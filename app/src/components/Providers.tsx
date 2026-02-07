"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from "react";

// ─── Constants (all dollar amounts in CENTS, $1 = 100) ─────────────────────
export const CENTS = 100; // $1 = 100 cents
const SIGNUP_BONUS = 500_000; // $5,000
const WEEKLY_REWARD = 100_000; // $1,000
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/** Format cents → $X,XXX.XX */
export function formatDollars(cents: number): string {
  const dollars = cents / 100;
  return dollars.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
  });
}

/** Format cents → compact $X.Xk */
export function formatDollarsShort(cents: number): string {
  const d = cents / 100;
  if (d >= 1000) return `$${(d / 1000).toFixed(1)}k`;
  return `$${d.toFixed(2)}`;
}

// ─── Types ──────────────────────────────────────────────────────────────────

export type DemoPoll = {
  id: string;
  pollId: number;
  creator: string;
  title: string;
  description: string;
  category: string;
  options: string[];
  voteCounts: number[];
  unitPriceCents: number;
  endTime: number;
  totalPoolCents: number;
  creatorInvestmentCents: number;
  platformFeeCents: number;
  creatorRewardCents: number;
  status: number; // 0=active, 1=settled
  winningOption: number;
  totalVoters: number;
  createdAt: number;
};

export type DemoVote = {
  pollId: string;
  voter: string;
  votesPerOption: number[];
  totalStakedCents: number;
  claimed: boolean;
};

export type UserAccount = {
  wallet: string;
  balance: number; // cents
  signupBonusClaimed: boolean;
  lastWeeklyRewardTs: number; // ms
  totalVotesCast: number;
  totalPollsVoted: number;
  pollsWon: number;
  pollsCreated: number;
  totalSpentCents: number;
  totalWinningsCents: number;
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

type AppContextType = {
  // Auth
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;

  // User account
  userAccount: UserAccount | null;
  signup: () => void;
  claimWeeklyReward: () => boolean;

  // Polls
  polls: DemoPoll[];
  votes: DemoVote[];
  createPoll: (poll: Omit<DemoPoll, "id">) => DemoPoll | null;
  castVote: (pollId: string, optionIndex: number, numCoins: number) => boolean;
  settlePoll: (pollId: string) => boolean;
  claimReward: (pollId: string) => number;

  // Leaderboard
  allUsers: UserAccount[];
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <Providers>");
  return ctx;
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  // ── localStorage helpers ──
  const loadJSON = <T,>(key: string, fallback: T): T => {
    if (typeof window === "undefined") return fallback;
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  };

  // ── Wallet state ──
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ── User accounts (keyed by wallet) — hydrated from localStorage ──
  const [users, setUsers] = useState<UserAccount[]>(() => loadJSON("sp_users", []));
  const [polls, setPolls] = useState<DemoPoll[]>(() => loadJSON("sp_polls", []));
  const [votes, setVotes] = useState<DemoVote[]>(() => loadJSON("sp_votes", []));

  // ── Persist state to localStorage on every change ──
  useEffect(() => { localStorage.setItem("sp_users", JSON.stringify(users)); }, [users]);
  useEffect(() => { localStorage.setItem("sp_polls", JSON.stringify(polls)); }, [polls]);
  useEffect(() => { localStorage.setItem("sp_votes", JSON.stringify(votes)); }, [votes]);

  // Current user account
  const userAccount = walletAddress
    ? users.find((u) => u.wallet === walletAddress) ?? null
    : null;

  // ── Auto-reconnect Phantom on load ──
  useEffect(() => {
    const tryReconnect = async () => {
      try {
        const solana = (window as any).solana;
        if (solana?.isPhantom) {
          const resp = await solana.connect({ onlyIfTrusted: true });
          setWalletAddress(resp.publicKey.toString());
          setWalletConnected(true);
        }
      } catch {
        // user hasn't previously connected
      }
    };
    tryReconnect();
  }, []);

  // ── Connect wallet ──
  const connectWallet = useCallback(async () => {
    try {
      const solana = (window as any).solana;
      if (solana?.isPhantom) {
        const resp = await solana.connect();
        setWalletAddress(resp.publicKey.toString());
        setWalletConnected(true);
      } else {
        window.open("https://phantom.app/", "_blank");
      }
    } catch {
      console.error("Wallet connection failed");
    }
  }, []);

  const disconnectWallet = useCallback(async () => {
    try {
      const solana = (window as any).solana;
      if (solana) await solana.disconnect();
    } catch {}
    setWalletConnected(false);
    setWalletAddress(null);
  }, []);

  // ── Signup — creates UserAccount with $5,000 bonus ──
  const signup = useCallback(() => {
    if (!walletAddress) return;
    if (users.find((u) => u.wallet === walletAddress)) return; // already signed up

    const now = Date.now();
    const newUser: UserAccount = {
      wallet: walletAddress,
      balance: SIGNUP_BONUS,
      signupBonusClaimed: true,
      lastWeeklyRewardTs: now,
      totalVotesCast: 0,
      totalPollsVoted: 0,
      pollsWon: 0,
      pollsCreated: 0,
      totalSpentCents: 0,
      totalWinningsCents: 0,
      weeklyWinningsCents: 0,
      monthlyWinningsCents: 0,
      weeklySpentCents: 0,
      monthlySpentCents: 0,
      weeklyVotesCast: 0,
      monthlyVotesCast: 0,
      weeklyPollsWon: 0,
      monthlyPollsWon: 0,
      weeklyPollsVoted: 0,
      monthlyPollsVoted: 0,
      creatorEarningsCents: 0,
      weeklyResetTs: now,
      monthlyResetTs: now,
      createdAt: now,
    };
    setUsers((prev) => [...prev, newUser]);
  }, [walletAddress, users]);

  // ── Auto-signup when connected ──
  useEffect(() => {
    if (walletConnected && walletAddress && !users.find((u) => u.wallet === walletAddress)) {
      signup();
    }
  }, [walletConnected, walletAddress, signup, users]);

  // ── Claim weekly reward ($1,000) ──
  const claimWeeklyReward = useCallback((): boolean => {
    if (!walletAddress) return false;
    const now = Date.now();
    const user = users.find((u) => u.wallet === walletAddress);
    if (!user) return false;
    if (now - user.lastWeeklyRewardTs < WEEK_MS) return false;

    setUsers((prev) =>
      prev.map((u) =>
        u.wallet === walletAddress
          ? { ...u, balance: u.balance + WEEKLY_REWARD, lastWeeklyRewardTs: now }
          : u
      )
    );
    return true;
  }, [walletAddress, users]);

  // ── Helper: update user field ──
  const updateUser = useCallback(
    (wallet: string, updater: (u: UserAccount) => UserAccount) => {
      setUsers((prev) => prev.map((u) => (u.wallet === wallet ? updater(u) : u)));
    },
    []
  );

  // ── Reset weekly/monthly leaderboard periods ──
  useEffect(() => {
    const now = Date.now();
    setUsers((prev) =>
      prev.map((u) => {
        let updated = { ...u };
        if (now - u.weeklyResetTs >= WEEK_MS) {
          updated.weeklyWinningsCents = 0;
          updated.weeklySpentCents = 0;
          updated.weeklyVotesCast = 0;
          updated.weeklyPollsWon = 0;
          updated.weeklyPollsVoted = 0;
          updated.weeklyResetTs = now;
        }
        if (now - u.monthlyResetTs >= 30 * 24 * 60 * 60 * 1000) {
          updated.monthlyWinningsCents = 0;
          updated.monthlySpentCents = 0;
          updated.monthlyVotesCast = 0;
          updated.monthlyPollsWon = 0;
          updated.monthlyPollsVoted = 0;
          updated.monthlyResetTs = now;
        }
        return updated;
      })
    );
  }, []);

  // ── Create poll ──
  const createPoll = useCallback(
    (poll: Omit<DemoPoll, "id">): DemoPoll | null => {
      if (!walletAddress) return null;
      const user = users.find((u) => u.wallet === walletAddress);
      if (!user || user.balance < poll.creatorInvestmentCents) return null;

      const id = `poll_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const platformFee = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
      const creatorReward = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
      const poolSeed = poll.creatorInvestmentCents - platformFee - creatorReward;

      const newPoll: DemoPoll = {
        ...poll,
        id,
        totalPoolCents: poolSeed,
        platformFeeCents: platformFee,
        creatorRewardCents: creatorReward,
        voteCounts: new Array(poll.options.length).fill(0),
        status: 0,
        winningOption: 255,
        totalVoters: 0,
        createdAt: Math.floor(Date.now() / 1000),
      };

      setPolls((prev) => [...prev, newPoll]);
      updateUser(walletAddress, (u) => ({
        ...u,
        balance: u.balance - poll.creatorInvestmentCents,
        pollsCreated: u.pollsCreated + 1,
      }));

      return newPoll;
    },
    [walletAddress, users, updateUser]
  );

  // ── Cast vote ──
  const castVote = useCallback(
    (pollId: string, optionIndex: number, numCoins: number): boolean => {
      if (!walletAddress) return false;
      const user = users.find((u) => u.wallet === walletAddress);
      const poll = polls.find((p) => p.id === pollId);
      if (!user || !poll || poll.status !== 0) return false;
      if (Date.now() / 1000 > poll.endTime) return false;

      const cost = numCoins * poll.unitPriceCents;
      if (cost > user.balance) return false;

      setPolls((prev) =>
        prev.map((p) => {
          if (p.id !== pollId) return p;
          const newVoteCounts = [...p.voteCounts];
          newVoteCounts[optionIndex] += numCoins;
          return {
            ...p,
            voteCounts: newVoteCounts,
            totalPoolCents: p.totalPoolCents + cost,
            totalVoters: p.totalVoters + 1,
          };
        })
      );

      setVotes((prev) => {
        const existing = prev.find(
          (v) => v.pollId === pollId && v.voter === walletAddress
        );
        if (existing) {
          return prev.map((v) => {
            if (v.pollId !== pollId || v.voter !== walletAddress) return v;
            const newVotes = [...v.votesPerOption];
            newVotes[optionIndex] += numCoins;
            return {
              ...v,
              votesPerOption: newVotes,
              totalStakedCents: v.totalStakedCents + cost,
            };
          });
        }
        const votesPerOption = new Array(poll.options.length).fill(0);
        votesPerOption[optionIndex] = numCoins;
        return [
          ...prev,
          {
            pollId,
            voter: walletAddress,
            votesPerOption,
            totalStakedCents: cost,
            claimed: false,
          },
        ];
      });

      updateUser(walletAddress, (u) => ({
        ...u,
        balance: u.balance - cost,
        totalVotesCast: u.totalVotesCast + numCoins,
        totalPollsVoted: u.totalPollsVoted + 1,
        totalSpentCents: u.totalSpentCents + cost,
        weeklyVotesCast: u.weeklyVotesCast + numCoins,
        monthlyVotesCast: u.monthlyVotesCast + numCoins,
        weeklySpentCents: u.weeklySpentCents + cost,
        monthlySpentCents: u.monthlySpentCents + cost,
        weeklyPollsVoted: u.weeklyPollsVoted + 1,
        monthlyPollsVoted: u.monthlyPollsVoted + 1,
      }));

      return true;
    },
    [walletAddress, users, polls, updateUser]
  );

  // ── Settle poll ──
  const settlePoll = useCallback(
    (pollId: string): boolean => {
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 0) return false;

      let maxVotes = 0;
      let winningIdx = 0;
      poll.voteCounts.forEach((count, i) => {
        if (count > maxVotes) {
          maxVotes = count;
          winningIdx = i;
        }
      });

      setPolls((prev) =>
        prev.map((p) =>
          p.id === pollId
            ? { ...p, status: 1, winningOption: maxVotes > 0 ? winningIdx : 255 }
            : p
        )
      );

      // Credit creator reward
      if (poll.creator) {
        updateUser(poll.creator, (u) => ({
          ...u,
          creatorEarningsCents: u.creatorEarningsCents + poll.creatorRewardCents,
          balance: u.balance + poll.creatorRewardCents,
        }));
      }

      return true;
    },
    [polls, updateUser]
  );

  // ── Claim reward ──
  const claimReward = useCallback(
    (pollId: string): number => {
      if (!walletAddress) return 0;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 1 || poll.winningOption === 255) return 0;

      const voteRecord = votes.find(
        (v) => v.pollId === pollId && v.voter === walletAddress
      );
      if (!voteRecord || voteRecord.claimed) return 0;

      const userWinningVotes = voteRecord.votesPerOption[poll.winningOption] || 0;
      if (userWinningVotes === 0) return 0;

      const totalWinningVotes = poll.voteCounts[poll.winningOption];
      const distributable = poll.totalPoolCents;
      const reward = Math.floor((userWinningVotes / totalWinningVotes) * distributable);

      setVotes((prev) =>
        prev.map((v) =>
          v.pollId === pollId && v.voter === walletAddress
            ? { ...v, claimed: true }
            : v
        )
      );

      updateUser(walletAddress, (u) => ({
        ...u,
        balance: u.balance + reward,
        totalWinningsCents: u.totalWinningsCents + reward,
        weeklyWinningsCents: u.weeklyWinningsCents + reward,
        monthlyWinningsCents: u.monthlyWinningsCents + reward,
        pollsWon: u.pollsWon + 1,
        weeklyPollsWon: u.weeklyPollsWon + 1,
        monthlyPollsWon: u.monthlyPollsWon + 1,
      }));

      return reward;
    },
    [walletAddress, polls, votes, updateUser]
  );

  return (
    <AppContext.Provider
      value={{
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        userAccount,
        signup,
        claimWeeklyReward,
        polls,
        votes,
        createPoll,
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
