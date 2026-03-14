"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp, formatDollars, DemoPoll, PollStatus } from "@/components/Providers";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";
import FeaturedPollHeroCard from "@/components/FeaturedPollHeroCard";
import { CATEGORY_META } from "@/lib/constants";
import { useLanguage } from "@/lib/languageContext";
import { tCat } from "@/lib/translations";
import { ArrowRight, Zap, BarChart3, Users, TrendingUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";

const CATEGORY_SECTIONS = CATEGORY_META.filter((c) => c.label !== "Trending");

type TrendingWindow = "24h" | "7d" | "30d" | "all";
const TRENDING_WINDOWS: { key: TrendingWindow; label: string; ms: number }[] = [
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7d", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30d", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All", ms: Infinity },
];

function getTrendingPolls(polls: DemoPoll[], limit = 6, windowMs = Infinity): DemoPoll[] {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const cutoff = windowMs === Infinity ? 0 : now - windowMs;
  return [...polls]
    .filter((p) => p.status === PollStatus.Active && p.createdAt * 1000 >= cutoff)
    .sort((a, b) => {
      const aVotes = a.voteCounts.reduce((s, v) => s + v, 0);
      const bVotes = b.voteCounts.reduce((s, v) => s + v, 0);
      const aAge = Math.max(1, (now - a.createdAt * 1000) / ONE_DAY);
      const bAge = Math.max(1, (now - b.createdAt * 1000) / ONE_DAY);
      const aScore = aVotes / Math.pow(aAge, 0.8);
      const bScore = bVotes / Math.pow(bAge, 0.8);
      return bScore - aScore;
    })
    .slice(0, limit);
}

function getPollsByCategory(polls: DemoPoll[], category: string, limit = 4): DemoPoll[] {
  return polls
    .filter((p) => p.category === category)
    .sort((a, b) => b.createdAt - a.createdAt)
    .slice(0, limit);
}

function getEndingSoon(polls: DemoPoll[], limit = 4): DemoPoll[] {
  const now = Math.floor(Date.now() / 1000);
  const in24h = now + 24 * 60 * 60;
  return polls
    .filter((p) => p.status === PollStatus.Active && p.endTime > now && p.endTime <= in24h)
    .sort((a, b) => a.endTime - b.endTime)
    .slice(0, limit);
}

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} delay={i * 0.07} />
          ))}
        </div>
      }
    >
      <HomeContent />
    </Suspense>
  );
}

function HomeContent() {
  const { walletConnected, connectWallet, polls, userAccount, isLoading } = useApp();
  const searchParams = useSearchParams();
  const catFilter = searchParams.get("cat");
  const [trendingWindow, setTrendingWindow] = useState<TrendingWindow>("all");
  const { t, lang } = useLanguage();

  // Mounted guard — defers Date.now()-dependent calculations to client only
  const [mounted, setMounted] = useState(false);
  const [activeFeaturedIndex, setActiveFeaturedIndex] = useState(0);
  const [activeTopic, setActiveTopic] = useState<string>("Trending");

  useEffect(() => setMounted(true), []);

  const windowMs = TRENDING_WINDOWS.find((w) => w.key === trendingWindow)?.ms ?? Infinity;
  const trending = useMemo(() => mounted ? getTrendingPolls(polls, 6, windowMs) : [], [polls, windowMs, mounted]);

  useEffect(() => {
    if (trending.length <= 1) return;
    const interval = setInterval(() => {
      setActiveFeaturedIndex((prev) => (prev + 1) % trending.length);
    }, 10000);
    return () => clearInterval(interval);
  }, [trending.length]);

  const filteredPolls = useMemo(() => {
    if (!catFilter || catFilter === "Trending") return null;
    return polls
      .filter((p) => p.category === catFilter)
      .sort((a, b) => b.createdAt - a.createdAt);
  }, [polls, catFilter]);

  const categorySections = useMemo(
    () =>
      CATEGORY_SECTIONS.map((cat) => ({
        ...cat,
        polls: getPollsByCategory(polls, cat.label),
      })).filter((c) => c.polls.length > 0),
    [polls]
  );

  // Topic options for the "More Topics" dropdown
  const TOPIC_OPTIONS = [
    { label: "Trending", icon: "🔥" },
    { label: "New", icon: "✨" },
    { label: "Top Movers", icon: "📈" },
    { label: "Highest Volume", icon: "💰" },
    { label: "Janamat Special", icon: "🇳🇵" },
  ];

  const topicPolls = useMemo(() => {
    if (!mounted) return [];
    switch (activeTopic) {
      case "New":
        return [...polls].sort((a, b) => b.createdAt - a.createdAt).slice(0, 5);
      case "Top Movers":
        return [...polls].sort((a, b) => {
          const aTotal = a.voteCounts.reduce((s, v) => s + v, 0);
          const bTotal = b.voteCounts.reduce((s, v) => s + v, 0);
          return bTotal - aTotal;
        }).slice(0, 5);
      case "Highest Volume":
        return [...polls].sort((a, b) => b.totalPoolLamports - a.totalPoolLamports).slice(0, 5);
      case "Janamat Special":
        return [...polls].filter(p => p.category === "Janamat").slice(0, 5);
      default: // Trending
        return trending.slice(0, 5);
    }
  }, [mounted, activeTopic, polls, trending]);

  const endingSoon = useMemo(() => mounted ? getEndingSoon(polls) : [], [polls, mounted]);

  const totalVotes = useMemo(() => mounted ? polls.reduce((sum, p) => sum + p.voteCounts.reduce((a, b) => a + b, 0), 0) : 0, [polls, mounted]);
  const totalVolume = useMemo(() => mounted ? polls.reduce((sum, p) => sum + p.totalPoolLamports, 0) : 0, [polls, mounted]);

  return (
    <div className="space-y-4">
      {/* ── Hero Section ── */}
      <section className="section-animate mb-0">
        {walletConnected && userAccount ? (
          /* ── Connected: Featured poll (left) + Kalshi-style trending (right) ── */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-4 lg:gap-10 py-4 lg:py-10">
            {/* Left — Featured poll card */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              {trending.length > 0 ? (
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeaturedIndex}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      <FeaturedPollHeroCard poll={trending[activeFeaturedIndex] || trending[0]} />
                    </motion.div>
                  </AnimatePresence>
                  {/* Dot indicators + Prev/Next buttons */}
                  {trending.length > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-2.5 items-center">
                        {trending.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveFeaturedIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeFeaturedIndex ? "w-6 bg-brand-500" : "w-2 bg-white/20 hover:bg-white/40"}`}
                            aria-label={`Go to featured poll ${i + 1}`}
                          />
                        ))}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveFeaturedIndex((prev) => (prev - 1 + trending.length) % trending.length)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[0.7rem] text-neutral-400 transition-colors"
                        >
                          <span className="text-neutral-500">‹</span>
                          <span>Previous</span>
                        </button>
                        <button
                          onClick={() => setActiveFeaturedIndex((prev) => (prev + 1) % trending.length)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[0.7rem] text-neutral-400 transition-colors"
                        >
                          <span>Next</span>
                          <span className="text-neutral-500">›</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full p-8 bg-surface-100 border border-border rounded-xl text-center">
                  <BarChart3 size={32} className="text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">No active polls yet</p>
                </div>
              )}
            </div>

            {/* Right — Kalshi-style trending list */}
            <div className="lg:col-span-2 flex flex-col gap-3">
              {/* Clickable category banner */}
              <Link
                href="/polls?cat=Janamat"
                className="relative flex items-center justify-between px-4 py-3.5 rounded-xl border border-border overflow-hidden hover:border-border-hover transition-all group cursor-pointer"
                style={{ backgroundImage: "url('/banner-bg.png')", backgroundSize: "cover", backgroundPosition: "center" }}
              >
                <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors" />
                <div className="relative z-10">
                  <h3 className="text-white font-bold text-sm">Janamat Special</h3>
                  <p className="text-white/70 text-[0.65rem] mt-0.5">Superteam Nepal</p>
                </div>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src="/newsuperteam.webp" alt="Superteam Nepal" width={96} height={96} className="relative z-10 rounded-md object-contain" />
              </Link>

              <div className="bg-surface-100 border border-border rounded-xl overflow-hidden">

                {/* Topic header */}
                <div className="px-4 pt-3.5 pb-2">
                  <Link href="/polls" className="inline-flex items-center gap-1.5 group">
                    <h4 className="text-white font-bold text-base group-hover:text-brand-400 transition-colors duration-200">{activeTopic}</h4>
                    <ArrowRight size={16} className="text-neutral-500 group-hover:text-brand-400 group-hover:translate-x-1 transition-all duration-200" />
                  </Link>
                </div>

                {/* Topic items list */}
                <div className="px-2 pb-2">
                  {topicPolls.map((poll, idx) => {
                    const totalVotesForPoll = poll.voteCounts.reduce((a, b) => a + b, 0);
                    const topOptionIdx = poll.voteCounts.indexOf(Math.max(...poll.voteCounts));
                    const topPercent = totalVotesForPoll > 0
                      ? Math.round((poll.voteCounts[topOptionIdx] / totalVotesForPoll) * 100)
                      : 0;
                    const topOptionName = poll.options[topOptionIdx] || "—";
                    const mockChange = ((poll.id.charCodeAt(0) + poll.id.charCodeAt(1)) % 40) - 15;
                    const isPositive = mockChange >= 0;

                    return (
                      <Link
                        key={poll.id}
                        href={`/polls/${poll.id}`}
                        className="flex items-start gap-2.5 px-2 py-1.5 rounded-lg hover:bg-surface-200/60 transition-colors group"
                      >
                        <span className="text-neutral-600 text-xs font-semibold tabular-nums mt-0.5 w-3.5 text-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-[0.78rem] text-neutral-200 font-medium leading-snug line-clamp-2 group-hover:text-white transition-colors">
                            {poll.title}
                          </p>
                          <p className="text-[0.65rem] text-neutral-500 mt-0.5 truncate">
                            {topOptionName}
                          </p>
                        </div>
                        <div className="text-right shrink-0 ml-1.5">
                          <p className="text-xs font-bold text-white tabular-nums">
                            {topPercent}%
                          </p>
                          <p className={`text-[0.6rem] font-semibold tabular-nums ${isPositive ? "text-emerald-400" : "text-red-400"}`}>
                            {isPositive ? "▲" : "▼"} {Math.abs(mockChange)}
                          </p>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>

              {/* More Topics button with hover dropdown — outside overflow-hidden */}
              <div className="relative group/topics">
                <button className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-border/60 bg-surface-200/40 hover:bg-surface-200 text-[0.75rem] text-neutral-400 hover:text-neutral-200 transition-all duration-200">
                  More Topics
                  <svg className="w-3 h-3 group-hover/topics:rotate-180 transition-transform duration-200" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                </button>
                {/* Dropdown */}
                <div className="absolute top-full left-0 right-0 mt-1 opacity-0 invisible group-hover/topics:opacity-100 group-hover/topics:visible transition-all duration-200 z-20">
                  <div className="bg-surface-100 border border-border rounded-lg shadow-xl overflow-hidden">
                    {TOPIC_OPTIONS.filter(t => t.label !== activeTopic).map((topic) => (
                      <button
                        key={topic.label}
                        onClick={() => setActiveTopic(topic.label)}
                        className="w-full flex items-center gap-2 px-3.5 py-2 text-[0.78rem] text-neutral-300 hover:bg-surface-200 hover:text-white transition-colors text-left"
                      >
                        <span className="text-sm">{topic.icon}</span>
                        <span>{topic.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* ── Disconnected: full hero ── */
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 lg:gap-12 py-5 lg:py-14">
            <div className="lg:col-span-2 flex flex-col justify-center">
              <p className="text-brand-500 text-xs font-semibold tracking-widest uppercase mb-4">
                {t("heroTagline")}
              </p>
              <h1 className="font-heading text-3xl sm:text-5xl lg:text-6xl font-bold leading-[1.1] mb-4 sm:mb-5 tracking-tight gradient-text">
                {t("heroTitle")}
              </h1>
              <p className="text-neutral-400 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                {t("heroDesc")}
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={connectWallet}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97] flex items-center gap-2"
                >
                  {t("connectPhantom")}
                  <ArrowRight size={16} />
                </button>
                <Link
                  href="/polls"
                  className="px-6 py-3 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg font-semibold text-sm text-neutral-300 transition-colors active:scale-[0.97]"
                >
                  {t("browsePolls")}
                </Link>
              </div>
              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-neutral-500">
                  <BarChart3 size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? polls.length : 0}</span> {t("polls").toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Users size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? totalVotes : 0}</span> {t("votes").toLowerCase()}</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Zap size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? formatDollars(totalVolume) : formatDollars(0)}</span> {t("totalVolume").toLowerCase()}</span>
                </div>
              </div>
            </div>

            {/* Right side — Featured poll card */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              {trending.length > 0 ? (
                <div className="w-full">
                  <AnimatePresence mode="wait">
                    <motion.div
                      key={activeFeaturedIndex}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -12 }}
                      transition={{ duration: 0.35, ease: "easeInOut" }}
                    >
                      <FeaturedPollHeroCard poll={trending[activeFeaturedIndex] || trending[0]} />
                    </motion.div>
                  </AnimatePresence>
                  {/* Dot indicators + Prev/Next buttons */}
                  {trending.length > 1 && (
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex gap-2.5 items-center">
                        {trending.map((_, i) => (
                          <button
                            key={i}
                            onClick={() => setActiveFeaturedIndex(i)}
                            className={`h-1.5 rounded-full transition-all duration-300 ${i === activeFeaturedIndex ? "w-6 bg-brand-500" : "w-2 bg-white/20 hover:bg-white/40"
                              }`}
                            aria-label={`Go to featured poll ${i + 1}`}
                          />
                        ))}
                      </div>
                      {/* Prev / Next pills */}
                      <div className="flex items-center gap-1.5">
                        <button
                          onClick={() => setActiveFeaturedIndex((prev) => (prev - 1 + trending.length) % trending.length)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[0.7rem] text-neutral-400 transition-colors"
                        >
                          <span className="text-neutral-500">‹</span>
                          <span>Previous</span>
                        </button>
                        <button
                          onClick={() => setActiveFeaturedIndex((prev) => (prev + 1) % trending.length)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-[0.7rem] text-neutral-400 transition-colors"
                        >
                          <span>Next</span>
                          <span className="text-neutral-500">›</span>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full p-8 bg-surface-100 border border-border rounded-xl text-center">
                  <BarChart3 size={32} className="text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">No active polls yet</p>
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1 py-2" role="tablist" aria-label="Category filters">
        {CATEGORY_META.map((cat) => {
          const isTrending = cat.label === "Trending";
          const isActive = isTrending
            ? !catFilter || catFilter === "Trending"
            : catFilter === cat.label;
          const href = isTrending ? "/" : `/?cat=${encodeURIComponent(cat.label)}`;
          return (
            <Link
              key={cat.label}
              href={href}
              role="tab"
              aria-selected={isActive}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-full text-[13px] font-medium whitespace-nowrap transition-all ${isActive
                ? "bg-brand-500/15 text-brand-400 border border-brand-500/25 shadow-sm shadow-brand-500/10"
                : "text-neutral-500 hover:text-neutral-300 hover:bg-surface-200 border border-border/40"
                }`}
            >
              <span className="text-sm leading-none">{cat.icon}</span>
              {tCat(cat.label, lang)}
            </Link>
          );
        })}
      </div>

      {/* ── Content ── */}
      {filteredPolls ? (
        <section role="tabpanel">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-heading text-lg font-semibold flex items-center gap-2 text-neutral-100">
              <span>{CATEGORY_META.find((c) => c.label === catFilter)?.icon}</span>
              {tCat(catFilter!, lang)}
            </h2>
            <Link
              href="/"
              className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors"
            >
              &larr; {t("allCategories")}
            </Link>
          </div>
          {filteredPolls.length === 0 ? (
            <div className="text-center py-16 text-neutral-500">
              <p className="text-sm mb-1">No polls in {tCat(catFilter!, lang)}</p>
              <p className="text-xs text-neutral-600 mb-4">Be the first to create one!</p>
              <Link href="/create" className="inline-flex items-center gap-1.5 text-brand-400 hover:text-brand-300 font-medium text-sm transition-colors">
                Create a Poll <span className="text-lg">+</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPolls.map((poll) => (
                <PollCard key={poll.id} poll={poll} />
              ))}
            </div>
          )}
        </section>
      ) : (
        <>
          {/* ── Trending ── */}
          {isLoading ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-neutral-100">Trending</h2>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <SkeletonCard key={i} delay={i * 0.07} />
                ))}
              </div>
            </section>
          ) : polls.length > 0 ? (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold text-neutral-100">Trending</h2>
                <div className="flex items-center gap-3">
                  <div className="flex bg-surface-100 border border-border rounded-lg p-0.5">
                    {TRENDING_WINDOWS.map((w) => (
                      <button
                        key={w.key}
                        onClick={() => setTrendingWindow(w.key)}
                        className={`px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors ${trendingWindow === w.key
                          ? "bg-brand-500/15 text-brand-400"
                          : "text-neutral-500 hover:text-neutral-300"
                          }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <Link
                    href="/polls"
                    className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors hidden sm:flex items-center gap-1"
                  >
                    {t("seeAll")} <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
              {trending.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {trending.map((poll) => (
                    <PollCard key={poll.id} poll={poll} />
                  ))}
                </div>
              ) : (
                <div className="text-center py-10 text-neutral-600">
                  <p className="text-xs">No trending polls in this window. Try a longer period.</p>
                </div>
              )}
            </section>
          ) : null}

          {/* ── Ending Soon ── */}
          {endingSoon.length > 0 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2 text-neutral-100">
                  <span>⏰</span>
                  Ending Soon
                </h2>
                <Link
                  href="/polls?sort=ending-soon"
                  className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors flex items-center gap-1"
                >
                  {t("seeAll")} <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {endingSoon.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            </section>
          )}

          {/* ── Category Sections ── */}
          {categorySections.map((cat) => (
            <section key={cat.label}>
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-heading text-lg font-semibold flex items-center gap-2 text-neutral-100">
                  <span>{cat.icon}</span>
                  {tCat(cat.label, lang)}
                </h2>
                <Link
                  href={`/polls?cat=${cat.label}`}
                  className="text-xs text-brand-500 hover:text-brand-400 font-medium transition-colors flex items-center gap-1"
                >
                  {t("seeAll")} <ArrowRight size={12} />
                </Link>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {cat.polls.map((poll) => (
                  <PollCard key={poll.id} poll={poll} />
                ))}
              </div>
            </section>
          ))}
        </>
      )}

      {/* ── Empty state ── */}
      {polls.length === 0 && !isLoading && (
        <section className="text-center py-16">
          <BarChart3 size={32} className="text-neutral-700 mx-auto mb-4" />
          <h2 className="font-heading text-lg font-semibold mb-2 text-neutral-300">{t("noPollsYet")}</h2>
          <p className="text-neutral-500 text-sm mb-6">{t("beFirstToCreate")}</p>
          <div className="flex items-center justify-center gap-3">
            {!walletConnected && (
              <button
                onClick={connectWallet}
                className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97]"
              >
                {t("connectPhantom")}
              </button>
            )}
            <Link
              href="/create"
              className="px-6 py-3 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg font-semibold text-sm text-neutral-300 transition-colors active:scale-[0.97]"
            >
              {t("createPoll")}
            </Link>
          </div>
        </section>
      )}

    </div>
  );
}
