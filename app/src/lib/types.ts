/**
 * Shared types for InstinctFi frontend.
 * Extracted from Providers.tsx for reuse across the app.
 */
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatSOL, formatSOLShort } from "@/lib/program";

// ─── Constants ─────────────────────────────────────────────────────────────
/** SOL_UNIT converts user-facing SOL values to lamports (1 SOL = 1e9 lamports) */
export const SOL_UNIT = LAMPORTS_PER_SOL;


/** Maximum coins a single user can stake on one poll */
export const MAX_COINS_PER_POLL = 100;

// ─── Enums for type safety ──────────────────────────────────────────────────
/** Poll lifecycle status */
export enum PollStatus {
  Active = 0,
  Settled = 1,
}

/** Sentinel value when no winning option has been determined */
export const WINNING_OPTION_UNSET = 255;

/** Format lamports → "X.XXXX SOL" */
export const formatDollars = formatSOL;
export const formatDollarsShort = formatSOLShort;

// ─── Types ──────────────────────────────────────────────────────────────────
/**
 * NAMING CONVENTION — "*Lamports" fields
 * ----------------------------------------
 * Every monetary value is stored in **lamports** (1 SOL = 1 000 000 000 lamports).
 * The Supabase SQL columns still use the legacy "_cents" suffix for backward
 * compatibility; the data converters handle the mapping.
 * Use `formatDollars()` / `formatDollarsShort()` (aliases for `formatSOL`)
 * to display them as human-readable SOL strings.
 */

export type DemoPoll = {
  id: string;                    // Poll PDA address (base58)
  pollId: number;                // Unique poll ID
  creator: string;               // Creator wallet address
  title: string;
  description: string;
  category: string;
  imageUrl: string;
  optionImages: string[];        // Off-chain only (Supabase)
  options: string[];
  /** Vote counts per option — length MUST equal options.length */
  voteCounts: number[];
  unitPriceLamports: number;        // LAMPORTS per option-coin
  endTime: number;               // Unix timestamp
  totalPoolLamports: number;        // LAMPORTS in distributable pool
  creatorInvestmentLamports: number; // LAMPORTS invested by creator
  platformFeeLamports: number;      // LAMPORTS platform fee
  creatorRewardLamports: number;    // LAMPORTS creator reward
  status: number;                // 0 = Active, 1 = Settled
  winningOption: number;         // 255 = unset
  totalVoters: number;
  createdAt: number;
};

export type DemoVote = {
  pollId: string;                // Poll PDA address (base58)
  voter: string;                 // Voter wallet address
  /** Votes placed per option — length MUST equal poll's options.length */
  votesPerOption: number[];
  totalStakedLamports: number;      // LAMPORTS total staked
  claimed: boolean;
};

export type UserAccount = {
  wallet: string;
  balance: number;               // Real SOL balance in LAMPORTS
  signupBonusClaimed: boolean;   // Whether on-chain user account exists
  lastWeeklyRewardTs: number;
  totalVotesCast: number;
  totalPollsVoted: number;
  pollsWon: number;
  pollsCreated: number;
  totalSpentLamports: number;       // LAMPORTS
  totalWinningsLamports: number;    // LAMPORTS
  weeklyWinningsLamports: number;
  monthlyWinningsLamports: number;
  weeklySpentLamports: number;
  monthlySpentLamports: number;
  weeklyVotesCast: number;
  monthlyVotesCast: number;
  weeklyPollsWon: number;
  monthlyPollsWon: number;
  weeklyPollsVoted: number;
  monthlyPollsVoted: number;
  creatorEarningsLamports: number;
  weeklyResetTs: number;
  monthlyResetTs: number;
  createdAt: number;
  loginStreak: number;
};

export type AppContextType = {
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  userAccount: UserAccount | null;
  signup: () => void;
  claimDailyReward: () => Promise<boolean>;
  isLoading: boolean;
  polls: DemoPoll[];
  votes: DemoVote[];
  createPoll: (poll: Omit<DemoPoll, "id">) => Promise<DemoPoll | null>;
  editPoll: (pollId: string, updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>) => Promise<boolean>;
  deletePoll: (pollId: string) => Promise<boolean>;
  castVote: (pollId: string, optionIndex: number, numCoins: number) => Promise<boolean>;
  settlePoll: (pollId: string, winningOption?: number) => Promise<boolean>;
  claimReward: (pollId: string) => Promise<number>;
  allUsers: UserAccount[];
  recentlyVotedPollIds: Set<string>;
  /** Counter that increments after every mutation — used to trigger re-fetches in dependent pages */
  dataVersion: number;
};
