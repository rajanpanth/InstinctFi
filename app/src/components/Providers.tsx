"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
  useCallback,
  ReactNode,
} from "react";
import { PROGRAM_DEPLOYED } from "@/lib/program";
import { useNotifications } from "@/lib/notifications";
import { useWalletManager } from "@/lib/hooks/useWalletManager";
import { useDataFetcher, type MutationTracker } from "@/lib/hooks/useDataFetcher";
import { usePollOperations } from "@/lib/hooks/usePollOperations";
import { SEED_POLLS } from "@/lib/seedPolls";

// ── Re-export types & constants from shared modules ──────────────────────
// This maintains backward compatibility for all existing imports
export {
  SOL_UNIT,
  MAX_COINS_PER_POLL,
  PollStatus,
  WINNING_OPTION_UNSET,
  formatDollars,
  formatDollarsShort,
  type DemoPoll,
  type DemoVote,
  type UserAccount,
  type AppContextType,
} from "@/lib/types";

import type { DemoPoll, DemoVote, UserAccount, AppContextType } from "@/lib/types";

// ── P-01 FIX: Split monolithic context into 3 focused contexts ──────────
// This prevents app-wide re-renders when only one domain changes.
// Components that only need wallet info won't re-render when polls change, etc.
// The legacy `useApp()` hook still works for backward compatibility.

type WalletContextType = {
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
};

type DataContextType = {
  isLoading: boolean;
  polls: DemoPoll[];
  votes: DemoVote[];
  userAccount: UserAccount | null;
  allUsers: UserAccount[];
  recentlyVotedPollIds: Set<string>;
  /** Counter that increments after every mutation — pages watch this to re-fetch */
  dataVersion: number;
};

type OpsContextType = {
  signup: () => void;
  claimDailyReward: () => Promise<boolean>;
  createPoll: (poll: Omit<DemoPoll, "id">) => Promise<DemoPoll | null>;
  editPoll: (pollId: string, updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>) => Promise<boolean>;
  deletePoll: (pollId: string) => Promise<boolean>;
  castVote: (pollId: string, optionIndex: number, numCoins: number) => Promise<boolean>;
  settlePoll: (pollId: string, winningOption?: number) => Promise<boolean>;
  claimReward: (pollId: string) => Promise<number>;
};

const WalletCtx = createContext<WalletContextType | null>(null);
const DataCtx = createContext<DataContextType | null>(null);
const OpsCtx = createContext<OpsContextType | null>(null);

/**
 * Fine-grained hooks — use these for optimized components.
 * Components using `useWalletCtx()` won't re-render when polls change.
 * Components using `usePollData()` won't re-render when wallet connects.
 */
export function useWalletCtx() {
  const ctx = useContext(WalletCtx);
  if (!ctx) throw new Error("useWalletCtx must be inside <Providers>");
  return ctx;
}

export function usePollData() {
  const ctx = useContext(DataCtx);
  if (!ctx) throw new Error("usePollData must be inside <Providers>");
  return ctx;
}

export function usePollOps() {
  const ctx = useContext(OpsCtx);
  if (!ctx) throw new Error("usePollOps must be inside <Providers>");
  return ctx;
}

/**
 * Legacy combined hook — backward compatible. Subscribes to ALL three contexts,
 * so it re-renders on any change. New components should prefer the fine-grained hooks above.
 */
export function useApp(): AppContextType {
  const wallet = useWalletCtx();
  const data = usePollData();
  const ops = usePollOps();
  return { ...wallet, ...data, ...ops };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  // ── Notifications ──
  const { addNotification } = useNotifications();

  // ── App data state ──
  // IMPORTANT: initial state must be empty ([]) to match SSR output.
  // localStorage is read in a useEffect below so client first-render = server render = [].
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [polls, setPolls] = useState<DemoPoll[]>([]);
  const [votes, setVotes] = useState<DemoVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Hydrate from localStorage on mount (client only, after first render)
  // #23: Validate parsed data shape to prevent crashes from corrupt localStorage
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try {
      const savedUsers = localStorage.getItem("instinctfi_users");
      if (savedUsers) {
        const parsed = JSON.parse(savedUsers);
        if (Array.isArray(parsed)) setUsers(parsed);
      }
      const savedPolls = localStorage.getItem("instinctfi_polls");
      if (savedPolls) {
        const parsed = JSON.parse(savedPolls);
        if (Array.isArray(parsed)) setPolls(parsed);
      }
      const savedVotes = localStorage.getItem("instinctfi_votes");
      if (savedVotes) {
        const parsed = JSON.parse(savedVotes);
        if (Array.isArray(parsed)) setVotes(parsed);
      }
    } catch {
      // Corrupt cache — clear it and start fresh
      try {
        localStorage.removeItem("instinctfi_users");
        localStorage.removeItem("instinctfi_polls");
        localStorage.removeItem("instinctfi_votes");
      } catch { /* localStorage unavailable */ }
    }
  }, []);

  // Persist to localStorage in demo mode (debounced to avoid jank)
  const persistTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    if (persistTimerRef.current) clearTimeout(persistTimerRef.current);
    persistTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem("instinctfi_polls", JSON.stringify(polls));
        localStorage.setItem("instinctfi_votes", JSON.stringify(votes));
        localStorage.setItem("instinctfi_users", JSON.stringify(users));
      } catch { }
    }, 500);
    return () => { if (persistTimerRef.current) clearTimeout(persistTimerRef.current); };
  }, [polls, votes, users]);

  // ── Mutation tracking (shared between fetcher and operations) ──
  // We use independent refs, then memoize the container object so 'tracker' is stable.
  const mutationGeneration = useRef(0);
  const lastMutationTs = useRef(0);
  const deletedPollIds = useRef(new Set<string>());

  const tracker = React.useMemo<MutationTracker>(() => ({
    mutationGeneration,
    lastMutationTs,
    deletedPollIds,
  }), []);

  // ── Mutation version counter (used by polls page to trigger re-fetch) ──
  const [dataVersion, setDataVersion] = useState(0);
  const bumpDataVersion = useCallback(() => setDataVersion(v => v + 1), []);

  // ── Wallet management ──
  const { walletConnected, walletAddress, connectWallet, disconnectWallet, signTransaction } =
    useWalletManager(users, setUsers);

  // ── Data fetching ──
  const { initialFetchDone, usersRef, pollsRef, votesRef, updateUsersRef, updatePollsRef, updateVotesRef, recentlyVotedPollIds } =
    useDataFetcher(walletAddress, walletConnected, setPolls, setVotes, setUsers, setIsLoading, tracker);

  // Keep refs in sync with latest state
  useEffect(() => { updateUsersRef(users); }, [users, updateUsersRef]);
  useEffect(() => { updatePollsRef(polls); }, [polls, updatePollsRef]);
  useEffect(() => { updateVotesRef(votes); }, [votes, updateVotesRef]);

  // ── Derived state ──
  const userAccount = walletAddress
    ? users.find((u) => u.wallet === walletAddress) ?? null
    : null;

  // ── Poll operations ──
  const { signup, claimDailyReward, createPoll, editPoll, deletePoll, castVote, settlePoll, claimReward } =
    usePollOperations({
      walletAddress, polls, votes, users, userAccount,
      setPolls, setVotes, setUsers,
      tracker, usersRef, pollsRef, votesRef, initialFetchDone,
      addNotification, signTransaction,
      bumpDataVersion,
    });

  // ── Auto-signup / balance sync when connected ──
  // #21: Mutex to prevent race condition from rapid wallet reconnects
  const signupMutex = useRef(false);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (walletConnected && walletAddress) {
      if (signupMutex.current) return;
      signupMutex.current = true;
      // BUG-22 FIX: Add .catch() to prevent unhandled promise rejection
      // if signup throws (e.g., network error, corrupted state).
      Promise.resolve(signup())
        .catch((e) => console.error("Auto-signup failed:", e))
        .finally(() => {
          signupMutex.current = false;
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, walletAddress]);

  // ── Expose polls: merge seed data when the database is empty so the
  //    site always looks populated for new visitors. Seed polls are
  //    automatically hidden once real data exists.
  const displayPolls = useMemo(() => {
    // During loading, return whatever we have (might be []) to avoid flicker
    if (isLoading) return polls;
    // If real polls exist, use them exclusively
    if (polls.length > 0) return polls;
    // Otherwise show seed/demo polls
    return SEED_POLLS;
  }, [polls, isLoading]);

  // P-01 FIX: Three focused context values instead of one 17-dep monolith.
  // Each only re-triggers consumers that care about its specific domain.

  const walletValue = useMemo<WalletContextType>(() => ({
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
  }), [walletConnected, walletAddress, connectWallet, disconnectWallet]);

  const dataValue = useMemo<DataContextType>(() => ({
    isLoading,
    polls: displayPolls,
    votes,
    userAccount,
    allUsers: users,
    recentlyVotedPollIds,
    dataVersion,
  }), [isLoading, displayPolls, votes, userAccount, users, recentlyVotedPollIds, dataVersion]);

  const opsValue = useMemo<OpsContextType>(() => ({
    signup,
    claimDailyReward,
    createPoll,
    editPoll,
    deletePoll,
    castVote,
    settlePoll,
    claimReward,
  }), [signup, claimDailyReward, createPoll, editPoll, deletePoll, castVote, settlePoll, claimReward]);

  return (
    <WalletCtx.Provider value={walletValue}>
      <DataCtx.Provider value={dataValue}>
        <OpsCtx.Provider value={opsValue}>
          {children}
        </OpsCtx.Provider>
      </DataCtx.Provider>
    </WalletCtx.Provider>
  );
}
