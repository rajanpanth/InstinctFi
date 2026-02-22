"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useApp, formatDollars, formatDollarsShort, DemoPoll, PollStatus } from "@/components/Providers";
import { useLanguage } from "@/lib/languageContext";
import {
    Wallet,
    TrendingUp,
    TrendingDown,
    Clock,
    CheckCircle,
    Gift,
    BarChart3,
    ArrowRight,
    AlertCircle,
    Coins,
} from "lucide-react";

/** Classification of a user's position in a poll */
type PositionStatus = "active" | "won" | "lost" | "claimable";

interface Position {
    poll: DemoPoll;
    optionIndex: number;
    coins: number;
    staked: number;
    status: PositionStatus;
    pnl: number;
}

export default function PortfolioPage() {
    const { polls, votes, userAccount, walletAddress, walletConnected, connectWallet, claimReward } = useApp();
    const { t } = useLanguage();
    const [activeTab, setActiveTab] = useState<"all" | "active" | "won" | "lost">("all");

    // Build positions from votes + polls
    const positions = useMemo<Position[]>(() => {
        if (!walletAddress) return [];

        return votes
            .filter((v) => v.voter === walletAddress)
            .map((v) => {
                const poll = polls.find((p) => p.id === v.pollId);
                if (!poll) return null;

                // Find main voted option (highest coins)
                let mainOption = 0;
                let mainCoins = 0;
                v.votesPerOption.forEach((coins, i) => {
                    if (coins > mainOption) {
                        mainOption = i;
                        mainCoins = coins;
                    }
                });

                const totalCoins = v.votesPerOption.reduce((a, b) => a + b, 0);
                const isSettled = poll.status === PollStatus.Settled;
                const isEnded = Math.floor(Date.now() / 1000) >= poll.endTime;
                const isWinner = isSettled && poll.winningOption === mainOption;
                const isLoser = isSettled && poll.winningOption !== mainOption;

                // Calculate P&L
                let pnl = 0;
                if (isSettled && isWinner) {
                    const totalWinning = poll.voteCounts[poll.winningOption] || 1;
                    const share = mainCoins / totalWinning;
                    const reward = Math.floor(share * poll.totalPoolCents);
                    pnl = reward - v.totalStakedCents;
                } else if (isSettled && isLoser) {
                    pnl = -v.totalStakedCents;
                }

                let status: PositionStatus = "active";
                if (isSettled && isWinner && !v.claimed) status = "claimable";
                else if (isSettled && isWinner) status = "won";
                else if (isSettled && isLoser) status = "lost";

                return {
                    poll,
                    optionIndex: mainOption,
                    coins: totalCoins,
                    staked: v.totalStakedCents,
                    status,
                    pnl,
                } as Position;
            })
            .filter(Boolean) as Position[];
    }, [votes, polls, walletAddress]);

    const filteredPositions = positions.filter((p) => {
        if (activeTab === "all") return true;
        if (activeTab === "active") return p.status === "active";
        if (activeTab === "won") return p.status === "won" || p.status === "claimable";
        if (activeTab === "lost") return p.status === "lost";
        return true;
    });

    // Summary stats
    const totalStaked = positions.reduce((sum, p) => sum + p.staked, 0);
    const totalPnL = positions.reduce((sum, p) => sum + p.pnl, 0);
    const claimableCount = positions.filter((p) => p.status === "claimable").length;
    const activeCount = positions.filter((p) => p.status === "active").length;
    const winRate = positions.filter((p) => p.status === "won" || p.status === "claimable").length;
    const settledCount = positions.filter((p) => p.status !== "active").length;

    if (!walletConnected) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
                <Wallet size={48} className="text-brand-500 opacity-50" />
                <h2 className="text-xl font-semibold text-neutral-200">Connect your wallet</h2>
                <p className="text-sm text-neutral-400 text-center max-w-sm">
                    Connect your wallet to view your portfolio, active positions, and P&L.
                </p>
                <button
                    onClick={connectWallet}
                    className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 rounded-xl text-sm font-medium transition-colors"
                >
                    Connect Wallet
                </button>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-brand-400 to-accent-400 bg-clip-text text-transparent">
                    Portfolio
                </h1>
                {userAccount && (
                    <div className="text-right">
                        <div className="text-xs text-neutral-500">Balance</div>
                        <div className="text-lg font-bold text-neutral-200">{formatDollars(userAccount.balance)}</div>
                    </div>
                )}
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                <SummaryCard
                    icon={<Coins size={18} />}
                    label="Total Staked"
                    value={formatDollarsShort(totalStaked)}
                    color="brand"
                />
                <SummaryCard
                    icon={totalPnL >= 0 ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                    label="Total P&L"
                    value={`${totalPnL >= 0 ? "+" : ""}${formatDollarsShort(totalPnL)}`}
                    color={totalPnL >= 0 ? "green" : "red"}
                />
                <SummaryCard
                    icon={<BarChart3 size={18} />}
                    label="Win Rate"
                    value={settledCount > 0 ? `${Math.round((winRate / settledCount) * 100)}%` : "—"}
                    color="blue"
                />
                <SummaryCard
                    icon={<Gift size={18} />}
                    label="Claimable"
                    value={String(claimableCount)}
                    color={claimableCount > 0 ? "yellow" : "gray"}
                />
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-1.5 mb-4 bg-surface-100 rounded-xl p-1 border border-border w-fit">
                {([
                    { key: "all", label: "All", count: positions.length },
                    { key: "active", label: "Active", count: activeCount },
                    { key: "won", label: "Won", count: winRate },
                    { key: "lost", label: "Lost", count: positions.filter((p) => p.status === "lost").length },
                ] as const).map(({ key, label, count }) => (
                    <button
                        key={key}
                        onClick={() => setActiveTab(key)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${activeTab === key
                                ? "bg-brand-500/20 text-brand-400 shadow-sm"
                                : "text-neutral-400 hover:text-neutral-200"
                            }`}
                    >
                        {label}
                        <span className="ml-1 opacity-60">({count})</span>
                    </button>
                ))}
            </div>

            {/* Positions List */}
            {filteredPositions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <AlertCircle size={32} className="text-neutral-500" />
                    <p className="text-sm text-neutral-400">
                        {activeTab === "all"
                            ? "No positions yet. Vote on a poll to get started!"
                            : `No ${activeTab} positions.`}
                    </p>
                    <Link
                        href="/"
                        className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors"
                    >
                        Browse polls <ArrowRight size={12} />
                    </Link>
                </div>
            ) : (
                <div className="space-y-2">
                    {filteredPositions.map((pos) => (
                        <PositionCard key={`${pos.poll.id}-${pos.optionIndex}`} position={pos} onClaim={claimReward} />
                    ))}
                </div>
            )}
        </div>
    );
}

// ── Sub-components ────────────────────────────────────────────────────

function SummaryCard({
    icon,
    label,
    value,
    color,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
    color: string;
}) {
    const colorClasses: Record<string, string> = {
        brand: "text-brand-400 bg-brand-500/10 border-brand-500/15",
        green: "text-green-400 bg-green-500/10 border-green-500/15",
        red: "text-red-400 bg-red-500/10 border-red-500/15",
        blue: "text-blue-400 bg-blue-500/10 border-blue-500/15",
        yellow: "text-yellow-400 bg-yellow-500/10 border-yellow-500/15",
        gray: "text-neutral-400 bg-neutral-500/10 border-neutral-500/15",
    };

    return (
        <div className={`p-3 rounded-xl border ${colorClasses[color] || colorClasses.gray}`}>
            <div className="flex items-center gap-1.5 mb-1 opacity-70">{icon}<span className="text-[10px]">{label}</span></div>
            <div className="text-lg font-bold">{value}</div>
        </div>
    );
}

function PositionCard({ position, onClaim }: { position: Position; onClaim: (pollId: string) => Promise<number> }) {
    const { poll, optionIndex, coins, staked, status, pnl } = position;
    const [claiming, setClaiming] = useState(false);

    const statusConfig: Record<PositionStatus, { icon: React.ReactNode; label: string; color: string }> = {
        active: { icon: <Clock size={14} />, label: "Active", color: "text-blue-400" },
        won: { icon: <CheckCircle size={14} />, label: "Won", color: "text-green-400" },
        lost: { icon: <TrendingDown size={14} />, label: "Lost", color: "text-red-400" },
        claimable: { icon: <Gift size={14} />, label: "Claimable", color: "text-yellow-400" },
    };

    const sc = statusConfig[status];

    const handleClaim = async () => {
        setClaiming(true);
        try {
            await onClaim(poll.id);
        } finally {
            setClaiming(false);
        }
    };

    return (
        <Link
            href={`/polls/${poll.id}`}
            className="flex items-center gap-3 p-3 sm:p-4 bg-surface-100 border border-border rounded-xl hover:border-brand-500/30 transition-all group"
        >
            {/* Status icon */}
            <div className={`shrink-0 ${sc.color}`}>{sc.icon}</div>

            {/* Poll info */}
            <div className="flex-1 min-w-0">
                <div className="text-sm font-medium text-neutral-200 truncate group-hover:text-brand-400 transition-colors">
                    {poll.title}
                </div>
                <div className="flex items-center gap-2 text-[11px] text-neutral-500 mt-0.5">
                    <span className="truncate">Picked: {poll.options[optionIndex] || `Option ${optionIndex}`}</span>
                    <span>·</span>
                    <span>{coins} coins</span>
                    <span>·</span>
                    <span>{formatDollarsShort(staked)} staked</span>
                </div>
            </div>

            {/* P&L + action */}
            <div className="flex items-center gap-2 shrink-0">
                {status !== "active" && (
                    <span className={`text-sm font-bold ${pnl >= 0 ? "text-green-400" : "text-red-400"}`}>
                        {pnl >= 0 ? "+" : ""}{formatDollarsShort(pnl)}
                    </span>
                )}
                {status === "claimable" && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            handleClaim();
                        }}
                        disabled={claiming}
                        className="px-3 py-1 text-[10px] font-semibold bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg hover:bg-yellow-500/30 transition-colors disabled:opacity-50"
                    >
                        {claiming ? "..." : "Claim"}
                    </button>
                )}
                <ArrowRight size={14} className="text-neutral-600 group-hover:text-neutral-400 transition-colors" />
            </div>
        </Link>
    );
}
