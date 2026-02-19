"use client";

import { useApp, formatDollars, UserAccount } from "@/components/Providers";
import { useState, useEffect } from "react";
import { shortAddr } from "@/lib/utils";
import { useLanguage } from "@/lib/languageContext";

type Period = "weekly" | "monthly" | "allTime";

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Check if the period counter is still valid (not expired) */
function isPeriodFresh(resetTs: number, periodMs: number): boolean {
  return Date.now() - resetTs <= periodMs;
}

export default function LeaderboardPage() {
  const { allUsers, walletAddress } = useApp();
  const { t } = useLanguage();
  const [period, setPeriod] = useState<Period>("allTime");
  const [sortBy, setSortBy] = useState<"winnings" | "pollsWon" | "votes" | "creatorEarnings">("winnings");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const getWinnings = (u: UserAccount) => {
    if (period === "weekly") return isPeriodFresh(u.weeklyResetTs, WEEK_MS) ? u.weeklyWinningsCents : 0;
    if (period === "monthly") return isPeriodFresh(u.monthlyResetTs, MONTH_MS) ? u.monthlyWinningsCents : 0;
    return u.totalWinningsCents;
  };

  const getSpent = (u: UserAccount) => {
    if (period === "weekly") return isPeriodFresh(u.weeklyResetTs, WEEK_MS) ? u.weeklySpentCents : 0;
    if (period === "monthly") return isPeriodFresh(u.monthlyResetTs, MONTH_MS) ? u.monthlySpentCents : 0;
    return u.totalSpentCents;
  };

  const getVotes = (u: UserAccount) => {
    if (period === "weekly") return isPeriodFresh(u.weeklyResetTs, WEEK_MS) ? u.weeklyVotesCast : 0;
    if (period === "monthly") return isPeriodFresh(u.monthlyResetTs, MONTH_MS) ? u.monthlyVotesCast : 0;
    return u.totalVotesCast;
  };

  const getPollsWon = (u: UserAccount) => {
    if (period === "weekly") return isPeriodFresh(u.weeklyResetTs, WEEK_MS) ? u.weeklyPollsWon : 0;
    if (period === "monthly") return isPeriodFresh(u.monthlyResetTs, MONTH_MS) ? u.monthlyPollsWon : 0;
    return u.pollsWon;
  };

  const getCreatorEarnings = (u: UserAccount) => {
    // Creator earnings use all-time since no period breakdown exists yet
    // TODO: Add weekly/monthly creator earnings to UserAccount when available
    return u.creatorEarningsCents;
  };

  const sortFn = (a: UserAccount, b: UserAccount) => {
    switch (sortBy) {
      case "winnings":
        return getWinnings(b) - getWinnings(a);
      case "pollsWon":
        return getPollsWon(b) - getPollsWon(a);
      case "votes":
        return getVotes(b) - getVotes(a);
      case "creatorEarnings":
        return getCreatorEarnings(b) - getCreatorEarnings(a);
      default:
        return 0;
    }
  };

  const sorted = [...allUsers].sort(sortFn);

  const winRate = (u: UserAccount) => {
    const voted = period === "weekly"
      ? (isPeriodFresh(u.weeklyResetTs, WEEK_MS) ? u.weeklyPollsVoted : 0)
      : period === "monthly"
        ? (isPeriodFresh(u.monthlyResetTs, MONTH_MS) ? u.monthlyPollsVoted : 0)
        : u.totalPollsVoted;
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
          <a href="/polls" className="inline-flex items-center gap-1.5 px-5 py-2.5 bg-brand-500 hover:bg-brand-600 text-white rounded-xl font-semibold text-sm transition-all active:scale-[0.97]">
            Start Voting <span className="text-lg">→</span>
          </a>
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
                      <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-sm">
                        {shortAddr(u.wallet)}
                        {isMe && <span className="ml-2 text-xs text-brand-400">(you)</span>}
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
                      <span className="font-mono text-xs text-gray-300">
                        {shortAddr(u.wallet)}
                        {isMe && <span className="ml-1 text-brand-400">(you)</span>}
                      </span>
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
    </div>
  );
}
