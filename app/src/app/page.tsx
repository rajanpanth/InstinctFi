"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useApp, formatDollars, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";
import SkeletonCard from "@/components/SkeletonCard";
import { CATEGORY_META } from "@/lib/constants";
import { useLanguage } from "@/lib/languageContext";
import { tCat } from "@/lib/translations";

const CATEGORY_SECTIONS = CATEGORY_META.filter(c => c.label !== "Trending");

type TrendingWindow = "24h" | "7d" | "30d" | "all";
const TRENDING_WINDOWS: { key: TrendingWindow; label: string; ms: number }[] = [
  { key: "24h", label: "24h", ms: 24 * 60 * 60 * 1000 },
  { key: "7d", label: "7 days", ms: 7 * 24 * 60 * 60 * 1000 },
  { key: "30d", label: "30 days", ms: 30 * 24 * 60 * 60 * 1000 },
  { key: "all", label: "All time", ms: Infinity },
];

function getTrendingPolls(polls: DemoPoll[], limit = 6, windowMs = Infinity): DemoPoll[] {
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  // createdAt is in seconds, convert to ms for comparison
  const cutoff = windowMs === Infinity ? 0 : now - windowMs;
  return [...polls]
    .filter((p) => p.status === 0 && p.createdAt * 1000 >= cutoff)
    .sort((a, b) => {
      const aVotes = a.voteCounts.reduce((s, v) => s + v, 0);
      const bVotes = b.voteCounts.reduce((s, v) => s + v, 0);
      // Time-weighted trending: recent polls with high votes score higher
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
    <Suspense fallback={
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 py-8">
        {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
      </div>
    }>
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

  // If a category filter is active, show only that category
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

  return (
    <div className="space-y-8 sm:space-y-12">

      {/* ── Hero Section ── */}
      {!walletConnected ? (
        <section className="text-center py-10 sm:py-16 md:py-20 section-animate">
          {/* Decorative glow */}
          <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none" aria-hidden>
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-primary-600/[0.07] rounded-full blur-[100px]" />
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 mb-6 rounded-full bg-primary-600/10 border border-primary-500/20 text-primary-400 text-xs font-medium">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            {t("liveOnDevnet")}
          </div>
          <h1 className="text-4xl sm:text-5xl md:text-7xl font-extrabold mb-5 sm:mb-6 tracking-tight">
            <span className="gradient-text">
              {t("predictVoteWin")}
            </span>
          </h1>
          <p className="text-base sm:text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-4 sm:mb-5 px-4 leading-relaxed">
            {t("heroDesc")}
          </p>
          <p className="text-accent-400 mb-8 sm:mb-10 text-sm sm:text-base font-medium"
             dangerouslySetInnerHTML={{ __html: t("heroSignup") }} />
          <button
            onClick={connectWallet}
            className="btn-glow px-7 sm:px-10 py-3.5 sm:py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-2xl font-bold text-base sm:text-lg transition-all transform hover:scale-105 active:scale-[0.98] flex items-center gap-2.5 sm:gap-3 mx-auto shadow-lg shadow-purple-600/25"
          >
            <svg width="22" height="22" viewBox="0 0 40 40" fill="currentColor">
              <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
            </svg>
            {t("connectPhantomWallet")}
          </button>
          {/* Trust badges */}
          <div className="flex items-center justify-center gap-6 mt-10 text-xs text-gray-500">
            <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-green-500"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> {t("nonCustodial")}</span>
            <span className="flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-blue-400"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg> {t("instantSettlement")}</span>
            <span className="hidden sm:flex items-center gap-1.5"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-purple-400"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg> {t("poweredBySolana")}</span>
          </div>
        </section>
      ) : (
        <section className="text-center py-6 sm:py-10 section-animate relative">
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-extrabold mb-4 tracking-tight">
            <span className="gradient-text">
              {t("welcomeBack")}
            </span>
          </h1>
          {userAccount && (
            <div className="inline-flex items-center gap-3 px-5 py-2.5 mb-6 rounded-2xl bg-dark-700/60 border border-gray-800/80">
              <span className="text-sm text-gray-400">{t("balance")}</span>
              <span className="text-accent-400 font-bold text-lg">
                {formatDollars(userAccount.balance)}
              </span>
            </div>
          )}
          <div className="flex gap-3 justify-center">
            <Link href="/polls" className="btn-glow px-6 sm:px-8 py-2.5 sm:py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 rounded-xl font-semibold transition-all text-sm sm:text-base active:scale-[0.97]">
              {t("browsePolls")}
            </Link>
            <Link href="/create" className="px-6 sm:px-8 py-2.5 sm:py-3 bg-dark-700/80 hover:bg-dark-700 border border-gray-700/80 hover:border-gray-600 rounded-xl font-semibold transition-all text-sm sm:text-base active:scale-[0.97]">
              {t("createPollPlus")}
            </Link>
          </div>
        </section>
      )}

      {/* ── Trending Polls ── */}
      {/* ── Category Filter Active ── */}
      {filteredPolls ? (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>{CATEGORY_META.find(c => c.label === catFilter)?.icon}</span>
              <span className={CATEGORY_META.find(c => c.label === catFilter)?.color}>{tCat(catFilter!, lang)}</span>
            </h2>
            <Link href="/" className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors">
              &larr; {t("allCategories")}
            </Link>
          </div>
          {filteredPolls.length === 0 ? (
            <div className="text-center py-16 text-gray-500">
              <p className="text-lg mb-2">No polls in {tCat(catFilter!, lang)}</p>
              <p className="text-sm">Be the first to create one!</p>
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
      {isLoading ? (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🔥</span> Trending
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        </section>
      ) : polls.length > 0 ? (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🔥</span> Trending
            </h2>
            <div className="flex items-center gap-2">
              <div className="flex bg-dark-800 rounded-lg p-0.5">
                {TRENDING_WINDOWS.map((w) => (
                  <button
                    key={w.key}
                    onClick={() => setTrendingWindow(w.key)}
                    className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                      trendingWindow === w.key
                        ? "bg-accent-500 text-white"
                        : "text-gray-400 hover:text-white"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
              <Link href="/polls" className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors hidden sm:block">
                {t("seeAll")} &rarr;
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
            <div className="text-center py-10 text-gray-500">
              <p className="text-sm">No trending polls in this time window. Try a longer period.</p>
            </div>
          )}
        </section>
      ) : null}

      {/* ── Category Sections ── */}
      {categorySections.map((cat) => (
        <section key={cat.label}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>{cat.icon}</span>
              <span className={cat.color}>{tCat(cat.label, lang)}</span>
            </h2>
            <Link href={`/polls?cat=${cat.label}`} className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors">
              {t("seeAll")} &rarr;
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
      {polls.length === 0 && (
        <section className="text-center py-16">
          <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-dark-700/60 border border-gray-800/60 flex items-center justify-center">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500"><path d="M18 20V10M12 20V4M6 20v-6"/></svg>
          </div>
          <h2 className="text-xl font-semibold mb-2 text-gray-300">{t("noPollsYet")}</h2>
          <p className="text-gray-500 mb-6">{t("beFirstToCreate")}</p>
          {walletConnected ? (
            <Link href="/create" className="btn-glow px-6 py-3 bg-gradient-to-r from-primary-600 to-indigo-600 hover:from-primary-500 hover:to-indigo-500 rounded-xl font-semibold transition-all active:scale-[0.97]">
              {t("createPoll")}
            </Link>
          ) : (
            <button onClick={connectWallet} className="btn-glow px-6 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-semibold transition-all active:scale-[0.97]">
              {t("connectWalletToStart")}
            </button>
          )}
        </section>
      )}

      {/* ── How It Works ── */}
      <section className="pt-6 sm:pt-10 section-animate">
        <h2 className="text-xl sm:text-2xl font-bold text-center mb-8 sm:mb-10">{t("howItWorks")}</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-5">
          {[
            { step: "1", title: t("step1Title"), desc: t("step1Desc"), icon: "M12 5v14M5 12h14" },
            { step: "2", title: t("step2Title"), desc: t("step2Desc"), icon: "M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z M7 7h.01" },
            { step: "3", title: t("step3Title"), desc: t("step3Desc"), icon: "M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z M12 6v6l4 2" },
            { step: "4", title: t("step4Title"), desc: t("step4Desc"), icon: "M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" },
          ].map((item) => (
            <div key={item.step} className="bg-dark-700/40 border border-gray-800/60 rounded-2xl p-4 sm:p-6 text-center card-hover group">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary-600/20 to-accent-500/10 border border-primary-500/20 text-primary-400 flex items-center justify-center mx-auto mb-3 sm:mb-4 group-hover:border-primary-500/40 transition-colors">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                </svg>
              </div>
              <h3 className="font-semibold mb-1.5 text-sm sm:text-base">{item.title}</h3>
              <p className="text-gray-400 text-xs sm:text-sm leading-relaxed">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
