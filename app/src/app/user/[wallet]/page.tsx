"use client";

import { useMemo } from "react";
import Link from "next/link";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useApp, formatDollars, PollStatus } from "@/components/Providers";
import { shortAddr } from "@/lib/utils";
import { useUserProfiles } from "@/lib/userProfiles";
import { computeBadges } from "@/lib/badges";
import { useLanguage } from "@/lib/languageContext";

export default function PublicProfilePage() {
    const params = useParams();
    const wallet = params.wallet as string;
    const { polls, votes, allUsers } = useApp();
    const { getDisplayName, getAvatarUrl } = useUserProfiles();
    const { t } = useLanguage();

    const userAccount = allUsers?.find((u) => u.wallet === wallet);
    const myPolls = useMemo(() => polls.filter((p) => p.creator === wallet), [polls, wallet]);
    const myVotes = useMemo(() => votes.filter((v) => v.voter === wallet), [votes, wallet]);

    const badges = useMemo(() => {
        if (!userAccount) return [];
        return computeBadges({
            totalVotesCast: userAccount.totalVotesCast,
            pollsCreated: userAccount.pollsCreated,
            pollsWon: userAccount.pollsWon,
            totalPollsVoted: userAccount.totalPollsVoted,
            totalWinningsLamports: userAccount.totalWinningsLamports,
            totalSpentLamports: userAccount.totalSpentLamports,
            createdAt: userAccount.createdAt,
            loginStreak: userAccount.loginStreak,
        });
    }, [userAccount]);

    const earnedBadges = badges.filter((b) => b.earned);

    if (!userAccount) {
        return (
            <div className="max-w-3xl mx-auto text-center py-20">
                <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-surface-100 border border-border flex items-center justify-center">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-600">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" /><circle cx="12" cy="7" r="4" />
                    </svg>
                </div>
                <p className="text-gray-400 text-lg font-medium mb-2">User not found</p>
                <p className="text-gray-600 text-sm mb-4 font-mono">{shortAddr(wallet)}</p>
                <Link href="/leaderboard" className="text-brand-400 hover:text-brand-300 text-sm font-medium transition-colors">
                    ← Back to Leaderboard
                </Link>
            </div>
        );
    }

    const netProfit = userAccount.totalWinningsLamports - userAccount.totalSpentLamports;
    const displayName = getDisplayName(wallet);
    const avatarUrl = getAvatarUrl(wallet);

    return (
        <div className="max-w-3xl mx-auto">
            <Link href="/leaderboard" className="flex items-center gap-1.5 text-gray-400 hover:text-white mb-6 text-sm font-medium transition-colors group">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="group-hover:-translate-x-0.5 transition-transform"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
                Back
            </Link>

            {/* Profile Header */}
            <div className="bg-surface-100 border border-border rounded-2xl p-6 sm:p-8 mb-6">
                <div className="flex items-center gap-4 mb-6">
                    {avatarUrl ? (
                        avatarUrl.startsWith("data:") ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={avatarUrl} alt="Avatar" className="w-16 h-16 rounded-full object-cover border-2 border-brand-500/25" />
                        ) : (
                            <Image src={avatarUrl} alt="Avatar" width={64} height={64} className="w-16 h-16 rounded-full object-cover border-2 border-brand-500/25" unoptimized />
                        )
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-brand-500 to-brand-600 flex items-center justify-center text-2xl font-bold text-white">
                            {displayName.charAt(0).toUpperCase()}
                        </div>
                    )}
                    <div>
                        <h1 className="text-xl font-bold">{displayName}</h1>
                        <p className="text-gray-500 font-mono text-xs">{shortAddr(wallet)}</p>
                    </div>
                </div>

                {/* Stats */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <StatCard label={t("pollsCreated")} value={userAccount.pollsCreated.toString()} />
                    <StatCard label={t("pollsVoted")} value={userAccount.totalPollsVoted.toString()} />
                    <StatCard label={t("pollsWon")} value={userAccount.pollsWon.toString()} />
                    <StatCard label={t("netProfit")} value={`${netProfit >= 0 ? "+" : ""}${formatDollars(netProfit)}`} highlight />
                </div>
            </div>

            {/* Badges */}
            {earnedBadges.length > 0 && (
                <div className="bg-surface-100 border border-border rounded-2xl p-6 sm:p-8 mb-6">
                    <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
                        🏅 Achievements
                        <span className="text-xs text-gray-500 font-normal">({earnedBadges.length}/{badges.length})</span>
                    </h2>
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {earnedBadges.map((badge) => (
                            <div key={badge.id} className="p-3 bg-surface-50 border border-border rounded-xl text-center">
                                <div className="text-2xl mb-1">{badge.icon}</div>
                                <div className="text-xs font-semibold text-white">{badge.name}</div>
                                <div className="text-[10px] text-gray-500 mt-0.5">{badge.description}</div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Created Polls */}
            <div className="bg-surface-100 border border-border rounded-2xl p-6 sm:p-8 mb-6">
                <h2 className="font-semibold text-lg mb-4">{t("myCreatedPolls")}</h2>
                {myPolls.length === 0 ? (
                    <p className="text-gray-500 text-sm">No polls created yet</p>
                ) : (
                    <div className="space-y-3">
                        {myPolls.slice(0, 10).map((p) => (
                            <Link key={p.id} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                                <div>
                                    <div className="font-medium text-sm">{p.title}</div>
                                    <div className="text-xs text-gray-500">
                                        {p.voteCounts.reduce((a, b) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolLamports)}
                                    </div>
                                </div>
                                <span className={`text-xs font-semibold px-2 py-1 rounded ${p.status === PollStatus.Settled ? "bg-green-600/20 text-green-400" : "bg-brand-500/20 text-brand-400"}`}>
                                    {p.status === PollStatus.Settled ? t("settled") : t("active")}
                                </span>
                            </Link>
                        ))}
                    </div>
                )}
            </div>

            {/* Vote Activity */}
            <div className="bg-surface-100 border border-border rounded-2xl p-6 sm:p-8 mb-20 md:mb-6">
                <h2 className="font-semibold text-lg mb-4">{t("myVoteHistory")}</h2>
                {myVotes.length === 0 ? (
                    <p className="text-gray-500 text-sm">No votes cast yet</p>
                ) : (
                    <div className="space-y-3">
                        {myVotes.slice(0, 10).map((v, i) => {
                            const p = polls.find((pl) => pl.id === v.pollId);
                            if (!p) return null;
                            return (
                                <Link key={i} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                                    <div>
                                        <div className="font-medium text-sm">{p.title}</div>
                                        <div className="text-xs text-gray-500">
                                            {v.votesPerOption
                                                .map((count, idx) => count > 0 ? `${p.options[idx]}: ${count}` : null)
                                                .filter(Boolean)
                                                .join(", ")}
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-sm font-mono">{formatDollars(v.totalStakedLamports)}</div>
                                        {v.claimed && <span className="text-xs text-green-400">Claimed</span>}
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}

function StatCard({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
    return (
        <div className="text-center p-3 bg-surface-50 border border-border rounded-xl">
            <div className={`text-lg font-bold font-mono ${highlight ? "text-green-400" : ""}`}>{value}</div>
            <div className="text-xs text-gray-500 mt-1">{label}</div>
        </div>
    );
}
