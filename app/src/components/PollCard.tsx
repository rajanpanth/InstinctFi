"use client";

import { useState, memo } from "react";
import { DemoPoll, useApp, formatDollars, formatDollarsShort } from "./Providers";
import Link from "next/link";
import { sanitizeImageUrl } from "@/lib/uploadImage";
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

type Props = {
  poll: DemoPoll;
};

/* ── Option Avatar ── */
function OptionAvatar({ src, label, index, size = "sm" }: { src?: string; label: string; index: number; size?: "sm" | "lg" }) {
  const sanitized = src ? sanitizeImageUrl(src) : "";
  const colors = [
    "from-blue-500 to-blue-600",
    "from-red-500 to-red-600",
    "from-green-500 to-green-600",
    "from-purple-500 to-purple-600",
    "from-orange-500 to-orange-600",
    "from-pink-500 to-pink-600",
  ];
  const bg = colors[index % colors.length];
  const dim = size === "lg" ? "w-10 h-10" : "w-7 h-7";
  const textSize = size === "lg" ? "text-sm" : "text-[10px]";

  if (sanitized) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={sanitized} alt={label} className={`${dim} rounded-full object-cover shrink-0 border border-gray-700`} />
    );
  }
  return (
    <div className={`${dim} rounded-full bg-gradient-to-br ${bg} flex items-center justify-center ${textSize} font-bold text-white shrink-0 border border-gray-700`}>
      {label.charAt(0).toUpperCase()}
    </div>
  );
}

const PollCard = memo(function PollCard({ poll }: Props) {
  const {
    walletAddress, walletConnected, connectWallet, userAccount,
    settlePoll, claimReward,
  } = useApp();

  const { getDisplayName, getAvatarUrl } = useUserProfiles();
  const { isBookmarked, toggleBookmark } = useBookmarks();

  const {
    selectedOption: votingOption,
    numCoins, setNumCoins,
    loading: voteLoading,
    success: voteSuccess,
    cost, totalVotes,
    isEnded, isSettled, isCreator,
    vote, selectOption, clearSelection, submitVote,
  } = useVote(poll);

  const [expanded, setExpanded] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSettleConfirm, setShowSettleConfirm] = useState(false);

  const canManage = isCreator && totalVotes === 0 && !isEnded && !isSettled;
  const mainImage = sanitizeImageUrl(poll.imageUrl);
  const { text: timeLeft, progress: countdownProgress } = useCountdown(poll.endTime);

  // Build option data
  const optionData = poll.options.map((opt, i) => {
    const v = poll.voteCounts[i] || 0;
    const pct = totalVotes > 0 ? Math.round((v / totalVotes) * 100) : Math.round(100 / poll.options.length);
    const multiplier = totalVotes > 0 && v > 0 ? (totalVotes / v).toFixed(2) : "—";
    return { label: opt, votes: v, pct, multiplier, index: i };
  });
  if (optionData.length === 2 && totalVotes > 0) optionData[1].pct = 100 - optionData[0].pct;

  const canClaim = isSettled && vote && !vote.claimed && poll.winningOption !== 255
    && (vote.votesPerOption[poll.winningOption] || 0) > 0;

  const potentialReward = canClaim && vote
    ? Math.floor((vote.votesPerOption[poll.winningOption] / poll.voteCounts[poll.winningOption]) * poll.totalPoolCents)
    : 0;

  // ── Handlers ──
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
      toast.success("Poll settled!");
    } else {
      playError();
      toast.error("Settlement failed");
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
      toast.error("No reward to claim");
    }
  };

  // Colors for option badges (from shared constants)
  const badgeColors = OPTION_BADGE_COLORS;

  return (
    <>
      {/* Modals — only mount when open to avoid hundreds of hidden DOM trees */}
      {showEditModal && <EditPollModal isOpen={showEditModal} onClose={() => setShowEditModal(false)} poll={poll} />}
      {showDeleteModal && <DeletePollModal isOpen={showDeleteModal} onClose={() => setShowDeleteModal(false)} poll={poll} onDeleted={() => {}} />}

      <div className={`bg-dark-700/60 border rounded-2xl overflow-hidden card-hover ${
        expanded ? "border-primary-500/40 shadow-lg shadow-primary-900/10" : "border-gray-800/80 hover:border-gray-700/80"
      }`}>
        {/* ═══════ COLLAPSED VIEW ═══════ */}
        <div className="p-3.5 sm:p-4">
          {/* Header row */}
          <div className="flex items-start gap-3 mb-3">
            {/* Image */}
            {mainImage ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={mainImage} alt="" className="w-10 h-10 rounded-lg object-cover shrink-0 border border-gray-700" />
            ) : (
              <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-600/30 to-accent-500/20 shrink-0 flex items-center justify-center border border-gray-700">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                  <rect x="3" y="3" width="18" height="18" rx="3" /><circle cx="8.5" cy="8.5" r="1.5" /><path d="M21 15l-5-5L5 21" />
                </svg>
              </div>
            )}
            <div className="flex-1 min-w-0">
              <Link href={`/polls/${poll.id}`} className="hover:text-primary-300 transition-colors">
                <h3 className="text-[13px] sm:text-sm font-semibold leading-snug line-clamp-2">{poll.title}</h3>
              </Link>
              <div className="flex items-center gap-2 mt-1">
                {(() => {
                  const catMeta = getCategoryMeta(poll.category);
                  return (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium bg-gradient-to-r ${catMeta.bgGradient || "from-primary-600/20 to-primary-600/20"} ${catMeta.color}`}>
                      {catMeta.icon} {poll.category}
                    </span>
                  );
                })()}
                <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                  isSettled ? "bg-green-600/20 text-green-400" : isEnded ? "bg-yellow-600/20 text-yellow-400" : "bg-accent-500/20 text-accent-400"
                }`}>
                  {isSettled ? "Settled" : isEnded ? "Ended" : (
                    <span className="flex items-center gap-1">
                      <CountdownCircle progress={countdownProgress} size={14} strokeWidth={2} />
                      {timeLeft}
                    </span>
                  )}
                </span>
              </div>
            </div>
            {/* Expand/collapse toggle */}
            <button
              onClick={() => setExpanded(!expanded)}
              className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-dark-600 transition-all shrink-0"
              aria-label={expanded ? "Collapse" : "Expand"}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                className={`transition-transform duration-300 ${expanded ? "rotate-180" : ""}`}>
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          </div>

          {/* ── Option rows (always visible) ── */}
          <div className="space-y-1.5">
            {optionData.map((opt) => {
              const bc = badgeColors[opt.index % badgeColors.length];
              const isWinner = isSettled && poll.winningOption === opt.index;
              const isVoting = votingOption === opt.index;

              return (
                <button
                  key={opt.index}
                  onClick={() => handleOptionClick(opt.index)}
                  disabled={isEnded || isSettled}
                  className={`w-full flex items-center gap-2.5 group/opt transition-all rounded-lg px-2 py-2 ${
                    isVoting ? "bg-primary-500/10 ring-1 ring-primary-500/40" :
                    isEnded || isSettled ? "cursor-default" : "hover:bg-dark-600/60 cursor-pointer"
                  }`}
                >
                  <OptionAvatar src={poll.optionImages?.[opt.index]} label={opt.label} index={opt.index} />
                  <span className={`text-sm truncate flex-1 text-left ${isWinner ? "text-green-400 font-semibold" : "text-gray-300"}`}>
                    {isWinner && "✓ "}{opt.label}
                  </span>
                  {opt.multiplier !== "—" && (
                    <span className="text-xs text-accent-400 font-mono font-bold shrink-0 bg-accent-500/10 px-1.5 py-0.5 rounded">{opt.multiplier}x</span>
                  )}
                  <span className={`shrink-0 px-2.5 py-1 rounded-md text-xs font-bold border transition-all ${
                    isWinner ? "bg-green-500/20 text-green-400 border-green-500/40" :
                    `${bc.bg} ${bc.text} ${bc.border} ${bc.bgHover} ${bc.borderHover}`
                  }`}>
                    {opt.pct}%
                  </span>
                </button>
              );
            })}
          </div>

          {/* Odds/Multiplier badges — prominent display */}
          {totalVotes > 0 && (
            <div className="flex items-center gap-2 mt-2">
              {optionData.map((opt) => {
                const bc = badgeColors[opt.index % badgeColors.length];
                return (
                  <div key={opt.index} className={`flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-bold ${bc.bg} ${bc.text} border ${bc.border}`}>
                    <span className="truncate max-w-[60px]">{opt.label}</span>
                    <span className="text-[10px] opacity-70">→</span>
                    <span>{opt.multiplier !== "—" ? `${opt.multiplier}x` : "—"}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Footer stats */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-800/80">
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{formatDollarsShort(poll.totalPoolCents)} vol</span>
              <span className="text-xs text-gray-400">{totalVotes} votes</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400">{formatDollars(poll.unitPriceCents)}/coin</span>
              {!isEnded && !isSettled && !expanded && (
                <button
                  onClick={() => { if (!walletConnected) { connectWallet(); } else { setExpanded(true); } }}
                  className="text-[11px] px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold transition-colors"
                >
                  Vote
                </button>
              )}
            </div>
          </div>
        </div>

        {/* ═══════ EXPANDED VIEW ═══════ */}
        <div className={`overflow-hidden transition-all duration-300 ease-in-out ${expanded ? "max-h-[800px] opacity-100" : "max-h-0 opacity-0"}`}>
          <div className="px-4 pb-4 border-t border-gray-800/60">

            {/* Description */}
            {poll.description && (
              <p className="text-sm text-gray-400 mt-3 mb-3 leading-relaxed">{poll.description}</p>
            )}

            {/* ── INLINE VOTE PANEL ── */}
            {votingOption !== null && !isEnded && !isSettled && !isCreator && (
              <div className="bg-dark-800/80 border border-gray-700 rounded-xl p-4 mt-3 animate-scaleIn">
                <div className="flex items-center gap-2.5 mb-3">
                  <OptionAvatar src={poll.optionImages?.[votingOption]} label={poll.options[votingOption]} index={votingOption} size="lg" />
                  <div>
                    <p className="text-xs text-gray-400">Buying coins on</p>
                    <p className="text-sm font-semibold text-white">{poll.options[votingOption]}</p>
                  </div>
                </div>

                {/* Quantity + cost */}
                <div className="bg-dark-900 border border-gray-700/60 rounded-xl p-3 mb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Coins</p>
                      {userAccount && <p className="text-[10px] text-green-400/70 mt-0.5">Bal: {formatDollars(userAccount.balance)}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <button onClick={() => setNumCoins(Math.max(1, numCoins - 1))} aria-label="Decrease coin count" className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 flex items-center justify-center text-lg transition-colors">−</button>
                      <input
                        type="number"
                        value={numCoins}
                        onChange={(e) => setNumCoins(Math.max(1, parseInt(e.target.value) || 1))}
                        min={1}
                        className="w-14 text-center text-lg font-semibold bg-transparent outline-none text-white"
                      />
                      <button onClick={() => setNumCoins(numCoins + 1)} aria-label="Increase coin count" className="w-7 h-7 rounded-lg bg-dark-700 hover:bg-dark-600 text-gray-400 flex items-center justify-center text-lg transition-colors">+</button>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
                    <span className="text-xs text-gray-400">Total Cost</span>
                    <span className="text-sm font-semibold text-white">{formatDollars(cost)}</span>
                  </div>
                </div>

                {/* Buy / Cancel */}
                <div className="flex gap-2">
                  <button
                    onClick={clearSelection}
                    className="flex-1 py-2.5 text-sm border border-gray-700 text-gray-400 rounded-xl hover:bg-dark-700 transition-colors font-medium"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const ok = await submitVote();
                      if (ok) { playSuccess(); hapticFeedback("medium"); }
                      else { playError(); }
                    }}
                    disabled={voteLoading}
                    className={`flex-1 py-2.5 text-sm rounded-xl font-semibold transition-all ${
                      voteSuccess
                        ? "bg-green-600 text-white"
                        : voteLoading
                        ? "bg-blue-600/60 text-white/60 cursor-wait"
                        : "bg-blue-600 hover:bg-blue-700 text-white"
                    }`}
                  >
                    {voteSuccess ? "✓ Success!" : voteLoading ? "Processing..." : `Buy ${numCoins} Coin${numCoins > 1 ? "s" : ""}`}
                  </button>
                </div>
              </div>
            )}

            {/* ── Your votes summary ── */}
            {vote && vote.totalStakedCents > 0 && (
              <div className="bg-dark-800/50 border border-gray-700/50 rounded-xl p-3 mt-3">
                <p className="text-xs text-gray-400 mb-1.5">Your positions</p>
                <div className="space-y-1">
                  {vote.votesPerOption.map((v, i) => v > 0 && (
                    <div key={i} className="flex items-center justify-between text-sm">
                      <span className="text-gray-300">{poll.options[i]}</span>
                      <span className="text-accent-400 font-medium">{v} coin{v > 1 ? "s" : ""} ({formatDollars(v * poll.unitPriceCents)})</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Settlement section (admin only) ── */}
            {isEnded && !isSettled && isAdminWallet(walletAddress) && (
              <div className="bg-yellow-600/10 border border-yellow-600/25 rounded-xl p-3 mt-3">
                <p className="text-sm font-medium text-yellow-400 mb-1">Ready to Settle</p>
                <p className="text-xs text-gray-400 mb-2">Anyone can trigger settlement. Most votes wins.</p>
                {showSettleConfirm ? (
                  <div className="space-y-2">
                    <p className="text-xs text-yellow-300">Are you sure? This action is irreversible.</p>
                    <div className="flex gap-2">
                      <button onClick={() => setShowSettleConfirm(false)} className="flex-1 py-2 text-sm border border-gray-700 text-gray-400 rounded-xl hover:bg-dark-700 transition-colors">
                        Cancel
                      </button>
                      <button onClick={handleSettle} className="flex-1 py-2 bg-accent-500 hover:bg-accent-600 text-dark-900 rounded-xl text-sm font-semibold transition-colors">
                        Confirm Settle
                      </button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setShowSettleConfirm(true)} className="w-full py-2.5 bg-accent-500 hover:bg-accent-600 text-dark-900 rounded-xl text-sm font-semibold transition-colors">
                    Settle Poll
                  </button>
                )}
              </div>
            )}

            {/* ── Claim reward ── */}
            {canClaim && (
              <div className="bg-green-600/10 border border-green-600/25 rounded-xl p-3 mt-3">
                <p className="text-sm font-medium text-green-400 mb-1">You Won!</p>
                <p className="text-xs text-gray-400 mb-2">Reward: <span className="text-green-400 font-semibold">{formatDollars(potentialReward)}</span></p>
                <button onClick={handleClaim} className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-xl text-sm font-semibold transition-colors">
                  Claim Reward
                </button>
              </div>
            )}

            {vote?.claimed && (
              <div className="text-center text-xs text-gray-400 mt-3">Reward claimed for this poll ✓</div>
            )}

            {/* ── Creator: Manage ── */}
            {isCreator && !isSettled && (
              <div className="mt-3 pt-3 border-t border-gray-800/60">
                {canManage ? (
                  <div>
                    <p className="text-xs text-gray-400 mb-2">Manage Poll (0 votes — editable)</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowEditModal(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-gray-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Edit
                      </button>
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-red-600/40 text-red-400 rounded-lg hover:bg-red-600/10 transition-colors font-medium"
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                        Delete
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 text-center">
                    {totalVotes > 0 ? "Cannot edit/delete — poll has votes" : "You created this poll"}
                  </p>
                )}
              </div>
            )}

            {/* Creator badge if not creator */}
            {!isCreator && (
              <div className="mt-3 pt-2.5 border-t border-gray-800/60 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {getAvatarUrl(poll.creator) ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={getAvatarUrl(poll.creator)} alt="" className="w-5 h-5 rounded-full object-cover border border-gray-700" />
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-[8px] font-bold text-white shrink-0">
                      {getDisplayName(poll.creator).charAt(0).toUpperCase()}
                    </div>
                  )}
                  <span className="text-[11px] text-gray-400 truncate">by {getDisplayName(poll.creator)}</span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleBookmark(poll.id); }}
                    className={`p-1 rounded-md transition-colors ${
                      isBookmarked(poll.id)
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-gray-500 hover:text-gray-300"
                    }`}
                    title={isBookmarked(poll.id) ? "Remove bookmark" : "Bookmark"}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill={isBookmarked(poll.id) ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2">
                      <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
                    </svg>
                  </button>
                  <ShareButton pollId={poll.id} pollTitle={poll.title} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
});

export default PollCard;
