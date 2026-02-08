"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";

const CATEGORIES = [
  "All", "Crypto", "Sports", "Politics", "Tech", "Entertainment", "Science", "Other",
];

// ── Sort options for poll browsing ──
type SortOption = "most-voted" | "latest" | "oldest";
const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "most-voted", label: "Most Voted", icon: "🔥" },
  { value: "latest",     label: "Latest",     icon: "🕐" },
  { value: "oldest",     label: "Oldest",     icon: "📜" },
];

/** Client-side sort: returns a new sorted array */
function sortPolls(polls: DemoPoll[], sort: SortOption): DemoPoll[] {
  return [...polls].sort((a, b) => {
    switch (sort) {
      case "most-voted": {
        const aVotes = a.voteCounts.reduce((s, v) => s + v, 0);
        const bVotes = b.voteCounts.reduce((s, v) => s + v, 0);
        return bVotes - aVotes;
      }
      case "latest":
        return b.createdAt - a.createdAt;
      case "oldest":
        return a.createdAt - b.createdAt;
    }
  });
}

export default function PollsPage() {
  const { polls, walletConnected } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "settled">("all");
  const [sortBy, setSortBy] = useState<SortOption>("most-voted");

  // Filter + sort (no auth gate — polls are visible to everyone)
  const filtered = polls.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (statusFilter === "active" && p.status !== 0) return false;
    if (statusFilter === "settled" && p.status !== 1) return false;
    return true;
  });
  const sorted = sortPolls(filtered, sortBy);

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold">Polls</h1>
        {walletConnected && (
          <Link href="/create" className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors">
            + Create Poll
          </Link>
        )}
      </div>

      {/* Filters + Sort */}
      <div className="space-y-4 mb-8">
        {/* Category filter */}
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

        {/* Status filter + Sort */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
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

          <div
            className="flex bg-dark-800 border border-gray-800 rounded-xl p-1 gap-0.5"
            role="radiogroup"
            aria-label="Sort polls by"
          >
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                role="radio"
                aria-checked={sortBy === opt.value}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  sortBy === opt.value
                    ? "bg-primary-600 text-white shadow-md shadow-primary-600/20"
                    : "text-gray-400 hover:text-white hover:bg-dark-700"
                }`}
              >
                <span className="text-xs">{opt.icon}</span>
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Poll grid */}
      {sorted.length === 0 ? (
        <div className="text-center py-20">
          <div className="text-4xl mb-4">📭</div>
          <p className="text-gray-500 text-lg mb-2">No polls found</p>
          <p className="text-gray-600 text-sm mb-4">Try adjusting your filters or create a new poll.</p>
          {walletConnected && (
            <Link href="/create" className="text-primary-400 hover:text-primary-300 font-medium">
              Create the first poll &rarr;
            </Link>
          )}
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
