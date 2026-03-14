"use client";

import { DemoPoll, formatDollars, WINNING_OPTION_UNSET } from "./Providers";
import OptionAvatar from "./OptionAvatar";
import { OPTION_BADGE_COLORS } from "@/lib/utils";
import { Minus, Plus, CheckCircle, AlertCircle, Edit3, Trash2, Bookmark } from "lucide-react";
import ShareButton from "./ShareButton";
import Image from "next/image";
import { useLanguage } from "@/lib/languageContext";

// ── Types shared across poll card sub-components ──────────────────────────

export type OptionData = {
    label: string;
    votes: number;
    pct: number;
    multiplier: string;
    index: number;
};

// ── Option Rows (collapsed view) ─────────────────────────────────────────

type OptionRowsProps = {
    poll: DemoPoll;
    optionData: OptionData[];
    votingOption: number | null;
    isEnded: boolean;
    isSettled: boolean;
    onOptionClick: (idx: number) => void;
    maxVisible?: number;
};

export function PollOptionRows({
    poll,
    optionData,
    votingOption,
    isEnded,
    isSettled,
    onOptionClick,
    maxVisible,
}: OptionRowsProps) {
    const badgeColors = OPTION_BADGE_COLORS;

    // When maxVisible is set, show only the top N options by vote count
    let visibleOptions = optionData;
    let hiddenCount = 0;
    if (maxVisible != null && optionData.length > maxVisible) {
        // Pick top N by votes, then re-sort by original index for consistent display order
        const sorted = [...optionData].sort((a, b) => b.votes - a.votes);
        const topN = sorted.slice(0, maxVisible);
        visibleOptions = topN.sort((a, b) => a.index - b.index);
        hiddenCount = optionData.length - maxVisible;
    }

    return (
        <div className="space-y-1.5">
            {visibleOptions.map((opt) => {
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
                        onClick={() => onOptionClick(opt.index)}
                        disabled={isEnded || isSettled}
                        aria-label={`Vote for ${opt.label}, ${opt.pct}%${isWinner ? ", winner" : ""}`}
                        className={`option-row-hover relative w-full flex items-center gap-2.5 group/opt transition-all rounded-lg px-3 py-2.5 overflow-hidden touch-target ${isVoting
                            ? "ring-1 ring-brand-500/40 bg-brand-500/[0.05]"
                            : isEnded || isSettled
                                ? "cursor-default bg-surface-50"
                                : "hover:bg-surface-200/50 cursor-pointer bg-surface-50"
                            }`}
                    >
                        <div
                            className={`absolute inset-y-0 left-0 ${barColor} bar-animate transition-all duration-500 ease-out rounded-lg`}
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
            {hiddenCount > 0 && (
                <div className="text-center text-[11px] text-neutral-500 py-1.5">
                    +{hiddenCount} more option{hiddenCount > 1 ? "s" : ""}
                </div>
            )}
        </div>
    );
}

// ── Vote Panel (inline voting UI in expanded view) ───────────────────────

type VotePanelProps = {
    poll: DemoPoll;
    votingOption: number;
    numCoins: number;
    setNumCoins: (n: number) => void;
    cost: number;
    voteLoading: boolean;
    voteSuccess: boolean;
    userBalance: number | null;
    onCancel: () => void;
    onSubmit: () => void;
};

export function PollVotePanel({
    poll,
    votingOption,
    numCoins,
    setNumCoins,
    cost,
    voteLoading,
    voteSuccess,
    userBalance,
    onCancel,
    onSubmit,
}: VotePanelProps) {
    const { t } = useLanguage();

    return (
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
                        {userBalance !== null && (
                            <p className="text-[10px] text-brand-500/70 mt-0.5">
                                {t("bal")} {formatDollars(userBalance)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setNumCoins(Math.max(1, numCoins - 1))}
                            aria-label="Decrease coin count"
                            className="w-9 h-9 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors touch-target"
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
                            className="w-14 text-center text-lg font-semibold bg-transparent outline-none text-neutral-200"
                        />
                        <button
                            onClick={() => setNumCoins(numCoins + 1)}
                            aria-label="Increase coin count"
                            className="w-9 h-9 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors touch-target"
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
                    onClick={onCancel}
                    className="flex-1 py-2.5 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-300 transition-colors font-medium"
                >
                    {t("cancel")}
                </button>
                <button
                    onClick={onSubmit}
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
    );
}

// ── Positions Display ────────────────────────────────────────────────────

type PositionsProps = {
    poll: DemoPoll;
    vote: { votesPerOption: number[]; totalStakedLamports: number; claimed: boolean } | null | undefined;
};

export function PollPositions({ poll, vote }: PositionsProps) {
    const { t } = useLanguage();
    if (!vote || vote.totalStakedLamports <= 0) return null;

    return (
        <div className="bg-surface-50 border border-border rounded-lg p-3 mt-3">
            <p className="text-[11px] text-neutral-500 mb-1.5">{t("yourPositions")}</p>
            <div className="space-y-1">
                {vote.votesPerOption.map(
                    (v, i) =>
                        v > 0 && (
                            <div key={i} className="flex items-center justify-between text-sm">
                                <span className="text-neutral-300">{poll.options[i]}</span>
                                <span className="text-brand-400 font-medium text-xs">
                                    {v} coin{v > 1 ? "s" : ""} ({formatDollars(v * poll.unitPriceLamports)})
                                </span>
                            </div>
                        )
                )}
            </div>
        </div>
    );
}

// ── Settlement Section ───────────────────────────────────────────────────

type SettlementProps = {
    showConfirm: boolean;
    setShowConfirm: (v: boolean) => void;
    onSettle: () => void;
};

export function PollSettlement({ showConfirm, setShowConfirm, onSettle }: SettlementProps) {
    const { t } = useLanguage();

    return (
        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3 mt-3">
            <p className="text-sm font-medium text-yellow-400 mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} />
                {t("readyToSettle")}
            </p>
            <p className="text-[11px] text-neutral-500 mb-2">
                Admin settlement: highest-voted option wins by default.
            </p>
            {showConfirm ? (
                <div className="space-y-2">
                    <p className="text-[11px] text-yellow-300">{t("settleConfirm")}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 py-2 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-200 transition-colors"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={onSettle}
                            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                        >
                            {t("confirmSettle")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                >
                    {t("settlePoll")}
                </button>
            )}
        </div>
    );
}

// ── Claim Reward Section ─────────────────────────────────────────────────

type ClaimProps = {
    potentialReward: number;
    onClaim: () => void;
};

export function PollClaimReward({ potentialReward, onClaim }: ClaimProps) {
    const { t } = useLanguage();

    return (
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
                onClick={onClaim}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold text-white transition-colors"
            >
                {t("claimReward")}
            </button>
        </div>
    );
}

// ── Creator Management Section ───────────────────────────────────────────

type ManageProps = {
    canManage: boolean;
    totalVotes: number;
    onEdit: () => void;
    onDelete: () => void;
};

export function PollCreatorManage({ canManage, totalVotes, onEdit, onDelete }: ManageProps) {
    const { t } = useLanguage();

    return (
        <div className="mt-3 pt-3 border-t border-border">
            {canManage ? (
                <div>
                    <p className="text-[11px] text-neutral-500 mb-2">{t("manageEditable")}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={onEdit}
                            className="flex-1 flex items-center justify-center gap-1.5 py-2 text-xs border border-border text-neutral-400 rounded-lg hover:bg-surface-200 transition-colors font-medium"
                        >
                            <Edit3 size={12} />
                            {t("edit")}
                        </button>
                        <button
                            onClick={onDelete}
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
    );
}

// ── Creator Badge & Actions (bottom of expanded view) ────────────────────

type CreatorBadgeProps = {
    poll: DemoPoll;
    displayName: string;
    avatarUrl: string;
    isBookmarked: boolean;
    onToggleBookmark: () => void;
};

export function PollCreatorBadge({
    poll,
    displayName,
    avatarUrl,
    isBookmarked: bookmarked,
    onToggleBookmark,
}: CreatorBadgeProps) {
    const { t } = useLanguage();

    return (
        <div className="mt-3 pt-2.5 border-t border-border flex items-center justify-between">
            <div className="flex items-center gap-2">
                {avatarUrl ? (
                    avatarUrl.startsWith("data:") ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={avatarUrl} alt="" className="w-5 h-5 rounded-full object-cover border border-border" />
                    ) : (
                        <Image src={avatarUrl} alt="" width={20} height={20} className="w-5 h-5 rounded-full object-cover border border-border" unoptimized />
                    )
                ) : (
                    <div className="w-5 h-5 rounded-full bg-brand-500/20 flex items-center justify-center text-[8px] font-bold text-brand-400 shrink-0">
                        {displayName.charAt(0).toUpperCase()}
                    </div>
                )}
                <span className="text-[10px] text-neutral-500 truncate">
                    by {displayName}
                </span>
            </div>
            <div className="flex items-center gap-1">
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleBookmark();
                    }}
                    className={`p-1 rounded transition-colors ${bookmarked
                        ? "text-yellow-400 hover:text-yellow-300"
                        : "text-neutral-600 hover:text-neutral-400"
                        }`}
                    title={bookmarked ? t("removeBookmark") : t("bookmark")}
                    aria-label={bookmarked ? t("removeBookmark") : t("bookmark")}
                >
                    <Bookmark size={13} fill={bookmarked ? "currentColor" : "none"} />
                </button>
                <ShareButton pollId={poll.id} pollTitle={poll.title} />
            </div>
        </div>
    );
}
