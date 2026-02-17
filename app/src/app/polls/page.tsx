"use client";

import React, { useState, useMemo, useCallback, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useApp, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";
import { CATEGORIES as CONST_CATEGORIES } from "@/lib/constants";
import { useLanguage } from "@/lib/languageContext";
import { tCat } from "@/lib/translations";

const CATEGORIES = ["All", ...CONST_CATEGORIES];

const POLLS_PER_PAGE = 12;

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

export default function PollsPageWrapper() {
  return (
    <Suspense fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
      <PollsPage />
    </Suspense>
  );
}

function PollsPage() {
  const { polls, walletConnected, isLoading } = useApp();
  const { t, lang } = useLanguage();
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize from URL params
  const [selectedCategory, setSelectedCategory] = useState(() => searchParams.get("cat") || "All");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "settled">(() => {
    const s = searchParams.get("status");
    return s === "active" || s === "settled" ? s : "all";
  });
  const [sortBy, setSortBy] = useState<SortOption>(() => {
    const s = searchParams.get("sort");
    return s === "latest" || s === "oldest" ? s : "most-voted";
  });
  const [search, setSearch] = useState(() => searchParams.get("q") || "");
  const [debouncedSearch, setDebouncedSearch] = useState(search);
  const [page, setPage] = useState(1);
  const debounceRef = React.useRef<ReturnType<typeof setTimeout>>(undefined);

  // Sync filters to URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedCategory !== "All") params.set("cat", selectedCategory);
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (sortBy !== "most-voted") params.set("sort", sortBy);
    if (debouncedSearch.trim()) params.set("q", debouncedSearch.trim());
    const qs = params.toString();
    router.replace(`/polls${qs ? `?${qs}` : ""}`, { scroll: false });
  }, [selectedCategory, statusFilter, sortBy, debouncedSearch, router]);

  // Reset to page 1 when filters change
  const handleCategoryChange = (cat: string) => { setSelectedCategory(cat); setPage(1); };
  const handleStatusChange = (s: "all" | "active" | "settled") => { setStatusFilter(s); setPage(1); };
  const handleSortChange = (s: SortOption) => { setSortBy(s); setPage(1); };
  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    setPage(1);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedSearch(val), 300);
  }, []);

  const filtered = useMemo(() => polls.filter((p) => {
    if (selectedCategory !== "All" && p.category !== selectedCategory) return false;
    if (statusFilter === "active" && p.status !== 0) return false;
    if (statusFilter === "settled" && p.status !== 1) return false;
    if (debouncedSearch.trim()) {
      const q = debouncedSearch.toLowerCase();
      if (!p.title.toLowerCase().includes(q) && !p.description.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [polls, selectedCategory, statusFilter, debouncedSearch]);

  const sorted = useMemo(() => sortPolls(filtered, sortBy), [filtered, sortBy]);
  const totalPages = Math.max(1, Math.ceil(sorted.length / POLLS_PER_PAGE));
  const paginated = useMemo(() => sorted.slice((page - 1) * POLLS_PER_PAGE, page * POLLS_PER_PAGE), [sorted, page]);

  return (
    <div>
      <div className="flex items-center justify-between mb-6 sm:mb-8">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">{t("polls")}</h1>
        {walletConnected && (
          <Link href="/create" className="px-4 sm:px-6 py-2 sm:py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl font-semibold transition-all text-sm sm:text-base active:scale-[0.97]">
            {t("createPollPlus")}
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
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full pl-10 pr-4 py-2.5 sm:py-3 bg-surface-100 border border-border/80 rounded-2xl text-sm focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all placeholder-gray-600"
        />
        {search && (
          <button
            onClick={() => handleSearchChange("")}
            aria-label="Clear search"
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
              onClick={() => handleCategoryChange(cat)}
              className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm transition-colors ${
                selectedCategory === cat
                  ? "bg-brand-600 text-white"
                  : "bg-surface-100 text-gray-400 hover:text-white"
              }`}
            >
              {tCat(cat, lang)}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center justify-between gap-2 sm:gap-3">
          <div className="flex gap-1.5 sm:gap-2">
            {(["all", "active", "settled"] as const).map((s) => (
              <button
                key={s}
                onClick={() => handleStatusChange(s)}
                className={`px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm capitalize transition-colors ${
                  statusFilter === s
                    ? "bg-brand-600 text-white"
                    : "bg-surface-100 text-gray-400 hover:text-white"
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <div className="flex bg-surface-50 border border-border rounded-xl p-0.5 sm:p-1 gap-0.5" role="radiogroup" aria-label="Sort polls by">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => handleSortChange(opt.value)}
                role="radio"
                aria-checked={sortBy === opt.value}
                className={`px-2 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all whitespace-nowrap flex items-center gap-1 sm:gap-1.5 ${
                  sortBy === opt.value
                    ? "bg-brand-600 text-white shadow-md shadow-brand-500/15"
                    : "text-gray-400 hover:text-white hover:bg-surface-100"
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
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 border border-border flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
          </div>
          <p className="text-gray-400 text-lg mb-2 font-medium">{t("noPollsFound")}</p>
          <p className="text-gray-600 text-sm mb-5">{t("noPollsHint")}</p>
          {walletConnected && (
            <Link href="/create" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium transition-colors">
              {t("createFirstPoll")} <span className="text-lg">→</span>
            </Link>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
            {paginated.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-surface-100 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Previous page"
              >
                {t("prev")}
              </button>
              <div className="flex gap-1">
                {Array.from({ length: totalPages }, (_, i) => i + 1)
                  .filter(p => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
                  .map((p, idx, arr) => (
                    <span key={p} className="contents">
                      {idx > 0 && arr[idx - 1] !== p - 1 && (
                        <span className="px-1 text-gray-600 text-sm">…</span>
                      )}
                      <button
                        onClick={() => setPage(p)}
                        className={`w-8 h-8 rounded-lg text-sm font-medium transition-colors ${
                          p === page ? "bg-brand-600 text-white" : "bg-surface-100 text-gray-400 hover:text-white"
                        }`}
                      >
                        {p}
                      </button>
                    </span>
                  ))}
              </div>
              <button
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-3 py-1.5 rounded-lg text-sm font-medium transition-colors bg-surface-100 text-gray-400 hover:text-white disabled:opacity-40 disabled:cursor-not-allowed"
                aria-label="Next page"
              >
                {t("next")}
              </button>
            </div>
          )}

          <p className="text-center text-xs text-gray-600 mt-3">
            Showing {(page - 1) * POLLS_PER_PAGE + 1}–{Math.min(page * POLLS_PER_PAGE, sorted.length)} of {sorted.length} polls
          </p>
        </>
      )}
    </div>
  );
}
