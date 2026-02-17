// ─── InstinctFi On-Chain Program Interaction Layer ─────────────────────────
// Handles all Solana program interactions: instruction building, account
// parsing, and transaction helpers. Uses raw @solana/web3.js — no Anchor TS
// dependency needed.

import {
  Connection,
  PublicKey,
  SystemProgram,
  TransactionInstruction,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
} from "@solana/web3.js";

// ─── Program Configuration ─────────────────────────────────────────────────
// Replace with real program ID after `anchor keys list` / `anchor deploy`
export const PROGRAM_ID = new PublicKey(
  "Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS"
);

// Set to true once the program is actually deployed to devnet/mainnet.
// When false, all operations run in demo mode (local state only, no on-chain txs).
// WARNING (#35): While false, all on-chain instruction builders and Borsh
// serialization below are dead code (~25KB). Consider tree-shaking or
// lazy-loading this module when PROGRAM_DEPLOYED is false.
export const PROGRAM_DEPLOYED = false;

export const CLUSTER = "devnet" as "devnet" | "mainnet-beta" | "localnet";
export const RPC_URL =
  CLUSTER === "localnet"
    ? "http://localhost:8899"
    : clusterApiUrl(CLUSTER);

export const connection = new Connection(RPC_URL, "confirmed");

// ─── PDA Derivation ────────────────────────────────────────────────────────

/** seeds = ["user", authority] */
export function getUserPDA(authority: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("user"), authority.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds = ["poll", creator, poll_id (8 bytes LE)] */
export function getPollPDA(creator: PublicKey, pollId: bigint | number): [PublicKey, number] {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(pollId));
  return PublicKey.findProgramAddressSync(
    [Buffer.from("poll"), creator.toBuffer(), buf],
    PROGRAM_ID
  );
}

/** seeds = ["treasury", poll_account_pubkey] */
export function getTreasuryPDA(pollAccount: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("treasury"), pollAccount.toBuffer()],
    PROGRAM_ID
  );
}

/** seeds = ["vote", poll_account_pubkey, voter] */
export function getVotePDA(pollAccount: PublicKey, voter: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from("vote"), pollAccount.toBuffer(), voter.toBuffer()],
    PROGRAM_ID
  );
}

// ─── SOL Formatting ────────────────────────────────────────────────────────

export function lamportsToSol(lamports: number): number {
  return lamports / LAMPORTS_PER_SOL;
}

export function solToLamports(sol: number): number {
  return Math.round(sol * LAMPORTS_PER_SOL);
}

export function formatSOL(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k SOL`;
  if (sol >= 1) return `${sol.toFixed(4)} SOL`;
  if (sol >= 0.001) return `${sol.toFixed(6)} SOL`;
  return `${sol.toFixed(9)} SOL`;
}

export function formatSOLShort(lamports: number): string {
  const sol = lamports / LAMPORTS_PER_SOL;
  if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k`;
  if (sol >= 1) return `${sol.toFixed(2)}`;
  return `${sol.toFixed(4)}`;
}

// ─── Anchor Discriminator Computation ──────────────────────────────────────
// Anchor instruction discriminator = SHA256("global:<snake_case_name>")[0..8]
// Anchor account discriminator = SHA256("account:<PascalCaseName>")[0..8]

const discriminatorCache: Record<string, Uint8Array> = {};

async function computeDiscriminator(preimage: string): Promise<Uint8Array> {
  if (discriminatorCache[preimage]) return discriminatorCache[preimage];
  const data = new TextEncoder().encode(preimage);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data as BufferSource);
  const disc = new Uint8Array(hashBuffer).slice(0, 8);
  discriminatorCache[preimage] = disc;
  return disc;
}

/** Instruction discriminator */
export async function ixDiscriminator(name: string): Promise<Uint8Array> {
  return computeDiscriminator(`global:${name}`);
}

/** Account discriminator */
export async function accountDiscriminator(name: string): Promise<Uint8Array> {
  return computeDiscriminator(`account:${name}`);
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// DEAD CODE SECTION (#46) – everything below is only used when
// PROGRAM_DEPLOYED === true.  While that flag is false the app runs entirely
// on Supabase demo data and none of these Borsh helpers, instruction
// builders, or on-chain fetchers are executed at runtime.  They are kept
// here so the on-chain integration can be re-enabled by flipping the flag.
// When bundle size is a concern, extract this section into a lazily-imported
// module (e.g. `program.onchain.ts`) behind a dynamic import().
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

// ─── Borsh Serialization Helpers ───────────────────────────────────────────

class BorshWriter {
  private buffers: Buffer[] = [];

  writeU8(val: number) {
    const buf = Buffer.alloc(1);
    buf.writeUInt8(val);
    this.buffers.push(buf);
  }

  writeU32(val: number) {
    const buf = Buffer.alloc(4);
    buf.writeUInt32LE(val);
    this.buffers.push(buf);
  }

  writeU64(val: bigint | number) {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(val));
    this.buffers.push(buf);
  }

  writeI64(val: bigint | number) {
    const buf = Buffer.alloc(8);
    buf.writeBigInt64LE(BigInt(val));
    this.buffers.push(buf);
  }

  writeString(val: string) {
    const encoded = Buffer.from(val, "utf-8");
    this.writeU32(encoded.length);
    this.buffers.push(encoded);
  }

  writeVecString(vals: string[]) {
    this.writeU32(vals.length);
    for (const v of vals) {
      this.writeString(v);
    }
  }

  writeBool(val: boolean) {
    this.writeU8(val ? 1 : 0);
  }

  writePubkey(val: PublicKey) {
    this.buffers.push(val.toBuffer());
  }

  toBuffer(): Buffer {
    return Buffer.concat(this.buffers);
  }
}

class BorshReader {
  private offset = 0;
  constructor(private data: Buffer) {}

  get remaining(): number {
    return this.data.length - this.offset;
  }

  readU8(): number {
    const val = this.data.readUInt8(this.offset);
    this.offset += 1;
    return val;
  }

  readU32(): number {
    const val = this.data.readUInt32LE(this.offset);
    this.offset += 4;
    return val;
  }

  readU64(): bigint {
    const val = this.data.readBigUInt64LE(this.offset);
    this.offset += 8;
    return val;
  }

  readU64AsNumber(): number {
    return Number(this.readU64());
  }

  readI64(): bigint {
    const val = this.data.readBigInt64LE(this.offset);
    this.offset += 8;
    return val;
  }

  readI64AsNumber(): number {
    return Number(this.readI64());
  }

  readString(): string {
    const len = this.readU32();
    const val = this.data.slice(this.offset, this.offset + len).toString("utf-8");
    this.offset += len;
    return val;
  }

  readVecString(): string[] {
    const count = this.readU32();
    const result: string[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.readString());
    }
    return result;
  }

  readVecU64AsNumber(): number[] {
    const count = this.readU32();
    const result: number[] = [];
    for (let i = 0; i < count; i++) {
      result.push(this.readU64AsNumber());
    }
    return result;
  }

  readBool(): boolean {
    return this.readU8() !== 0;
  }

  readPubkey(): PublicKey {
    const bytes = this.data.slice(this.offset, this.offset + 32);
    this.offset += 32;
    return new PublicKey(bytes);
  }

  skip(bytes: number) {
    this.offset += bytes;
  }
}

// ─── On-Chain Account Types ────────────────────────────────────────────────

export type OnChainUser = {
  address: PublicKey;
  authority: PublicKey;
  totalPollsCreated: number;
  totalVotesCast: number;
  pollsWon: number;
  totalStaked: number;
  totalWinnings: number;
  createdAt: number;
  bump: number;
};

export type OnChainPoll = {
  address: PublicKey;
  pollId: number;
  creator: PublicKey;
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  options: string[];
  voteCounts: number[];
  unitPrice: number;
  endTime: number;
  totalPool: number;
  creatorInvestment: number;
  platformFee: number;
  creatorReward: number;
  status: number;
  winningOption: number;
  treasuryBump: number;
  bump: number;
  totalVoters: number;
  createdAt: number;
};

export type OnChainVote = {
  address: PublicKey;
  poll: PublicKey;
  voter: PublicKey;
  votesPerOption: number[];
  totalStaked: number;
  claimed: boolean;
  bump: number;
};

// ─── Account Deserialization ───────────────────────────────────────────────

export function parseUserAccount(address: PublicKey, data: Buffer): OnChainUser {
  const reader = new BorshReader(data);
  reader.skip(8); // Skip Anchor discriminator
  return {
    address,
    authority: reader.readPubkey(),
    totalPollsCreated: reader.readU64AsNumber(),
    totalVotesCast: reader.readU64AsNumber(),
    pollsWon: reader.readU64AsNumber(),
    totalStaked: reader.readU64AsNumber(),
    totalWinnings: reader.readU64AsNumber(),
    createdAt: reader.readI64AsNumber(),
    bump: reader.readU8(),
  };
}

export function parsePollAccount(address: PublicKey, data: Buffer): OnChainPoll {
  const reader = new BorshReader(data);
  reader.skip(8); // Skip Anchor discriminator
  return {
    address,
    pollId: reader.readU64AsNumber(),
    creator: reader.readPubkey(),
    title: reader.readString(),
    description: reader.readString(),
    category: reader.readString(),
    imageUrl: reader.readString(),
    options: reader.readVecString(),
    voteCounts: reader.readVecU64AsNumber(),
    unitPrice: reader.readU64AsNumber(),
    endTime: reader.readI64AsNumber(),
    totalPool: reader.readU64AsNumber(),
    creatorInvestment: reader.readU64AsNumber(),
    platformFee: reader.readU64AsNumber(),
    creatorReward: reader.readU64AsNumber(),
    status: reader.readU8(),
    winningOption: reader.readU8(),
    treasuryBump: reader.readU8(),
    bump: reader.readU8(),
    totalVoters: reader.readU32(),
    createdAt: reader.readI64AsNumber(),
  };
}

export function parseVoteAccount(address: PublicKey, data: Buffer): OnChainVote {
  const reader = new BorshReader(data);
  reader.skip(8); // Skip Anchor discriminator
  return {
    address,
    poll: reader.readPubkey(),
    voter: reader.readPubkey(),
    votesPerOption: reader.readVecU64AsNumber(),
    totalStaked: reader.readU64AsNumber(),
    claimed: reader.readBool(),
    bump: reader.readU8(),
  };
}

// ─── Instruction Builders ──────────────────────────────────────────────────

/** Build InitializeUser instruction */
export async function buildInitializeUserIx(
  authority: PublicKey
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("initialize_user");
  const [userPDA] = getUserPDA(authority);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: authority, isSigner: true, isWritable: true },
      { pubkey: userPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data: Buffer.from(disc),
  });
}

/** Build CreatePoll instruction */
export async function buildCreatePollIx(
  creator: PublicKey,
  pollId: number | bigint,
  title: string,
  description: string,
  category: string,
  imageUrl: string,
  options: string[],
  unitPrice: number | bigint,
  endTime: number | bigint,
  creatorInvestment: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("create_poll");
  const [userPDA] = getUserPDA(creator);
  const [pollPDA] = getPollPDA(creator, pollId);
  const [treasuryPDA] = getTreasuryPDA(pollPDA);

  const writer = new BorshWriter();
  writer.writeU64(pollId);
  writer.writeString(title);
  writer.writeString(description);
  writer.writeString(category);
  writer.writeString(imageUrl);
  writer.writeVecString(options);
  writer.writeU64(unitPrice);
  writer.writeI64(endTime);
  writer.writeU64(creatorInvestment);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: userPDA, isSigner: false, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Build EditPoll instruction */
export async function buildEditPollIx(
  creator: PublicKey,
  pollId: number | bigint,
  title: string,
  description: string,
  category: string,
  imageUrl: string,
  options: string[],
  endTime: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("edit_poll");
  const [pollPDA] = getPollPDA(creator, pollId);

  const writer = new BorshWriter();
  writer.writeU64(pollId);
  writer.writeString(title);
  writer.writeString(description);
  writer.writeString(category);
  writer.writeString(imageUrl);
  writer.writeVecString(options);
  writer.writeI64(endTime);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: true },
    ],
    data,
  });
}

/** Build DeletePoll instruction */
export async function buildDeletePollIx(
  creator: PublicKey,
  pollId: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("delete_poll");
  const [pollPDA] = getPollPDA(creator, pollId);
  const [treasuryPDA] = getTreasuryPDA(pollPDA);

  const writer = new BorshWriter();
  writer.writeU64(pollId);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: creator, isSigner: true, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Build CastVote instruction */
export async function buildCastVoteIx(
  voter: PublicKey,
  pollCreator: PublicKey,
  pollId: number | bigint,
  optionIndex: number,
  numCoins: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("cast_vote");
  const [userPDA] = getUserPDA(voter);
  const [pollPDA] = getPollPDA(pollCreator, pollId);
  const [treasuryPDA] = getTreasuryPDA(pollPDA);
  const [votePDA] = getVotePDA(pollPDA, voter);

  const writer = new BorshWriter();
  writer.writeU64(pollId);
  writer.writeU8(optionIndex);
  writer.writeU64(numCoins);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: voter, isSigner: true, isWritable: true },
      { pubkey: userPDA, isSigner: false, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: votePDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Build SettlePoll instruction */
export async function buildSettlePollIx(
  settler: PublicKey,
  pollCreator: PublicKey,
  pollId: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("settle_poll");
  const [pollPDA] = getPollPDA(pollCreator, pollId);
  const [treasuryPDA] = getTreasuryPDA(pollPDA);

  const writer = new BorshWriter();
  writer.writeU64(pollId);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: settler, isSigner: true, isWritable: true },
      { pubkey: pollCreator, isSigner: false, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: true },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

/** Build ClaimReward instruction */
export async function buildClaimRewardIx(
  claimer: PublicKey,
  pollCreator: PublicKey,
  pollId: number | bigint
): Promise<TransactionInstruction> {
  const disc = await ixDiscriminator("claim_reward");
  const [userPDA] = getUserPDA(claimer);
  const [pollPDA] = getPollPDA(pollCreator, pollId);
  const [treasuryPDA] = getTreasuryPDA(pollPDA);
  const [votePDA] = getVotePDA(pollPDA, claimer);

  const writer = new BorshWriter();
  writer.writeU64(pollId);

  const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

  return new TransactionInstruction({
    programId: PROGRAM_ID,
    keys: [
      { pubkey: claimer, isSigner: true, isWritable: true },
      { pubkey: userPDA, isSigner: false, isWritable: true },
      { pubkey: pollPDA, isSigner: false, isWritable: false },
      { pubkey: treasuryPDA, isSigner: false, isWritable: true },
      { pubkey: votePDA, isSigner: false, isWritable: true },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
    ],
    data,
  });
}

// ─── Fetch All On-Chain Accounts ───────────────────────────────────────────

/** Fetch all PollAccounts from the program */
export async function fetchAllPolls(): Promise<OnChainPoll[]> {
  const disc = await accountDiscriminator("PollAccount");
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: Buffer.from(disc).toString("base64") } }],
    commitment: "confirmed",
  });
  return accounts
    .map(({ pubkey, account }) => {
      try {
        return parsePollAccount(pubkey, account.data as Buffer);
      } catch (e) {
        console.warn("Failed to parse poll account:", pubkey.toString(), e);
        return null;
      }
    })
    .filter((p): p is OnChainPoll => p !== null)
    .sort((a, b) => b.createdAt - a.createdAt);
}

/** Fetch all VoteAccounts for a specific voter */
export async function fetchVotesForUser(voter: PublicKey): Promise<OnChainVote[]> {
  const disc = await accountDiscriminator("VoteAccount");
  // VoteAccount layout: [8 disc][32 poll][32 voter]
  // Filter by voter at offset 8 + 32 = 40
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: Buffer.from(disc).toString("base64") } },
      { memcmp: { offset: 40, bytes: voter.toBase58() } },
    ],
    commitment: "confirmed",
  });
  return accounts
    .map(({ pubkey, account }) => {
      try {
        return parseVoteAccount(pubkey, account.data as Buffer);
      } catch (e) {
        console.warn("Failed to parse vote account:", pubkey.toString(), e);
        return null;
      }
    })
    .filter((v): v is OnChainVote => v !== null);
}

/** Fetch all VoteAccounts for a specific poll */
export async function fetchVotesForPoll(pollPDA: PublicKey): Promise<OnChainVote[]> {
  const disc = await accountDiscriminator("VoteAccount");
  // VoteAccount layout: [8 disc][32 poll][32 voter]
  // Filter by poll at offset 8
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [
      { memcmp: { offset: 0, bytes: Buffer.from(disc).toString("base64") } },
      { memcmp: { offset: 8, bytes: pollPDA.toBase58() } },
    ],
    commitment: "confirmed",
  });
  return accounts
    .map(({ pubkey, account }) => {
      try {
        return parseVoteAccount(pubkey, account.data as Buffer);
      } catch (e) {
        console.warn("Failed to parse vote account:", pubkey.toString(), e);
        return null;
      }
    })
    .filter((v): v is OnChainVote => v !== null);
}

/** Fetch a single user account (returns null if not initialized) */
export async function fetchUserAccount(authority: PublicKey): Promise<OnChainUser | null> {
  const [userPDA] = getUserPDA(authority);
  const info = await connection.getAccountInfo(userPDA);
  if (!info) return null;
  return parseUserAccount(userPDA, info.data as Buffer);
}

/** Fetch all UserAccounts (for leaderboard) */
export async function fetchAllUsers(): Promise<OnChainUser[]> {
  const disc = await accountDiscriminator("UserAccount");
  const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
    filters: [{ memcmp: { offset: 0, bytes: Buffer.from(disc).toString("base64") } }],
    commitment: "confirmed",
  });
  return accounts
    .map(({ pubkey, account }) => {
      try {
        return parseUserAccount(pubkey, account.data as Buffer);
      } catch (e) {
        console.warn("Failed to parse user account:", pubkey.toString(), e);
        return null;
      }
    })
    .filter((u): u is OnChainUser => u !== null);
}

// ─── Transaction Helper ────────────────────────────────────────────────────

/**
 * Build, sign, and send a transaction using the injected wallet provider.
 * Currently uses Phantom's `window.solana` API.
 * TODO: Migrate to @solana/wallet-adapter-react `useWallet().signTransaction`
 * for multi-wallet support (Solflare, Backpack, etc.).
 * Returns the transaction signature.
 */
export async function sendTransaction(
  instructions: TransactionInstruction[],
  payer: PublicKey
): Promise<string> {
  const solana = (window as any).solana ?? (window as any).phantom?.solana;
  if (!solana) throw new Error("No Solana wallet found. Please install Phantom or another wallet.");

  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  for (const ix of instructions) {
    tx.add(ix);
  }

  const signed = await solana.signTransaction(tx);
  const rawTx = signed.serialize();
  const sig = await connection.sendRawTransaction(rawTx, {
    skipPreflight: false,
    preflightCommitment: "confirmed",
  });

  await connection.confirmTransaction(
    { signature: sig, blockhash, lastValidBlockHeight },
    "confirmed"
  );

  return sig;
}

/** Get wallet SOL balance in lamports */
export async function getWalletBalance(wallet: PublicKey): Promise<number> {
  return connection.getBalance(wallet, "confirmed");
}

/** Request devnet airdrop (for testing) — with retry, backoff & faucet fallback */
export async function requestAirdrop(wallet: PublicKey, solAmount = 1): Promise<string> {
  const MAX_RETRIES = 3;
  let lastError: any;

  // Strategy 1: Use connection.requestAirdrop with exponential back-off
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (attempt > 0) {
        // Exponential back-off: 3s, 6s
        await new Promise(r => setTimeout(r, 3000 * attempt));
      }

      // Fresh connection per attempt avoids stale nonce / rate-limit caching
      const airdropConn = new Connection(clusterApiUrl("devnet"), {
        commitment: "confirmed",
        confirmTransactionInitialTimeout: 60_000,
      });

      const amt = Math.min(solAmount, 1); // devnet caps ~1-2 SOL per request
      const sig = await airdropConn.requestAirdrop(wallet, amt * LAMPORTS_PER_SOL);
      console.log(`Airdrop attempt ${attempt + 1} sig:`, sig);

      // Poll balance instead of confirmTransaction — much more reliable for
      // airdrops where the confirmation websocket often times out.
      const balBefore = await airdropConn.getBalance(wallet, "confirmed");
      const deadline = Date.now() + 30_000; // 30 s timeout
      while (Date.now() < deadline) {
        await new Promise(r => setTimeout(r, 2000));
        const balNow = await airdropConn.getBalance(wallet, "confirmed");
        if (balNow > balBefore) {
          console.log("Airdrop confirmed via balance increase:", balNow - balBefore);
          return sig;
        }
      }

      // If balance didn't change, try next attempt
      console.warn(`Airdrop attempt ${attempt + 1}: balance unchanged after 30 s`);
      lastError = new Error("Airdrop confirmed but balance unchanged — retrying");
    } catch (e: any) {
      lastError = e;
      console.warn(`Airdrop attempt ${attempt + 1}/${MAX_RETRIES} failed:`, e?.message);

      // Rate-limited — wait extra before next retry
      if (e?.message?.includes("429") || e?.message?.includes("Too Many")) {
        await new Promise(r => setTimeout(r, 5000));
        continue;
      }
      // Transient errors — keep retrying
      if (attempt < MAX_RETRIES - 1) continue;
    }
  }

  // Strategy 2: Try the Solana web faucet API as a fallback
  try {
    console.log("Falling back to web faucet API...");
    const resp = await fetch("https://faucet.solana.com/api/request-airdrop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wallet: wallet.toBase58(),
        network: "devnet",
        amount: Math.min(solAmount, 1),
      }),
    });

    if (resp.ok) {
      const data = await resp.json();
      console.log("Web faucet response:", data);
      // Wait for it to land on-chain
      await new Promise(r => setTimeout(r, 4000));
      return data?.signature || data?.txid || "faucet-airdrop";
    }
    console.warn("Web faucet returned", resp.status);
  } catch (faucetErr: any) {
    console.warn("Web faucet fallback failed:", faucetErr?.message);
  }

  throw lastError;
}
