"use client";

import { useState, memo } from "react";
import { DemoPoll, useApp, formatDollars, formatDollarsShort } from "./Providers";
import Link from "next/link";
import Image from "next/image";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import OptionAvatar from "./OptionAvatar";
import EditPollModal from "./EditPollModal";
import DeletePollModal from "./DeletePollModal";
import { useCountdown } from "@/lib/useCountdown";
import { useVote } from "@/lib/useVote";
import { OPTION_BADGE_COLORS } from "@/lib/utils";
import { getCategoryMeta, isAdminWallet } from "@/lib/constants";
import ShareButton from "./ShareButton";
import CountdownCircle from "./CountdownCircle";
import { fireConfetti } from "@/lib/confetti";
import { playPop, playSuccess, playReward, playError, hapticFeedback } from "@/lib/sounds";
import { useUserProfiles } from "@/lib/userProfiles";
import { useBookmarks } from "@/lib/bookmarks";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/languageContext";
import {
  ChevronDown,
  Bookmark,
  Edit3,
  Trash2,
  Minus,
  Plus,
  Zap,
  Clock,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

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

  const optionData = poll.options.map((opt, i) => {
    const v = poll.voteCounts[i] || 0;
    const pct =
      totalVotes > 0
        ? Math.round((v / totalVotes) * 100)
        : Math.round(100 / poll.options.length);
    const multiplier =
      totalVotes > 0 && v > 0 ? (totalVotes / v).toFixed(2) : "—";
    return { label: opt, votes: v, pct, multiplier, index: i };
  });
  if (optionData.length === 2 && totalVotes > 0)
    optionData[1].pct = 100 - optionData[0].pct;

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

  const handleOptionClick = (idx: number) => {
    if (selectOption(idx)) {
      playPop();
      hapticFeedback("light");
      setExpanded(true);
    }
  };

  const handleSettle = async () => {
    setShowSettleConfirm(false);
    if (await settlePoll(poll.id)) {
      playSuccess();
      toast.success(t("pollSettled"));
    } else {
      playError();
      toast.error(t("settlementFailed"));
    }
  };

  const handleClaim = async () => {
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
  };

  const badgeColors = OPTION_BADGE_COLORS;

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
          onDeleted={() => { }}
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
                <Image src={mainImage} alt="" width={48} height={48} className="w-12 h-12 rounded-lg object-cover shrink-0 border border-border" />
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
                          <CountdownCircle
                            progress={countdownProgress}
                            size={12}
                            strokeWidth={2}
                          />
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
            >
              <ChevronDown
                size={14}
                className={`transition-transform duration-200 ${expanded ? "rotate-180" : ""
                  }`}
              />
            </button>
          </div>

          {/* ── Option rows ── */}
          <div className="space-y-1.5">
            {optionData.map((opt) => {
              const bc = badgeColors[opt.index % badgeColors.length];
              const isWinner = isSettled && poll.winningOption === opt.index;
              const isVoting = votingOption === opt.index;
              const barColors = [
                "bg-blue-500/10",
                "bg-red-500/10",
                "bg-purple-500/10",
                "bg-orange-500/10",
                "bg-green-500/10",
                "bg-pink-500/10",
              ];
              const barColor = isWinner
                ? "bg-green-500/15"
                : barColors[opt.index % barColors.length];

              return (
                <button
                  key={opt.index}
                  onClick={() => handleOptionClick(opt.index)}
                  disabled={isEnded || isSettled} aria-label={`Vote for ${opt.label}, ${opt.pct}%${isWinner ? ', winner' : ''}`} className={`relative w-full flex items-center gap-2.5 group/opt transition-all rounded-lg px-3 py-2 overflow-hidden ${isVoting
                    ? "ring-1 ring-brand-500/40 bg-brand-500/[0.05]"
                    : isEnded || isSettled
                      ? "cursor-default bg-surface-50"
                      : "hover:bg-surface-200/50 cursor-pointer bg-surface-50"
                    }`}
                >
                  <div
                    className={`absolute inset-y-0 left-0 ${barColor} transition-all duration-500 ease-out rounded-lg`}
                    style={{ width: `${Math.max(opt.pct, 2)}%` }}
                  />
                  <div className="relative flex items-center gap-2.5 w-full z-[1]">
                    <OptionAvatar
                      src={poll.optionImages?.[opt.index]}
                      label={opt.label}
                      index={opt.index}
                    />
                    <span
                      className={`text-sm truncate flex-1 text-left font-medium ${isWinner ? "text-green-400" : "text-neutral-300"
                        }`}
                    >
                      {isWinner && "✓ "}
                      {opt.label}
                    </span>
                    {opt.multiplier !== "—" && (
                      <span className="text-[10px] text-brand-400 font-mono font-semibold shrink-0 bg-brand-500/10 px-1.5 py-0.5 rounded">
                        {opt.multiplier}x
                      </span>
                    )}
                    <span
                      className={`shrink-0 min-w-[40px] text-center px-2.5 py-1 rounded text-xs font-semibold border transition-all ${isWinner
                        ? "bg-green-500/15 text-green-400 border-green-500/25"
                        : `${bc.bg} ${bc.text} ${bc.border} ${bc.bgHover} ${bc.borderHover}`
                        }`}
                    >
                      {opt.pct}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                <Zap size={10} className="text-brand-500" />
                {formatDollarsShort(poll.totalPoolCents)}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                {totalVotes} {t("votesLabel")}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500 bg-surface-50 px-2 py-0.5 rounded border border-border">
                {formatDollars(poll.unitPriceCents)}{t("perCoin")}
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
                  className="text-[11px] px-3 py-1 bg-brand-500 hover:bg-brand-600 text-white rounded-lg font-semibold transition-colors active:scale-[0.96]"
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
                <div className="bg-surface-200 border border-border rounded-lg p-4 mt-3 animate-scaleIn">
                  <div className="flex items-center gap-2.5 mb-3">
                    <OptionAvatar
                      src={poll.optionImages?.[votingOption]}
                      label={poll.options[votingOption]}
                      index={votingOption}
                      size="lg"
                    />
                    <div>
                      <p className="text-[11px] text-neutral-500">{t("buyingCoinsOn")}</p>
                      <p className="text-sm font-semibold text-neutral-200">
                        {poll.options[votingOption]}
                      </p>
                    </div>
                  </div>

                  <div className="bg-surface-0 border border-border rounded-lg p-3 mb-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-[11px] text-neutral-500">{t("coins")}</p>
                        {userAccount && (
                          <p className="text-[10px] text-brand-500/70 mt-0.5">
                            {t("bal")} {formatDollars(userAccount.balance)}
                          </p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setNumCoins(Math.max(1, numCoins - 1))}
                          aria-label="Decrease coin count"
                          className="w-7 h-7 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors"
                        >
                          <Minus size={14} />
                        </button>
                        <input
                          type="number"
                          value={numCoins}
                          onChange={(e) =>
                            setNumCoins(Math.max(1, parseInt(e.target.value) || 1))
                          }
                          min={1}
                          aria-label="Number of coins to vote"
                          className="w-12 text-center text-lg font-semibold bg-transparent outline-none text-neutral-200"
                        />
                        <button
                          onClick={() => setNumCoins(numCoins + 1)}
                          aria-label="Increase coin count"
                          className="w-7 h-7 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                      <span className="text-[11px] text-neutral-500">{t("totalCost")}</span>
                      <span className="text-sm font-semibold text-neutral-200">
                        {formatDollars(cost)}
                      </span>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={clearSelection}
                      className="flex-1 py-2.5 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-300 transition-colors font-medium"
                    >
                      {t("cancel")}
                    </button>
                    <button
                      onClick={async () => {
                        const ok = await submitVote();
                        if (ok) {
                          playSuccess();
                          hapticFeedback("medium");
                        } else {
                          playError();
                        }
                      }}
                      disabled={voteLoading}
                      className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition-all ${voteSuccess
                        ? "bg-green-600 text-white"
                        : voteLoading
                          ? "bg-brand-600/60 text-white/60 cursor-wait"
                          : "bg-brand-500 hover:bg-brand-600 text-white"
                        }`}
                    >
                      {voteSuccess
                        ? t("success")
                        : voteLoading
                          ? t("processing")
                          : `${t("buyCoins")} ${numCoins} ${numCoins > 1 ? t("coins") : t("coin")}`}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Your positions ── */}
              {vote && vote.totalStakedCents > 0 && (
                <div className="bg-surface-50 border border-border rounded-lg p-3 mt-3">
                  <p className="text-[11px] text-neutral-500 mb-1.5">{t("yourPositions")}</p>
                  <div className="space-y-1">
                    {vote.votesPerOption.map(
                      (v, i) =>
                        v > 0 && (
                          <div
                            key={i}
                            className="flex items-center justify-between text-sm"
                          >
                            <span className="text-neutral-300">{poll.options[i]}</span>
                            <span className="text-brand-400 font-medium text-xs">
                              {v} coin{v > 1 ? "s" : ""} (
                              {formatDollars(v * poll.unitPriceCents)})
                            </span>
                          </div>
                        )
                    )}
                  </div>
                </div>
              )}

              {/* ── Settlement section ── */}
              {isEnded && !isSettled && isAdminWallet(walletAddress) && (
                <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-yellow-400 mb-1 flex items-center gap-1.5">
                    <AlertCircle size={14} />
                    {t("readyToSettle")}
                  </p>
                  <p className="text-[11px] text-neutral-500 mb-2">Admin settlement: highest-voted option wins by default.</p>
                  {showSettleConfirm ? (
                    <div className="space-y-2">
                      <p className="text-[11px] text-yellow-300">{t("settleConfirm")}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowSettleConfirm(false)}
                          className="flex-1 py-2 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-200 transition-colors"
                        >
                          {t("cancel")}
                        </button>
                        <button
                          onClick={handleSettle}
                          className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                        >
                          {t("confirmSettle")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowSettleConfirm(true)}
                      className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                    >
                      {t("settlePoll")}
                    </button>
                  )}
                </div>
              )}

              {/* ── Claim reward ── */}
              {canClaim && (
                <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3 mt-3">
                  <p className="text-sm font-medium text-green-400 mb-1 flex items-center gap-1.5">
                    <CheckCircle size={14} />
                    {t("youWon")}
                  </p>
                  <p className="text-[11px] text-neutral-500 mb-2">
                    {t("reward")}{" "}
                    <span className="text-green-400 font-semibold">
                      {formatDollars(potentialReward)}
                    </span>
                  </p>
                  <button
                    onClick={handleClaim}
                    className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold text-white transition-colors"
                  >
                    {t("claimReward")}
                  </button>
                </div>
              )}

              {vote?.claimed && (
                <div className="text-center text-[11px] text-neutral-500 mt-3 flex items-center justify-center gap-1">
                  <CheckCircle size={12} />
                  {t("rewardClaimed")}
                </div>
              )}

              {/* ── Creator: Manage ── */}
              {isCreator && !isSettled && (
                <div className="mt-3 pt-3 border-t border-border">
                  {canManage ? (
                    <div>
                      <p className="text-[11px] text-neutral-500 mb-2">{t("manageEditable")}</p>
                      <div className="flex gap-2">
                        <button
                          onClick={() => setShowEditModal(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-border text-neutral-400 rounded-lg hover:bg-surface-200 transition-colors font-medium"
                        >
                          <Edit3 size={12} />
                          {t("edit")}
                        </button>
                        <button
                          onClick={() => setShowDeleteModal(true)}
                          className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-red-500/20 text-red-400 rounded-lg hover:bg-red-500/5 transition-colors font-medium"
                        >
                          <Trash2 size={12} />
                          {t("delete")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="text-[11px] text-neutral-500 text-center">
                      {totalVotes > 0 ? t("cannotEditHasVotes") : t("youCreated")}
                    </p>
                  )}
                </div>
              )}

              {/* Creator badge */}
              {!isCreator && (
                <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {getAvatarUrl(poll.creator) ? (
                      getAvatarUrl(poll.creator).startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={getAvatarUrl(poll.creator)} alt="" className="w-5 h-5 rounded-full object-cover border border-border" />
                      ) : (
                        <Image src={getAvatarUrl(poll.creator)} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover border border-border" />
                      )
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-[8px] font-bold text-brand-400 shrink-0">
                        {getDisplayName(poll.creator).charAt(0).toUpperCase()}
                      </div>
                    )}
                    <span className="text-[10px] text-neutral-500 truncate">
                      by {getDisplayName(poll.creator)}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleBookmark(poll.id);
                      }}
                      className={`p-1 rounded transition-colors ${isBookmarked(poll.id)
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-neutral-600 hover:text-neutral-400"
                        }`}
                      title={
                        isBookmarked(poll.id) ? t("removeBookmark") : t("bookmark")
                      }
                      aria-label={
                        isBookmarked(poll.id) ? t("removeBookmark") : t("bookmark")
                      }
                    >
                      <Bookmark
                        size={13}
                        fill={isBookmarked(poll.id) ? "currentColor" : "none"}
                      />
                    </button>
                    <ShareButton pollId={poll.id} pollTitle={poll.title} />
                  </div>
                </div>
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
