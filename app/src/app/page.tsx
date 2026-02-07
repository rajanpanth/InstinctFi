"use client";

import Link from "next/link";
import { useApp, formatDollars } from "@/components/Providers";

export default function Home() {
  const { walletConnected, connectWallet, polls, userAccount } = useApp();

  // ── Auth gate: show connect page if not logged in ──
  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center">
        <h1 className="text-5xl md:text-7xl font-extrabold mb-6">
          <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
            Predict. Vote. Win.
          </span>
        </h1>
        <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-4">
          Buy option-coins on prediction polls. If your side wins, you take the
          entire losing pool. Powered by Solana.
        </p>
        <p className="text-accent-400 mb-8">
          Sign up with Phantom to get <strong>$5,000</strong> in play money!
        </p>
        <button
          onClick={connectWallet}
          className="px-8 py-4 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-2xl font-bold text-lg transition-all transform hover:scale-105 flex items-center gap-3 shadow-lg shadow-purple-600/25"
        >
          <svg width="24" height="24" viewBox="0 0 40 40" fill="currentColor">
            <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
          </svg>
          Connect Phantom Wallet
        </button>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mt-16 max-w-4xl w-full">
          {[
            { icon: "🎁", title: "$5,000 Signup Bonus", desc: "Get free play money instantly when you connect your Phantom wallet." },
            { icon: "💰", title: "$1,000 Weekly Rewards", desc: "Claim $1,000 every week to keep the fun going." },
            { icon: "🏆", title: "Leaderboard", desc: "Compete for the top spot on weekly, monthly, and all-time rankings." },
          ].map((f) => (
            <div key={f.title} className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-lg mb-2">{f.title}</h3>
              <p className="text-gray-400 text-sm">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Logged-in dashboard ──
  const activePolls = polls.filter((p) => p.status === 0);
  const settledPolls = polls.filter((p) => p.status === 1);

  return (
    <div className="space-y-16">
      {/* Welcome */}
      <section className="text-center py-12">
        <h1 className="text-4xl md:text-5xl font-extrabold mb-4">
          <span className="bg-gradient-to-r from-primary-400 via-accent-400 to-primary-400 bg-clip-text text-transparent">
            Welcome Back!
          </span>
        </h1>
        {userAccount && (
          <p className="text-xl text-gray-400">
            Balance:{" "}
            <span className="text-accent-400 font-bold">
              {formatDollars(userAccount.balance)}
            </span>
          </p>
        )}
        <div className="flex gap-4 justify-center mt-6">
          <Link
            href="/polls"
            className="px-8 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold text-lg transition-colors"
          >
            Browse Polls
          </Link>
          <Link
            href="/create"
            className="px-8 py-3 bg-dark-700 hover:bg-dark-800 border border-gray-700 rounded-xl font-semibold text-lg transition-colors"
          >
            Create Poll
          </Link>
        </div>
      </section>

      {/* How it works */}
      <section>
        <h2 className="text-3xl font-bold text-center mb-10">How It Works</h2>
        <div className="grid md:grid-cols-4 gap-6">
          {[
            { step: "1", title: "Create a Poll", desc: "Set options, price per coin, and seed the pool with your investment." },
            { step: "2", title: "Buy Option-Coins", desc: "Each coin = 1 vote. Pick the option you think will win." },
            { step: "3", title: "Poll Settles", desc: "After end time, the winning option is determined by most votes." },
            { step: "4", title: "Winners Collect", desc: "Winning voters split the ENTIRE pool proportionally. Losers get nothing." },
          ].map((item) => (
            <div key={item.step} className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center">
              <div className="w-12 h-12 rounded-full bg-primary-600/20 text-primary-400 flex items-center justify-center text-xl font-bold mx-auto mb-4">
                {item.step}
              </div>
              <h3 className="font-semibold text-lg mb-2">{item.title}</h3>
              <p className="text-gray-400 text-sm">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats */}
      <section className="grid md:grid-cols-3 gap-6">
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="text-3xl font-bold text-primary-400">{polls.length}</div>
          <div className="text-gray-400 mt-1">Total Polls</div>
        </div>
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="text-3xl font-bold text-green-400">{activePolls.length}</div>
          <div className="text-gray-400 mt-1">Active Polls</div>
        </div>
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center">
          <div className="text-3xl font-bold text-accent-400">{settledPolls.length}</div>
          <div className="text-gray-400 mt-1">Settled Polls</div>
        </div>
      </section>
    </div>
  );
}
