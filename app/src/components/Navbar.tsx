"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useApp, formatDollars, PollStatus, WINNING_OPTION_UNSET } from "./Providers";
import { isAdminWallet } from "@/lib/constants";
import { shortAddr } from "@/lib/utils";
import DarkModeToggle from "./DarkModeToggle";
import LanguageToggle from "./LanguageToggle";
import NotificationBell from "./NotificationBell";
import { useLanguage } from "@/lib/languageContext";
import toast from "react-hot-toast";
import { useNotifications } from "@/lib/notifications";
import {
  Home,
  LayoutGrid,
  Plus,
  Trophy,
  Activity,
  User,
  Settings,
  LogOut,
  Wallet,
  Zap,
  MoreHorizontal,
  Briefcase,
} from "lucide-react";

export function Navbar() {
  const {
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    userAccount,
    polls,
    votes,
  } = useApp();
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showDisconnectConfirm, setShowDisconnectConfirm] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const { markAllRead } = useNotifications();

  const handleDisconnect = () => {
    setShowDisconnectConfirm(true);
  };

  const confirmDisconnect = () => {
    setShowDisconnectConfirm(false);
    disconnectWallet();
  };

  const dailyAvailable =
    userAccount &&
    Date.now() - userAccount.lastWeeklyRewardTs >= 24 * 60 * 60 * 1000;

  const unclaimedRewards = useMemo(() => {
    if (!walletConnected || !votes.length || !polls.length) return 0;
    // Build poll lookup map for O(1) access instead of O(n×m) (#18)
    const pollMap = new Map(polls.map((p) => [p.id, p]));
    let count = 0;
    for (const v of votes) {
      const poll = pollMap.get(v.pollId);
      if (!poll) continue;
      if (poll.status === PollStatus.Settled && !v.claimed && poll.winningOption !== WINNING_OPTION_UNSET) {
        if ((v.votesPerOption[poll.winningOption] || 0) > 0) count++;
      }
    }
    return count;
  }, [walletConnected, votes, polls]);

  const navItems = [
    { href: "/polls", label: t("polls"), Icon: LayoutGrid },
    { href: "/create", label: t("create"), Icon: Plus },
    { href: "/portfolio", label: "Portfolio", Icon: Briefcase },
    { href: "/leaderboard", label: t("leaderboard"), Icon: Trophy },
    { href: "/activity", label: t("activity"), Icon: Activity },
    { href: "/profile", label: t("profile"), Icon: User },
  ];

  return (
    <>
      <nav aria-label="Main navigation" className="fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)] bg-surface-0/80 backdrop-blur-md border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-[3.75rem]">
            {/* Logo */}
            <Link href="/" className="flex items-center gap-2 shrink-0 group">
              <Image
                src="/logo.svg"
                alt="InstinctFi"
                width={28}
                height={28}
                priority
                className="rounded-lg transition-transform group-hover:scale-105"
              />
              <span className="text-lg font-heading font-bold text-neutral-100">
                Instinct<span className="text-brand-500">Fi</span>
              </span>
            </Link>

            {/* Center: Nav links */}
            <div className="hidden md:flex items-center gap-1">
              {navItems.map((item) => {
                const active = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={item.href === "/profile" ? () => markAllRead() : undefined}
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${active
                      ? "bg-brand-500/10 text-brand-400"
                      : "text-neutral-500 hover:text-neutral-200 hover:bg-surface-200"
                      }`}
                  >
                    <item.Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                    {item.label}
                  </Link>
                );
              })}
              {isAdminWallet(walletAddress) && (
                <Link
                  href="/admin"
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${pathname === "/admin"
                    ? "bg-red-500/10 text-red-400"
                    : "text-neutral-500 hover:text-neutral-200 hover:bg-surface-200"
                    }`}
                >
                  <Settings size={14} strokeWidth={1.8} />
                  Admin
                </Link>
              )}
            </div>

            {/* Right side */}
            <div className="flex items-center gap-2">
              <LanguageToggle />
              <DarkModeToggle />
              {walletConnected && <NotificationBell />}
              {walletConnected ? (
                <div className="flex items-center gap-2">
                  {/* Balance pill */}
                  <div className="flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-100 border border-border rounded-lg">
                    <Zap size={12} className="text-brand-500" />
                    <span className="text-brand-400 font-semibold text-xs tabular-nums">
                      {userAccount ? formatDollars(userAccount.balance) : "..."}
                    </span>
                  </div>
                  {/* Wallet address */}
                  <button
                    onClick={handleDisconnect}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg text-xs font-mono text-neutral-400 transition-colors group"
                    title="Click to disconnect"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    {shortAddr(walletAddress!)}
                    <LogOut size={11} className="text-neutral-600 group-hover:text-red-400 transition-colors" />
                  </button>

                </div>
              ) : (
                <button
                  onClick={connectWallet}
                  className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg font-semibold text-xs sm:text-sm text-white transition-colors flex items-center gap-1.5 active:scale-[0.97]"
                >
                  <Wallet size={15} />
                  <span className="hidden sm:inline">Connect</span>
                  <span className="sm:hidden">Connect</span>
                </button>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom nav */}
      <nav aria-label="Mobile navigation" className="md:hidden fixed bottom-0 left-0 right-0 z-50 mobile-bottom-nav">
        <div className="mx-3 mb-3 rounded-2xl bg-surface-50/95 backdrop-blur-xl border border-border/60 shadow-2xl shadow-black/40">
          <div className="flex items-center justify-around py-2 px-1">
            {[
              { href: "/", label: t("home") || "Home", Icon: Home },
              { href: "/polls", label: t("polls"), Icon: LayoutGrid },
              { href: "/create", label: t("create"), Icon: Plus, isCreate: true },
              { href: "/leaderboard", label: "Rankings", Icon: Trophy },
            ].map((item) => {
              const active = pathname === item.href;
              const isCreate = "isCreate" in item && item.isCreate;

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all active:scale-95 ${active ? "text-brand-400" : "text-neutral-500"
                    }`}
                >
                  {isCreate ? (
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center transition-colors ${active ? "bg-brand-500 text-white" : "bg-brand-600/80 text-white"
                      }`}>
                      <item.Icon size={20} strokeWidth={2.5} />
                    </div>
                  ) : (
                    <item.Icon
                      size={22}
                      fill={active ? "currentColor" : "none"}
                      strokeWidth={active ? 1.5 : 1.8}
                    />
                  )}
                  <span className={`text-[10px] font-medium leading-none ${active ? "text-brand-400" : "text-neutral-500"}`}>
                    {item.label}
                  </span>
                </Link>
              );
            })}
            {/* More button */}
            <button
              onClick={() => setShowMoreMenu(prev => !prev)}
              className={`relative flex flex-col items-center gap-1 py-1.5 px-2 rounded-xl transition-all active:scale-95 ${showMoreMenu ? "text-brand-400" : "text-neutral-500"}`}
            >
              <MoreHorizontal size={22} strokeWidth={showMoreMenu ? 1.5 : 1.8} />
              <span className={`text-[10px] font-medium leading-none ${showMoreMenu ? "text-brand-400" : "text-neutral-500"}`}>More</span>
            </button>
          </div>
        </div>
      </nav>

      {/* More menu overlay (mobile) */}
      {showMoreMenu && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setShowMoreMenu(false)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div
            className="absolute bottom-[5.5rem] left-3 right-3 bg-surface-100/95 backdrop-blur-xl border border-border/60 rounded-2xl shadow-2xl shadow-black/40 overflow-hidden animate-scaleIn"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="py-2">
              <Link
                href="/portfolio"
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${pathname === "/portfolio" ? "text-brand-400 bg-brand-500/10" : "text-neutral-300 hover:bg-surface-200"}`}
              >
                <Briefcase size={18} strokeWidth={1.8} />
                <span className="text-sm font-medium">Portfolio</span>
              </Link>
              <Link
                href="/activity"
                onClick={() => setShowMoreMenu(false)}
                className={`flex items-center gap-3 px-5 py-3 transition-colors ${pathname === "/activity" ? "text-brand-400 bg-brand-500/10" : "text-neutral-300 hover:bg-surface-200"}`}
              >
                <Activity size={18} strokeWidth={1.8} />
                <span className="text-sm font-medium">{t("activity")}</span>
              </Link>
              <Link
                href="/profile"
                onClick={() => { setShowMoreMenu(false); markAllRead(); }}
                className={`relative flex items-center gap-3 px-5 py-3 transition-colors ${pathname === "/profile" ? "text-brand-400 bg-brand-500/10" : "text-neutral-300 hover:bg-surface-200"}`}
              >
                <User size={18} strokeWidth={1.8} />
                <span className="text-sm font-medium">{t("profile")}</span>
                {(dailyAvailable || unclaimedRewards > 0) && (
                  <span className="flex h-2 w-2 ml-auto">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-400 opacity-60" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                  </span>
                )}
              </Link>
              {isAdminWallet(walletAddress) && (
                <Link
                  href="/admin"
                  onClick={() => setShowMoreMenu(false)}
                  className={`flex items-center gap-3 px-5 py-3 transition-colors ${pathname === "/admin" ? "text-red-400 bg-red-500/10" : "text-neutral-300 hover:bg-surface-200"}`}
                >
                  <Settings size={18} strokeWidth={1.8} />
                  <span className="text-sm font-medium">Admin</span>
                </Link>
              )}
              {walletConnected && (
                <>
                  <div className="mx-4 my-1 border-t border-border/40" />
                  <button
                    onClick={() => { setShowMoreMenu(false); handleDisconnect(); }}
                    className="flex items-center gap-3 px-5 py-3 w-full text-left text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut size={18} strokeWidth={1.8} />
                    <span className="text-sm font-medium">Logout</span>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Disconnect confirmation modal */}
      {showDisconnectConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setShowDisconnectConfirm(false)}>
          <div className="bg-surface-100 border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
                <LogOut size={18} className="text-red-400" />
              </div>
              <h3 className="text-lg font-semibold text-neutral-100">Disconnect Wallet?</h3>
            </div>
            <p className="text-sm text-neutral-400 mb-5">
              You will be disconnected from InstinctFi. You can reconnect anytime.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDisconnectConfirm(false)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-neutral-400 hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDisconnect}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Disconnect
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
