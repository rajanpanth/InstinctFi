"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";

const CATEGORIES = [
  "All", "Crypto", "Sports", "Politics", "Tech", "Entertainment", "Science",
  "Economics", "Mentions", "Companies", "Financials", "Tech & Science", "Other",
];

type SortOption = "most-voted" | "latest" | "oldest";
const SORT_OPTIONS: { value: SortOption; label: string; icon: string }[] = [
  { value: "most-voted", label: "Most Voted", icon: "🔥" },
  { value: "latest",     label: "Latest",     icon: "🕐" },
  { value: "oldest",     label: "Oldest",     icon: "📜" },
];

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
  const { polls, walletConnected, isLoading } = useApp();
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "settled">("all");
  const [sortBy, setSortBy] = useState<SortOption>("most-voted");
  const [search, setSearch] = useState("");

  const filtered = polls.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (statusFilter === "active" && p.status !== 0) return false;
    if (statusFilter === "settled" && p.status !== 1) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    }
    return true;
  });
  const sorted = sortPolls(filtered, sortBy);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold">Polls</h1>
        {walletConnected && (
          <Link href="/create" className="px-4 sm:px-6 py-2 sm:py-2.5 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors text-sm sm:text-base">
            + Create Poll
          </Link>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-4 sm:mb-5">
        <svg className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search polls by title or description..."
          className="w-full pl-10 pr-4 py-2.5 bg-dark-700 border border-gray-700 rounded-xl text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors placeholder-gray-600"
        />
        {search && (
          <button
            onClick={() => setSearch("")}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 1l12 12M13 1L1 13" /></svg>
          </button>
        )}
      </div>

      {/* Filters + Sort */}
      <div className="space-y-3 sm:space-y-4 mb-6 sm:mb-8">
        <div className="flex flex-wrap gap-1.5 sm:gap-2">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-primary-600 text-white"
                  : "bg-dark-700 text-gray-400 hover:text-white"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex gap-1.5 sm:gap-2">
            {(["all", "active", "settled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => setStatusFilter(s)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-primary-600 text-white"
                    : "bg-dark-700 text-gray-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex bg-dark-800 border border-gray-800 rounded-xl p-0.5 sm:p-1 gap-0.5" role="radiogroup" aria-label="Sort polls by">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => setSortBy(opt.value)}
                role="radio"
                aria-checked={sortBy === opt.value}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
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
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : sorted.length === 0 ? (
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          {sorted.map((poll) => (
            <PollCard key={poll.id} poll={poll} />
          ))}
        </div>
      )}
    </div>
  );
}
