"use client";

import { useApp, formatDollars, UserAccount } from "@/components/Providers";
import { useState } from "react";

type Period = "weekly" | "monthly" | "allTime";

export default function LeaderboardPage() {
  const { allUsers, walletAddress } = useApp();
  const [period, setPeriod] = useState<Period>("allTime");
  const [sortBy, setSortBy] = useState<"winnings" | "pollsWon" | "votes" | "creatorEarnings">("winnings");

  const getWinnings = (u: UserAccount) => {
    if (period === "weekly") return u.weeklyWinningsCents;
    if (period === "monthly") return u.monthlyWinningsCents;
    return u.totalWinningsCents;
  };

  const getSpent = (u: UserAccount) => {
    if (period === "weekly") return u.weeklySpentCents;
    if (period === "monthly") return u.monthlySpentCents;
    return u.totalSpentCents;
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

  const sortFn = (a: UserAccount, b: UserAccount) => {
    switch (sortBy) {
      case "winnings":
        return getWinnings(b) - getWinnings(a);
      case "pollsWon":
        return getPollsWon(b) - getPollsWon(a);
      case "votes":
        return getVotes(b) - getVotes(a);
      case "creatorEarnings":
        return b.creatorEarningsCents - a.creatorEarningsCents;
      default:
        return 0;
    }
  };

  const sorted = [...allUsers].sort(sortFn);

  const shortAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;

  const winRate = (u: UserAccount) => {
    const voted = period === "weekly" ? u.weeklyPollsVoted : period === "monthly" ? u.monthlyPollsVoted : u.totalPollsVoted;
    const won = getPollsWon(u);
    if (voted === 0) return "0.0";
    return ((won / voted) * 100).toFixed(1);
  };

  const netProfit = (u: UserAccount) => getWinnings(u) - getSpent(u);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Leaderboard</h1>
      </div>

      {/* Period tabs */}
      <div className="flex gap-1.5 sm:gap-2 mb-3 sm:mb-4">
        {([
          { key: "weekly", label: "This Week" },
          { key: "monthly", label: "This Month" },
          { key: "allTime", label: "All Time" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setPeriod(key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              period === key
                ? "bg-accent-500 text-dark-900"
                : "bg-dark-700 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Sort tabs */}
      <div className="flex flex-wrap gap-1.5 sm:gap-2 mb-4 sm:mb-6">
        {([
          { key: "winnings", label: "Profit" },
          { key: "pollsWon", label: "Wins" },
          { key: "votes", label: "Votes" },
          { key: "creatorEarnings", label: "Creator $" },
        ] as const).map(({ key, label }) => (
          <button
            key={key}
            onClick={() => setSortBy(key)}
            className={`px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors ${
              sortBy === key
                ? "bg-primary-600 text-white"
                : "bg-dark-700 text-gray-400 hover:text-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Table */}
      {sorted.length === 0 ? (
        <div className="text-center py-20 text-gray-500">
          <p className="text-lg mb-2">No users yet</p>
          <p className="text-sm">Create & vote on polls to appear on the leaderboard!</p>
        </div>
      ) : (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl overflow-hidden">
          {/* Desktop table */}
          <div className="hidden sm:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">#</th>
                  <th className="text-left px-6 py-4 text-sm font-medium text-gray-400">User</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Net Profit</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Win %</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Votes</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Polls Won</th>
                  <th className="text-right px-6 py-4 text-sm font-medium text-gray-400">Creator $</th>
                </tr>
              </thead>
              <tbody>
                {sorted.map((u, i) => {
                  const profit = netProfit(u);
                  const isMe = u.wallet === walletAddress;
                  return (
                    <tr
                      key={u.wallet}
                      className={`border-b border-gray-800/50 ${isMe ? "bg-primary-600/10" : "hover:bg-dark-800/30"}`}
                    >
                      <td className="px-4 sm:px-6 py-3 sm:py-4">
                        <span className={`font-bold ${
                          i === 0 ? "text-accent-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-500"
                        }`}>
                          {i + 1}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 font-mono text-sm">
                        {shortAddr(u.wallet)}
                        {isMe && <span className="ml-2 text-xs text-primary-400">(you)</span>}
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">
                        <span className={profit >= 0 ? "text-green-400" : "text-red-400"}>
                          {profit >= 0 ? "+" : ""}{formatDollars(profit)}
                        </span>
                      </td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{winRate(u)}%</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{getVotes(u)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono">{getPollsWon(u)}</td>
                      <td className="px-4 sm:px-6 py-3 sm:py-4 text-right font-mono text-accent-400">
                        {formatDollars(u.creatorEarningsCents)}
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
                <div key={u.wallet} className={`p-3 ${isMe ? "bg-primary-600/10" : ""}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className={`text-sm font-bold ${
                        i === 0 ? "text-accent-400" : i === 1 ? "text-gray-300" : i === 2 ? "text-orange-400" : "text-gray-500"
                      }`}>
                        #{i + 1}
                      </span>
                      <span className="font-mono text-xs text-gray-300">
                        {shortAddr(u.wallet)}
                        {isMe && <span className="ml-1 text-primary-400">(you)</span>}
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
                    <span className="text-accent-400">{formatDollars(u.creatorEarningsCents)} earned</span>
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
