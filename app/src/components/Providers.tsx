"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { PROGRAM_DEPLOYED } from "@/lib/program";
import { useNotifications } from "@/lib/notifications";
import { useWalletManager } from "@/lib/hooks/useWalletManager";
import { useDataFetcher, type MutationTracker } from "@/lib/hooks/useDataFetcher";
import { usePollOperations } from "@/lib/hooks/usePollOperations";

// ── Re-export types & constants from shared modules ──────────────────────
// This maintains backward compatibility for all existing imports
export {
  SOL_UNIT,
  CENTS,
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
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try {
      const savedUsers = localStorage.getItem("instinctfi_users");
      if (savedUsers) setUsers(JSON.parse(savedUsers));
      const savedPolls = localStorage.getItem("instinctfi_polls");
      if (savedPolls) setPolls(JSON.parse(savedPolls));
      const savedVotes = localStorage.getItem("instinctfi_votes");
      if (savedVotes) setVotes(JSON.parse(savedVotes));
    } catch { /* corrupt cache — start fresh */ }
  }, []);

  // Persist to localStorage in demo mode
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_polls", JSON.stringify(polls)); } catch { }
  }, [polls]);
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_votes", JSON.stringify(votes)); } catch { }
  }, [votes]);
  useEffect(() => {
    if (PROGRAM_DEPLOYED) return;
    try { localStorage.setItem("instinctfi_users", JSON.stringify(users)); } catch { }
  }, [users]);

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
  const { walletConnected, walletAddress, connectWallet, disconnectWallet } =
    useWalletManager(users, setUsers);

  // ── Data fetching ──
  const { initialFetchDone, usersRef, pollsRef, votesRef, updateUsersRef, updatePollsRef, updateVotesRef } =
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
      addNotification,
    });

  // ── Auto-signup when connected ──
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (walletConnected && walletAddress && !users.find((u) => u.wallet === walletAddress)) {
      signup();
    }
  }, [walletConnected, walletAddress, signup, users]);

  return (
    <AppContext.Provider
      value={{
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
