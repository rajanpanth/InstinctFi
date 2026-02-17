"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useApp, formatDollars, DemoPoll } from "@/components/Providers";
import PollImage from "@/components/PollImage";
import Image from "next/image";
import WalletConnectModal from "@/components/WalletConnectModal";
import EditPollModal from "@/components/EditPollModal";
import DeletePollModal from "@/components/DeletePollModal";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import { useCountdown } from "@/lib/useCountdown";
import { useVote } from "@/lib/useVote";
import ShareButton from "@/components/ShareButton";
import PollComments from "@/components/PollComments";
import VoteChart from "@/components/VoteChart";
import { fireConfetti } from "@/lib/confetti";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminWallet } from "@/lib/constants";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/languageContext";

export default function PollDetailPage() {
  const params = useParams();
  const router = useRouter();
  const pollId = params.id as string;

  const {
    polls,
    walletAddress,
    userAccount,
    settlePoll,
    claimReward,
    walletConnected,
    isLoading,
  } = useApp();

  const poll = polls.find((p) => p.id === pollId);

  // Grace period: after navigating from create page, React state may not have updated yet.
  // Wait a short time before concluding the poll truly doesn't exist.
  const [graceExpired, setGraceExpired] = useState(false);
  useEffect(() => {
    if (poll) { setGraceExpired(true); return; }
    setGraceExpired(false);
    const t = setTimeout(() => setGraceExpired(true), 500);
    return () => clearTimeout(t);
  }, [pollId, poll]);

  const emptyPoll: DemoPoll = {
    id: "", pollId: 0, title: "", description: "", category: "",
    creator: "", options: [], optionImages: [], voteCounts: [],
    totalPoolCents: 0, unitPriceCents: 0, totalVoters: 0,
    endTime: 0, status: 0, winningOption: 255, imageUrl: "",
    createdAt: 0, creatorInvestmentCents: 0, platformFeeCents: 0,
    creatorRewardCents: 0,
  };

  const {
    selectedOption, numCoins, setNumCoins,
    cost, totalVotes, isEnded, isSettled, isCreator, canVote,
    vote, selectOption, submitVote,
  } = useVote(poll ?? emptyPoll);

  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [settling, setSettling] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [resolutionProof, setResolutionProof] = useState<string | null>(null);
  const { t } = useLanguage();

  const { text: timeLeft } = useCountdown(poll?.endTime ?? 0);

  // Load resolution proof
  useEffect(() => {
    if (!pollId) return;
    // Try localStorage first
    try {
      const proofs = JSON.parse(localStorage.getItem("instinctfi_resolution_proofs") || "{}");
      if (proofs[pollId]) setResolutionProof(proofs[pollId]);
    } catch {}
    // Then try Supabase
    if (isSupabaseConfigured) {
      supabase.from("resolution_proofs").select("source_url").eq("poll_id", pollId).single().then(({ data }) => {
        if (data?.source_url) setResolutionProof(data.source_url);
      });
    }
  }, [pollId]);

  if (!poll) {
    // Still loading or within grace period — show spinner instead of "not found"
    if (isLoading || !graceExpired) {
      return (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <div className="w-10 h-10 border-3 border-brand-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-gray-500 text-sm">{t("loadingPoll")}</p>
        </div>
      );
    }
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 border border-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>
        </div>
        <p className="text-gray-400 text-lg font-medium mb-2">{t("pollNotFound")}</p>
        <button onClick={() => router.push("/polls")} className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
          ← {t("backToPolls")}
        </button>
      </div>
    );
  }

  const canManage = isCreator && totalVotes === 0 && !isEnded && !isSettled;

  const [voting, setVoting] = useState(false);

  const handleVote = async () => {
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
    setVoting(true);
    try {
      await submitVote();
    } finally {
      setVoting(false);
    }
  };

  const handleOptionClick = (index: number) => {
    if (!walletConnected) {
      setShowWalletModal(true);
      return;
    }
    if (canVote) selectOption(index);
  };

  const handleSettle = async () => {
    if (settling) return;
    setSettling(true);
    try {
      const success = await settlePoll(pollId);
      if (success) toast.success(t("pollSettled"));
      else toast.error(t("settlementFailed"));
    } finally {
      setSettling(false);
    }
  };

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const reward = await claimReward(pollId);
      if (reward > 0) {
        fireConfetti();
        toast.success(`Claimed ${formatDollars(reward)}!`);
      } else {
        toast.error(t("noRewardToClaim"));
      }
    } finally {
      setClaiming(false);
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
      <button onClick={() => router.push("/polls")} className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm font-medium transition-colors group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>
        {t("backToPolls")}
      </button>

      {/* Header */}
      <div className="bg-surface-100 border border-border rounded-2xl overflow-hidden mb-6">
        {poll.imageUrl && (
          <PollImage
            src={poll.imageUrl}
            alt={poll.title}
            className="rounded-none"
          />
        )}

        <div className="p-5 sm:p-8">
          <div className="flex items-start justify-between mb-4">
            <span className="px-3 py-1 bg-brand-600/20 text-brand-400 rounded-lg text-xs font-medium">
              {poll.category}
            </span>
            <div className="flex items-center gap-2">
              <ShareButton pollId={poll.id} pollTitle={poll.title} />
              <span
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  isSettled
                    ? "bg-green-600/20 text-green-400"
                    : isEnded
                    ? "bg-red-600/20 text-red-400"
                    : "bg-brand-500/20 text-brand-400"
                }`}
              >
                {isSettled ? t("settled") : isEnded ? "Awaiting Settlement" : timeLeft}
              </span>
            </div>
          </div>

          <h1 className="text-xl sm:text-2xl font-bold mb-3 tracking-tight">{poll.title}</h1>
          {poll.description && <p className="text-gray-400 mb-6 leading-relaxed text-sm sm:text-base">{poll.description}</p>}

          {/* Stats bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 text-center p-3 sm:p-4 bg-surface-50 border border-border rounded-xl">
            <div>
              <div className="text-lg font-bold text-brand-400">
                {formatDollars(poll.totalPoolCents)}
              </div>
              <div className="text-xs text-gray-500">Pool</div>
            </div>
            <div>
              <div className="text-lg font-bold">{totalVotes}</div>
              <div className="text-xs text-gray-500">{t("totalVotes")}</div>
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

          {/* Fee transparency */}
          <div className="mt-3 flex flex-wrap gap-3 sm:gap-4 text-xs text-gray-500">
            <span>Platform fee: {formatDollars(poll.platformFeeCents)}</span>
            <span>Creator reward: {formatDollars(poll.creatorRewardCents)}</span>
            <span>Seed investment: {formatDollars(poll.creatorInvestmentCents)}</span>
          </div>

          {/* Resolution proof */}
          {isSettled && resolutionProof && (
            <div className="mt-3 flex items-center gap-2 p-2.5 bg-green-500/5 border border-green-500/20 rounded-lg">
              <span className="text-green-400 text-sm">🔗</span>
              <span className="text-xs text-gray-400">Resolution source:</span>
              <a
                href={resolutionProof}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-brand-400 hover:text-brand-300 underline underline-offset-2 truncate"
              >
                {resolutionProof}
              </a>
            </div>
          )}
        </div>
      </div>

      {/* Options */}
      <div className="bg-surface-100 border border-border rounded-2xl p-5 sm:p-8 mb-6">
        <h2 className="font-semibold text-lg mb-4">{t("options")}</h2>
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
                    ? "border-brand-500 bg-brand-500/10"
                    : "border-border bg-surface-50 hover:border-border"
                } cursor-pointer`}
              >
                <div className="flex justify-between items-center mb-2">
                  <div className="flex items-center gap-3">
                    {optImage ? (
                      optImage.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={optImage} alt={opt} className="w-8 h-8 rounded-full object-cover border border-border" />
                      ) : (
                        <Image src={optImage} alt={opt} width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border" />
                      )
                    ) : (
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white border border-border ${
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
                <div className="h-2 bg-surface-0 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${isWinner ? "bg-green-500" : "bg-brand-600"}`}
                    style={{ width: `${Math.max(pct, 0.5)}%` }}
                  />
                </div>
                {userVotes > 0 && (
                  <div className="mt-2 text-xs text-brand-400">
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
        <div className="bg-surface-100 border border-border rounded-2xl p-5 sm:p-8 mb-6">
          <h2 className="font-semibold text-lg mb-4">{t("step2Title")}</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm text-gray-400 mb-2">Number of coins</label>
              <input
                type="number"
                value={numCoins}
                onChange={(e) => setNumCoins(Math.max(1, parseInt(e.target.value) || 1))}
                min={1}
                className="w-full px-4 py-3 bg-surface-50 border border-border rounded-xl focus:border-brand-500/60 focus:ring-2 focus:ring-brand-500/20 outline-none transition-all"
              />
            </div>
            <div className="text-left sm:text-right pb-0 sm:pb-3">
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
            disabled={voting || (walletConnected && selectedOption === null)}
            className={`w-full mt-4 py-3.5 rounded-xl font-semibold transition-all active:scale-[0.98] ${
              voting
                ? "bg-brand-500/70 cursor-wait"
                : walletConnected && selectedOption !== null
                ? "bg-brand-500 hover:bg-brand-600 shadow-lg shadow-brand-500/15"
                : !walletConnected
                ? "bg-brand-500 hover:bg-brand-600"
                : "bg-gray-700 text-gray-500 cursor-not-allowed"
            }`}
          >
            {voting ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Submitting...
              </span>
            ) : !walletConnected
              ? t("connectWalletToStart")
              : selectedOption !== null
              ? `${t("vote")} "${poll.options[selectedOption]}"`
              : "Select an option above"}
          </button>
        </div>
      )}

      {/* Settlement (admin only) */}
      {isEnded && !isSettled && isAdminWallet(walletAddress) && (
        <div className="bg-surface-100 border border-yellow-600/30 rounded-2xl p-5 sm:p-8 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-brand-400">Poll Ended — Ready to Settle</h2>
          <p className="text-gray-400 text-sm mb-4">
            As admin, you can settle this poll. The option with the most votes wins.
          </p>
          <button
            onClick={handleSettle}
            disabled={settling}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              settling
                ? "bg-brand-500/60 text-dark-900/60 cursor-wait"
                : "bg-brand-500 hover:bg-brand-600 text-dark-900"
            }`}
          >
            {settling ? "Settling..." : t("settlePoll")}
          </button>
        </div>
      )}

      {/* Claim */}
      {canClaim && (
        <div className="bg-surface-100 border border-green-600/30 rounded-2xl p-5 sm:p-8 mb-6">
          <h2 className="font-semibold text-lg mb-2 text-green-400">{t("youWon")}</h2>
          <p className="text-gray-400 text-sm mb-4">
            Your reward:{" "}
            <span className="text-green-400 font-bold">{formatDollars(potentialReward)}</span>
          </p>
          <button
            onClick={handleClaim}
            disabled={claiming}
            className={`w-full py-3 rounded-xl font-semibold transition-colors ${
              claiming
                ? "bg-green-600/60 cursor-wait"
                : "bg-green-600 hover:bg-green-700"
            }`}
          >
            {claiming ? "Claiming..." : t("claimReward")}
          </button>
        </div>
      )}

      {/* Already claimed */}
      {vote?.claimed && (
        <div className="bg-surface-100 border border-border rounded-2xl p-6 text-center text-gray-400">
          Reward already claimed for this poll.
        </div>
      )}

      {/* Creator notice */}
      {isCreator && !isSettled && (
        <div className="bg-surface-100 border border-border rounded-2xl p-6 text-center text-gray-500 text-sm">
          You created this poll — you cannot vote on it.
        </div>
      )}

      {/* Manage Poll (edit/delete) — visible only to creator when no votes */}
      {canManage && (
        <div className="bg-surface-100 border border-border rounded-2xl p-5 sm:p-6 mt-6">
          <h2 className="font-semibold text-lg mb-1">Manage Poll</h2>
          <p className="text-gray-500 text-sm mb-4">
            No votes yet — you can edit or delete this poll.
          </p>
          <div className="flex gap-3">
            <button
              onClick={() => setShowEditModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-border text-gray-300 rounded-xl hover:bg-dark-600 hover:border-gray-600 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
              </svg>
              {t("edit")} Poll
            </button>
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 border border-red-600/40 text-red-400 rounded-xl hover:bg-red-600/10 hover:border-red-600/60 transition-colors font-medium"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="3 6 5 6 21 6" />
                <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              </svg>
              {t("delete")} Poll
            </button>
          </div>
        </div>
      )}

      {/* ── Vote Distribution Chart ── */}
      <VoteChart poll={poll} />

      {/* ── Comments Section ── */}
      <div className="mt-6">
        <PollComments pollId={pollId} />
      </div>
    </div>
  );
}
