"use client";

import { useApp, formatDollars, UserAccount } from "@/components/Providers";
import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import { shortAddr } from "@/lib/utils";
import { useLanguage } from "@/lib/languageContext";
import { useUserProfiles } from "@/lib/userProfiles";

type Period = "weekly" | "monthly" | "allTime";
type SortKey = "profit" | "pollsWon" | "votes" | "creatorEarnings";

// Map frontend sort keys to API param values
const SORT_MAP: Record<"winnings" | "pollsWon" | "votes" | "creatorEarnings", SortKey> = {
  winnings: "profit",
  pollsWon: "pollsWon",
  votes: "votes",
  creatorEarnings: "creatorEarnings",
};

export default function LeaderboardPage() {
  const { walletAddress } = useApp();
  const { t } = useLanguage();
  const { getDisplayName, getAvatarUrl } = useUserProfiles();
  const [period, setPeriod] = useState<Period>("allTime");
  const [sortBy, setSortBy] = useState<"winnings" | "pollsWon" | "votes" | "creatorEarnings">("winnings");
  const [mounted, setMounted] = useState(false);
  const [leaderboardUsers, setLeaderboardUsers] = useState<UserAccount[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  useEffect(() => setMounted(true), []);

  const PAGE_SIZE = 50;

  /** Fetch leaderboard from API with current filters */
  const fetchLeaderboard = useCallback(async (p: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period,
        sortBy: SORT_MAP[sortBy],
        page: String(p),
      });
      const res = await fetch(`/api/leaderboard?${params}`);
      const data = await res.json();
      if (data.users) {
        const mapped: UserAccount[] = data.users.map((r: any) => ({
          wallet: r.wallet,
          balance: 0,
          signupBonusClaimed: true,
          lastWeeklyRewardTs: 0,
          totalVotesCast: Number(r.total_votes_cast || 0),
          totalPollsVoted: Number(r.total_polls_voted || 0),
          pollsWon: Number(r.polls_won || 0),
          pollsCreated: Number(r.polls_created || 0),
          totalSpentLamports: Number(r.total_spent_cents || 0),
          totalWinningsLamports: Number(r.total_winnings_cents || 0),
          weeklyWinningsLamports: Number(r.weekly_winnings_cents || 0),
          monthlyWinningsLamports: Number(r.monthly_winnings_cents || 0),
          weeklySpentLamports: Number(r.weekly_spent_cents || 0),
          monthlySpentLamports: Number(r.monthly_spent_cents || 0),
          weeklyVotesCast: Number(r.weekly_votes_cast || 0),
          monthlyVotesCast: Number(r.monthly_votes_cast || 0),
          weeklyPollsWon: Number(r.weekly_polls_won || 0),
          monthlyPollsWon: Number(r.monthly_polls_won || 0),
          weeklyPollsVoted: Number(r.weekly_polls_voted || 0),
          monthlyPollsVoted: Number(r.monthly_polls_voted || 0),
          creatorEarningsLamports: Number(r.creator_earnings_cents || 0),
          weeklyResetTs: Number(r.weekly_reset_ts || 0),
          monthlyResetTs: Number(r.monthly_reset_ts || 0),
          createdAt: Number(r.created_at || 0),
          loginStreak: Number(r.login_streak || 0),
        }));
        setLeaderboardUsers(prev => append ? [...prev, ...mapped] : mapped);
        setHasMore(mapped.length >= PAGE_SIZE);
      }
    } catch (err) {
      console.warn("[Leaderboard] API fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [period, sortBy]);

  // Re-fetch when period or sort changes
  useEffect(() => {
    setPage(1);
    setHasMore(true);
    fetchLeaderboard(1, false);
  }, [fetchLeaderboard]);

  const loadMore = () => {
    const next = page + 1;
    setPage(next);
    fetchLeaderboard(next, true);
  };

  // Period-aware stat getters — API already filters by period,
  // so weekly/monthly users returned have fresh counters.
  const getWinnings = (u: UserAccount) => {
    if (period === "weekly") return u.weeklyWinningsLamports;
    if (period === "monthly") return u.monthlyWinningsLamports;
    return u.totalWinningsLamports;
  };

  const getSpent = (u: UserAccount) => {
    if (period === "weekly") return u.weeklySpentLamports;
    if (period === "monthly") return u.monthlySpentLamports;
    return u.totalSpentLamports;
  };

  const getVotes = (u: UserAccount) => {
    if (period === "weekly") return u.weeklyVotesCast;
    if (period === "monthly") return u.monthlyVotesCast;
    return u.totalVotesCast;
  };

  const getPollsWon = (u: UserAccount) => {
    if (period === "weekly") return u.weeklyPollsWon;
    if (period === "monthly") return u.monthlyPollsWon;
    return u.pollsWon;
  };

  const getCreatorEarnings = (u: UserAccount) => u.creatorEarningsLamports;

  const getPollsVoted = (u: UserAccount) => {
    if (period === "weekly") return u.weeklyPollsVoted;
    if (period === "monthly") return u.monthlyPollsVoted;
    return u.totalPollsVoted;
  };

  // Data is already sorted by the API — no client-side sort needed
  const sorted = leaderboardUsers;

  const winRate = (u: UserAccount) => {
    const voted = getPollsVoted(u);
    const won = getPollsWon(u);
    if (voted === 0) return "0.0";
    return ((won / voted) * 100).toFixed(1);
  };

  const netProfit = (u: UserAccount) => getWinnings(u) - getSpent(u);

  if (!mounted) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight flex items-center gap-2.5">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          Leaderboard
        </h1>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {([
          { key: "weekly", label: t("thisWeek") },
          { key: "monthly", label: t("thisMonth") },
          { key: "allTime", label: t("allTime") },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${period === key
              ? "bg-brand-500 text-dark-900"
              : "bg-surface-100 text-gray-400 hover:text-white"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        {([
          { key: "winnings", label: t("profit") },
          { key: "pollsWon", label: t("wins") },
          { key: "votes", label: t("votes") },
          { key: "creatorEarnings", label: t("creatorDollar") },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${sortBy === key
              ? "bg-brand-600 text-white"
              : "bg-surface-100 text-gray-400 hover:text-white"
              }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 border border-border flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
          </div>
          <p className="text-gray-400 text-lg mb-2 font-medium">{t("noUsersYet")}</p>
          <p className="text-gray-600 text-sm mb-5">{t("leaderboardHint")}</p>
          <Link href="/polls" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.97]">
            Start Voting <span className="text-lg">→</span>
          </Link>
        </div>
      ) : (
        <div className="bg-surface-100 border border-border rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">#</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">{t("user")}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">{t("netProfit")}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">{t("winPercent")}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">{t("votes")}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">{t("pollsWon")}</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">{t("creatorDollar")}</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => {
                  const profit = netProfit(u);
                  const isMe = u.wallet === walletAddress;
                  return (
                    <tr
                      key={u.wallet}
                      className={`border-b border-border ${isMe ? "bg-brand-600/10" : "hover:bg-surface-50/30"}`}
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`font-bold ${i === 0 ? "text-brand-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-500"
                          }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <div className="flex items-center gap-3">
                          {getAvatarUrl(u.wallet) ? (
                            getAvatarUrl(u.wallet).startsWith("data:") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={getAvatarUrl(u.wallet)} alt="" className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                            ) : (
                              <Image src={getAvatarUrl(u.wallet)} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" unoptimized />
                            )
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-500/60 to-brand-700/60 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {getDisplayName(u.wallet).charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="font-medium text-sm">
                              {getDisplayName(u.wallet)}
                              {isMe && <span className="ml-2 text-xs text-brand-400">(you)</span>}
                            </div>
                            <div className="font-mono text-[11px] text-gray-500">{shortAddr(u.wallet)}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">
                        <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>
                          {profit >= 0 ? "+" : ""}{formatDollars(profit)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{winRate(u)}%</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{getVotes(u)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{getPollsWon(u)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-brand-400">
                        {formatDollars(getCreatorEarnings(u))}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile card view */}
          <div className="sm:hidden divide-y divide-gray-800/50">
            {sorted.map((u, i) => {
              const profit = netProfit(u);
              const isMe = u.wallet === walletAddress;
              return (
                <div key={u.wallet} className={`p-3 ${isMe ? "bg-brand-600/10" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${i === 0 ? "text-brand-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-500"
                        }`}>
                        #{i + 1}
                      </span>
                      {getAvatarUrl(u.wallet) ? (
                        getAvatarUrl(u.wallet).startsWith("data:") ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={getAvatarUrl(u.wallet)} alt="" className="w-7 h-7 rounded-full object-cover border border-border shrink-0" />
                        ) : (
                          <Image src={getAvatarUrl(u.wallet)} alt="" width={28} height={28} className="w-7 h-7 rounded-full object-cover border border-border shrink-0" unoptimized />
                        )
                      ) : (
                        <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-500/60 to-brand-700/60 flex items-center justify-center text-[10px] font-bold text-white shrink-0">
                          {getDisplayName(u.wallet).charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <span className="text-xs text-gray-300">
                          {getDisplayName(u.wallet)}
                          {isMe && <span className="ml-1 text-brand-400">(you)</span>}
                        </span>
                        <div className="font-mono text-[10px] text-gray-600">{shortAddr(u.wallet)}</div>
                      </div>
                    </div>
                    <span className={`font-mono text-sm font-bold ${profit >= 0 ? "text-green-400" : "text-red-400"}`}>
                      {profit >= 0 ? "+" : ""}{formatDollars(profit)}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-gray-500">
                    <span>Win {winRate(u)}%</span>
                    <span>{getVotes(u)} votes</span>
                    <span>{getPollsWon(u)} won</span>
                    <span className="text-brand-400">{formatDollars(getCreatorEarnings(u))} earned</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Pagination — Load More */}
      {sorted.length > 0 && hasMore && (
        <div className="flex justify-center mt-6">
          <button
            onClick={loadMore}
            disabled={loading}
            className="px-6 py-2.5 bg-surface-100 hover:bg-surface-50 border border-border text-gray-300 rounded-xl text-sm font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
