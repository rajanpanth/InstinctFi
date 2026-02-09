"use client";

import { DemoPoll } from "@/components/Providers";
import { useLanguage } from "@/lib/languageContext";

type Props = {
  poll: DemoPoll;
};

const BAR_COLORS = ["#5c7cfa", "#f03e3e", "#ae3ec9", "#fd7e14", "#40c057", "#e64980"];

export default function VoteChart({ poll }: Props) {
  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
  const { t } = useLanguage();
  if (totalVotes === 0) return null;

  const maxVotes = Math.max(...poll.voteCounts);
  
  return (
    <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 sm:p-8 mb-6">
      <h2 className="font-semibold text-lg mb-1">{t("voteDistribution")}</h2>
      <p className="text-xs text-gray-500 mb-5">{totalVotes} {t("totalVotesLabel")}</p>

      {/* Horizontal Bar Chart */}
      <div className="space-y-4">
        {poll.options.map((opt, i) => {
          const votes = poll.voteCounts[i] || 0;
          const pct = (votes / totalVotes) * 100;
          const width = maxVotes > 0 ? (votes / maxVotes) * 100 : 0;
          const color = BAR_COLORS[i % BAR_COLORS.length];
          const multiplier = votes > 0 ? (totalVotes / votes).toFixed(2) : "—";
          const isWinner = poll.status === 1 && poll.winningOption === i;

          return (
            <div key={i}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className={`text-sm font-medium ${isWinner ? "text-green-400" : "text-gray-300"}`}>
                    {isWinner && "✓ "}{opt}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                    <span className="text-gray-400">{votes} {t("votesLabel")}</span>
                  <span className="font-bold" style={{ color }}>{pct.toFixed(1)}%</span>
                  <span className="text-accent-400 font-mono bg-accent-500/10 px-1.5 py-0.5 rounded">
                    {multiplier}x
                  </span>
                </div>
              </div>
              <div className="h-6 bg-dark-900 rounded-lg overflow-hidden relative">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out relative"
                  style={{
                    width: `${Math.max(width, 1)}%`,
                    backgroundColor: color,
                    opacity: isWinner ? 1 : 0.7,
                  }}
                >
                  {width > 15 && (
                    <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[11px] font-bold text-white/90">
                      {pct.toFixed(0)}%
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pie Chart visualization (mini) */}
      <div className="mt-6 flex items-center justify-center gap-6">
        <svg width="120" height="120" viewBox="0 0 120 120">
          {(() => {
            let offset = 0;
            const circumference = 2 * Math.PI * 50;
            return poll.options.map((_, i) => {
              const pct = poll.voteCounts[i] / totalVotes;
              const dash = pct * circumference;
              const gap = circumference - dash;
              const currentOffset = offset;
              offset += pct * 360;
              return (
                <circle
                  key={i}
                  cx="60"
                  cy="60"
                  r="50"
                  fill="none"
                  stroke={BAR_COLORS[i % BAR_COLORS.length]}
                  strokeWidth="18"
                  strokeDasharray={`${dash} ${gap}`}
                  strokeDashoffset={-currentOffset * (circumference / 360)}
                  className="transition-all duration-500"
                  style={{ transformOrigin: "60px 60px", transform: "rotate(-90deg)" }}
                />
              );
            });
          })()}
          <text x="60" y="56" textAnchor="middle" className="fill-white text-lg font-bold" fontSize="16">
            {totalVotes}
          </text>
          <text x="60" y="72" textAnchor="middle" className="fill-gray-500" fontSize="10">
            {t("votesLabel")}
          </text>
        </svg>

        {/* Legend */}
        <div className="space-y-2">
          {poll.options.map((opt, i) => {
            const pct = ((poll.voteCounts[i] / totalVotes) * 100).toFixed(1);
            return (
              <div key={i} className="flex items-center gap-2 text-sm">
                <div
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: BAR_COLORS[i % BAR_COLORS.length] }}
                />
                <span className="text-gray-400 truncate max-w-[100px]">{opt}</span>
                <span className="font-mono text-xs text-gray-300">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
