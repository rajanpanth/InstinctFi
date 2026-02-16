"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useApp, formatDollars, formatDollarsShort, PollStatus } from "@/components/Providers";
import { getCategoryMeta } from "@/lib/constants";

export default function EmbedPollPage() {
  const params = useParams();
  const pollId = params.id as string;
  const { polls } = useApp();
  const poll = polls.find((p) => p.id === pollId);

  if (!poll) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-dark-950 text-gray-400 text-sm">
        Poll not found
      </div>
    );
  }

  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
  const isSettled = poll.status === PollStatus.Settled;
  const catMeta = getCategoryMeta(poll.category);

  return (
    <div className="min-h-screen bg-dark-950 text-white p-4 flex items-center justify-center">
      <div className="w-full max-w-md bg-surface-50 border border-border rounded-2xl overflow-hidden">
        {/* Header */}
        <div className={`px-4 py-3 bg-gradient-to-r ${catMeta.bgGradient || "from-surface-100 to-surface-100"} border-b border-border`}>
          <div className="flex items-center justify-between">
            <span className={`text-xs font-medium ${catMeta.color}`}>
              {catMeta.icon} {poll.category}
            </span>
            <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${isSettled ? "bg-green-500/20 text-green-400" : "bg-brand-500/20 text-brand-400"
              }`}>
              {isSettled ? "Settled" : "Active"}
            </span>
          </div>
          <h2 className="text-sm font-semibold mt-1 leading-snug">{poll.title}</h2>
        </div>

        {/* Options */}
        <div className="p-4 space-y-2">
          {poll.options.map((opt, i) => {
            const count = poll.voteCounts[i] || 0;
            const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
            const isWinner = isSettled && poll.winningOption === i;

            return (
              <div key={i} className="relative overflow-hidden rounded-lg border border-border">
                <div
                  className={`absolute inset-0 ${isWinner ? "bg-green-500" : "bg-brand-500"} opacity-10`}
                  style={{ width: `${pct}%` }}
                />
                <div className="relative flex items-center justify-between px-3 py-2">
                  <span className={`text-xs ${isWinner ? "text-green-300 font-semibold" : "text-gray-300"}`}>
                    {isWinner && "🏆 "}{opt}
                  </span>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="text-gray-500">{count}</span>
                    <span className="text-gray-400 font-mono">{pct.toFixed(0)}%</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t border-border flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-gray-500">
            <span>Pool: {formatDollarsShort(poll.totalPoolCents)}</span>
            <span>{totalVotes} votes</span>
            <span>{poll.totalVoters} voters</span>
          </div>
          <Link
            href={`/polls/${poll.id}`}
            target="_blank"
            className="text-[10px] text-brand-400 hover:text-brand-300 font-medium"
          >
            View on InstinctFi →
          </Link>
        </div>
      </div>
    </div>
  );
}
