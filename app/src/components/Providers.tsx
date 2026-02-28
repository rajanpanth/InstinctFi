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
import { useRealtimePolls } from "@/lib/hooks/useRealtimePolls";

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

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <Providers>");
  return ctx;
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

  // ── Wallet management ──
  const { walletConnected, walletAddress, connectWallet, disconnectWallet, signTransaction } =
    useWalletManager(users, setUsers);

  // ── Data fetching ──
  const { initialFetchDone, usersRef, pollsRef, votesRef, updateUsersRef, updatePollsRef, updateVotesRef, recentlyVotedPollIds } =
    useDataFetcher(walletAddress, walletConnected, setPolls, setVotes, setUsers, setIsLoading, tracker);

  // ── Real-time subscriptions ──
  useRealtimePolls({ setPolls, setVotes });

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
    });

  // ── Auto-signup / balance sync when connected ──
  // #21: Mutex to prevent race condition from rapid wallet reconnects
  const signupMutex = useRef(false);
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (walletConnected && walletAddress) {
      if (signupMutex.current) return;
      signupMutex.current = true;
      Promise.resolve(signup()).finally(() => {
        signupMutex.current = false;
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletConnected, walletAddress]);

  // #22: Memoize context value to prevent re-renders of all consumers
  const contextValue = useMemo<AppContextType>(() => ({
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    userAccount,
    signup,
    claimDailyReward,
    isLoading,
    polls,
    votes,
    createPoll,
    editPoll,
    deletePoll,
    castVote,
    settlePoll,
    claimReward,
    allUsers: users,
    recentlyVotedPollIds,
  }), [
    walletConnected, walletAddress, connectWallet, disconnectWallet,
    userAccount, signup, claimDailyReward, isLoading, polls, votes,
    createPoll, editPoll, deletePoll, castVote, settlePoll, claimReward,
    users, recentlyVotedPollIds,
  ]);

  return (
    <AppContext.Provider value={contextValue}>
      {children}
    </AppContext.Provider>
  );
}
