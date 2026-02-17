"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp, formatDollars, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";
import { CATEGORY_META } from "@/lib/constants";
import { useLanguage } from "@/lib/languageContext";
import { tCat } from "@/lib/translations";
import { ArrowRight, Zap, BarChart3, Users, Github, ExternalLink } from "lucide-react";

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
    .filter((p) => p.status === 0 && p.createdAt * 1000 >= cutoff)
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

export default function Home() {
  return (
    <Suspense
      fallback={
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
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

  const windowMs = TRENDING_WINDOWS.find((w) => w.key === trendingWindow)?.ms ?? Infinity;
  const trending = useMemo(() => getTrendingPolls(polls, 6, windowMs), [polls, windowMs]);

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

  // Live stats — deferred to client to avoid hydration mismatch (server=0 vs client=N)
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const totalVotes = polls.reduce((sum, p) => sum + p.voteCounts.reduce((a, b) => a + b, 0), 0);
  const totalVolume = polls.reduce((sum, p) => sum + p.totalPoolCents, 0);

  return (
    <div className="space-y-10">
      {/* ── Hero Section ── */}
      {!walletConnected ? (
        <section className="section-animate">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 lg:gap-12 py-8 lg:py-14">
            {/* Left side — Text */}
            <div className="lg:col-span-3 flex flex-col justify-center">
              <p className="text-brand-500 text-xs font-semibold tracking-widest uppercase mb-4">
                Prediction Markets on Solana
              </p>
              <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-bold text-neutral-100 leading-[1.1] mb-5 tracking-tight">
                Trust Your{" "}
                <span className="gradient-text">Instinct.</span>
              </h1>
              <p className="text-neutral-400 text-base sm:text-lg leading-relaxed mb-8 max-w-lg">
                {t("heroDesc")}
              </p>
              <div className="flex flex-wrap gap-3 mb-8">
                <button
                  onClick={connectWallet}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97] flex items-center gap-2"
                >
                  Connect Wallet
                  <ArrowRight size={16} />
                </button>
                <Link
                  href="/polls"
                  className="px-6 py-3 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg font-semibold text-sm text-neutral-300 transition-colors active:scale-[0.97]"
                >
                  Browse Polls
                </Link>
              </div>
              {/* Stats */}
              <div className="flex items-center gap-6 text-sm">
                <div className="flex items-center gap-2 text-neutral-500">
                  <BarChart3 size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? polls.length : 0}</span> polls</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Users size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? totalVotes : 0}</span> votes</span>
                </div>
                <div className="flex items-center gap-2 text-neutral-500">
                  <Zap size={14} className="text-brand-500" />
                  <span><span className="text-neutral-200 font-semibold">{mounted ? formatDollars(totalVolume) : formatDollars(0)}</span> volume</span>
                </div>
              </div>
            </div>

            {/* Right side — Featured poll preview */}
            <div className="lg:col-span-2 flex items-center">
              {trending.length > 0 ? (
                <div className="w-full">
                  <p className="text-[11px] text-neutral-500 uppercase tracking-wider font-medium mb-3">
                    Featured Poll
                  </p>
                  <PollCard poll={trending[0]} />
                </div>
              ) : (
                <div className="w-full p-8 bg-surface-100 border border-border rounded-xl text-center">
                  <BarChart3 size={32} className="text-neutral-700 mx-auto mb-3" />
                  <p className="text-neutral-500 text-sm">No active polls yet</p>
                </div>
              )}
            </div>
          </div>
        </section>
      ) : (
        <section className="section-animate py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="font-heading text-2xl sm:text-3xl font-bold text-neutral-100 mb-1">
                {t("welcomeBack")}
              </h1>
              {userAccount && (
                <p className="text-neutral-500 text-sm">
                  {t("balance")}: <span className="text-brand-400 font-semibold">{formatDollars(userAccount.balance)}</span>
                </p>
              )}
            </div>
            <div className="flex gap-2">
              <Link
                href="/polls"
                className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97]"
              >
                {t("browsePolls")}
              </Link>
              <Link
                href="/create"
                className="px-5 py-2.5 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg font-semibold text-sm text-neutral-300 transition-colors active:scale-[0.97]"
              >
                {t("createPollPlus")}
              </Link>
            </div>
          </div>
        </section>
      )}

      {/* ── Category Filter Pills ── */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-hide -mx-1 px-1 pb-2">
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
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${isActive
                  ? "bg-brand-500/10 text-brand-400 border border-brand-500/20"
                  : "text-neutral-500 hover:text-neutral-300 hover:bg-surface-200 border border-transparent"
                }`}
            >
              <span className="text-xs">{cat.icon}</span>
              {tCat(cat.label, lang)}
            </Link>
          );
        })}
      </div>

      {/* ── Content ── */}
      {filteredPolls ? (
        <section>
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
              <p className="text-xs text-neutral-600">Be the first to create one!</p>
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
                  <SkeletonCard key={i} />
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
          {walletConnected ? (
            <Link
              href="/create"
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97]"
            >
              {t("createPoll")}
            </Link>
          ) : (
            <button
              onClick={connectWallet}
              className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-sm text-white transition-colors active:scale-[0.97]"
            >
              {t("connectWalletToStart")}
            </button>
          )}
        </section>
      )}

      {/* ── Footer ── */}
      <footer className="border-t border-border pt-8 pb-4 mt-12">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <span className="font-heading font-bold text-neutral-300">
              Instinct<span className="text-brand-500">Fi</span>
            </span>
            <p className="text-neutral-600 text-xs mt-1">
              Decentralized prediction polls on Solana
            </p>
          </div>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              <Github size={16} />
            </a>
            <a
              href="https://twitter.com"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
            >
              <ExternalLink size={16} />
            </a>
            <span className="text-[10px] text-neutral-600 px-2 py-0.5 bg-surface-100 border border-border rounded">
              Solana Devnet
            </span>
          </div>
        </div>
        <p className="text-neutral-700 text-[10px] mt-4">
          © {new Date().getFullYear()} InstinctFi. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
