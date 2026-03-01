// ─── InstinctFi Program Base ───────────────────────────────────────────────
// Shared constants, PDA helpers, and discriminator utilities used by both
// program.ts and program.onchain.ts.  Extracted to break the circular
// dependency between those two modules.

import {
    Connection,
    PublicKey,
    LAMPORTS_PER_SOL,
    clusterApiUrl,
} from "@solana/web3.js";

// ─── Program Configuration ─────────────────────────────────────────────────
export const PROGRAM_ID = new PublicKey(
    "3RAY4WxQREyvDvZwCc4LJeXYhQmxnqDghqq4groQ16En"
);

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
    // Use DataView for browser compatibility (Buffer polyfill lacks writeBigUInt64LE)
    const buf = new Uint8Array(8);
    const view = new DataView(buf.buffer);
    view.setBigUint64(0, BigInt(pollId), true); // true = little-endian
    return PublicKey.findProgramAddressSync(
        [Buffer.from("poll"), creator.toBuffer(), Buffer.from(buf)],
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
    if (sol >= 1) return `${parseFloat(sol.toFixed(4))} SOL`;
    if (sol >= 0.001) return `${parseFloat(sol.toFixed(4))} SOL`;
    if (sol > 0) return `${parseFloat(sol.toFixed(6))} SOL`;
    return `0 SOL`;
}

export function formatSOLShort(lamports: number): string {
    const sol = lamports / LAMPORTS_PER_SOL;
    if (sol >= 1000) return `${(sol / 1000).toFixed(1)}k`;
    if (sol >= 1) return `${sol.toFixed(2)}`;
    return `${sol.toFixed(4)}`;
}

// ─── Anchor Discriminator Computation ──────────────────────────────────────

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
