"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Github, Zap } from "lucide-react";

const MARKET_LINKS = [
  { href: "/?cat=Trending", label: "Trending" },
  { href: "/?cat=Politics", label: "Politics" },
  { href: "/?cat=Crypto", label: "Crypto" },
  { href: "/?cat=Sports", label: "Sports" },
  { href: "/?cat=Entertainment", label: "Entertainment" },
];

const PLATFORM_LINKS = [
  { href: "/create", label: "Create Poll" },
  { href: "/polls", label: "Browse Polls" },
  { href: "/leaderboard", label: "Leaderboard" },
  { href: "/activity", label: "Activity" },
  { href: "/profile", label: "Profile" },
];

// #27: Use real paths instead of placeholder # links
const LEGAL_LINKS = [
  { href: "/legal/terms", label: "Terms of Service" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/docs", label: "Documentation" },
];

// #54: Social links — use env vars or default to real profiles
const GITHUB_URL = process.env.NEXT_PUBLIC_GITHUB_URL || "https://github.com/rajanpanth";
const TWITTER_URL = process.env.NEXT_PUBLIC_TWITTER_URL || "https://x.com/Rajan_panth";

export default function Footer() {
  // #55: SSR-safe year — empty initial state avoids hydration mismatch at midnight boundary
  const [year, setYear] = useState("");
  useEffect(() => {
    setYear(String(new Date().getFullYear()));
  }, []);

  return (
    <footer className="border-t border-border mt-12 bg-surface-0/30 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Main grid ── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 py-10">
          {/* Brand column */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2 group">
              <span className="font-heading text-lg font-bold text-neutral-200 group-hover:text-neutral-100 transition-colors">
                Instinct<span className="text-brand-500">Fi</span>
              </span>
            </Link>
            <p className="text-neutral-500 text-xs mt-2 leading-relaxed max-w-[200px]">
              Decentralized prediction polls on Solana. Predict, vote, and win.
            </p>
            <div className="flex items-center gap-3 mt-4">
              <a
                href={GITHUB_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 border border-border text-neutral-500 hover:text-neutral-200 hover:border-border-hover transition-all"
                aria-label="GitHub"
              >
                <Github size={14} />
              </a>
              <a
                href={TWITTER_URL}
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 border border-border text-neutral-500 hover:text-neutral-200 hover:border-border-hover transition-all"
                aria-label="X / Twitter"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="shrink-0"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" /></svg>
              </a>
            </div>
          </div>

          {/* Markets column */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Markets
            </h4>
            <ul className="space-y-2">
              {MARKET_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-neutral-500 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Platform column */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Platform
            </h4>
            <ul className="space-y-2">
              {PLATFORM_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-neutral-500 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Legal column */}
          <div>
            <h4 className="text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-3">
              Legal
            </h4>
            <ul className="space-y-2">
              {LEGAL_LINKS.map((link) => (
                <li key={link.label}>
                  <Link
                    href={link.href}
                    className="text-xs text-neutral-500 hover:text-brand-400 transition-colors"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* ── Bottom bar ── */}
        <div className="border-t border-border py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <p className="text-neutral-600 text-[10px]" suppressHydrationWarning>
            © {year} InstinctFi. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500 px-2 py-1 bg-surface-100 border border-border rounded-md">
              <Zap size={10} className="text-brand-500" />
              Powered by Solana
            </span>
            <span className="text-[10px] text-neutral-600 px-2 py-0.5 bg-surface-100 border border-border rounded">
              {process.env.NEXT_PUBLIC_SOLANA_NETWORK === "mainnet-beta" ? "Mainnet" : "Devnet"}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
