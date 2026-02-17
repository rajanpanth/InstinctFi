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
import {
  LayoutGrid,
  Plus,
  Trophy,
  Activity,
  User,
  Settings,
  Home,
  LogOut,
  Wallet,
  Zap,
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

  const dailyAvailable =
    userAccount &&
    Date.now() - userAccount.lastWeeklyRewardTs >= 24 * 60 * 60 * 1000;

  const unclaimedRewards = useMemo(() => {
    if (!walletConnected || !votes.length || !polls.length) return 0;
    let count = 0;
    for (const v of votes) {
      const poll = polls.find((p) => p.id === v.pollId);
      if (!poll) continue;
      const isSettled = poll.status === PollStatus.Settled;
      if (isSettled && !v.claimed && poll.winningOption !== WINNING_OPTION_UNSET) {
        const userVotesOnWinner = v.votesPerOption[poll.winningOption] || 0;
        if (userVotesOnWinner > 0) count++;
      }
    }
    return count;
  }, [walletConnected, votes, polls]);

  const navItems = [
    { href: "/polls", label: t("polls"), Icon: LayoutGrid },
    { href: "/create", label: t("create"), Icon: Plus },
    { href: "/leaderboard", label: t("leaderboard"), Icon: Trophy },
    { href: "/activity", label: t("activity"), Icon: Activity },
    { href: "/profile", label: t("profile"), Icon: User, badge: unclaimedRewards },
  ];

  return (
    <>
      <nav aria-label="Main navigation" className="fixed top-0 inset-x-0 z-50 pt-[env(safe-area-inset-top)] bg-surface-0/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
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
                    className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-medium transition-colors ${active
                      ? "bg-brand-500/10 text-brand-400"
                      : "text-neutral-500 hover:text-neutral-200 hover:bg-surface-200"
                      }`}
                  >
                    <item.Icon size={14} strokeWidth={active ? 2.2 : 1.8} />
                    {item.label}
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-brand-500 text-[9px] font-bold text-white px-1">
                        {item.badge}
                      </span>
                    )}
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
                    onClick={disconnectWallet}
                    className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-surface-100 hover:bg-surface-200 border border-border rounded-lg text-xs font-mono text-neutral-400 transition-colors group"
                    title="Click to disconnect"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 shrink-0" />
                    {shortAddr(walletAddress!)}
                    <LogOut size={11} className="text-neutral-600 group-hover:text-red-400 transition-colors" />
                  </button>
                  {/* Mobile disconnect */}
                  <button
                    onClick={disconnectWallet}
                    className="sm:hidden w-8 h-8 flex items-center justify-center bg-surface-100 border border-border rounded-lg text-neutral-500 hover:text-neutral-300 transition-colors"
                    title="Disconnect wallet"
                    aria-label="Disconnect wallet"
                  >
                    <LogOut size={14} />
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
        <div className="mx-2 mb-2 rounded-2xl bg-surface-50/95 backdrop-blur-xl border border-border shadow-xl shadow-black/50">
          <div className="flex justify-around items-center py-2 px-1">
            {[
              { href: "/", label: t("home"), Icon: Home },
              { href: "/polls", label: t("polls"), Icon: LayoutGrid },
              { href: "/create", label: t("create"), Icon: Plus, isSpecial: true },
              { href: "/activity", label: t("feed"), Icon: Activity },
              { href: "/profile", label: t("profile"), Icon: User, hasBadge: dailyAvailable || unclaimedRewards > 0 },
            ].map((item) => {
              const active = item.href === "/" ? pathname === "/" : pathname === item.href;
              const isSpecial = "isSpecial" in item && item.isSpecial;

              if (isSpecial) {
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="relative flex flex-col items-center gap-0.5 -mt-4 transition-all active:scale-90"
                  >
                    <div
                      className={`w-11 h-11 rounded-xl flex items-center justify-center shadow-lg ${active
                        ? "bg-brand-500 shadow-brand-500/30"
                        : "bg-brand-600 shadow-brand-500/15"
                        }`}
                    >
                      <item.Icon size={20} className="text-white" strokeWidth={2.5} />
                    </div>
                    <span className={`text-[9px] font-medium mt-0.5 ${active ? "text-brand-400" : "text-neutral-500"}`}>
                      {item.label}
                    </span>
                  </Link>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`relative flex flex-col items-center gap-0.5 py-1.5 px-3 rounded-xl min-w-[52px] transition-colors ${active ? "text-brand-400" : "text-neutral-600 active:scale-95"
                    }`}
                >
                  {"hasBadge" in item && item.hasBadge && (
                    <span className="absolute top-0.5 right-1 flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-500" />
                    </span>
                  )}
                  <item.Icon
                    size={20}
                    fill={active ? "currentColor" : "none"}
                    strokeWidth={active ? 1.5 : 1.8}
                  />
                  {active ? (
                    <span className="w-1 h-1 rounded-full bg-brand-400 mt-0.5" />
                  ) : (
                    <span className="text-[9px] font-medium mt-0.5">{item.label}</span>
                  )}
                </Link>
              );
            })}
          </div>
        </div>
      </nav>
    </>
  );
}
