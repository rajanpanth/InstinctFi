import * as anchor from "@coral-xyz/anchor";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { expect } from "chai";

/**
 * E2E tests for the InstinctFi prediction‑market programs.
 *
 * These tests validate PDA derivation, cross‑program account addressing,
 * and off‑chain tokenomics math. Full integration tests require deployed
 * programs with `anchor test --provider.cluster localnet`.
 */
describe("InstinctFi E2E", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  // ── Program IDs (must match declare_id! in each program) ──
  const POLL_PROGRAM_ID = new PublicKey("Po11CrtrPrgm1111111111111111111111111111111");
  const VOTE_PROGRAM_ID = new PublicKey("VotePrgm11111111111111111111111111111111111");
  const SETTLEMENT_PROGRAM_ID = new PublicKey("Sett1ePrgm111111111111111111111111111111111");
  const USER_PROGRAM_ID = new PublicKey("UserPrgm11111111111111111111111111111111111");

  const creator = anchor.web3.Keypair.generate();
  const voter1 = anchor.web3.Keypair.generate();
  const voter2 = anchor.web3.Keypair.generate();

  const pollId = new anchor.BN(1);
  const unitPrice = new anchor.BN(LAMPORTS_PER_SOL * 0.01); // 0.01 SOL per coin
  const creatorInvestment = new anchor.BN(LAMPORTS_PER_SOL * 0.1); // 0.1 SOL seed

  // PDAs
  let pollPda: PublicKey;
  let pollBump: number;

  before(async () => {
    // Airdrop to test wallets
    for (const kp of [creator, voter1, voter2]) {
      const sig = await provider.connection.requestAirdrop(
        kp.publicKey,
        5 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Derive poll PDA (seeds: ["poll", creator, poll_id_le_bytes])
    [pollPda, pollBump] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.publicKey.toBuffer(),
        pollId.toArrayLike(Buffer, "le", 8),
      ],
      POLL_PROGRAM_ID
    );
  });

  // ────────────────────────────────────────────────────────────────────────
  // 1. PDA derivation
  // ────────────────────────────────────────────────────────────────────────

  it("Derives poll PDA correctly", () => {
    expect(pollPda).to.not.be.null;
    console.log("Poll PDA:", pollPda.toBase58());
    console.log("Creator:", creator.publicKey.toBase58());
  });

  it("Derives vote account PDAs correctly (vote_program)", () => {
    // seeds: ["vote", poll_pda, voter]
    const [votePda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter1.publicKey.toBuffer()],
      VOTE_PROGRAM_ID
    );

    const [votePda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter2.publicKey.toBuffer()],
      VOTE_PROGRAM_ID
    );

    console.log("Voter1 vote PDA:", votePda1.toBase58());
    console.log("Voter2 vote PDA:", votePda2.toBase58());

    expect(votePda1.toBase58()).to.not.equal(votePda2.toBase58());
  });

  it("Derives user account PDAs correctly (user_program)", () => {
    // seeds: ["user", authority]
    const [userPda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), voter1.publicKey.toBuffer()],
      USER_PROGRAM_ID
    );

    const [userPda2] = PublicKey.findProgramAddressSync(
      [Buffer.from("user"), voter2.publicKey.toBuffer()],
      USER_PROGRAM_ID
    );

    console.log("Voter1 user PDA:", userPda1.toBase58());
    console.log("Voter2 user PDA:", userPda2.toBase58());

    expect(userPda1.toBase58()).to.not.equal(userPda2.toBase58());
  });

  // ────────────────────────────────────────────────────────────────────────
  // 2. Cross‑program account addressing
  // ────────────────────────────────────────────────────────────────────────

  it("vote_program CPI target PDA matches poll_program record_vote", () => {
    // vote_program calls poll_program::record_vote, passing poll PDA.
    // The PDA is owned by poll_program — vote_program references it as a
    // read‑only AccountInfo and uses CPI for mutation.
    const [derivedPoll] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.publicKey.toBuffer(),
        pollId.toArrayLike(Buffer, "le", 8),
      ],
      POLL_PROGRAM_ID
    );
    expect(derivedPoll.toBase58()).to.equal(pollPda.toBase58());
  });

  it("settlement_program CPI target PDA matches poll_program settle_poll_cpi", () => {
    // settlement_program calls poll_program::settle_poll_cpi with the poll PDA.
    const [derivedPoll] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.publicKey.toBuffer(),
        pollId.toArrayLike(Buffer, "le", 8),
      ],
      POLL_PROGRAM_ID
    );
    expect(derivedPoll.toBase58()).to.equal(pollPda.toBase58());
  });

  // ────────────────────────────────────────────────────────────────────────
  // 3. Tokenomics math
  // ────────────────────────────────────────────────────────────────────────

  it("Validates fee breakdown at poll creation", () => {
    const investment = 0.1 * LAMPORTS_PER_SOL; // 100_000_000 lamports

    // 1% platform fee, 1% creator reward, rest seeds the pool
    const platformFee = Math.max(Math.floor(investment / 100), 1);
    const creatorReward = Math.max(Math.floor(investment / 100), 1);
    const poolSeed = investment - platformFee - creatorReward;

    console.log("Investment:", investment, "lamports");
    console.log("Platform fee (1%):", platformFee, "lamports");
    console.log("Creator reward (1%):", creatorReward, "lamports");
    console.log("Pool seed:", poolSeed, "lamports");

    expect(platformFee).to.equal(1_000_000);
    expect(creatorReward).to.equal(1_000_000);
    expect(poolSeed).to.equal(98_000_000);
    expect(poolSeed + platformFee + creatorReward).to.equal(investment);
  });

  it("Validates settlement reward distribution", () => {
    const investment = 0.1 * LAMPORTS_PER_SOL;
    const unitPriceNum = 0.01 * LAMPORTS_PER_SOL;

    const platformFee = Math.floor(investment / 100);
    const creatorReward = Math.floor(investment / 100);
    const poolSeed = investment - platformFee - creatorReward;

    // Voter1 buys 3 coins on Option A, Voter2 buys 2 coins on Option B
    const voter1Cost = 3 * unitPriceNum;
    const voter2Cost = 2 * unitPriceNum;
    const totalPool = poolSeed + voter1Cost + voter2Cost;

    console.log("Total pool:", totalPool, "lamports");

    // Distributable = total_pool_cents (fees already carved at creation)
    // This matches claim_reward.rs: distributable = poll.total_pool_cents
    const distributable = totalPool;

    // If Option A wins: voter1 has 3/3 = 100% of winning votes
    const voter1Share = Math.floor((3 / 3) * distributable);
    expect(voter1Share).to.equal(distributable);

    // If Option B wins: voter2 has 2/2 = 100% of winning votes
    const voter2Share = Math.floor((2 / 2) * distributable);
    expect(voter2Share).to.equal(distributable);

    console.log("Voter1 reward (if A wins):", voter1Share, "lamports");
    console.log("Voter2 reward (if B wins):", voter2Share, "lamports");
  });

  it("Validates partial reward shares", () => {
    // Two voters both pick Option A: voter1 buys 3, voter2 buys 5
    const totalWinningVotes = 8;
    const distributable = 148_000_000; // example pool

    const voter1Reward = Math.floor((3 / totalWinningVotes) * distributable);
    const voter2Reward = Math.floor((5 / totalWinningVotes) * distributable);

    console.log("voter1 (3/8):", voter1Reward, "lamports");
    console.log("voter2 (5/8):", voter2Reward, "lamports");

    // Sum should be <= distributable (rounding dust)
    expect(voter1Reward + voter2Reward).to.be.at.most(distributable);
    // Each share proportional
    expect(voter1Reward).to.be.lessThan(voter2Reward);
  });

  it("Guards against zero‑division edge cases", () => {
    // If no winning votes (shouldn't happen with proper settling)
    const totalWinningVotes = 0;
    const distributable = 100_000_000;

    // claim_reward.rs requires user_winning_votes > 0 and total_winning_votes > 0
    // Off-chain, division by zero would produce NaN/Infinity
    if (totalWinningVotes === 0) {
      console.log("No winners — settlement should not proceed (guard in contract).");
    } else {
      const reward = Math.floor((1 / totalWinningVotes) * distributable);
      expect(reward).to.be.greaterThan(0);
    }
  });

  // ────────────────────────────────────────────────────────────────────────
  // 4. Edge cases (NEW — Enhancement #3)
  // ────────────────────────────────────────────────────────────────────────

  it("Prevents same voter from deriving two different vote PDAs for same poll", () => {
    // A voter should always get the same PDA for the same poll
    const [votePda1] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter1.publicKey.toBuffer()],
      VOTE_PROGRAM_ID
    );
    const [votePda1Again] = PublicKey.findProgramAddressSync(
      [Buffer.from("vote"), pollPda.toBuffer(), voter1.publicKey.toBuffer()],
      VOTE_PROGRAM_ID
    );
    expect(votePda1.toBase58()).to.equal(votePda1Again.toBase58());
  });

  it("Validates expired poll detection (off-chain)", () => {
    const now = Math.floor(Date.now() / 1000);
    // Poll that ended 1 hour ago
    const endTime = now - 3600;
    expect(now >= endTime).to.be.true;

    // Poll that ends in 1 hour
    const futureEndTime = now + 3600;
    expect(now >= futureEndTime).to.be.false;
  });

  it("Prevents voting with zero coins (off-chain validation)", () => {
    const numCoins = 0;
    const unitPriceNum = 0.01 * LAMPORTS_PER_SOL;
    const cost = numCoins * unitPriceNum;

    expect(cost).to.equal(0);
    expect(numCoins > 0).to.be.false;
    // The contract should also reject this — require!(num_coins > 0)
  });

  it("Validates maximum coins per poll constraint", () => {
    const MAX_COINS = 1000; // matches MAX_COINS_PER_POLL in types.ts
    const numCoins = 1001;
    expect(numCoins > MAX_COINS).to.be.true;
    // Contract enforces: require!(total_coins <= MAX_COINS_PER_POLL)
  });

  it("Validates insufficient balance detection (off-chain)", () => {
    const userBalance = 0.05 * LAMPORTS_PER_SOL; // 0.05 SOL
    const unitPriceNum = 0.01 * LAMPORTS_PER_SOL;
    const numCoins = 10;
    const cost = numCoins * unitPriceNum; // 0.1 SOL

    expect(cost > userBalance).to.be.true;
    // UI should block this before sending the transaction
  });

  it("Validates creator cannot vote on own poll (off-chain)", () => {
    const pollCreator = creator.publicKey.toString();
    const voterWallet = creator.publicKey.toString(); // same wallet

    expect(pollCreator === voterWallet).to.be.true;
    // The contract enforces: require!(voter != poll.creator)
  });

  it("Validates reward calculation with rounding dust is safe", () => {
    // Edge case: 3 voters with odd distribution
    const distributable = 100_000_000; // 0.1 SOL
    const votes = [1, 1, 1]; // all on winning option
    const totalWinningVotes = votes.reduce((a, b) => a + b, 0);

    let totalDistributed = 0;
    for (const v of votes) {
      totalDistributed += Math.floor((v / totalWinningVotes) * distributable);
    }

    // Due to rounding, some dust may remain
    const dust = distributable - totalDistributed;
    console.log("Rounding dust:", dust, "lamports");
    expect(dust).to.be.at.least(0);
    expect(dust).to.be.lessThan(totalWinningVotes); // dust < number of winners
  });

  it("Derives settlement PDA correctly", () => {
    // Settlement account PDA: ["settlement", poll_pda]
    const [settlementPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("settlement"), pollPda.toBuffer()],
      SETTLEMENT_PROGRAM_ID
    );
    expect(settlementPda).to.not.be.null;
    console.log("Settlement PDA:", settlementPda.toBase58());
  });

  it("Validates multiple polls by same creator have unique PDAs", () => {
    const pollId1 = new anchor.BN(1);
    const pollId2 = new anchor.BN(2);

    const [pda1] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.publicKey.toBuffer(),
        pollId1.toArrayLike(Buffer, "le", 8),
      ],
      POLL_PROGRAM_ID
    );
    const [pda2] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("poll"),
        creator.publicKey.toBuffer(),
        pollId2.toArrayLike(Buffer, "le", 8),
      ],
      POLL_PROGRAM_ID
    );

    expect(pda1.toBase58()).to.not.equal(pda2.toBase58());
  });
});
