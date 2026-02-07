"use client";

import { useApp, formatDollars } from "@/components/Providers";

export default function ProfilePage() {
  const {
    walletConnected,
    walletAddress,
    userAccount,
    polls,
    votes,
    connectWallet,
    claimWeeklyReward,
  } = useApp();

  if (!walletConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Connect your Phantom wallet to view your profile</p>
        <button onClick={connectWallet} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors">
          Connect Phantom
        </button>
      </div>
    );
  }

  const addr = walletAddress || "";
  const myPolls = polls.filter((p) => p.creator === addr);
  const myVotes = votes.filter((v) => v.voter === addr);
  const u = userAccount;

  const shortAddr = (a: string) =>
    a.length > 12 ? `${a.slice(0, 6)}...${a.slice(-6)}` : a;

  const netProfit = u ? u.totalWinningsCents - u.totalSpentCents : 0;

  // Weekly reward availability
  const now = Math.floor(Date.now() / 1000);
  const weeklyAvailable = u ? now - u.lastWeeklyRewardTs >= 604800 : false;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Profile</h1>

      {/* Wallet Card */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-8 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <div className="text-sm text-gray-400 mb-1">Connected Wallet</div>
            <div className="font-mono text-lg">{shortAddr(addr)}</div>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-1">Balance</div>
            <div className="text-2xl font-bold text-accent-400">
              {u ? formatDollars(u.balance) : "$0.00"}
            </div>
          </div>
        </div>

        {/* Weekly Reward */}
        <div className="mb-6 p-4 bg-dark-800/50 rounded-xl flex items-center justify-between">
          <div>
            <div className="text-sm font-medium">Weekly Reward</div>
            <div className="text-xs text-gray-500">
              {weeklyAvailable ? "Available now!" : `Next in ${u ? Math.max(0, Math.ceil((604800 - (now - u.lastWeeklyRewardTs)) / 3600)) : 0}h`}
            </div>
          </div>
          <button
            onClick={claimWeeklyReward}
            disabled={!weeklyAvailable}
            className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
              weeklyAvailable
                ? "bg-green-600 hover:bg-green-700 text-white"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            Claim $1,000
          </button>
        </div>

        {/* Stats grid */}
        {u && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Polls Created" value={u.pollsCreated.toString()} />
            <Stat label="Polls Voted" value={u.totalPollsVoted.toString()} />
            <Stat label="Total Votes" value={u.totalVotesCast.toString()} />
            <Stat label="Polls Won" value={u.pollsWon.toString()} />
            <Stat label="Total Spent" value={formatDollars(u.totalSpentCents)} />
            <Stat label="Total Won" value={formatDollars(u.totalWinningsCents)} highlight />
            <Stat
              label="Net Profit"
              value={`${netProfit >= 0 ? "+" : ""}${formatDollars(netProfit)}`}
              highlight
            />
            <Stat label="Creator Earnings" value={formatDollars(u.creatorEarningsCents)} />
          </div>
        )}
      </div>

      {/* My Polls */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-8 mb-6">
        <h2 className="font-semibold text-lg mb-4">My Created Polls</h2>
        {myPolls.length === 0 ? (
          <p className="text-gray-500 text-sm">No polls created yet.</p>
        ) : (
          <div className="space-y-3">
            {myPolls.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 bg-dark-800/50 rounded-xl">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    {p.options.length} options · {p.voteCounts.reduce((a, b) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolCents)}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  p.status === 1 ? "bg-green-600/20 text-green-400" : "bg-accent-500/20 text-accent-400"
                }`}>
                  {p.status === 1 ? "Settled" : "Active"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* My Vote History */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-8">
        <h2 className="font-semibold text-lg mb-4">My Vote History</h2>
        {myVotes.length === 0 ? (
          <p className="text-gray-500 text-sm">No votes cast yet.</p>
        ) : (
          <div className="space-y-3">
            {myVotes.map((v, i) => {
              const p = polls.find((pl) => pl.id === v.pollId);
              if (!p) return null;
              return (
                <div key={i} className="flex justify-between items-center p-3 bg-dark-800/50 rounded-xl">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      {v.votesPerOption
                        .map((count, idx) => count > 0 ? `${p.options[idx]}: ${count}` : null)
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{formatDollars(v.totalStakedCents)}</div>
                    {v.claimed && <span className="text-xs text-green-400">Claimed</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-3 bg-dark-800/50 rounded-xl">
      <div className={`text-lg font-bold font-mono ${highlight ? "text-green-400" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}
