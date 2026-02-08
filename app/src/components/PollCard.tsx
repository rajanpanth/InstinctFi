"use client";

import Link from "next/link";
import { DemoPoll, formatDollarsShort } from "./Providers";
import { sanitizeImageUrl } from "@/lib/uploadImage";

type Props = {
  poll: DemoPoll;
  /** Compact variant for home page grids */
  compact?: boolean;
};

/** Tiny circular avatar for an option */
function OptionAvatar({ src, label, index }: { src?: string; label: string; index: number }) {
  const sanitized = src ? sanitizeImageUrl(src) : "";
  const colors = [
    "from-blue-500 to-blue-600",
    "from-red-500 to-red-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
  ];
  const bg = colors[index % colors.length];

  if (sanitized) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={sanitized}
        alt={label}
        className="w-7 h-7 rounded-full object-cover shrink-0 border border-gray-700"
      />
    );
  }

  return (
    <div
      className={`w-7 h-7 rounded-full bg-gradient-to-br ${bg} flex items-center justify-center text-[10px] font-bold text-white shrink-0 border border-gray-700`}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

export default function PollCard({ poll, compact }: Props) {
  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
  const mainImage = sanitizeImageUrl(poll.imageUrl);

  // Calculate percentages for top 2 options
  const optionData = poll.options.slice(0, 2).map((opt, i) => {
    const votes = poll.voteCounts[i] || 0;
    const pct = totalVotes > 0 ? Math.round((votes / totalVotes) * 100) : 50;
    const multiplier = totalVotes > 0 && votes > 0
      ? (totalVotes / votes).toFixed(1)
      : "—";
    return { label: opt, votes, pct, multiplier, index: i };
  });

  // Ensure two percentages sum to 100 for binary polls with 2 options
  if (optionData.length === 2 && totalVotes > 0) {
    optionData[1].pct = 100 - optionData[0].pct;
  }

  return (
    <Link
      href={`/polls/${poll.id}`}
      className="group block bg-dark-700/60 border border-gray-800 rounded-xl overflow-hidden hover:border-primary-500/40 transition-all hover:bg-dark-700/80"
    >
      <div className="p-4">
        {/* Header: Title + poll image */}
        <div className="flex items-start gap-3 mb-4">
          <h3 className="text-sm font-semibold leading-snug line-clamp-2 flex-1 group-hover:text-primary-300 transition-colors">
            {poll.title}
          </h3>
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt=""
              className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600/30 to-accent-500/20 shrink-0 flex items-center justify-center border border-gray-700">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                <rect x="3" y="3" width="18" height="18" rx="3" />
                <circle cx="8.5" cy="8.5" r="1.5" />
                <path d="M21 15l-5-5L5 21" />
              </svg>
            </div>
          )}
        </div>

        {/* Option rows */}
        <div className="space-y-2.5">
          {optionData.map((opt) => (
            <div key={opt.index} className="flex items-center gap-2.5">
              <OptionAvatar
                src={poll.optionImages?.[opt.index]}
                label={opt.label}
                index={opt.index}
              />
              <span className="text-sm text-gray-300 truncate flex-1">
                {opt.label}
              </span>
              {/* Multiplier */}
              {opt.multiplier !== "—" && (
                <span className="text-xs text-gray-500 font-mono shrink-0">
                  {opt.multiplier}x
                </span>
              )}
              {/* Percentage badge */}
              <span
                className={`shrink-0 px-2 py-0.5 rounded-md text-xs font-semibold ${
                  opt.index === 0
                    ? "bg-blue-500/20 text-blue-400"
                    : "bg-red-500/20 text-red-400"
                }`}
              >
                {opt.pct}%
              </span>
            </div>
          ))}
          {poll.options.length > 2 && (
            <p className="text-[11px] text-gray-600 pl-9">
              +{poll.options.length - 2} more
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/80">
          <span className="text-xs text-gray-500">
            {formatDollarsShort(poll.totalPoolCents)} Vol.
          </span>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">
              {totalVotes} votes
            </span>
            {poll.status === 1 && (
              <span className="text-[10px] px-1.5 py-0.5 bg-green-600/20 text-green-400 rounded font-medium">
                Settled
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
