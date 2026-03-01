"use client";

import { useState, useMemo, memo } from "react";
import { DemoPoll, useApp, formatDollars, formatDollarsShort, WINNING_OPTION_UNSET } from "./Providers";
import Link from "next/link";
import Image from "next/image";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import OptionAvatar from "./OptionAvatar";
import dynamic from "next/dynamic";

// Lazy-load modals — only rendered on user interaction, not in initial bundle
const EditPollModal = dynamic(() => import("./EditPollModal"), { ssr: false });
const DeletePollModal = dynamic(() => import("./DeletePollModal"), { ssr: false });
import { useCountdown } from "@/lib/useCountdown";
import { useVote } from "@/lib/useVote";
import { getCategoryMeta, isAdminWallet } from "@/lib/constants";
import CountdownCircle from "./CountdownCircle";
import { fireConfetti } from "@/lib/confetti";
import { playPop, playSuccess, playReward, playError, hapticFeedback } from "@/lib/sounds";
import { useUserProfiles } from "@/lib/userProfiles";
import { useBookmarks } from "@/lib/bookmarks";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/languageContext";
import { ChevronDown, Zap, CheckCircle } from "lucide-react";
import {
  PollOptionRows,
  PollVotePanel,
  PollPositions,
  PollSettlement,
  PollClaimReward,
  PollCreatorManage,
  PollCreatorBadge,
} from "./PollCardParts";

type Props = {
  poll: DemoPoll;
};

const PollCard = memo(function PollCard({ poll }: Props) {
  const {
    walletAddress,
    walletConnected,
    connectWallet,
    userAccount,
    settlePoll,
    claimReward,
  } = useApp();

  const { getDisplayName, getAvatarUrl } = useUserProfiles();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const {
    selectedOption: votingOption,
    numCoins,
    setNumCoins,
    loading: voteLoading,
    success: voteSuccess,
    cost,
    totalVotes,
    isEnded,
    isSettled,
    isCreator,
    vote,
    selectOption,
    clearSelection,
    submitVote,
  } = useVote(poll);

  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);
  const { t } = useLanguage();

  const canManage = isCreator && totalVotes === 0 && !isEnded && !isSettled;
  const mainImage = sanitizeImageUrl(poll.imageUrl);
  const { text: timeLeft, progress: countdownProgress } = useCountdown(poll.endTime);

  // #26: Normalize percentages using largest-remainder method for all option counts
  const optionData = useMemo(() => {
    const raw = poll.options.map((opt, i) => {
      const v = poll.voteCounts[i] || 0;
      const multiplier =
        totalVotes > 0 && v > 0 ? (totalVotes / v).toFixed(2) : "—";
      return { label: opt, votes: v, pct: 0, multiplier, index: i };
    });

    if (totalVotes <= 0) {
      // Even split when no votes
      const evenPct = Math.round(100 / raw.length);
      raw.forEach((d, i) => { d.pct = i === raw.length - 1 ? 100 - evenPct * (raw.length - 1) : evenPct; });
    } else {
      // Largest-remainder method to guarantee sum = 100
      const exactPcts = raw.map(d => (d.votes / totalVotes) * 100);
      const floored = exactPcts.map(p => Math.floor(p));
      let remainder = 100 - floored.reduce((a, b) => a + b, 0);
      const remainders = exactPcts.map((p, i) => ({ idx: i, r: p - floored[i] }));
      remainders.sort((a, b) => b.r - a.r);
      for (const { idx } of remainders) {
        if (remainder <= 0) break;
        floored[idx]++;
        remainder--;
      }
      raw.forEach((d, i) => { d.pct = floored[i]; });
    }
    return raw;
  }, [poll.options, poll.voteCounts, totalVotes]);

  const canClaim =
    isSettled &&
    vote &&
    !vote.claimed &&
    poll.winningOption !== WINNING_OPTION_UNSET &&
    (vote.votesPerOption[poll.winningOption] || 0) > 0;

  const potentialReward = (() => {
    if (!canClaim || !vote) return 0;
    const denominator = poll.voteCounts[poll.winningOption] || 0;
    if (denominator === 0) return 0;
    return Math.floor(
      (vote.votesPerOption[poll.winningOption] / denominator) *
      poll.totalPoolLamports
    );
  })();

  const handleOptionClick = (idx: number) => {
    if (selectOption(idx)) {
      playPop();
      hapticFeedback("light");
      setExpanded(true);
    }
  };

  const handleSettle = async () => {
    setShowSettleConfirm(false);
    try {
      if (await settlePoll(poll.id)) {
        playSuccess();
        toast.success(t("pollSettled"));
      } else {
        playError();
        toast.error(t("settlementFailed"));
      }
    } catch (e) {
      console.error("Settlement error:", e);
      playError();
      toast.error(t("settlementFailed"));
    }
  };

  const handleClaim = async () => {
    try {
      const reward = await claimReward(poll.id);
      if (reward > 0) {
        fireConfetti();
        playReward();
        hapticFeedback("heavy");
        toast.success(`Claimed ${formatDollars(reward)}!`);
      } else {
        playError();
        toast.error(t("noRewardToClaim"));
      }
    } catch (e) {
      console.error("Claim error:", e);
      playError();
      toast.error(t("noRewardToClaim"));
    }
  };

  return (
    <>
      {showEditModal && (
        <EditPollModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          poll={poll}
        />
      )}
      {showDeleteModal && (
        <DeletePollModal
          isOpen={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          poll={poll}
          onDeleted={() => { setShowDeleteModal(false); }}
        />
      )}

      <div
        className={`bg-surface-100 border rounded-xl overflow-hidden card-hover ${expanded
          ? "border-brand-500/30"
          : "border-border hover:border-border-hover"
          }`}
      >
        {/* ═══════ COLLAPSED VIEW ═══════ */}
        <div className="p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            {mainImage ? (
              mainImage.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mainImage} alt="" className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
              ) : (
                <Image src={mainImage} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" unoptimized />
              )
            ) : (
              <div className="w-12 h-12 rounded-lg bg-surface-200 shrink-0 flex items-center justify-center border border-border">
                <BarChart3Icon />
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link
                href={`/polls/${poll.id}`}
                className="hover:text-brand-400 transition-colors"
              >
                <h3 className="text-sm font-semibold leading-snug line-clamp-2 text-neutral-200">
                  {poll.title}
                </h3>
              </Link>
              <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                {(() => {
                  const catMeta = getCategoryMeta(poll.category);
                  return (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-200 text-neutral-400 font-medium border border-border">
                      {catMeta.icon} {poll.category}
                    </span>
                  );
                })()}
                <span
                  className={`text-[10px] px-1.5 py-0.5 rounded font-medium border ${isSettled
                    ? "bg-green-500/10 text-green-400 border-green-500/20"
                    : isEnded
                      ? "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                      : "bg-brand-500/10 text-brand-400 border-brand-500/20"
                    }`}
                >
                  {isSettled
                    ? t("settledBadge")
                    : isEnded
                      ? t("endedBadge")
                      : (
                        <span className="flex items-center gap-1">
                          <CountdownCircle progress={countdownProgress} size={12} strokeWidth={2} />
                          {timeLeft}
                        </span>
                      )}
                </span>
              </div>
            </div>
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center text-neutral-600 hover:text-neutral-300 rounded-lg hover:bg-surface-200 transition-all shrink-0"
              aria-label={expanded ? "Collapse" : "Expand"}
              aria-expanded={expanded}
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""}`}
              />
            </button>
          </div>

          {/* ── Option rows ── */}
          <PollOptionRows
            poll={poll}
            optionData={optionData}
            votingOption={votingOption}
            isEnded={isEnded}
            isSettled={isSettled}
            onOptionClick={handleOptionClick}
          />

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                <Zap size={10} className="text-brand-500" />
                {formatDollarsShort(poll.totalPoolLamports)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                {totalVotes} {t("votesLabel")}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                {formatDollars(poll.unitPriceLamports)}{t("perCoin")}
              </span>
            </div>
            <div className="flex items-center gap-2">
              {!isEnded && !isSettled && !expanded && (
                <button
                  onClick={() => {
                    if (!walletConnected) {
                      connectWallet();
                    } else {
                      setExpanded(true);
                    }
                  }}
                  className="vote-btn-pulse text-[11px] px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold transition-colors active:scale-[0.96]"
                >
                  {t("vote")}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ EXPANDED VIEW ═══════ */}
        <div
          className={`grid transition-[grid-template-rows,opacity] duration-300 ease-in-out ${expanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
            }`}
        >
          <div className="overflow-hidden">
            <div className="px-4 pb-4 border-t border-border">
              {poll.description && (
                <p className="text-sm text-neutral-400 mt-3 mb-3 leading-relaxed">
                  {poll.description}
                </p>
              )}

              {/* ── INLINE VOTE PANEL ── */}
              {votingOption !== null && !isEnded && !isSettled && !isCreator && (
                <PollVotePanel
                  poll={poll}
                  votingOption={votingOption}
                  numCoins={numCoins}
                  setNumCoins={setNumCoins}
                  cost={cost}
                  voteLoading={voteLoading}
                  voteSuccess={voteSuccess}
                  userBalance={userAccount?.balance ?? null}
                  onCancel={clearSelection}
                  onSubmit={async () => {
                    const ok = await submitVote();
                    if (ok) {
                      playSuccess();
                      hapticFeedback("medium");
                    } else {
                      playError();
                    }
                  }}
                />
              )}

              {/* ── Your positions ── */}
              <PollPositions poll={poll} vote={vote} />

              {/* ── Settlement section ── */}
              {isEnded && !isSettled && isAdminWallet(walletAddress) && (
                <PollSettlement
                  showConfirm={showSettleConfirm}
                  setShowConfirm={setShowSettleConfirm}
                  onSettle={handleSettle}
                />
              )}

              {/* ── Claim reward ── */}
              {canClaim && (
                <PollClaimReward potentialReward={potentialReward} onClaim={handleClaim} />
              )}

              {vote?.claimed && (
                <div className="text-center text-[11px] text-neutral-500 mt-3 flex items-center justify-center gap-1">
                  <CheckCircle size={12} />
                  {t("rewardClaimed")}
                </div>
              )}

              {/* ── Creator: Manage ── */}
              {isCreator && !isSettled && (
                <PollCreatorManage
                  canManage={canManage}
                  totalVotes={totalVotes}
                  onEdit={() => setShowEditModal(true)}
                  onDelete={() => setShowDeleteModal(true)}
                />
              )}

              {/* Creator badge */}
              {!isCreator && (
                <PollCreatorBadge
                  poll={poll}
                  displayName={getDisplayName(poll.creator)}
                  avatarUrl={getAvatarUrl(poll.creator)}
                  isBookmarked={isBookmarked(poll.id)}
                  onToggleBookmark={() => toggleBookmark(poll.id)}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
});

/* Simple bar chart icon replacement for missing poll images */
function BarChart3Icon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      className="text-neutral-600"
    >
      <path d="M18 20V10M12 20V4M6 20v-6" />
    </svg>
  );
}

export default PollCard;
