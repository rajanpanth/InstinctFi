// ─── InstinctFi On-Chain Program Interaction Layer ─────────────────────────
// This module contains all Borsh serialization, instruction builders,
// account parsers, and on-chain fetchers. These are ONLY used when
// PROGRAM_DEPLOYED === true. When false, the app runs on Supabase demo data.
//
// Extracted from program.ts (#23) to keep the core module lean (~120 lines)
// and avoid bundling ~25KB of dead code in demo mode.

import {
    PublicKey,
    SystemProgram,
    TransactionInstruction,
} from "@solana/web3.js";

import {
    PROGRAM_ID,
    connection,
    getUserPDA,
    getPollPDA,
    getTreasuryPDA,
    getVotePDA,
    ixDiscriminator,
    accountDiscriminator,
} from "./program.base";

// ─── Borsh Serialization Helpers ───────────────────────────────────────────

class BorshWriter {
    private buffers: Uint8Array[] = [];

    writeU8(val: number) {
        this.buffers.push(new Uint8Array([val & 0xff]));
    }

    writeU32(val: number) {
        const buf = new ArrayBuffer(4);
        new DataView(buf).setUint32(0, val, true);
        this.buffers.push(new Uint8Array(buf));
    }

    writeU64(val: bigint | number) {
        const big = BigInt(val);
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        view.setBigUint64(0, big, true);
        this.buffers.push(new Uint8Array(buf));
    }

    writeI64(val: bigint | number) {
        const big = BigInt(val);
        const buf = new ArrayBuffer(8);
        const view = new DataView(buf);
        view.setBigInt64(0, big, true);
        this.buffers.push(new Uint8Array(buf));
    }

    writeString(val: string) {
        const encoded = new TextEncoder().encode(val);
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
        this.buffers.push(val.toBytes());
    }

    toBuffer(): Buffer {
        const totalLen = this.buffers.reduce((sum, b) => sum + b.length, 0);
        const out = new Uint8Array(totalLen);
        let offset = 0;
        for (const b of this.buffers) {
            out.set(b, offset);
            offset += b.length;
        }
        return Buffer.from(out);
    }
}

class BorshReader {
    private offset = 0;
    private view: DataView;
    constructor(private data: Buffer) {
        // Create a DataView over the underlying ArrayBuffer for BigInt support
        // in browser polyfill environments where Buffer lacks readBigUInt64LE.
        const ab = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
        this.view = new DataView(ab);
    }

    get remaining(): number {
        return this.data.length - this.offset;
    }

    readU8(): number {
        const val = this.view.getUint8(this.offset);
        this.offset += 1;
        return val;
    }

    readU32(): number {
        const val = this.view.getUint32(this.offset, true);
        this.offset += 4;
        return val;
    }

    readU64(): bigint {
        const val = this.view.getBigUint64(this.offset, true);
        this.offset += 8;
        return val;
    }

    readU64AsNumber(): number {
        return Number(this.readU64());
    }

    readI64(): bigint {
        const val = this.view.getBigInt64(this.offset, true);
        this.offset += 8;
        return val;
    }

    readI64AsNumber(): number {
        return Number(this.readI64());
    }

    readString(): string {
        const len = this.readU32();
        const bytes = this.data.slice(this.offset, this.offset + len);
        this.offset += len;
        return new TextDecoder().decode(bytes);
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

/** Build AdminEditPoll instruction — admin can edit any poll including ended ones */
export async function buildAdminEditPollIx(
    admin: PublicKey,
    pollCreator: PublicKey,
    pollId: number | bigint,
    title: string,
    description: string,
    category: string,
    imageUrl: string,
    options: string[],
    endTime: number | bigint
): Promise<TransactionInstruction> {
    const disc = await ixDiscriminator("admin_edit_poll");
    const [pollPDA] = getPollPDA(pollCreator, pollId);

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
            { pubkey: admin, isSigner: true, isWritable: true },
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

/** Build SettlePoll instruction (permissionless — blocked during 7-day admin grace period) */
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

/** Build AdminSettlePoll instruction (admin-only, declares real-world outcome) */
export async function buildAdminSettlePollIx(
    admin: PublicKey,
    pollCreator: PublicKey,
    pollId: number | bigint,
    winningOption: number
): Promise<TransactionInstruction> {
    const disc = await ixDiscriminator("admin_settle_poll");
    const [pollPDA] = getPollPDA(pollCreator, pollId);
    const [treasuryPDA] = getTreasuryPDA(pollPDA);

    const writer = new BorshWriter();
    writer.writeU64(pollId);
    writer.writeU8(winningOption);

    const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: admin, isSigner: true, isWritable: true },
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

// ─── Token-2022 (Token Extension) Support ──────────────────────────────────

/** SPL Token program ID (used for vote receipt mints) */
export const SPL_TOKEN_PROGRAM_ID = new PublicKey(
    "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

/** seeds = ["vote_mint", poll_account, voter, poll_id (8 bytes LE)] */
export function getVoteMintPDA(
    pollAccount: PublicKey,
    voter: PublicKey,
    pollId: bigint | number
): [PublicKey, number] {
    const buf = Buffer.alloc(8);
    buf.writeBigUInt64LE(BigInt(pollId));
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vote_mint"), pollAccount.toBuffer(), voter.toBuffer(), buf],
        PROGRAM_ID
    );
}

/** seeds = ["vote_receipt", vote_mint, voter] */
export function getVoteReceiptPDA(
    voteMint: PublicKey,
    voter: PublicKey
): [PublicKey, number] {
    return PublicKey.findProgramAddressSync(
        [Buffer.from("vote_receipt"), voteMint.toBuffer(), voter.toBuffer()],
        PROGRAM_ID
    );
}

/** Build MintVoteToken instruction (Token-2022 vote receipt NFT) */
export async function buildMintVoteTokenIx(
    voter: PublicKey,
    pollCreator: PublicKey,
    pollId: number | bigint
): Promise<TransactionInstruction> {
    const disc = await ixDiscriminator("mint_vote_token");
    const [pollPDA] = getPollPDA(pollCreator, pollId);
    const [voteMintPDA] = getVoteMintPDA(pollPDA, voter, pollId);
    const [voterTokenAccount] = getVoteReceiptPDA(voteMintPDA, voter);

    const writer = new BorshWriter();
    writer.writeU64(pollId);

    const data = Buffer.concat([Buffer.from(disc), writer.toBuffer()]);

    return new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
            { pubkey: voter, isSigner: true, isWritable: true },
            { pubkey: pollPDA, isSigner: false, isWritable: false },
            { pubkey: voteMintPDA, isSigner: false, isWritable: true },
            { pubkey: voterTokenAccount, isSigner: false, isWritable: true },
            { pubkey: SPL_TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
            { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
        ],
        data,
    });
}

// ─── Fetch All On-Chain Accounts ───────────────────────────────────────────

/** Fetch all PollAccounts from the program */
export async function fetchAllPolls(): Promise<OnChainPoll[]> {
    const disc = await accountDiscriminator("PollAccount");
    // HIGH-03 FIX: Use base58 encoding for memcmp (getProgramAccounts default)
    const bs58 = await import("bs58");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ memcmp: { offset: 0, bytes: bs58.default.encode(Buffer.from(disc)) } }],
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
    // HIGH-03 FIX: Use base58 encoding for memcmp discriminator filter
    const bs58 = await import("bs58");
    // VoteAccount layout: [8 disc][32 poll][32 voter]
    // Filter by voter at offset 8 + 32 = 40
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
            { memcmp: { offset: 0, bytes: bs58.default.encode(Buffer.from(disc)) } },
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
    // HIGH-03 FIX: Use base58 encoding for memcmp discriminator filter
    const bs58 = await import("bs58");
    // VoteAccount layout: [8 disc][32 poll][32 voter]
    // Filter by poll at offset 8
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [
            { memcmp: { offset: 0, bytes: bs58.default.encode(Buffer.from(disc)) } },
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
    // HIGH-03 FIX: Use base58 encoding for memcmp discriminator filter
    const bs58 = await import("bs58");
    const accounts = await connection.getProgramAccounts(PROGRAM_ID, {
        filters: [{ memcmp: { offset: 0, bytes: bs58.default.encode(Buffer.from(disc)) } }],
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
