"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp, formatDollars, DemoPoll } from "@/components/Providers";

const CATEGORIES = [
  "All", "Crypto", "Sports", "Politics", "Tech", "Entertainment", "Science", "Other",
];

function PollCard({ poll }: { poll: DemoPoll }) {
  const now = Math.floor(Date.now() / 1000);
  const isEnded = now >= poll.endTime;
  const timeLeft = poll.endTime - now;

  const formatTimeLeft = (seconds: number) => {
    if (seconds <= 0) return "Ended";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 24) return `${Math.floor(h / 24)}d ${h % 24}h`;
    if (h > 0) return `${h}h ${m}m`;
    return `${m}m`;
  };

  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="block bg-dark-700/50 border border-gray-800 rounded-2xl p-6 hover:border-primary-500/50 transition-all hover:transform hover:scale-[1.01]"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="px-2.5 py-1 bg-primary-600/20 text-primary-400 rounded-lg text-xs font-medium">
          {poll.category}
        </span>
        <span
          className={`px-2.5 py-1 rounded-lg text-xs font-medium ${
            poll.status === 1
              ? "bg-green-600/20 text-green-400"
              : isEnded
              ? "bg-red-600/20 text-red-400"
              : "bg-accent-500/20 text-accent-400"
          }`}
        >
          {poll.status === 1
            ? "Settled"
            : isEnded
            ? "Awaiting Settlement"
            : formatTimeLeft(timeLeft)}
        </span>
      </div>

      <h3 className="text-lg font-semibold mb-2 line-clamp-2">{poll.title}</h3>

      {poll.description && (
        <p className="text-gray-400 text-sm mb-4 line-clamp-2">{poll.description}</p>
      )}

      {/* Option bars */}
      <div className="space-y-2 mb-4">
        {poll.options.map((opt, i) => {
          const pct = totalVotes > 0 ? (poll.voteCounts[i] / totalVotes) * 100 : 0;
          const isWinner = poll.status === 1 && poll.winningOption === i;
          return (
            <div key={i} className="relative">
              <div className="flex justify-between text-sm mb-1">
                <span className={isWinner ? "text-green-400 font-semibold" : "text-gray-300"}>
                  {isWinner && "✓ "}{opt}
                </span>
                <span className="text-gray-500 font-mono">
                  {poll.voteCounts[i]} ({pct.toFixed(0)}%)
                </span>
              </div>
              <div className="h-2 bg-dark-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isWinner ? "bg-green-500" : "bg-primary-600/60"
                  }`}
                  style={{ width: `${Math.max(pct, 1)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer stats */}
      <div className="flex justify-between text-xs text-gray-500 pt-3 border-t border-gray-800">
        <span>Pool: {formatDollars(poll.totalPoolCents)}</span>
        <span>{totalVotes} votes</span>
        <span>{poll.totalVoters} voters</span>
      </div>
    </Link>
  );
}

export default function PollsPage() {
  const { polls, walletConnected, connectWallet } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "settled">("all");

  if (!walletConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Connect your Phantom wallet to view polls</p>
        <button onClick={connectWallet} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors">
          Connect Phantom
        </button>
      </div>
    );
  }

  const filtered = polls.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (statusFilter === "active" && p.status !== 0) return false;
    if (statusFilter === "settled" && p.status !== 1) return false;
    return true;
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Polls</h1>
        <Link href="/create" className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors">
          + Create Poll
        </Link>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-4 mb-8">
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-primary-600 text-white"
                  : "bg-dark-700 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
        <div className="flex gap-2 ml-auto">
          {(["all", "active", "settled"] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-sm capitalize transition-colors ${
                statusFilter === s
                  ? "bg-primary-600 text-white"
                  : "bg-dark-700 text-gray-400 hover:text-white"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      {/* Poll grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-gray-500 text-lg mb-4">No polls found</p>
          <Link href="/create" className="text-primary-400 hover:text-primary-300">
            Create the first poll →
          </Link>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
