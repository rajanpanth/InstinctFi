// ─── InstinctFi On-Chain Program Interaction Layer ─────────────────────────
// Handles all Solana program interactions: instruction building, account
// parsing, and transaction helpers. Uses raw @solana/web3.js — no Anchor TS
// dependency needed.

import {
  PublicKey,
  TransactionInstruction,
  Transaction,
  LAMPORTS_PER_SOL,
  clusterApiUrl,
  Connection,
} from "@solana/web3.js";

// ─── Re-export everything from the base module ─────────────────────────────
// All existing imports from "@/lib/program" continue to work unchanged.
export {
  PROGRAM_ID,
  PROGRAM_DEPLOYED,
  CLUSTER,
  RPC_URL,
  connection,
  getUserPDA,
  getPollPDA,
  getTreasuryPDA,
  getVotePDA,
  lamportsToSol,
  solToLamports,
  formatSOL,
  formatSOLShort,
  ixDiscriminator,
  accountDiscriminator,
} from "./program.base";

import { connection } from "./program.base";

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// On-chain code (Borsh, instruction builders, account parsers, fetchers)
// has been extracted to program.onchain.ts for cleaner separation.
// Re-exported here for backward compatibility — all existing imports from
// "@/lib/program" continue to work unchanged.
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

export type {
  OnChainUser,
  OnChainPoll,
  OnChainVote,
} from "./program.onchain";

export {
  parseUserAccount,
  parsePollAccount,
  parseVoteAccount,
  buildInitializeUserIx,
  buildCreatePollIx,
  buildEditPollIx,
  buildAdminEditPollIx,
  buildDeletePollIx,
  buildCastVoteIx,
  buildSettlePollIx,
  buildClaimRewardIx,
  SPL_TOKEN_PROGRAM_ID,
  getVoteMintPDA,
  getVoteReceiptPDA,
  buildMintVoteTokenIx,
  fetchAllPolls,
  fetchVotesForUser,
  fetchVotesForPoll,
  fetchUserAccount,
  fetchAllUsers,
} from "./program.onchain";

/**
 * Build, sign, and send a transaction.
 * Accepts a `signTransaction` callback from the wallet adapter
 * (e.g. `useWallet().signTransaction`) so any wallet can be used.
 * Returns the transaction signature.
 */
export async function sendTransaction(
  instructions: TransactionInstruction[],
  payer: PublicKey,
  signTransaction: (tx: Transaction) => Promise<Transaction>
): Promise<string> {
  const { blockhash, lastValidBlockHeight } =
    await connection.getLatestBlockhash("confirmed");

  const tx = new Transaction();
  tx.recentBlockhash = blockhash;
  tx.feePayer = payer;
  for (const ix of instructions) {
    tx.add(ix);
  }

  const signed = await signTransaction(tx);
  const rawTx = signed.serialize();

  // Skip preflight — the wallet already simulates. This avoids a redundant
  // RPC round-trip and double-rate-limit hits on public devnet endpoints.
  const sig = await connection.sendRawTransaction(rawTx, {
    skipPreflight: true,
    maxRetries: 3,
  });

  // Return immediately after sendRawTransaction succeeds — the tx is now
  // in the leader pipeline. Confirmation is done in the background.
  // This cuts 5-30s of blocking wait on devnet.
  return sig;
}

/**
 * Confirm a transaction in the background. Does NOT throw on timeout —
 * logs a warning instead. Throws only if the tx actually failed on-chain.
 */
export async function confirmTransactionBg(sig: string): Promise<boolean> {
  // Poll getSignatureStatuses directly — this avoids the blockhash-mismatch
  // issue that occurs when confirmTransaction uses a different blockhash
  // than the one the transaction was originally signed with.
  const POLL_INTERVAL = 2_000;
  const POLL_TIMEOUT = 60_000;
  const deadline = Date.now() + POLL_TIMEOUT;

  while (Date.now() < deadline) {
    try {
      const { value } = await connection.getSignatureStatuses([sig]);
      const status = value?.[0];
      if (status) {
        if (status.err) {
          console.error("Transaction failed on-chain:", sig, status.err);
          return false;
        }
        if (status.confirmationStatus === "confirmed" || status.confirmationStatus === "finalized") {
          console.log("Transaction confirmed via polling:", sig);
          return true;
        }
      }
    } catch (e) {
      // polling error — keep trying until deadline
      console.warn("Signature status poll error:", e);
    }
    await new Promise(r => setTimeout(r, POLL_INTERVAL));
  }

  console.warn("Transaction confirmation timed out (bg):", sig);
  return false;
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
