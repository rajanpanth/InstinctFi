"use client";

import Link from "next/link";
import { useApp, formatDollars } from "./Providers";

export function Navbar() {
  const {
    walletConnected,
    walletAddress,
    connectWallet,
    disconnectWallet,
    userAccount,
    claimWeeklyReward,
  } = useApp();

  const shortAddr = (addr: string) =>
    addr.length > 12 ? `${addr.slice(0, 4)}...${addr.slice(-4)}` : addr;

  // Check if weekly reward is available
  const weeklyAvailable =
    userAccount &&
    Date.now() - userAccount.lastWeeklyRewardTs >= 7 * 24 * 60 * 60 * 1000;

  return (
    <nav className="border-b border-gray-800 bg-dark-900/80 backdrop-blur-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-2xl font-extrabold bg-gradient-to-r from-primary-400 to-accent-400 bg-clip-text text-transparent">
              SolVote
            </span>
          </Link>

          {/* Nav links (only if connected) */}
          {walletConnected && (
            <div className="hidden md:flex items-center gap-6">
              <Link
                href="/polls"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Polls
              </Link>
              <Link
                href="/create"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Create
              </Link>
              <Link
                href="/leaderboard"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Leaderboard
              </Link>
              <Link
                href="/profile"
                className="text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Profile
              </Link>
            </div>
          )}

          {/* Right side */}
          <div className="flex items-center gap-3">
            {walletConnected && userAccount ? (
              <>
                {/* Weekly reward button */}
                {weeklyAvailable && (
                  <button
                    onClick={() => claimWeeklyReward()}
                    className="px-3 py-1.5 bg-green-600/20 text-green-400 border border-green-600/40 rounded-lg text-xs font-semibold hover:bg-green-600/30 transition-colors animate-pulse"
                  >
                    Claim $1,000
                  </button>
                )}

                {/* Balance */}
                <div className="px-3 py-1.5 bg-dark-700 border border-gray-700 rounded-lg">
                  <span className="text-accent-400 font-bold text-sm">
                    {formatDollars(userAccount.balance)}
                  </span>
                </div>

                {/* Wallet address + disconnect */}
                <button
                  onClick={disconnectWallet}
                  className="px-3 py-1.5 bg-dark-700 hover:bg-dark-800 border border-gray-700 rounded-lg text-sm font-mono text-gray-300 transition-colors"
                  title="Click to disconnect"
                >
                  {shortAddr(walletAddress!)}
                </button>
              </>
            ) : (
              <button
                onClick={connectWallet}
                className="px-5 py-2 bg-gradient-to-r from-purple-600 to-purple-700 hover:from-purple-500 hover:to-purple-600 rounded-xl font-semibold text-sm transition-all flex items-center gap-2"
              >
                <svg width="18" height="18" viewBox="0 0 40 40" fill="currentColor">
                  <path d="M34.9 17.1c-.4 0-.8.3-.8.7-.3 4.3-2.2 8.3-5.3 11.2-3.2 3-7.4 4.6-11.8 4.5-8.9-.1-16-7.5-16-16.5 0-9.1 7.4-16.5 16.5-16.5 4.3 0 8.4 1.7 11.4 4.7.3.3.3.8 0 1l-1.2 1.2c-.3.3-.8.3-1 0-2.5-2.5-5.8-3.9-9.3-3.7-6.6.3-11.8 5.8-12 12.4-.2 6.9 5.5 12.6 12.4 12.6 3.3 0 6.5-1.3 8.8-3.6 2.1-2 3.4-4.5 3.8-7.3.1-.4.4-.7.8-.7h1.6c.5 0 .9.4.8.9-.5 3.8-2.3 7.3-5.1 9.9-3.1 2.9-7.2 4.6-11.5 4.8-9 .2-16.7-7-16.9-15.9C-.1 8.5 8.5.6 17 .6h.2c4.9 0 9.6 2 13 5.5.3.3.3.8 0 1.1l-2.4 2.4c-.3.3-.8.3-1.1 0-2.7-2.9-6.5-4.5-10.5-4.5h-.2C9 5.1 3.1 11.1 3.1 18.4c0 7.5 6.3 13.6 13.8 13.2 3.3-.1 6.4-1.5 8.7-3.7 2-1.9 3.3-4.3 3.8-6.8.1-.4.5-.7.9-.7h4.1c.5 0 .9.4.8.9" />
                </svg>
                Connect Phantom
              </button>
            )}
          </div>
        </div>

        {/* Mobile nav */}
        {walletConnected && (
          <div className="md:hidden flex gap-4 pb-3 overflow-x-auto">
            <Link href="/polls" className="text-gray-400 hover:text-white text-sm font-medium whitespace-nowrap">Polls</Link>
            <Link href="/create" className="text-gray-400 hover:text-white text-sm font-medium whitespace-nowrap">Create</Link>
            <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm font-medium whitespace-nowrap">Leaderboard</Link>
            <Link href="/profile" className="text-gray-400 hover:text-white text-sm font-medium whitespace-nowrap">Profile</Link>
          </div>
        )}
      </div>
    </nav>
  );
}
