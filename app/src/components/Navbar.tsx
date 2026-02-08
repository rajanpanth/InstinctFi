"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp, formatDollars } from "./Providers";
import { CATEGORY_META } from "@/lib/constants";
import toast from "react-hot-toast";

/* ── Compact claim timer for navbar ── */
function NavClaimTimer({ lastClaimTs, onClaim }: { lastClaimTs: number; onClaim: () => Promise<boolean> }) {
  const [timeLeft, setTimeLeft] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [pct, setPct] = useState(0);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const tick = () => {
      const diff = lastClaimTs + DAY_MS - Date.now();
      if (diff <= 0) {
        setCanClaim(true);
        setTimeLeft("Ready");
        setPct(100);
        return;
      }
      setCanClaim(false);
      setPct(Math.min(100, ((DAY_MS - diff) / DAY_MS) * 100));
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTimeLeft(`${h}h ${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastClaimTs]);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const ok = await onClaim();
      if (ok) {
        setClaimed(true);
        toast.success("Claimed $100!");
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
        {claimed ? "✓" : "$100"}
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
      <span className="text-[10px] text-gray-500 font-mono tabular-nums whitespace-nowrap">{timeLeft}</span>
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
  } = useApp();
  const pathname = usePathname();

  const shortAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;

  const dailyAvailable =
    userAccount &&
    Date.now() - userAccount.lastWeeklyRewardTs >= 24 * 60 * 60 * 1000;

  const isActive = (href: string) => {
    if (href.startsWith("/?")) return pathname === "/";
    return pathname === href;
  };

  return (
    <nav className="border-b border-gray-800/80 bg-dark-900/90 backdrop-blur-md sticky top-0 z-50">
      {/* Top bar */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <span className="text-xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              InstinctFi
            </span>
          </Link>

          {/* Center: Page links */}
          <div className="hidden md:flex items-center gap-1">
            <Link
              href="/polls"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/polls"
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-gray-400 hover:text-white hover:bg-dark-700"
              }`}
            >
              Polls
            </Link>
            <Link
              href="/create"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/create"
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-gray-400 hover:text-white hover:bg-dark-700"
              }`}
            >
              Create
            </Link>
            <Link
              href="/leaderboard"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/leaderboard"
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-gray-400 hover:text-white hover:bg-dark-700"
              }`}
            >
              Leaderboard
            </Link>
            <Link
              href="/profile"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                pathname === "/profile"
                  ? "bg-primary-600/20 text-primary-400"
                  : "text-gray-400 hover:text-white hover:bg-dark-700"
              }`}
            >
              Profile
            </Link>
          </div>

          {/* Right side */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            {walletConnected && userAccount ? (
              <>
                {/* Timer + Balance combined pill */}
                <div className="flex items-center gap-0 bg-dark-700 border border-gray-700 rounded-lg overflow-hidden">
                  {/* Claim timer (left side) */}
                  <div className="border-r border-gray-700/60 flex items-center">
                    <NavClaimTimer lastClaimTs={userAccount.lastWeeklyRewardTs} onClaim={claimDailyReward} />
                  </div>
                  {/* Balance (right side) */}
                  <div className="px-2 sm:px-2.5 py-1.5">
                    <span className="text-accent-400 font-bold text-xs sm:text-sm">
                      {formatDollars(userAccount.balance)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={disconnectWallet}
                  className="hidden sm:block px-2.5 py-1.5 bg-dark-700 hover:bg-dark-800 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 transition-colors"
                  title="Click to disconnect"
                >
                  {shortAddr(walletAddress!)}
                </button>
                {/* Mobile disconnect — icon only */}
                <button
                  onClick={disconnectWallet}
                  className="sm:hidden w-8 h-8 flex items-center justify-center bg-dark-700 border border-gray-700 rounded-lg text-gray-400"
                  title="Disconnect wallet"
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
                className="px-3 sm:px-4 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-semibold text-xs sm:text-sm transition-all flex items-center gap-1.5 sm:gap-2"
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
      <div className="border-t border-gray-800/50">
        <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-2">
            {NAV_CATEGORIES.map((cat) => (
              <Link
                key={cat.label}
                href={cat.href}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors text-gray-400 hover:text-white hover:bg-dark-700/60"
              >
                <span className="text-xs">{cat.icon}</span>
                {cat.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Mobile bottom nav — fixed to bottom for easy thumb access */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-dark-900/95 backdrop-blur-md border-t border-gray-800/80 mobile-bottom-nav">
        <div className="flex justify-around py-2 px-2">
          {[
            { href: "/", label: "Home", icon: "M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z", extra: "M9 22V12h6v10" },
            { href: "/polls", label: "Polls", icon: "M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z" },
            { href: "/create", label: "Create", icon: "M12 5v14M5 12h14" },
            { href: "/leaderboard", label: "Board", icon: "M8 21V12H4l8-9 8 9h-4v9" },
            { href: "/profile", label: "Profile", icon: "M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 7a4 4 0 100-8 4 4 0 000 8", hasBadge: dailyAvailable },
          ].map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 py-1.5 px-2 rounded-lg min-w-[52px] transition-colors ${
                  active ? "text-primary-400" : "text-gray-500"
                }`}
              >
                {"hasBadge" in item && item.hasBadge && (
                  <span className="absolute top-1 right-1.5 flex h-2.5 w-2.5">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                  </span>
                )}
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d={item.icon} />
                  {item.extra && <path d={item.extra} />}
                </svg>
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
