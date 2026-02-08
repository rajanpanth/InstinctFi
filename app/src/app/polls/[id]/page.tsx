"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp, formatDollars } from "@/components/Providers";
import PollImage from "@/components/PollImage";
import WalletConnectModal from "@/components/WalletConnectModal";
import EditPollModal from "@/components/EditPollModal";
import DeletePollModal from "@/components/DeletePollModal";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import toast from "react-hot-toast";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;

  const {
    polls,
    votes,
    walletAddress,
    userAccount,
    castVote,
    settlePoll,
    claimReward,
    walletConnected,
    editPoll,
    deletePoll,
  } = useApp();

  const poll = polls.find((p) => p.id === pollId);
  const vote = votes.find(
    (v) => v.pollId === pollId && v.voter === walletAddress
  );

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [numCoins, setNumCoins] = useState(1);
  const [timeLeft, setTimeLeft] = useState("");
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  // Countdown timer
  useEffect(() => {
    if (!poll) return;
    const interval = setInterval(() => {
      const now = Math.floor(Date.now() / 1000);
      const diff = poll.endTime - now;
      if (diff <= 0) {
        setTimeLeft("Ended");
        return;
      }
      const h = Math.floor(diff / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setTimeLeft(`${h}h ${m}m ${s}s`);
    }, 1000);
    return () => clearInterval(interval);
  }, [poll]);

  if (!poll) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg">Poll not found</p>
        <button onClick={() => router.push("/polls")} className="mt-4 text-primary-400 hover:text-primary-300">
          &larr; Back to Polls
        </button>
      </div>
    );
  }

  const now = Math.floor(Date.now() / 1000);
  const isEnded = now >= poll.endTime;
  const isSettled = poll.status === 1;
  const isCreator = walletAddress === poll.creator;
  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
  const cost = numCoins * poll.unitPriceCents;
  const canVote = !isEnded && !isSettled && !isCreator && walletConnected;
  const canManage = isCreator && totalVotes === 0 && !isEnded && !isSettled;

  const handleVote = async () => {
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
    if (selectedOption === null) return toast.error("Select an option");
    if (numCoins <= 0) return toast.error("Buy at least 1 coin");
    if (userAccount && cost > userAccount.balance) return toast.error("Insufficient balance");

    const success = await castVote(pollId, selectedOption, numCoins);
    if (success) {
      toast.success(`Voted ${numCoins} coin(s) for "${poll.options[selectedOption]}"`);
      setSelectedOption(null);
      setNumCoins(1);
    } else {
      toast.error("Vote failed");
    }
  };

  const handleOptionClick = (index: number) => {
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
    if (canVote) setSelectedOption(index);
  };

  const handleSettle = async () => {
    const success = await settlePoll(pollId);
    if (success) toast.success("Poll settled!");
    else toast.error("Settlement failed");
  };

  const handleClaim = async () => {
    const reward = await claimReward(pollId);
    if (reward > 0) {
      toast.success(`Claimed ${formatDollars(reward)}!`);
    } else {
      toast.error("No reward to claim");
    }
  };

  const canClaim =
    isSettled &&
    vote &&
    !vote.claimed &&
    poll.winningOption !== 255 &&
    (vote.votesPerOption[poll.winningOption] || 0) > 0;

  const potentialReward =
    canClaim && vote
      ? Math.floor(
          (vote.votesPerOption[poll.winningOption] /
            poll.voteCounts[poll.winningOption]) *
            poll.totalPoolCents
        )
      : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <WalletConnectModal isOpen={showWalletModal} onClose={() => setShowWalletModal(false)} />
      {poll && (
        <>
          <EditPollModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} poll={poll} />
          <DeletePollModal
            isOpen={showDeleteModal}
            onClose={() => setShowDeleteModal(false)}
            poll={poll}
            onDeleted={() => router.push("/polls")}
          />
        </>
      )}

      {/* Back */}
      <button onClick={() => router.push("/polls")} className="text-gray-400 hover:text-white mb-6 text-sm">
        &larr; Back to Polls
      </button>

      {/* Header */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl overflow-hidden mb-6">
        {poll.imageUrl && (
          <PollImage
            src={poll.imageUrl}
            alt={poll.title}
            className="rounded-none"
          />
        )}

        <div className="p-8">
          <div className="flex items-start justify-between mb-4">
            <span className="px-3 py-1 bg-primary-600/20 text-primary-400 rounded-lg text-xs font-medium">
              {poll.category}
            </span>
            <span
              className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                isSettled
                  ? "bg-green-600/20 text-green-400"
                  : isEnded
                  ? "bg-red-600/20 text-red-400"
                  : "bg-accent-500/20 text-accent-400"
              }`}
            >
              {isSettled ? "Settled" : isEnded ? "Awaiting Settlement" : timeLeft}
            </span>
          </div>

          <h1 className="text-2xl font-bold mb-3">{poll.title}</h1>
          {poll.description && <p className="text-gray-400 mb-6">{poll.description}</p>}

          {/* Stats bar */}
          <div className="grid grid-cols-4 gap-4 text-center p-4 bg-dark-800/50 rounded-xl">
            <div>
              <div className="text-lg font-bold text-primary-400">
                {formatDollars(poll.totalPoolCents)}
              </div>
              <div className="text-xs text-gray-500">Pool</div>
            </div>
            <div>
              <div className="text-lg font-bold">{totalVotes}</div>
              <div className="text-xs text-gray-500">Total Votes</div>
            </div>
            <div>
              <div className="text-lg font-bold">{poll.totalVoters}</div>
              <div className="text-xs text-gray-500">Voters</div>
            </div>
            <div>
              <div className="text-lg font-bold">
                {formatDollars(poll.unitPriceCents)}
              </div>
              <div className="text-xs text-gray-500">Price/Coin</div>
            </div>
          </div>
        </div>
      </div>

      {/* Options */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-8 mb-6">
        <h2 className="font-semibold text-lg mb-4">Options</h2>
        <div className="space-y-3">
          {poll.options.map((opt, i) => {
            const pct = totalVotes > 0 ? (poll.voteCounts[i] / totalVotes) * 100 : 0;
            const isWinner = isSettled && poll.winningOption === i;
            const isSelected = selectedOption === i;
            const userVotes = vote ? vote.votesPerOption[i] || 0 : 0;
            const optImage = poll.optionImages?.[i]
              ? sanitizeImageUrl(poll.optionImages[i])
              : "";

            return (
              <button
                key={i}
                onClick={() => handleOptionClick(i)}
                className={`w-full text-left p-4 rounded-xl transition-all border ${
                  isWinner
                    ? "border-green-500/50 bg-green-500/10"
                    : isSelected
                    ? "border-primary-500 bg-primary-500/10"
                    : "border-gray-800 bg-dark-800/50 hover:border-gray-700"
                } cursor-pointer`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {optImage ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={optImage}
                        alt={opt}
                        className="w-8 h-8 rounded-full object-cover border border-gray-700"
                      />
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border border-gray-700 ${
                        i === 0 ? "bg-blue-600" : i === 1 ? "bg-red-600" : "bg-purple-600"
                      }`}>
                        {opt.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className={`font-medium ${isWinner ? "text-green-400" : ""}`}>
                      {isWinner && "\u2713 "}{String.fromCharCode(65 + i)}. {opt}
                    </span>
                  </div>
                  <span className="text-sm text-gray-400 font-mono">
                    {poll.voteCounts[i]} votes ({pct.toFixed(1)}%)
                  </span>
                </div>
                <div className="h-2 bg-dark-900 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isWinner ? "bg-green-500" : "bg-primary-600"}`}
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                </div>
                {userVotes > 0 && (
                  <div className="mt-2 text-xs text-accent-400">
                    Your votes: {userVotes} ({formatDollars(userVotes * poll.unitPriceCents)})
                  </div>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Vote action */}
      {!isEnded && !isSettled && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-8 mb-6">
          <h2 className="font-semibold text-lg mb-4">Buy Option-Coins</h2>
          <div className="flex items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Number of coins</label>
              <input
                type="number"
                value={numCoins}
                onChange={(e) => setNumCoins(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full px-4 py-3 bg-dark-800 border border-gray-700 rounded-xl focus:border-primary-500 outline-none"
              />
            </div>
            <div className="text-right pb-3">
              <div className="text-sm text-gray-400">Cost</div>
              <div className="text-lg font-bold font-mono">{formatDollars(cost)}</div>
            </div>
          </div>
          {userAccount && (
            <div className="text-xs text-gray-500 mt-2">
              Balance: {formatDollars(userAccount.balance)}
            </div>
          )}
          <button
            onClick={handleVote}
            className={`w-full mt-4 py-3 rounded-xl font-semibold transition-all ${
              walletConnected && selectedOption !== null
                ? "bg-primary-600 hover:bg-primary-700"
                : !walletConnected
                ? "bg-purple-600 hover:bg-purple-700"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {!walletConnected
              ? "Connect Wallet to Vote"
              : selectedOption !== null
              ? `Vote for "${poll.options[selectedOption]}"`
              : "Select an option above"}
          </button>
        </div>
      )}

      {/* Settlement */}
      {isEnded && !isSettled && (
        <div className="bg-dark-700/50 border border-yellow-600/30 rounded-2xl p-8 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-accent-400">Poll Ended — Ready to Settle</h2>
          <p className="text-gray-400 text-sm mb-4">
            Anyone can trigger settlement. The option with the most votes wins.
          </p>
          <button
            onClick={handleSettle}
            className="w-full py-3 bg-accent-500 hover:bg-accent-600 text-dark-900 rounded-xl font-semibold transition-colors"
          >
            Settle Poll
          </button>
        </div>
      )}

      {/* Claim */}
      {canClaim && (
        <div className="bg-dark-700/50 border border-green-600/30 rounded-2xl p-8 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-green-400">You Won!</h2>
          <p className="text-gray-400 text-sm mb-4">
            Your reward:{" "}
            <span className="text-green-400 font-bold">{formatDollars(potentialReward)}</span>
          </p>
          <button
            onClick={handleClaim}
            className="w-full py-3 bg-green-600 hover:bg-green-700 rounded-xl font-semibold transition-colors"
          >
            Claim Reward
          </button>
        </div>
      )}

      {/* Already claimed */}
      {vote?.claimed && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center text-gray-400">
          Reward already claimed for this poll.
        </div>
      )}

      {/* Creator notice */}
      {isCreator && !isSettled && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 text-center text-gray-500 text-sm">
          You created this poll — you cannot vote on it.
        </div>
      )}

      {/* Manage Poll (edit/delete) — visible only to creator when no votes */}
      {canManage && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 mt-6">
          <h2 className="font-semibold text-lg mb-1">Manage Poll</h2>
          <p className="text-gray-500 text-sm mb-4">
            No votes yet — you can edit or delete this poll.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-gray-700 text-gray-300 rounded-xl hover:bg-dark-600 hover:border-gray-600 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              Edit Poll
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-600/40 text-red-400 rounded-xl hover:bg-red-600/10 hover:border-red-600/60 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              Delete Poll
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
