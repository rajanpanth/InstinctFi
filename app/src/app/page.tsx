"use client";

import { useMemo } from "react";
import Link from "next/link";
import { useApp, formatDollars, DemoPoll } from "@/components/Providers";
import PollCard from "@/components/PollCard";

const CATEGORY_SECTIONS = [
  { label: "Politics", icon: "🏛️", color: "text-blue-400" },
  { label: "Crypto", icon: "₿", color: "text-amber-400" },
  { label: "Sports", icon: "⚽", color: "text-green-400" },
  { label: "Science", icon: "🔬", color: "text-purple-400" },
  { label: "Tech", icon: "💻", color: "text-cyan-400" },
  { label: "Entertainment", icon: "🎬", color: "text-pink-400" },
];

function getTrendingPolls(polls: DemoPoll[], limit = 6): DemoPoll[] {
  return [...polls]
    .filter((p) => p.status === 0)
    .sort((a, b) => {
      const aVotes = a.voteCounts.reduce((s, v) => s + v, 0);
      const bVotes = b.voteCounts.reduce((s, v) => s + v, 0);
      return bVotes - aVotes;
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
  const { walletConnected, connectWallet, polls, userAccount } = useApp();

  const trending = useMemo(() => getTrendingPolls(polls), [polls]);
  const categorySections = useMemo(
    () =>
      CATEGORY_SECTIONS.map((cat) => ({
        ...cat,
        polls: getPollsByCategory(polls, cat.label),
      })).filter((c) => c.polls.length > 0),
    [polls]
  );

  return (
    <div className="space-y-12">
      {/* ── Hero Section ── */}
      {!walletConnected ? (
        /* Not logged in hero */
        <section className="text-center py-14">
          <h1 className="text-5xl md:text-6xl font-extrabold mb-5">
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
              Predict. Vote. Win.
            </span>
          </h1>
          <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-4">
            Buy option-coins on prediction polls. If your side wins, you take the
            entire losing pool. Powered by Solana.
          </p>
          <p className="text-accent-400 mb-8">
            Sign up with Phantom to get <strong>$5,000</strong> in play money!
          </p>
          <button
            onClick={connectWallet}
            className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 flex items-center gap-3 mx-auto shadow-lg shadow-purple-600/25"
          >
            <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
              <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
            </svg>
            Connect Phantom Wallet
          </button>
        </section>
      ) : (
        /* Logged in hero */
        <section className="text-center py-10">
          <h1 className="text-4xl md:text-5xl font-extrabold mb-3">
            <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
              Welcome Back!
            </span>
          </h1>
          {userAccount && (
            <p className="text-lg text-gray-400 mb-5">
              Balance:{" "}
              <span className="text-accent-400 font-bold">
                {formatDollars(userAccount.balance)}
              </span>
            </p>
          )}
          <div className="flex gap-3 justify-center">
            <Link
              href="/polls"
              className="px-7 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
            >
              Browse Polls
            </Link>
            <Link
              href="/create"
              className="px-7 py-3 bg-dark-700 hover:bg-dark-800 border border-gray-700 rounded-xl font-semibold transition-colors"
            >
              Create Poll
            </Link>
          </div>
        </section>
      )}

      {/* ── Trending Polls ── */}
      {trending.length > 0 && (
        <section>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>🔥</span> Trending
            </h2>
            <Link
              href="/polls"
              className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              See all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {trending.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      )}

      {/* ── Category Sections ── */}
      {categorySections.map((cat) => (
        <section key={cat.label}>
          <div className="flex items-center justify-between mb-5">
            <h2 className="text-xl font-bold flex items-center gap-2">
              <span>{cat.icon}</span>
              <span className={cat.color}>{cat.label}</span>
            </h2>
            <Link
              href={`/polls?cat=${cat.label}`}
              className="text-sm text-primary-400 hover:text-primary-300 font-medium transition-colors"
            >
              See all &rarr;
            </Link>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {cat.polls.map((poll) => (
              <PollCard key={poll.id} poll={poll} />
            ))}
          </div>
        </section>
      ))}

      {/* ── Empty state if no polls at all ── */}
      {polls.length === 0 && (
        <section className="text-center py-16">
          <div className="text-5xl mb-4">📊</div>
          <h2 className="text-xl font-semibold mb-2 text-gray-300">No polls yet</h2>
          <p className="text-gray-500 mb-6">Be the first to create a prediction market!</p>
          {walletConnected ? (
            <Link
              href="/create"
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
            >
              Create Poll
            </Link>
          ) : (
            <button
              onClick={connectWallet}
              className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors"
            >
              Connect Wallet to Start
            </button>
          )}
        </section>
      )}

      {/* ── How It Works (bottom) ── */}
      <section className="pt-4">
        <h2 className="text-2xl font-bold text-center mb-8">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-5">
          {[
            { step: "1", title: "Create a Poll", desc: "Set options, price per coin, and seed the pool with your investment." },
            { step: "2", title: "Buy Option-Coins", desc: "Each coin = 1 vote. Pick the option you think will win." },
            { step: "3", title: "Poll Settles", desc: "After end time, the winning option is determined by most votes." },
            { step: "4", title: "Winners Collect", desc: "Winning voters split the ENTIRE pool proportionally." },
          ].map((item) => (
            <div key={item.step} className="bg-dark-700/50 border border-gray-800 rounded-xl p-5 text-center">
              <div className="w-10 h-10 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center text-lg font-bold mx-auto mb-3">
                {item.step}
              </div>
              <h3 className="font-semibold mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
