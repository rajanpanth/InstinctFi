"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname, useSearchParams } from "next/navigation";
import { useApp, formatDollars } from "./Providers";
import { CATEGORY_META, isAdminWallet } from "@/lib/constants";
import { tCat } from "@/lib/translations";
import { useDailyCountdown } from "@/lib/useCountdown";
import { shortAddr } from "@/lib/utils";
import DarkModeToggle from "./DarkModeToggle";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";
import { useLanguage } from "@/lib/languageContext";
import toast from "react-hot-toast";

/* ── Compact claim timer for navbar ── */
function NavClaimTimer({ lastClaimTs, onClaim }: { lastClaimTs: number; onClaim: () => Promise<boolean> }) {
  const { timeLeft, canClaim, progress: pct } = useDailyCountdown(lastClaimTs);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const ok = await onClaim();
      if (ok) {
        setClaimed(true);
        toast.success("Airdrop received!");
        setTimeout(() => setClaimed(false), 2000);
      }
    } finally {
      setClaiming(false);
    }
  };

  if (canClaim) {
    return (
      <button
        onClick={handleClaim}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-[11px] font-bold transition-all ${
          claimed
            ? "bg-green-600 text-white scale-95"
            : "bg-green-500/15 text-green-400 border border-green-500/30 hover:bg-green-500/25 hover:scale-[1.03]"
        }`}
      >
        <span className="relative flex h-2 w-2 shrink-0">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
        </span>
        {claimed ? "✓" : "◎ SOL"}
      </button>
    );
  }

  return (
    <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-dark-800/80 border border-gray-700/50 rounded-lg" title={`Next daily claim in ${timeLeft}`}>
      {/* Mini circular progress */}
      <div className="relative w-4 h-4 shrink-0">
        <svg viewBox="0 0 20 20" className="w-4 h-4 -rotate-90">
          <circle cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5" className="text-gray-700" />
          <circle
            cx="10" cy="10" r="8" fill="none" stroke="currentColor" strokeWidth="2.5"
            className="text-primary-500/70"
            strokeDasharray={`${pct * 0.5027} 50.27`}
            strokeLinecap="round"
          />
        </svg>
      </div>
      <span className="text-[10px] text-gray-400 font-mono tabular-nums whitespace-nowrap">{timeLeft}</span>
    </div>
  );
}

const NAV_CATEGORIES = CATEGORY_META.map(c => ({
  label: c.label,
  icon: c.icon,
  href: c.label === "Trending" ? "/" : `/?cat=${encodeURIComponent(c.label)}`,
}));

export function Navbar() {
  const {
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    userAccount,
    claimDailyReward,
    polls,
    votes,
  } = useApp();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentCat = searchParams.get("cat") || "";
  const { t, lang } = useLanguage();

  const dailyAvailable =
    userAccount &&
    Date.now() - userAccount.lastWeeklyRewardTs >= 24 * 60 * 60 * 1000;

  // Count unclaimed rewards from settled polls
  const unclaimedRewards = useMemo(() => {
    if (!walletConnected || !votes.length || !polls.length) return 0;
    let count = 0;
    for (const v of votes) {
      const poll = polls.find(p => p.id === v.pollId);
      if (!poll) continue;
      const isSettled = poll.status === 2;
      if (isSettled && !v.claimed && poll.winningOption !== 255) {
        const userVotesOnWinner = v.votesPerOption[poll.winningOption] || 0;
        if (userVotesOnWinner > 0) count++;
      }
    }
    return count;
  }, [walletConnected, votes, polls]);

  const isActive = (href: string) => {
    if (href.startsWith("/?")) return pathname === "/";
    return pathname === href;
  };

  return (
    <>
    <nav className="border-b border-gray-800/50 glass fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)]">
      {/* Top bar */}
      <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14 md:h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-1.5 sm:gap-2.5 shrink-0 group">
            <Image src="/logo.svg" alt="InstinctFi" width={32} height={32} className="rounded-lg sm:w-9 sm:h-9 transition-transform group-hover:scale-105" />
            <span className="text-lg sm:text-xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              InstinctFi
            </span>
          </Link>

          {/* Center: Page links — pill container */}
          <div className="hidden md:flex items-center gap-0.5 bg-dark-800/50 border border-gray-800/40 rounded-xl p-1">
            {[
              { href: "/polls", label: t("polls"), icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
              { href: "/create", label: t("create"), icon: "M12 5v14M5 12h14" },
              { href: "/leaderboard", label: t("leaderboard"), icon: "M8 21V11M12 21V3M16 21V7" },
              { href: "/activity", label: t("activity"), icon: "M22 12h-4l-3 9L9 3l-3 9H2" },
              { href: "/profile", label: t("profile"), icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2", extra: "M12 7a4 4 0 100-8 4 4 0 000 8", badge: unclaimedRewards },
            ].map((item) => {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary-600/20 text-primary-400 shadow-sm shadow-primary-500/10"
                      : "text-gray-400 hover:text-white hover:bg-dark-600/50"
                  }`}
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={active ? "text-primary-400" : "text-gray-500"}>
                    <path d={item.icon} />
                    {item.extra && <path d={item.extra} />}
                  </svg>
                  {item.label}
                  {item.badge !== undefined && item.badge > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-green-500 text-[9px] font-bold text-white px-1">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
            {isAdminWallet(walletAddress) && (
              <Link
                href="/admin"
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 ${
                  pathname === "/admin"
                    ? "bg-red-600/15 text-red-400"
                    : "text-gray-400 hover:text-white hover:bg-dark-600/50"
                }`}
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={pathname === "/admin" ? "text-red-400" : "text-gray-500"}>
                  <circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
                </svg>
                Admin
              </Link>
            )}
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <LanguageToggle />
            <DarkModeToggle />
            {walletConnected && <NotificationBell />}
            {walletConnected ? (
              <>
                {/* Timer + Balance combined pill */}
                <div className="flex items-center bg-dark-800/60 border border-gray-700/50 rounded-xl overflow-hidden shadow-sm">
                  {/* Claim timer (left side) */}
                  <div className="border-r border-gray-700/30 flex items-center">
                    <NavClaimTimer lastClaimTs={userAccount?.lastWeeklyRewardTs ?? 0} onClaim={claimDailyReward} />
                  </div>
                  {/* Balance (right side) */}
                  <div className="flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5">
                    <svg width="14" height="14" viewBox="0 0 397.7 311.7" className="shrink-0 hidden sm:block">
                      <linearGradient id="sol-nav" x1="360.9" y1="351.5" x2="141.2" y2="-69.2" gradientUnits="userSpaceOnUse" gradientTransform="translate(0 -25)">
                        <stop offset="0" stopColor="#00FFA3"/><stop offset="1" stopColor="#DC1FFF"/>
                      </linearGradient>
                      <path fill="url(#sol-nav)" d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z"/>
                      <path fill="url(#sol-nav)" d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z"/>
                      <path fill="url(#sol-nav)" d="M333.1 120c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1L333.1 120z"/>
                    </svg>
                    <span className="text-accent-400 font-bold text-[11px] sm:text-sm tabular-nums">
                      {userAccount ? formatDollars(userAccount.balance) : "..."}
                    </span>
                  </div>
                </div>
                {/* Wallet address pill */}
                <button
                  onClick={disconnectWallet}
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-dark-800/60 hover:bg-dark-700 border border-gray-700/50 rounded-xl text-sm font-mono text-gray-300 transition-all hover:border-gray-600/60 shadow-sm group"
                  title="Click to disconnect"
                >
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0" />
                  {shortAddr(walletAddress!)}
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-500 group-hover:text-red-400 transition-colors shrink-0">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" strokeLinecap="round" strokeLinejoin="round" />
                    <polyline points="16 17 21 12 16 7" strokeLinecap="round" strokeLinejoin="round" />
                    <line x1="21" y1="12" x2="9" y2="12" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
                {/* Mobile disconnect — icon only */}
                <button
                  onClick={disconnectWallet}
                  className="sm:hidden w-8 h-8 flex items-center justify-center bg-dark-700/80 border border-gray-700/60 rounded-xl text-gray-400 hover:text-gray-200 transition-colors"
                  title="Disconnect wallet"
                  aria-label="Disconnect wallet"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
                    <polyline points="16 17 21 12 16 7" />
                    <line x1="21" y1="12" x2="9" y2="12" />
                  </svg>
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="px-3 sm:px-5 py-2 sm:py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2 shadow-md shadow-purple-900/30 hover:shadow-lg hover:shadow-purple-900/40 active:scale-[0.97]"
              >
                <svg width="16" height="16" viewBox="0 0 40 40" fill="currentColor" className="hidden sm:block">
                  <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
                </svg>
                Connect<span className="hidden sm:inline"> Phantom</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Category bar */}
      <div className="border-t border-gray-800/40">
        <div className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center gap-0.5 sm:gap-0.5 overflow-x-auto scrollbar-hide py-1.5 sm:py-2 -mx-1 px-1">
            {NAV_CATEGORIES.map((cat) => {
              const isTrending = cat.label === "Trending";
              const active = isTrending
                ? pathname === "/" && !currentCat
                : currentCat === cat.label;
              return (
                <Link
                  key={cat.label}
                  href={cat.href}
                  className={`flex items-center gap-1 sm:gap-1.5 px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-lg text-xs sm:text-[13px] font-medium whitespace-nowrap transition-all duration-200 ${
                    active
                      ? "bg-primary-600/15 text-primary-400 shadow-sm shadow-primary-500/5"
                      : "text-gray-500 hover:text-gray-200 hover:bg-dark-700/40"
                  }`}
                >
                  <span className="text-[10px] sm:text-xs">{cat.icon}</span>
                  {tCat(cat.label, lang)}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>

      {/* Mobile bottom nav — rendered outside <nav> to avoid backdrop-filter containing block issues */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-bottom-nav">
        <div className="mx-2 mb-2 rounded-2xl bg-dark-800/90 backdrop-blur-xl border border-gray-700/40 shadow-xl shadow-black/40">
          <div className="flex justify-around items-center py-2 px-1">
            {[
              { href: "/", label: t("home"), icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", extra: "M9 22V12h6v10" },
              { href: "/polls", label: t("polls"), icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
              { href: "/create", label: t("create"), isSpecial: true, icon: "M12 5v14M5 12h14" },
              { href: "/activity", label: t("feed"), icon: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8" },
              { href: "/profile", label: t("profile"), icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8", hasBadge: dailyAvailable || unclaimedRewards > 0 },
            ].map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href;
              const isSpecial = "isSpecial" in item && item.isSpecial;

              if (isSpecial) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative flex flex-col items-center gap-0.5 -mt-4 transition-all duration-200 active:scale-90`}
                  >
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg ${
                      active
                        ? "bg-gradient-to-br from-primary-500 to-indigo-600 shadow-primary-500/30"
                        : "bg-gradient-to-br from-primary-600 to-indigo-700 shadow-primary-600/20"
                    }`}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.icon} />
                      </svg>
                    </div>
                    <span className={`text-[9px] font-semibold mt-0.5 ${active ? "text-primary-400" : "text-gray-500"}`}>{item.label}</span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[52px] transition-all duration-200 ${
                    active ? "text-primary-400" : "text-gray-500 active:scale-95"
                  }`}
                >
                  {"hasBadge" in item && item.hasBadge && (
                    <span className="absolute top-0.5 right-1 flex h-2.5 w-2.5">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                    </span>
                  )}
                  <svg width="20" height="20" viewBox="0 0 24 24" fill={active ? "currentColor" : "none"} stroke="currentColor" strokeWidth={active ? "1.5" : "1.8"} strokeLinecap="round" strokeLinejoin="round" className="transition-all">
                    <path d={item.icon} />
                    {item.extra && <path d={item.extra} />}
                  </svg>
                  {active && (
                    <span className="w-1 h-1 rounded-full bg-primary-400 mt-0.5" />
                  )}
                  {!active && (
                    <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}
