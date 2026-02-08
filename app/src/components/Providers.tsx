"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import toast from "react-hot-toast";

// ─── Constants (all dollar amounts in CENTS, $1 = 100) ─────────────────────
export const CENTS = 100;
const SIGNUP_BONUS = 500_000; // $5,000
const DAILY_REWARD = 10_000; // $100
const DAY_MS = 24 * 60 * 60 * 1000;
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
  imageUrl: string;
  optionImages: string[];
  options: string[];
  voteCounts: number[];
  unitPriceCents: number;
  endTime: number;
  totalPoolCents: number;
  creatorInvestmentCents: number;
  platformFeeCents: number;
  creatorRewardCents: number;
  status: number;
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
  balance: number;
  signupBonusClaimed: boolean;
  lastWeeklyRewardTs: number;
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
  walletConnected: boolean;
  walletAddress: string | null;
  connectWallet: () => Promise<void>;
  disconnectWallet: () => void;
  userAccount: UserAccount | null;
  signup: () => void;
  claimDailyReward: () => boolean;
  isLoading: boolean;
  polls: DemoPoll[];
  votes: DemoVote[];
  createPoll: (poll: Omit<DemoPoll, "id">) => DemoPoll | null;
  editPoll: (pollId: string, updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>) => boolean;
  deletePoll: (pollId: string) => boolean;
  castVote: (pollId: string, optionIndex: number, numCoins: number) => boolean;
  settlePoll: (pollId: string) => boolean;
  claimReward: (pollId: string) => number;
  allUsers: UserAccount[];
};

const AppContext = createContext<AppContextType | null>(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be inside <Providers>");
  return ctx;
}

// ─── DB ↔ App mapping helpers ───────────────────────────────────────────────

function dbToUser(r: any): UserAccount {
  return {
    wallet: r.wallet,
    balance: Number(r.balance),
    signupBonusClaimed: r.signup_bonus_claimed,
    lastWeeklyRewardTs: Number(r.last_weekly_reward_ts),
    totalVotesCast: Number(r.total_votes_cast),
    totalPollsVoted: Number(r.total_polls_voted),
    pollsWon: Number(r.polls_won),
    pollsCreated: Number(r.polls_created),
    totalSpentCents: Number(r.total_spent_cents),
    totalWinningsCents: Number(r.total_winnings_cents),
    weeklyWinningsCents: Number(r.weekly_winnings_cents),
    monthlyWinningsCents: Number(r.monthly_winnings_cents),
    weeklySpentCents: Number(r.weekly_spent_cents),
    monthlySpentCents: Number(r.monthly_spent_cents),
    weeklyVotesCast: Number(r.weekly_votes_cast),
    monthlyVotesCast: Number(r.monthly_votes_cast),
    weeklyPollsWon: Number(r.weekly_polls_won),
    monthlyPollsWon: Number(r.monthly_polls_won),
    weeklyPollsVoted: Number(r.weekly_polls_voted),
    monthlyPollsVoted: Number(r.monthly_polls_voted),
    creatorEarningsCents: Number(r.creator_earnings_cents),
    weeklyResetTs: Number(r.weekly_reset_ts),
    monthlyResetTs: Number(r.monthly_reset_ts),
    createdAt: Number(r.created_at),
  };
}

function userToDb(u: UserAccount) {
  return {
    wallet: u.wallet,
    balance: u.balance,
    signup_bonus_claimed: u.signupBonusClaimed,
    last_weekly_reward_ts: u.lastWeeklyRewardTs,
    total_votes_cast: u.totalVotesCast,
    total_polls_voted: u.totalPollsVoted,
    polls_won: u.pollsWon,
    polls_created: u.pollsCreated,
    total_spent_cents: u.totalSpentCents,
    total_winnings_cents: u.totalWinningsCents,
    weekly_winnings_cents: u.weeklyWinningsCents,
    monthly_winnings_cents: u.monthlyWinningsCents,
    weekly_spent_cents: u.weeklySpentCents,
    monthly_spent_cents: u.monthlySpentCents,
    weekly_votes_cast: u.weeklyVotesCast,
    monthly_votes_cast: u.monthlyVotesCast,
    weekly_polls_won: u.weeklyPollsWon,
    monthly_polls_won: u.monthlyPollsWon,
    weekly_polls_voted: u.weeklyPollsVoted,
    monthly_polls_voted: u.monthlyPollsVoted,
    creator_earnings_cents: u.creatorEarningsCents,
    weekly_reset_ts: u.weeklyResetTs,
    monthly_reset_ts: u.monthlyResetTs,
    created_at: u.createdAt,
  };
}

function dbToPoll(r: any): DemoPoll {
  return {
    id: r.id,
    pollId: Number(r.poll_id),
    creator: r.creator,
    title: r.title,
    description: r.description,
    category: r.category,
    imageUrl: r.image_url || "",
    optionImages: r.option_images || [],
    options: r.options,
    voteCounts: (r.vote_counts || []).map(Number),
    unitPriceCents: Number(r.unit_price_cents),
    endTime: Number(r.end_time),
    totalPoolCents: Number(r.total_pool_cents),
    creatorInvestmentCents: Number(r.creator_investment_cents),
    platformFeeCents: Number(r.platform_fee_cents),
    creatorRewardCents: Number(r.creator_reward_cents),
    status: Number(r.status),
    winningOption: Number(r.winning_option),
    totalVoters: Number(r.total_voters),
    createdAt: Number(r.created_at),
  };
}

function pollToDb(p: DemoPoll) {
  return {
    id: p.id,
    poll_id: p.pollId,
    creator: p.creator,
    title: p.title,
    description: p.description,
    category: p.category,
    image_url: p.imageUrl || "",
    option_images: p.optionImages || [],
    options: p.options,
    vote_counts: p.voteCounts,
    unit_price_cents: p.unitPriceCents,
    end_time: p.endTime,
    total_pool_cents: p.totalPoolCents,
    creator_investment_cents: p.creatorInvestmentCents,
    platform_fee_cents: p.platformFeeCents,
    creator_reward_cents: p.creatorRewardCents,
    status: p.status,
    winning_option: p.winningOption,
    total_voters: p.totalVoters,
    created_at: p.createdAt,
  };
}

function dbToVote(r: any): DemoVote {
  return {
    pollId: r.poll_id,
    voter: r.voter,
    votesPerOption: (r.votes_per_option || []).map(Number),
    totalStakedCents: Number(r.total_staked_cents),
    claimed: r.claimed,
  };
}

function voteToDb(v: DemoVote) {
  return {
    poll_id: v.pollId,
    voter: v.voter,
    votes_per_option: v.votesPerOption,
    total_staked_cents: v.totalStakedCents,
    claimed: v.claimed,
  };
}

// ─── Provider ───────────────────────────────────────────────────────────────

export function Providers({ children }: { children: ReactNode }) {
  // ── Wallet state ──
  const [walletConnected, setWalletConnected] = useState(false);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);

  // ── App data ──
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [polls, setPolls] = useState<DemoPoll[]>([]);
  const [votes, setVotes] = useState<DemoVote[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const fetchingRef = useRef(false);
  const initialFetchDone = useRef(false);

  const userAccount = walletAddress
    ? users.find((u) => u.wallet === walletAddress) ?? null
    : null;

  // ── Fetch all data from Supabase ──
  const fetchAll = useCallback(async () => {
    if (!isSupabaseConfigured || fetchingRef.current) return;
    fetchingRef.current = true;
    try {
      const [uRes, pRes, vRes] = await Promise.all([
        supabase.from("users").select("*"),
        supabase.from("polls").select("*").order("created_at", { ascending: false }),
        supabase.from("votes").select("*"),
      ]);
      if (uRes.data) setUsers(uRes.data.map(dbToUser));
      if (pRes.data) setPolls(pRes.data.map(dbToPoll));
      if (vRes.data) setVotes(vRes.data.map(dbToVote));
    } catch (e) {
      console.error("Fetch failed:", e);
    }
    setIsLoading(false);
    initialFetchDone.current = true;
    fetchingRef.current = false;
  }, []);

  // ── On mount: fetch data + subscribe to real-time ──
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    fetchAll();

    const channel = supabase
      .channel("db-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "users" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => fetchAll())
      .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => fetchAll())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [fetchAll]);

  // ── DB write helpers (fire-and-forget, errors are logged) ──
  const dbUpsertUser = (user: UserAccount) => {
    if (!isSupabaseConfigured) return;
    supabase.from("users").upsert(userToDb(user), { onConflict: "wallet" }).then(({ error }) => {
      if (error) { console.error("DB user upsert error:", error); toast.error("Failed to sync user data"); }
    });
  };

  const dbUpsertPoll = (poll: DemoPoll) => {
    if (!isSupabaseConfigured) return;
    supabase.from("polls").upsert(pollToDb(poll), { onConflict: "id" }).then(({ error }) => {
      if (error) { console.error("DB poll upsert error:", error); toast.error("Failed to save poll"); }
    });
  };

  const dbUpsertVote = (vote: DemoVote) => {
    if (!isSupabaseConfigured) return;
    supabase.from("votes").upsert(voteToDb(vote), { onConflict: "poll_id,voter" }).then(({ error }) => {
      if (error) { console.error("DB vote upsert error:", error); toast.error("Failed to save vote"); }
    });
  };

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
      } catch {}
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

  // ── Helper: update user in local state + DB ──
  const updateUser = useCallback(
    (wallet: string, updater: (u: UserAccount) => UserAccount) => {
      setUsers((prev) => {
        const updated = prev.map((u) => {
          if (u.wallet !== wallet) return u;
          const newU = updater(u);
          dbUpsertUser(newU); // fire-and-forget DB write
          return newU;
        });
        return updated;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  // ── Signup — creates UserAccount with $5,000 bonus ──
  const signup = useCallback(() => {
    if (!walletAddress) return;
    // IMPORTANT: Don't create a new user until we've checked the DB
    if (!initialFetchDone.current) return;
    if (users.find((u) => u.wallet === walletAddress)) return;

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
    dbUpsertUser(newUser);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [walletAddress, users]);

  // ── Auto-signup when connected (only after initial DB fetch completes) ──
  useEffect(() => {
    if (!initialFetchDone.current) return;
    if (walletConnected && walletAddress && !users.find((u) => u.wallet === walletAddress)) {
      signup();
    }
  }, [walletConnected, walletAddress, signup, users, isLoading]);

  // ── Claim daily reward ($100 every 24h) — persists to DB ──
  const claimDailyReward = useCallback((): boolean => {
    if (!walletAddress) return false;
    const now = Date.now();
    const user = users.find((u) => u.wallet === walletAddress);
    if (!user) return false;
    if (now - user.lastWeeklyRewardTs < DAY_MS) return false;

    const updatedUser = {
      ...user,
      balance: user.balance + DAILY_REWARD,
      lastWeeklyRewardTs: now,
    };

    // Update local state immediately
    setUsers((prev) => prev.map((u) => u.wallet === walletAddress ? updatedUser : u));

    // Persist to DB (awaited, with error handling)
    if (isSupabaseConfigured) {
      supabase.from("users").upsert(userToDb(updatedUser), { onConflict: "wallet" }).then(({ error }) => {
        if (error) {
          console.error("Failed to persist daily claim:", error);
          toast.error("Claim failed to save — try again");
          // Rollback local state
          setUsers((prev) => prev.map((u) => u.wallet === walletAddress ? user : u));
        }
      });
    }

    return true;
  }, [walletAddress, users]);

  // ── Reset weekly/monthly leaderboard periods (only after DB loaded) ──
  useEffect(() => {
    if (!initialFetchDone.current) return;
    const now = Date.now();
    setUsers((prev) =>
      prev.map((u) => {
        let updated = { ...u };
        let changed = false;
        if (now - u.weeklyResetTs >= WEEK_MS) {
          updated.weeklyWinningsCents = 0;
          updated.weeklySpentCents = 0;
          updated.weeklyVotesCast = 0;
          updated.weeklyPollsWon = 0;
          updated.weeklyPollsVoted = 0;
          updated.weeklyResetTs = now;
          changed = true;
        }
        if (now - u.monthlyResetTs >= 30 * 24 * 60 * 60 * 1000) {
          updated.monthlyWinningsCents = 0;
          updated.monthlySpentCents = 0;
          updated.monthlyVotesCast = 0;
          updated.monthlyPollsWon = 0;
          updated.monthlyPollsVoted = 0;
          updated.monthlyResetTs = now;
          changed = true;
        }
        if (changed) dbUpsertUser(updated);
        return updated;
      })
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoading]);

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
      dbUpsertPoll(newPoll);

      updateUser(walletAddress, (u) => ({
        ...u,
        balance: u.balance - poll.creatorInvestmentCents,
        pollsCreated: u.pollsCreated + 1,
      }));

      return newPoll;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress, users, updateUser]
  );

  // ── Edit poll (creator-only, zero votes, active, not ended) ──
  const editPoll = useCallback(
    (
      pollId: string,
      updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>
    ): boolean => {
      if (!walletAddress) return false;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return false;

      // Permission checks
      if (poll.creator !== walletAddress) return false;
      if (poll.status !== 0) return false;
      const now = Math.floor(Date.now() / 1000);
      if (now >= poll.endTime) return false;
      const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
      if (totalVotes > 0) return false;

      // Option count must match if options are being updated
      if (updates.options && updates.options.length !== poll.options.length) return false;

      // End time must be in the future
      if (updates.endTime && updates.endTime <= now) return false;

      const updatedPoll: DemoPoll = {
        ...poll,
        title: updates.title ?? poll.title,
        description: updates.description ?? poll.description,
        category: updates.category ?? poll.category,
        imageUrl: updates.imageUrl ?? poll.imageUrl,
        optionImages: updates.optionImages ?? poll.optionImages,
        options: updates.options ?? poll.options,
        endTime: updates.endTime ?? poll.endTime,
      };

      setPolls((prev) => prev.map((p) => (p.id === pollId ? updatedPoll : p)));
      dbUpsertPoll(updatedPoll);
      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress, polls]
  );

  // ── Delete poll (creator-only, zero votes, active, not ended — refund investment) ──
  const deletePoll = useCallback(
    (pollId: string): boolean => {
      if (!walletAddress) return false;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll) return false;

      // Permission checks
      if (poll.creator !== walletAddress) return false;
      if (poll.status !== 0) return false;
      const now = Math.floor(Date.now() / 1000);
      if (now >= poll.endTime) return false;
      const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
      if (totalVotes > 0) return false;

      // Refund creator investment
      updateUser(walletAddress, (u) => ({
        ...u,
        balance: u.balance + poll.creatorInvestmentCents,
        pollsCreated: Math.max(0, u.pollsCreated - 1),
      }));

      // Remove poll from state
      setPolls((prev) => prev.filter((p) => p.id !== pollId));

      // Delete from Supabase
      if (isSupabaseConfigured) {
        supabase.from("polls").delete().eq("id", pollId).then(({ error }) => {
          if (error) console.error("DB poll delete error:", error);
        });
      }

      return true;
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress, polls, updateUser]
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

      // Check for existing vote record (for correct totalVoters count)
      const existing = votes.find((v) => v.pollId === pollId && v.voter === walletAddress);

      // Update poll
      const updatedPoll = {
        ...poll,
        voteCounts: poll.voteCounts.map((c, i) => (i === optionIndex ? c + numCoins : c)),
        totalPoolCents: poll.totalPoolCents + cost,
        totalVoters: poll.totalVoters + (existing ? 0 : 1),
      };
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updatedPoll : p)));
      dbUpsertPoll(updatedPoll);

      // Update or create vote
      if (existing) {
        const updatedVote: DemoVote = {
          ...existing,
          votesPerOption: existing.votesPerOption.map((c, i) => (i === optionIndex ? c + numCoins : c)),
          totalStakedCents: existing.totalStakedCents + cost,
        };
        setVotes((prev) =>
          prev.map((v) => (v.pollId === pollId && v.voter === walletAddress ? updatedVote : v))
        );
        dbUpsertVote(updatedVote);
      } else {
        const votesPerOption = new Array(poll.options.length).fill(0);
        votesPerOption[optionIndex] = numCoins;
        const newVote: DemoVote = {
          pollId,
          voter: walletAddress,
          votesPerOption,
          totalStakedCents: cost,
          claimed: false,
        };
        setVotes((prev) => [...prev, newVote]);
        dbUpsertVote(newVote);
      }

      // Update user
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [walletAddress, users, polls, votes, updateUser]
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

      const updatedPoll = {
        ...poll,
        status: 1,
        winningOption: maxVotes > 0 ? winningIdx : 255,
      };
      setPolls((prev) => prev.map((p) => (p.id === pollId ? updatedPoll : p)));
      dbUpsertPoll(updatedPoll);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [polls, updateUser]
  );

  // ── Claim reward ──
  const claimReward = useCallback(
    (pollId: string): number => {
      if (!walletAddress) return 0;
      const poll = polls.find((p) => p.id === pollId);
      if (!poll || poll.status !== 1 || poll.winningOption === 255) return 0;

      const voteRecord = votes.find((v) => v.pollId === pollId && v.voter === walletAddress);
      if (!voteRecord || voteRecord.claimed) return 0;

      const userWinningVotes = voteRecord.votesPerOption[poll.winningOption] || 0;
      if (userWinningVotes === 0) return 0;

      const totalWinningVotes = poll.voteCounts[poll.winningOption];
      const distributable = poll.totalPoolCents;
      const reward = Math.floor((userWinningVotes / totalWinningVotes) * distributable);

      const updatedVote = { ...voteRecord, claimed: true };
      setVotes((prev) =>
        prev.map((v) => (v.pollId === pollId && v.voter === walletAddress ? updatedVote : v))
      );
      dbUpsertVote(updatedVote);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
