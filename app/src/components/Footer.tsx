"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Github, ExternalLink, Zap } from "lucide-react";

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

const LEGAL_LINKS = [
  { href: "#", label: "Terms of Service" },
  { href: "#", label: "Privacy Policy" },
  { href: "#", label: "Documentation" },
];

export default function Footer() {
  const [year, setYear] = useState("2026");
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
                href="https://github.com/instinctfi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 border border-border text-neutral-500 hover:text-neutral-200 hover:border-border-hover transition-all"
                aria-label="GitHub"
              >
                <Github size={14} />
              </a>
              <a
                href="https://x.com/instinctfi"
                target="_blank"
                rel="noopener noreferrer"
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 border border-border text-neutral-500 hover:text-neutral-200 hover:border-border-hover transition-all"
                aria-label="X / Twitter"
              >
                <ExternalLink size={14} />
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
          <p className="text-neutral-600 text-[10px]">
            © {year} InstinctFi. All rights reserved.
          </p>
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-[10px] text-neutral-500 px-2 py-1 bg-surface-100 border border-border rounded-md">
              <Zap size={10} className="text-brand-500" />
              Powered by Solana
            </span>
            <span className="text-[10px] text-neutral-600 px-2 py-0.5 bg-surface-100 border border-border rounded">
              Devnet
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
