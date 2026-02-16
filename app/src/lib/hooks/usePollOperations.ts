"use client";

import { useCallback, useRef } from "react";
import { PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import {
    sendTransaction,
    formatSOL,
    getWalletBalance,
    requestAirdrop,
    fetchUserAccount,
    buildInitializeUserIx,
    buildCreatePollIx,
    buildEditPollIx,
    buildDeletePollIx,
    buildCastVoteIx,
    buildSettlePollIx,
    buildClaimRewardIx,
    getPollPDA,
    PROGRAM_DEPLOYED,
} from "@/lib/program";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { isAdminWallet } from "@/lib/constants";
import { friendlyErrorMessage } from "@/lib/errorRecovery";
import {
    onChainUserToAccount,
    withFreshPeriods,
    demoPollToRow,
} from "@/lib/dataConverters";
import { type DemoPoll, type DemoVote, type UserAccount, MAX_COINS_PER_POLL, PollStatus, WINNING_OPTION_UNSET } from "@/lib/types";
import type { MutationTracker } from "./useDataFetcher";
import toast from "react-hot-toast";

interface PollOpsArgs {
    walletAddress: string | null;
    polls: DemoPoll[];
    votes: DemoVote[];
    users: UserAccount[];
    userAccount: UserAccount | null;
    setPolls: React.Dispatch<React.SetStateAction<DemoPoll[]>>;
    setVotes: React.Dispatch<React.SetStateAction<DemoVote[]>>;
    setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>;
    tracker: MutationTracker;
    usersRef: React.MutableRefObject<UserAccount[]>;
    initialFetchDone: React.MutableRefObject<boolean>;
    addNotification: (n: any) => void;
}

/**
 * All poll CRUD operations, voting, settlement, claims, signup, and daily rewards.
 */
export function usePollOperations({
    walletAddress,
    polls,
    votes,
    users,
    userAccount,
    setPolls,
    setVotes,
    setUsers,
    tracker,
    usersRef,
    initialFetchDone,
    addNotification,
}: PollOpsArgs) {

    // ── Helper: bump mutation tracking ──
    const markMutation = () => {
        tracker.mutationGeneration.current++;
        tracker.lastMutationTs.current = Date.now();
    };

    // ── Signup ──
    const signup = useCallback(async () => {
        if (!walletAddress) return;
        if (!initialFetchDone.current) return;

        if (!PROGRAM_DEPLOYED) {
            if (isSupabaseConfigured) {
                try {
                    await supabase.from("users").upsert({
                        wallet: walletAddress,
                        created_at: Date.now(),
                    }, { onConflict: "wallet" });
                } catch (e) {
                    console.warn("Failed to sync user to Supabase:", e);
                }
            }
            const existingUser = users.find(u => u.wallet === walletAddress);
            if (existingUser && !existingUser.signupBonusClaimed) {
                setUsers(prev => prev.map(u =>
                    u.wallet === walletAddress
                        ? { ...u, signupBonusClaimed: true, lastWeeklyRewardTs: Date.now() }
                        : u
                ));
            }
            return;
        }

        try {
            const existing = await fetchUserAccount(new PublicKey(walletAddress));
            if (existing) {
                const bal = await getWalletBalance(new PublicKey(walletAddress));
                const user = onChainUserToAccount(existing, bal);
                setUsers(prev => {
                    if (prev.find(u => u.wallet === walletAddress)) {
                        return prev.map(u => u.wallet === walletAddress ? user : u);
                    }
                    return [...prev, user];
                });
                return;
            }
        } catch (e) {
            console.warn("Failed to check user account:", e);
        }

        try {
            const pubkey = new PublicKey(walletAddress);
            const ix = await buildInitializeUserIx(pubkey);
            const sig = await sendTransaction([ix], pubkey);
            console.log("User initialized on-chain:", sig);
            toast.success("Account created on Solana!");

            const bal = await getWalletBalance(pubkey);
            const onChainUser = await fetchUserAccount(pubkey);
            if (onChainUser) {
                const user = onChainUserToAccount(onChainUser, bal);
                setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
            }
        } catch (e: any) {
            console.error("Signup failed:", e);
            if (e?.message?.includes("already in use") || e?.message?.includes("0x0")) {
                const bal = await getWalletBalance(new PublicKey(walletAddress));
                const onChainUser = await fetchUserAccount(new PublicKey(walletAddress));
                if (onChainUser) {
                    const user = onChainUserToAccount(onChainUser, bal);
                    setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
                }
            } else {
                toast.error("Failed to create account — make sure you have SOL for gas");
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletAddress]);

    // ── Claim daily reward ──
    const claimDailyReward = useCallback(async (): Promise<boolean> => {
        if (!walletAddress) return false;

        if (!PROGRAM_DEPLOYED) {
            const user = users.find(u => u.wallet === walletAddress);
            if (user) {
                const hoursSinceLastClaim = (Date.now() - user.lastWeeklyRewardTs) / (1000 * 60 * 60);
                if (hoursSinceLastClaim < 24) {
                    const hoursLeft = Math.ceil(24 - hoursSinceLastClaim);
                    toast.error(`Daily reward available in ${hoursLeft}h`, { id: "airdrop" });
                    return false;
                }
            }
            try {
                toast.loading("Requesting devnet SOL airdrop…", { id: "airdrop" });
                const pubkey = new PublicKey(walletAddress);
                const balBefore = await getWalletBalance(pubkey);
                const sig = await requestAirdrop(pubkey, 1);
                console.log("Airdrop sig:", sig);

                await new Promise(r => setTimeout(r, 2000));
                let balAfter = await getWalletBalance(pubkey);
                if (balAfter <= balBefore) {
                    await new Promise(r => setTimeout(r, 3000));
                    balAfter = await getWalletBalance(pubkey);
                }

                const receivedLamports = Math.max(balAfter - balBefore, 0);
                const receivedSol = receivedLamports / LAMPORTS_PER_SOL;
                const credited = receivedLamports > 0 ? receivedLamports : LAMPORTS_PER_SOL;
                const now = Date.now();
                setUsers(prev => prev.map(u =>
                    u.wallet === walletAddress
                        ? { ...u, balance: u.balance + credited, lastWeeklyRewardTs: now }
                        : u
                ));

                if (isSupabaseConfigured) {
                    await new Promise(r => setTimeout(r, 50));
                    const updatedUser = usersRef.current.find(u => u.wallet === walletAddress);
                    if (updatedUser) {
                        try {
                            await supabase.from("users").update({
                                balance: updatedUser.balance,
                                last_weekly_reward_ts: now,
                            }).eq("wallet", walletAddress);
                        } catch { }
                    }
                }

                toast.success(
                    receivedLamports > 0
                        ? `Received ${receivedSol.toFixed(2)} SOL airdrop!`
                        : "Airdrop sent! Balance credited.",
                    { id: "airdrop" }
                );
                return true;
            } catch (e: any) {
                console.error("Airdrop failed:", e);
                const msg = e?.message || "";
                if (msg.includes("429") || msg.includes("Too Many") || msg.includes("rate")) {
                    toast.error("Rate limited — wait a minute and try again", { id: "airdrop" });
                } else {
                    toast.error("Airdrop failed — devnet may be congested, try again later", { id: "airdrop" });
                }
                return false;
            }
        }

        try {
            toast.loading("Requesting devnet SOL airdrop…", { id: "airdrop" });
            const pubkey = new PublicKey(walletAddress);
            const balBefore = await getWalletBalance(pubkey);
            const sig = await requestAirdrop(pubkey, 1);
            console.log("Airdrop sig:", sig);

            await new Promise(r => setTimeout(r, 2000));
            let newBal = await getWalletBalance(pubkey);
            if (newBal <= balBefore) {
                await new Promise(r => setTimeout(r, 3000));
                newBal = await getWalletBalance(pubkey);
            }

            const received = Math.max(newBal - balBefore, 0) / LAMPORTS_PER_SOL;
            toast.success(
                received > 0
                    ? `Received ${received.toFixed(2)} SOL airdrop!`
                    : "Airdrop sent! Balance updated.",
                { id: "airdrop" }
            );
            setUsers(prev => prev.map(u =>
                u.wallet === walletAddress ? { ...u, balance: newBal, lastWeeklyRewardTs: Date.now() } : u
            ));
            return true;
        } catch (e: any) {
            console.error("Airdrop failed:", e);
            const msg = e?.message || "";
            if (msg.includes("429") || msg.includes("Too Many") || msg.includes("rate")) {
                toast.error("Rate limited — wait a minute and try again", { id: "airdrop" });
            } else {
                toast.error("Airdrop failed — devnet may be congested, try again later", { id: "airdrop" });
            }
            return false;
        }
    }, [walletAddress, users, setUsers, usersRef]);

    // ── Create poll ──
    const createPoll = useCallback(
        async (poll: Omit<DemoPoll, "id">): Promise<DemoPoll | null> => {
            if (!walletAddress) return null;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollId = poll.pollId || Date.now();
                toast.loading("Creating poll...", { id: "create-poll" });

                if (PROGRAM_DEPLOYED) {
                    const ix = await buildCreatePollIx(
                        pubkey, pollId, poll.title, poll.description, poll.category,
                        poll.imageUrl, poll.options, poll.unitPriceCents, poll.endTime,
                        poll.creatorInvestmentCents
                    );
                    await sendTransaction([ix], pubkey);
                }

                const [pollPDA] = getPollPDA(pubkey, pollId);
                const platformFee = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
                const creatorReward = Math.max(Math.floor(poll.creatorInvestmentCents / 100), 1);
                const poolSeed = poll.creatorInvestmentCents - platformFee - creatorReward;

                const newPoll: DemoPoll = {
                    ...poll,
                    id: pollPDA.toString(),
                    pollId,
                    totalPoolCents: poolSeed,
                    platformFeeCents: platformFee,
                    creatorRewardCents: creatorReward,
                    voteCounts: new Array(poll.options.length).fill(0),
                    status: PollStatus.Active,
                    winningOption: WINNING_OPTION_UNSET,
                    totalVoters: 0,
                    createdAt: Math.floor(Date.now() / 1000),
                };

                setPolls(prev => [newPoll, ...prev]);
                markMutation();

                if (isSupabaseConfigured) {
                    try {
                        await supabase.from("polls").upsert(demoPollToRow(newPoll), { onConflict: "id" });
                    } catch (e) {
                        console.warn("Failed to save poll to Supabase:", e);
                    }
                }

                {
                    let newBal: number | undefined;
                    if (PROGRAM_DEPLOYED) {
                        try { newBal = await getWalletBalance(pubkey); } catch { }
                    }
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== walletAddress) return u;
                        const bal = newBal ?? Math.max(0, u.balance - poll.creatorInvestmentCents);
                        return {
                            ...u,
                            balance: bal,
                            pollsCreated: u.pollsCreated + 1,
                            totalSpentCents: u.totalSpentCents + poll.creatorInvestmentCents,
                        };
                    }));
                }

                if (isSupabaseConfigured) {
                    await new Promise(r => setTimeout(r, 50));
                    const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
                    if (currentUser) {
                        try {
                            await supabase.from("users").update({
                                balance: currentUser.balance,
                                total_spent_cents: currentUser.totalSpentCents,
                                polls_created: currentUser.pollsCreated,
                            }).eq("wallet", walletAddress);
                        } catch { }
                    }
                }

                toast.success("Poll created!", { id: "create-poll" });
                return newPoll;
            } catch (e: any) {
                console.error("Create poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Create poll"), { id: "create-poll" });
                return null;
            }
        },
        [walletAddress, setPolls, setUsers, usersRef, tracker]
    );

    // ── Edit poll ──
    const editPoll = useCallback(
        async (
            pollId: string,
            updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>
        ): Promise<boolean> => {
            if (!walletAddress) return false;
            const poll = polls.find((p) => p.id === pollId);
            if (!poll) return false;

            const admin = isAdminWallet(walletAddress);
            if (!admin) {
                if (poll.creator !== walletAddress) return false;
                if (poll.status !== PollStatus.Active) return false;
                const now = Math.floor(Date.now() / 1000);
                if (now >= poll.endTime) return false;
                const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
                if (totalVotes > 0) return false;
                if (updates.options && updates.options.length !== poll.options.length) return false;
                if (updates.endTime && updates.endTime <= now) return false;
            }

            const updatedPoll: DemoPoll = {
                ...poll,
                title: updates.title ?? poll.title,
                description: updates.description ?? poll.description,
                category: updates.category ?? poll.category,
                imageUrl: updates.imageUrl ?? poll.imageUrl,
                optionImages: updates.optionImages ?? poll.optionImages,
                options: updates.options ?? poll.options,
                endTime: updates.endTime ?? poll.endTime,
            };
            setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));
            markMutation();

            try {
                if (PROGRAM_DEPLOYED) {
                    const pubkey = new PublicKey(walletAddress);
                    toast.loading("Editing poll on Solana...", { id: "edit-poll" });
                    const ix = await buildEditPollIx(
                        pubkey, poll.pollId,
                        updates.title ?? poll.title, updates.description ?? poll.description,
                        updates.category ?? poll.category, updates.imageUrl ?? poll.imageUrl,
                        updates.options ?? poll.options, updates.endTime ?? poll.endTime
                    );
                    await sendTransaction([ix], pubkey);
                }

                if (isSupabaseConfigured) {
                    try {
                        await supabase.from("polls").update({
                            title: updates.title ?? poll.title,
                            description: updates.description ?? poll.description,
                            category: updates.category ?? poll.category,
                            image_url: updates.imageUrl ?? poll.imageUrl,
                            option_images: updates.optionImages ?? poll.optionImages,
                            options: updates.options ?? poll.options,
                            end_time: updates.endTime ?? poll.endTime,
                        }).eq("id", pollId);
                    } catch (e) {
                        console.warn("Failed to sync edit to Supabase:", e);
                    }
                }

                toast.success("Poll edited!", { id: "edit-poll" });
                return true;
            } catch (e: any) {
                setPolls(prev => prev.map(p => p.id === pollId ? poll : p));
                console.error("Edit poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Edit"), { id: "edit-poll" });
                return false;
            }
        },
        [walletAddress, polls, setPolls, tracker]
    );

    // ── Delete poll ──
    const deletePoll = useCallback(
        async (pollId: string): Promise<boolean> => {
            if (!walletAddress) return false;
            const poll = polls.find((p) => p.id === pollId);
            if (!poll) return false;

            const admin = isAdminWallet(walletAddress);
            if (!admin) {
                if (poll.creator !== walletAddress) return false;
                if (poll.status !== PollStatus.Active) return false;
                const now = Math.floor(Date.now() / 1000);
                if (now >= poll.endTime) return false;
                const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
                if (totalVotes > 0) return false;
            }

            const prevPolls = polls;
            const prevUsers = users;
            const prevVotes = votes;
            const pollVotes = votes.filter(v => v.pollId === pollId);

            try {
                const pubkey = new PublicKey(walletAddress);
                toast.loading("Deleting poll & refunding balances...", { id: "delete-poll" });

                if (PROGRAM_DEPLOYED) {
                    const ix = await buildDeletePollIx(pubkey, poll.pollId);
                    await sendTransaction([ix], pubkey);
                }

                tracker.deletedPollIds.current.add(pollId);
                markMutation();

                let supabaseDeleteOk = true;
                if (isSupabaseConfigured) {
                    await supabase.from("votes").delete().eq("poll_id", pollId).select();
                    const pollRes = await supabase.from("polls").delete().eq("id", pollId).select();
                    if (pollRes.error) {
                        const retry = await supabase.from("polls").delete().eq("id", pollId).select();
                        if (retry.error) {
                            const checkRes = await supabase.from("polls").select("id").eq("id", pollId).single();
                            if (checkRes.data) supabaseDeleteOk = false;
                        }
                    } else if (!pollRes.data || pollRes.data.length === 0) {
                        const checkRes = await supabase.from("polls").select("id").eq("id", pollId).single();
                        if (checkRes.data) supabaseDeleteOk = false;
                    }

                    if (!supabaseDeleteOk) {
                        tracker.deletedPollIds.current.delete(pollId);
                        toast.error("Failed to delete poll from database.", { id: "delete-poll" });
                        return false;
                    }
                }

                try {
                    const savedPolls = localStorage.getItem("instinctfi_polls");
                    if (savedPolls) {
                        const parsed = JSON.parse(savedPolls);
                        localStorage.setItem("instinctfi_polls", JSON.stringify(parsed.filter((p: any) => p.id !== pollId)));
                    }
                    const savedVotes = localStorage.getItem("instinctfi_votes");
                    if (savedVotes) {
                        const parsed = JSON.parse(savedVotes);
                        localStorage.setItem("instinctfi_votes", JSON.stringify(parsed.filter((v: any) => v.pollId !== pollId)));
                    }
                } catch { }

                setPolls(prev => prev.filter(p => p.id !== pollId));
                setVotes(prev => prev.filter(v => v.pollId !== pollId));

                // Refund balances
                const refunds: Record<string, number> = {};
                refunds[poll.creator] = (refunds[poll.creator] || 0) + poll.creatorInvestmentCents;
                for (const v of pollVotes) {
                    refunds[v.voter] = (refunds[v.voter] || 0) + v.totalStakedCents;
                }

                setUsers(prev => prev.map(u => {
                    const refund = refunds[u.wallet] || 0;
                    if (refund === 0 && u.wallet !== poll.creator) return u;
                    return {
                        ...u,
                        balance: u.balance + refund,
                        pollsCreated: u.wallet === poll.creator ? Math.max(0, u.pollsCreated - 1) : u.pollsCreated,
                        totalSpentCents: Math.max(0, u.totalSpentCents - refund),
                    };
                }));

                if (isSupabaseConfigured) {
                    await new Promise(r => setTimeout(r, 50));
                    try {
                        for (const [wallet] of Object.entries(refunds)) {
                            const user = usersRef.current.find(u => u.wallet === wallet);
                            if (user) {
                                await supabase.from("users").update({
                                    balance: user.balance,
                                    total_spent_cents: user.totalSpentCents,
                                    ...(wallet === poll.creator ? { polls_created: user.pollsCreated } : {}),
                                }).eq("wallet", wallet);
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to sync refunds:", e);
                    }
                }

                setTimeout(() => { tracker.deletedPollIds.current.delete(pollId); }, 300_000);

                const refundTotal = poll.creatorInvestmentCents + pollVotes.reduce((s, v) => s + v.totalStakedCents, 0);
                toast.success(`Poll deleted! ${formatSOL(refundTotal)} refunded.`, { id: "delete-poll" });
                return true;
            } catch (e: any) {
                tracker.deletedPollIds.current.delete(pollId);
                setPolls(prevPolls);
                setUsers(prevUsers);
                setVotes(prevVotes);
                console.error("Delete poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Delete"), { id: "delete-poll" });
                return false;
            }
        },
        [walletAddress, polls, votes, users, setPolls, setVotes, setUsers, tracker, usersRef]
    );

    // ── Cast vote ──
    const castVote = useCallback(
        async (pollId: string, optionIndex: number, numCoins: number): Promise<boolean> => {
            if (!walletAddress) return false;
            const poll = polls.find((p) => p.id === pollId);
            if (!poll || poll.status !== PollStatus.Active) return false;
            if (Date.now() / 1000 > poll.endTime) return false;
            if (poll.creator === walletAddress) {
                toast.error("You cannot vote on your own poll");
                return false;
            }

            const existing = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
            const currentCoins = existing ? existing.votesPerOption.reduce((a, b) => a + b, 0) : 0;
            if (currentCoins + numCoins > MAX_COINS_PER_POLL) {
                toast.error(`Max ${MAX_COINS_PER_POLL} coins per poll (you have ${currentCoins})`);
                return false;
            }

            const cost = numCoins * poll.unitPriceCents;
            if (userAccount && cost > userAccount.balance) {
                toast.error("Insufficient SOL balance");
                return false;
            }

            const prevPolls = polls;
            const prevVotes = votes;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollCreator = new PublicKey(poll.creator);
                toast.loading("Casting vote...", { id: "cast-vote" });

                if (PROGRAM_DEPLOYED) {
                    const ix = await buildCastVoteIx(pubkey, pollCreator, poll.pollId, optionIndex, numCoins);
                    await sendTransaction([ix], pubkey);
                }

                const updatedPoll = {
                    ...poll,
                    voteCounts: poll.voteCounts.map((c, i) => i === optionIndex ? c + numCoins : c),
                    totalPoolCents: poll.totalPoolCents + cost,
                    totalVoters: poll.totalVoters + (existing ? 0 : 1),
                };
                setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));
                markMutation();

                if (existing) {
                    const updatedVote: DemoVote = {
                        ...existing,
                        votesPerOption: existing.votesPerOption.map((c, i) => i === optionIndex ? c + numCoins : c),
                        totalStakedCents: existing.totalStakedCents + cost,
                    };
                    setVotes(prev => prev.map(v =>
                        v.pollId === pollId && v.voter === walletAddress ? updatedVote : v
                    ));
                } else {
                    const votesPerOption = new Array(poll.options.length).fill(0);
                    votesPerOption[optionIndex] = numCoins;
                    setVotes(prev => [...prev, {
                        pollId, voter: walletAddress, votesPerOption,
                        totalStakedCents: cost, claimed: false,
                    }]);
                }

                {
                    let newBal: number | undefined;
                    if (PROGRAM_DEPLOYED) {
                        try { newBal = await getWalletBalance(pubkey); } catch { }
                    }
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== walletAddress) return u;
                        const fresh = withFreshPeriods(u);
                        const bal = newBal ?? Math.max(0, fresh.balance - cost);
                        return {
                            ...fresh,
                            balance: bal,
                            totalVotesCast: fresh.totalVotesCast + numCoins,
                            weeklyVotesCast: fresh.weeklyVotesCast + numCoins,
                            monthlyVotesCast: fresh.monthlyVotesCast + numCoins,
                            totalSpentCents: fresh.totalSpentCents + cost,
                            weeklySpentCents: fresh.weeklySpentCents + cost,
                            monthlySpentCents: fresh.monthlySpentCents + cost,
                            totalPollsVoted: fresh.totalPollsVoted + (existing ? 0 : 1),
                            weeklyPollsVoted: fresh.weeklyPollsVoted + (existing ? 0 : 1),
                            monthlyPollsVoted: fresh.monthlyPollsVoted + (existing ? 0 : 1),
                        };
                    }));
                }

                if (isSupabaseConfigured) {
                    try {
                        const voteRow = existing
                            ? {
                                poll_id: pollId, voter: walletAddress,
                                votes_per_option: existing.votesPerOption.map((c, i) => i === optionIndex ? c + numCoins : c),
                                total_staked_cents: existing.totalStakedCents + cost, claimed: false,
                            }
                            : {
                                poll_id: pollId, voter: walletAddress,
                                votes_per_option: new Array(poll.options.length).fill(0).map((_, i) => i === optionIndex ? numCoins : 0),
                                total_staked_cents: cost, claimed: false,
                            };
                        await Promise.all([
                            supabase.from("votes").upsert(voteRow, { onConflict: "poll_id,voter" }),
                            supabase.from("polls").update({
                                vote_counts: updatedPoll.voteCounts,
                                total_pool_cents: updatedPoll.totalPoolCents,
                                total_voters: updatedPoll.totalVoters,
                            }).eq("id", pollId),
                        ]);

                        await new Promise(r => setTimeout(r, 50));
                        const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
                        if (currentUser) {
                            await supabase.from("users").update({
                                balance: currentUser.balance,
                                total_spent_cents: currentUser.totalSpentCents,
                                total_votes_cast: currentUser.totalVotesCast,
                                total_polls_voted: currentUser.totalPollsVoted,
                            }).eq("wallet", walletAddress);
                        }
                    } catch (e) {
                        console.warn("Failed to sync vote to Supabase:", e);
                    }
                }

                toast.success(`Voted ${numCoins} coin(s) — ${formatSOL(cost)} SOL sent!`, { id: "cast-vote" });
                addNotification({
                    wallet: walletAddress,
                    type: "poll_voted",
                    title: "Vote Cast",
                    message: `You voted ${numCoins} coin(s) on "${poll.options[optionIndex]}" in "${poll.title}"`,
                    pollId,
                });
                return true;
            } catch (e: any) {
                setPolls(prevPolls);
                setVotes(prevVotes);
                console.error("Cast vote failed:", e);
                toast.error(friendlyErrorMessage(e, "Vote"), { id: "cast-vote" });
                return false;
            }
        },
        [walletAddress, polls, votes, userAccount, setPolls, setVotes, setUsers, tracker, usersRef, addNotification]
    );

    // ── Settle poll ──
    const settlePoll = useCallback(
        async (pollId: string, winningOption?: number): Promise<boolean> => {
            const poll = polls.find((p) => p.id === pollId);
            if (!poll || poll.status !== PollStatus.Active) return false;
            if (!walletAddress) return false;

            const prevPolls = polls;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollCreator = new PublicKey(poll.creator);
                toast.loading("Settling poll...", { id: "settle-poll" });

                if (PROGRAM_DEPLOYED) {
                    const ix = await buildSettlePollIx(pubkey, pollCreator, poll.pollId);
                    await sendTransaction([ix], pubkey);
                }

                let finalWinningOption: number;
                if (winningOption !== undefined && winningOption >= 0 && winningOption < poll.options.length) {
                    finalWinningOption = winningOption;
                } else {
                    let maxVotes = 0;
                    let winningIdx = 255;
                    poll.voteCounts.forEach((count, i) => {
                        if (count > maxVotes) { maxVotes = count; winningIdx = i; }
                    });
                    finalWinningOption = maxVotes > 0 ? winningIdx : WINNING_OPTION_UNSET;
                }

                setPolls(prev => prev.map(p =>
                    p.id === pollId ? { ...p, status: PollStatus.Settled, winningOption: finalWinningOption } : p
                ));
                markMutation();

                if (poll.creatorRewardCents > 0) {
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== poll.creator) return u;
                        const fresh = withFreshPeriods(u);
                        return {
                            ...fresh,
                            balance: fresh.balance + poll.creatorRewardCents,
                            creatorEarningsCents: fresh.creatorEarningsCents + poll.creatorRewardCents,
                            totalWinningsCents: fresh.totalWinningsCents + poll.creatorRewardCents,
                            weeklyWinningsCents: fresh.weeklyWinningsCents + poll.creatorRewardCents,
                            monthlyWinningsCents: fresh.monthlyWinningsCents + poll.creatorRewardCents,
                        };
                    }));

                    if (isSupabaseConfigured) {
                        await new Promise(r => setTimeout(r, 50));
                        const creatorUser = usersRef.current.find(u => u.wallet === poll.creator);
                        if (creatorUser) {
                            try {
                                await supabase.from("users").update({
                                    balance: creatorUser.balance,
                                    creator_earnings_cents: creatorUser.creatorEarningsCents,
                                    total_winnings_cents: creatorUser.totalWinningsCents,
                                }).eq("wallet", poll.creator);
                            } catch { }
                        }
                    }
                }

                if (isSupabaseConfigured) {
                    try {
                        await supabase.from("polls").update({
                            status: PollStatus.Settled,
                            winning_option: finalWinningOption,
                        }).eq("id", pollId);
                    } catch (e) {
                        console.warn("Failed to sync settlement:", e);
                    }
                }

                toast.success("Poll settled!", { id: "settle-poll" });

                const winnerLabel = finalWinningOption < poll.options.length ? poll.options[finalWinningOption] : "N/A";
                addNotification({
                    wallet: walletAddress!,
                    type: "poll_settled",
                    title: "Poll Settled",
                    message: `"${poll.title}" has been settled. Winner: ${winnerLabel}`,
                    pollId,
                });

                const userVote = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
                if (userVote && finalWinningOption !== WINNING_OPTION_UNSET && (userVote.votesPerOption[finalWinningOption] || 0) > 0) {
                    addNotification({
                        wallet: walletAddress!,
                        type: "reward_available",
                        title: "You Won!",
                        message: `Your side won in "${poll.title}"! Claim your reward now.`,
                        pollId,
                    });
                }

                return true;
            } catch (e: any) {
                setPolls(prevPolls);
                console.error("Settle poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Settlement"), { id: "settle-poll" });
                return false;
            }
        },
        [walletAddress, polls, votes, setPolls, setUsers, tracker, usersRef, addNotification]
    );

    // ── Claim reward ──
    const claimReward = useCallback(
        async (pollId: string): Promise<number> => {
            if (!walletAddress) return 0;
            const poll = polls.find((p) => p.id === pollId);
            if (!poll || poll.status !== 1 || poll.winningOption === 255) return 0;

            const voteRecord = votes.find(v => v.pollId === pollId && v.voter === walletAddress);
            if (!voteRecord || voteRecord.claimed) return 0;

            const userWinningVotes = voteRecord.votesPerOption[poll.winningOption] || 0;
            if (userWinningVotes === 0) return 0;

            const prevVotes = votes;
            const prevUsers = users;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollCreator = new PublicKey(poll.creator);
                toast.loading("Claiming reward...", { id: "claim-reward" });

                if (PROGRAM_DEPLOYED) {
                    const ix = await buildClaimRewardIx(pubkey, pollCreator, poll.pollId);
                    await sendTransaction([ix], pubkey);
                }

                const totalWinningVotes = poll.voteCounts[poll.winningOption];
                const reward = Math.floor(
                    (userWinningVotes / totalWinningVotes) * poll.totalPoolCents
                );

                setVotes(prev => prev.map(v =>
                    v.pollId === pollId && v.voter === walletAddress ? { ...v, claimed: true } : v
                ));

                if (isSupabaseConfigured) {
                    try {
                        await supabase.from("votes").update({ claimed: true })
                            .eq("poll_id", pollId)
                            .eq("voter", walletAddress);
                    } catch (e) {
                        console.warn("Failed to sync claim:", e);
                    }
                }

                {
                    let newBal: number | undefined;
                    if (PROGRAM_DEPLOYED) {
                        try { newBal = await getWalletBalance(pubkey); } catch { }
                    }
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== walletAddress) return u;
                        const fresh = withFreshPeriods(u);
                        const bal = newBal ?? (fresh.balance + reward);
                        return {
                            ...fresh,
                            balance: bal,
                            pollsWon: fresh.pollsWon + 1,
                            weeklyPollsWon: fresh.weeklyPollsWon + 1,
                            monthlyPollsWon: fresh.monthlyPollsWon + 1,
                            totalWinningsCents: fresh.totalWinningsCents + reward,
                            weeklyWinningsCents: fresh.weeklyWinningsCents + reward,
                            monthlyWinningsCents: fresh.monthlyWinningsCents + reward,
                        };
                    }));
                }

                toast.success(`Claimed ${formatSOL(reward)}!`, { id: "claim-reward" });
                addNotification({
                    wallet: walletAddress,
                    type: "reward_claimed",
                    title: "Reward Claimed",
                    message: `You claimed ${formatSOL(reward)} from "${poll.title}"`,
                    pollId,
                });
                return reward;
            } catch (e: any) {
                setVotes(prevVotes);
                setUsers(prevUsers);
                console.error("Claim reward failed:", e);
                toast.error(friendlyErrorMessage(e, "Claim"), { id: "claim-reward" });
                return 0;
            }
        },
        [walletAddress, polls, votes, users, setVotes, setUsers, tracker, addNotification]
    );

    return {
        signup,
        claimDailyReward,
        createPoll,
        editPoll,
        deletePoll,
        castVote,
        settlePoll,
        claimReward,
    };
}
