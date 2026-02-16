"use client";

import React, { useState, useMemo } from "react";
import { useApp, type DemoPoll, type DemoVote, formatDollarsShort, PollStatus, WINNING_OPTION_UNSET } from "@/components/Providers";
import Link from "next/link";
import { useLanguage } from "@/lib/languageContext";

type ActivityItem = {
  id: string;
  type: "poll_created" | "vote_cast" | "poll_settled" | "poll_ended";
  timestamp: number;
  pollId: string;
  pollTitle: string;
  category: string;
  actor: string; // wallet address
  detail: string;
};

type FilterType = "all" | "poll_created" | "vote_cast" | "poll_settled" | "poll_ended";

function buildActivities(polls: DemoPoll[], votes: DemoVote[]): ActivityItem[] {
  const items: ActivityItem[] = [];

  for (const poll of polls) {
    // Poll created
    items.push({
      id: `created-${poll.id}`,
      type: "poll_created",
      timestamp: poll.createdAt,
      pollId: poll.id,
      pollTitle: poll.title,
      category: poll.category,
      actor: poll.creator,
      detail: `Created poll "${poll.title}" with ${poll.options.length} options`,
    });

    // Poll settled
    if (poll.status === PollStatus.Settled && poll.winningOption !== WINNING_OPTION_UNSET) {
      items.push({
        id: `settled-${poll.id}`,
        type: "poll_settled",
        timestamp: poll.endTime * 1000 + 1000, // slightly after end
        pollId: poll.id,
        pollTitle: poll.title,
        category: poll.category,
        actor: poll.creator,
        detail: `Poll settled — "${poll.options[poll.winningOption]}" won with ${poll.voteCounts[poll.winningOption]} votes`,
      });
    }

    // Poll ended (expired but not necessarily settled)
    if (poll.endTime * 1000 < Date.now() && poll.status === PollStatus.Active) {
      items.push({
        id: `ended-${poll.id}`,
        type: "poll_ended",
        timestamp: poll.endTime * 1000,
        pollId: poll.id,
        pollTitle: poll.title,
        category: poll.category,
        actor: poll.creator,
        detail: `Poll "${poll.title}" has ended — awaiting settlement`,
      });
    }
  }

  // Votes — we don't have individual vote timestamps, so we approximate
  const pollMap = new Map(polls.map((p) => [p.id, p]));
  for (const vote of votes) {
    const poll = pollMap.get(vote.pollId);
    if (!poll) continue;
    const votedOptions = vote.votesPerOption
      .map((count, i) => (count > 0 ? `${count}x "${poll.options[i]}"` : null))
      .filter(Boolean)
      .join(", ");
    items.push({
      id: `vote-${vote.pollId}-${vote.voter}`,
      type: "vote_cast",
      timestamp: poll.createdAt + 1, // approximate: shortly after creation
      pollId: vote.pollId,
      pollTitle: poll.title,
      category: poll.category,
      actor: vote.voter,
      detail: `Voted ${votedOptions} • Staked ${formatDollarsShort(vote.totalStakedCents)}`,
    });
  }

  // Sort newest first
  return items.sort((a, b) => b.timestamp - a.timestamp);
}

const TYPE_META: Record<string, { label: string; icon: string; color: string }> = {
  poll_created: { label: "Created", icon: "➕", color: "text-green-400" },
  vote_cast: { label: "Voted", icon: "🗳️", color: "text-brand-400" },
  poll_settled: { label: "Settled", icon: "✅", color: "text-blue-400" },
  poll_ended: { label: "Ended", icon: "⏰", color: "text-yellow-400" },
};

function shortAddress(addr: string) {
  return addr.slice(0, 4) + "…" + addr.slice(-4);
}

function formatTimestamp(ts: number) {
  const d = new Date(ts);
  const now = Date.now();
  const diff = now - ts;
  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  if (diff < 604_800_000) return `${Math.floor(diff / 86_400_000)}d ago`;
  return d.toLocaleDateString();
}

export default function ActivityPage() {
  const { polls, votes, walletAddress } = useApp();
  const { t } = useLanguage();
  const [filter, setFilter] = useState<FilterType>("all");
  const [showMyOnly, setShowMyOnly] = useState(false);

  const activities = useMemo(() => buildActivities(polls, votes), [polls, votes]);

  const filtered = useMemo(() => {
    let items = activities;
    if (filter !== "all") items = items.filter((a) => a.type === filter);
    if (showMyOnly && walletAddress) items = items.filter((a) => a.actor === walletAddress);
    return items;
  }, [activities, filter, showMyOnly, walletAddress]);

  return (
    <div className="min-h-screen bg-dark-950 text-white">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-2">{t("activityFeed")}</h1>
        <p className="text-gray-400 mb-6">{t("recentActivity")}</p>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-6">
          {(["all", "poll_created", "vote_cast", "poll_settled", "poll_ended"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${filter === f
                  ? "bg-brand-500 text-white"
                  : "bg-surface-50 text-gray-400 hover:bg-surface-100"
                }`}
            >
              {f === "all" ? "All" : TYPE_META[f].label}
            </button>
          ))}

          {walletAddress && (
            <button
              onClick={() => setShowMyOnly((v) => !v)}
              className={`ml-auto px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${showMyOnly
                  ? "bg-brand-500 text-white"
                  : "bg-surface-50 text-gray-400 hover:bg-surface-100"
                }`}
            >
              {showMyOnly ? t("myActivity") : t("everyone")}
            </button>
          )}
        </div>

        {/* Activity list */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <p className="text-5xl mb-4">📭</p>
            <p className="text-lg">{t("noActivityYet")}</p>
          </div>
        ) : (
          <div className="relative">
            {/* Timeline line */}
            <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-100" />

            <div className="space-y-1">
              {filtered.map((item) => {
                const meta = TYPE_META[item.type];
                return (
                  <Link
                    key={item.id}
                    href={`/polls/${item.pollId}`}
                    className="block relative pl-12 pr-4 py-3 rounded-xl hover:bg-surface-50/60 transition-colors group"
                  >
                    {/* Timeline dot */}
                    <div className="absolute left-3.5 top-5 w-3 h-3 rounded-full bg-surface-100 border-2 border-dark-600 group-hover:border-brand-500 transition-colors" />

                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-base">{meta.icon}</span>
                          <span className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
                            {meta.label}
                          </span>
                          {item.category && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-100 text-gray-500">
                              {item.category}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-300 leading-snug truncate">
                          {item.detail}
                        </p>
                        <p className="text-xs text-gray-600 mt-1">
                          by {shortAddress(item.actor)}
                        </p>
                      </div>
                      <span className="text-xs text-gray-600 whitespace-nowrap pt-1">
                        {formatTimestamp(item.timestamp)}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
