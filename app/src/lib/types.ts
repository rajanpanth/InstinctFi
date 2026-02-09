/**
 * Shared types for InstinctFi frontend.
 * Extracted from Providers.tsx for reuse across the app.
 */
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { formatSOL, formatSOLShort } from "@/lib/program";

// ─── Constants ─────────────────────────────────────────────────────────────
/** SOL_UNIT converts user-facing SOL values to lamports (1 SOL = 1e9 lamports) */
export const SOL_UNIT = LAMPORTS_PER_SOL;

/** @deprecated Use SOL_UNIT instead. Kept for backward compat. */
export const CENTS = SOL_UNIT;

/** Maximum coins a single user can stake on one poll */
export const MAX_COINS_PER_POLL = 100;

/** Format lamports → "X.XXXX SOL" */
export const formatDollars = formatSOL;
export const formatDollarsShort = formatSOLShort;

// ─── Types ──────────────────────────────────────────────────────────────────
/**
 * NAMING CONVENTION — "*Cents" fields
 * ------------------------------------
 * For backward compatibility the type fields still use the "*Cents" suffix,
 * but every value is stored in **lamports** (1 SOL = 1 000 000 000 lamports).
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
  voteCounts: number[];
  unitPriceCents: number;        // LAMPORTS per option-coin
  endTime: number;               // Unix timestamp
  totalPoolCents: number;        // LAMPORTS in distributable pool
  creatorInvestmentCents: number; // LAMPORTS invested by creator
  platformFeeCents: number;      // LAMPORTS platform fee
  creatorRewardCents: number;    // LAMPORTS creator reward
  status: number;                // 0 = Active, 1 = Settled
  winningOption: number;         // 255 = unset
  totalVoters: number;
  createdAt: number;
};

export type DemoVote = {
  pollId: string;                // Poll PDA address (base58)
  voter: string;                 // Voter wallet address
  votesPerOption: number[];
  totalStakedCents: number;      // LAMPORTS total staked
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
  totalSpentCents: number;       // LAMPORTS
  totalWinningsCents: number;    // LAMPORTS
  weeklyWinningsCents: number;
  monthlyWinningsCents: number;
  weeklySpentCents: number;
  monthlySpentCents: number;
  weeklyVotesCast: number;
  monthlyVotesCast: number;
  weeklyPollsWon: number;
  monthlyPollsWon: number;
  weeklyPollsVoted: number;
  monthlyPollsVoted: number;
  creatorEarningsCents: number;
  weeklyResetTs: number;
  monthlyResetTs: number;
  createdAt: number;
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
};
