"use client";

import { useState, useEffect } from "react";
import { Github, ExternalLink } from "lucide-react";

export default function Footer() {
  const [year, setYear] = useState("2026");
  useEffect(() => {
    setYear(String(new Date().getFullYear()));
  }, []);

  return (
    <footer className="border-t border-border pt-8 pb-4 mt-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
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
              href="https://github.com/instinctfi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
              aria-label="GitHub"
            >
              <Github size={16} />
            </a>
            <a
              href="https://x.com/instinctfi"
              target="_blank"
              rel="noopener noreferrer"
              className="text-neutral-600 hover:text-neutral-400 transition-colors"
              aria-label="X / Twitter"
            >
              <ExternalLink size={16} />
            </a>
            <span className="text-[10px] text-neutral-600 px-2 py-0.5 bg-surface-100 border border-border rounded">
              Solana Devnet
            </span>
          </div>
        </div>
        <p className="text-neutral-700 text-[10px] mt-4">
          © {year} InstinctFi. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
