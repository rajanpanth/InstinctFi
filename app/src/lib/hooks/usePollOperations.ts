"use client";

import { useCallback, useRef } from "react";
import { PublicKey, Transaction } from "@solana/web3.js";
import {
    sendTransaction,
    confirmTransactionBg,
    formatSOL,
    getWalletBalance,
    fetchUserAccount,
    buildInitializeUserIx,
    buildCreatePollIx,
    buildEditPollIx,
    buildAdminEditPollIx,
    buildDeletePollIx,
    buildCastVoteIx,
    buildSettlePollIx,
    buildAdminSettlePollIx,
    buildClaimRewardIx,
    getPollPDA,
    connection,
} from "@/lib/program";
import { isSupabaseConfigured } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/apiClient";
import { isAdminWallet } from "@/lib/constants";
import { friendlyErrorMessage } from "@/lib/errorRecovery";
import {
    onChainUserToAccount,
    withFreshPeriods,
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
    pollsRef: React.MutableRefObject<DemoPoll[]>;
    votesRef: React.MutableRefObject<DemoVote[]>;
    initialFetchDone: React.MutableRefObject<boolean>;
    addNotification: (n: any) => void;
    signTransaction: ((tx: Transaction) => Promise<Transaction>) | undefined;
    /** Callback to increment data version counter — triggers re-fetches in dependent pages */
    bumpDataVersion: () => void;
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
    pollsRef,
    votesRef,
    initialFetchDone,
    addNotification,
    signTransaction,
    bumpDataVersion,
}: PollOpsArgs) {

    // ── Helper: bump mutation tracking ──
    // tracker is a stable ref object — no deps needed
    const markMutation = useCallback(() => {
        tracker.mutationGeneration.current++;
        tracker.lastMutationTs.current = Date.now();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Voting lock to prevent concurrent submissions (#4) ──
    const votingLock = useRef<Set<string>>(new Set());

    // BUG-21 FIX: Operation lock to prevent double-submit on create/edit/delete/settle/claim.
    // Uses a Set of operation keys (e.g., "create", "edit:pollId", "settle:pollId").
    const operationLock = useRef<Set<string>>(new Set());

    /** Re-fetch the real on-chain wallet balance after a mutation (source of truth). */
    const refreshOnChainBalance = useCallback(async (wallet: string): Promise<number | undefined> => {
        try {
            return await getWalletBalance(new PublicKey(wallet));
        } catch { }
        return undefined;
    }, []);

    // ── Signup ──
    const signup = useCallback(async () => {
        if (!walletAddress) return;
        if (!initialFetchDone.current) return;

        const pubkey = new PublicKey(walletAddress);

        // ── On-chain initialization is MANDATORY ──
        let onChainBal = 0;
        try {
            const existing = await fetchUserAccount(pubkey);
            if (existing) {
                // Already initialized on-chain — fetch real balance
                onChainBal = await getWalletBalance(pubkey);
                const onChainUser = onChainUserToAccount(existing, onChainBal);
                setUsers(prev => {
                    const exists = prev.find(u => u.wallet === walletAddress);
                    if (exists) return prev.map(u => u.wallet === walletAddress ? onChainUser : u);
                    return [...prev, onChainUser];
                });
                // Fire-and-forget Supabase sync
                if (isSupabaseConfigured) {
                    authenticatedFetch("/api/rpc/signup", {})
                        .catch(e => console.warn("Supabase signup sync failed (user exists on-chain):", e));
                }
                return;
            }
        } catch (e) {
            console.warn("Failed to check on-chain user account:", e);
        }

        try {
            const ix = await buildInitializeUserIx(pubkey);
            const sig = await sendTransaction([ix], pubkey, signTransaction!);
            console.log("User initialized on-chain:", sig);
            toast.success("Account created on Solana!");

            // Wait for confirmation before fetching the new account
            await confirmTransactionBg(sig);
            onChainBal = await getWalletBalance(pubkey);
            const onChainUser = await fetchUserAccount(pubkey);
            if (onChainUser) {
                const user = onChainUserToAccount(onChainUser, onChainBal);
                setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
            }
        } catch (e: any) {
            if (e?.message?.includes("already in use") || e?.message?.includes("0x0")) {
                // Account already exists — just fetch it
                onChainBal = await getWalletBalance(pubkey);
                const onChainUser = await fetchUserAccount(pubkey);
                if (onChainUser) {
                    const user = onChainUserToAccount(onChainUser, onChainBal);
                    setUsers(prev => [...prev.filter(u => u.wallet !== walletAddress), user]);
                }
            } else {
                console.warn("On-chain account creation failed:", e?.message);
            }
        }

        // ── Sync to Supabase for stats tracking (fire-and-forget) ──
        if (isSupabaseConfigured) {
            authenticatedFetch("/api/rpc/signup", {})
                .catch(e => console.warn("Supabase signup sync failed (on-chain done):", e));
        }
    }, [walletAddress, setUsers, usersRef, initialFetchDone, signTransaction]);

    // ── Claim daily reward ──
    // NOTE: Daily reward is tracked in Supabase only. Since all transactions now
    // use real on-chain SOL, the daily reward updates the Supabase stats record
    // and we re-fetch the real wallet balance afterwards.
    const claimDailyReward = useCallback(async (): Promise<boolean> => {
        if (!walletAddress) return false;

        // ── 24-hour cooldown check ──
        const user = usersRef.current.find(u => u.wallet === walletAddress);
        if (user) {
            const hoursSinceLastClaim = (Date.now() - user.lastWeeklyRewardTs) / (1000 * 60 * 60);
            if (hoursSinceLastClaim < 24) {
                const hoursLeft = Math.ceil(24 - hoursSinceLastClaim);
                toast.error(`Daily reward available in ${hoursLeft}h`, { id: "daily-reward" });
                return false;
            }
        }

        try {
            const now = Date.now();

            // ── Persist to Supabase (stats tracking) ──
            if (isSupabaseConfigured) {
                const result = await authenticatedFetch("/api/rpc/claim-daily");
                if (!result.success) {
                    const errorMsg = result.error === 'too_early'
                        ? 'Daily reward not available yet'
                        : (result.error || 'Claim failed');
                    toast.error(errorMsg, { id: "daily-reward" });
                    return false;
                }
            }

            // ── Update UI with fresh on-chain balance ──
            const freshBal = await refreshOnChainBalance(walletAddress);
            setUsers(prev => prev.map(u =>
                u.wallet === walletAddress
                    ? { ...u, balance: freshBal ?? u.balance, lastWeeklyRewardTs: now }
                    : u
            ));

            toast.success(
                `Claimed daily reward! (tracked in stats)`,
                { id: "daily-reward" }
            );
            return true;
        } catch (e: any) {
            console.error("Daily reward failed:", e);
            toast.error("Failed to claim daily reward — try again", { id: "daily-reward" });
            return false;
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [walletAddress, setUsers, markMutation]);

    // ── Create poll ──
    const createPoll = useCallback(
        async (poll: Omit<DemoPoll, "id">): Promise<DemoPoll | null> => {
            if (!walletAddress) return null;
            const lockKey = "create";
            if (operationLock.current.has(lockKey)) return null;
            operationLock.current.add(lockKey);

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollId = poll.pollId || Date.now();
                toast.loading("Creating poll...", { id: "create-poll" });

                // ── Pre-flight: check wallet balance before building tx ──
                const walletBal = await getWalletBalance(pubkey);
                // Need enough for creator investment + tx fees (~0.01 SOL buffer)
                const minRequired = poll.creatorInvestmentLamports + 10_000_000; // investment + ~0.01 SOL for fees/rent
                if (walletBal < minRequired) {
                    toast.error(
                        `Insufficient SOL. You need at least ${((minRequired) / 1e9).toFixed(4)} SOL but have ${(walletBal / 1e9).toFixed(4)} SOL.`,
                        { id: "create-poll" }
                    );
                    return null;
                }

                // ── Pre-flight + instruction build in parallel ──
                const [existingUser, createIx] = await Promise.all([
                    fetchUserAccount(pubkey),
                    buildCreatePollIx(
                        pubkey, pollId, poll.title, poll.description, poll.category,
                        poll.imageUrl, poll.options, poll.unitPriceLamports, poll.endTime,
                        poll.creatorInvestmentLamports
                    ),
                ]);
                const instructions = [];
                if (!existingUser) {
                    instructions.push(await buildInitializeUserIx(pubkey));
                }
                instructions.push(createIx);

                // ── On-chain transaction (MANDATORY — real SOL) with retry ──
                let sig: string = "";
                const MAX_TX_RETRIES = 2;
                let lastTxError: any;
                for (let attempt = 0; attempt <= MAX_TX_RETRIES; attempt++) {
                    try {
                        if (attempt > 0) {
                            toast.loading(`Retrying (attempt ${attempt + 1})...`, { id: "create-poll" });
                            await new Promise(r => setTimeout(r, 1500 * attempt));
                            // Rebuild instructions with fresh blockhash
                        }
                        sig = await sendTransaction(instructions, pubkey, signTransaction!);
                        lastTxError = null;
                        break;
                    } catch (retryErr: any) {
                        lastTxError = retryErr;
                        const msg = (retryErr?.message || "").toLowerCase();
                        // Don't retry user rejections or balance errors
                        if (msg.includes("rejected") || msg.includes("denied") || msg.includes("cancelled") || msg.includes("insufficient")) {
                            throw retryErr;
                        }
                        if (attempt >= MAX_TX_RETRIES) throw retryErr;
                    }
                }
                if (lastTxError) throw lastTxError;

                const [pollPDA] = getPollPDA(pubkey, pollId);
                const platformFee = Math.max(Math.floor(poll.creatorInvestmentLamports / 100), 1);
                const creatorReward = Math.max(Math.floor(poll.creatorInvestmentLamports / 100), 1);
                const poolSeed = poll.creatorInvestmentLamports - platformFee - creatorReward;

                const newPoll: DemoPoll = {
                    ...poll,
                    id: pollPDA.toString(),
                    pollId,
                    totalPoolLamports: poolSeed,
                    platformFeeLamports: platformFee,
                    creatorRewardLamports: creatorReward,
                    voteCounts: new Array(poll.options.length).fill(0),
                    status: PollStatus.Active,
                    winningOption: WINNING_OPTION_UNSET,
                    totalVoters: 0,
                    createdAt: Math.floor(Date.now() / 1000),
                };

                // ── On-chain succeeded — sync to Supabase (AWAIT — option images are Supabase-only) ──
                if (isSupabaseConfigured) {
                    let syncOk = false;
                    try {
                        const rpcResult = await authenticatedFetch("/api/rpc/create-poll", {
                            p_id: newPoll.id,
                            p_poll_id: pollId,
                            p_title: newPoll.title,
                            p_description: newPoll.description,
                            p_category: newPoll.category,
                            p_image_url: newPoll.imageUrl,
                            p_option_images: newPoll.optionImages,
                            p_options: newPoll.options,
                            p_unit_price_cents: newPoll.unitPriceLamports,
                            p_end_time: newPoll.endTime,
                            p_creator_investment_cents: newPoll.creatorInvestmentLamports,
                        });
                        syncOk = rpcResult.success === true;
                        if (!syncOk) {
                            console.warn("Supabase create-poll RPC returned failure:", rpcResult.error);
                        }
                    } catch (e) {
                        console.warn("Supabase create-poll sync threw:", e);
                    }

                    // Fallback: if the RPC failed (e.g. balance mismatch), use the
                    // sync-poll endpoint which does a direct upsert (no balance check).
                    if (!syncOk) {
                        try {
                            const fallbackResult = await authenticatedFetch("/api/rpc/sync-poll", {
                                id: newPoll.id,
                                poll_id: pollId,
                                title: newPoll.title,
                                description: newPoll.description,
                                category: newPoll.category,
                                image_url: newPoll.imageUrl,
                                option_images: newPoll.optionImages,
                                options: newPoll.options,
                                unit_price_cents: newPoll.unitPriceLamports,
                                end_time: newPoll.endTime,
                                total_pool_cents: newPoll.totalPoolLamports,
                                creator_investment_cents: newPoll.creatorInvestmentLamports,
                                platform_fee_cents: newPoll.platformFeeLamports,
                                creator_reward_cents: newPoll.creatorRewardLamports,
                                created_at: newPoll.createdAt,
                            });
                            if (fallbackResult.success) {
                                console.log("Supabase fallback sync succeeded for poll", newPoll.id);
                            } else {
                                console.warn("Supabase fallback sync returned failure:", fallbackResult.error);
                                toast.error("Poll created on-chain but image sync failed. Option images may not persist after refresh.", { id: "create-poll-sync" });
                            }
                        } catch (fallbackErr) {
                            console.warn("Supabase fallback sync threw:", fallbackErr);
                            toast.error("Poll created on-chain but image sync failed. Option images may not persist after refresh.", { id: "create-poll-sync" });
                        }
                    }
                }

                // ── Apply optimistic UI updates immediately ──
                setPolls(prev => [newPoll, ...prev]);
                setUsers(prev => prev.map(u => {
                    if (u.wallet !== walletAddress) return u;
                    return {
                        ...u,
                        balance: Math.max(0, u.balance - poll.creatorInvestmentLamports),
                        pollsCreated: u.pollsCreated + 1,
                        totalSpentLamports: u.totalSpentLamports + poll.creatorInvestmentLamports,
                    };
                }));
                markMutation();
                toast.success("Poll created!", { id: "create-poll" });

                // ── Background: confirm tx + refresh real balance ──
                confirmTransactionBg(sig).then(() =>
                    refreshOnChainBalance(walletAddress).then(freshBal => {
                        if (freshBal !== undefined) {
                            setUsers(prev => prev.map(u =>
                                u.wallet === walletAddress ? { ...u, balance: freshBal } : u
                            ));
                        }
                    })
                ).catch(e => console.warn("Background confirm/refresh failed:", e));
                return newPoll;
            } catch (e: any) {
                console.error("Create poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Create poll"), { id: "create-poll" });
                return null;
            } finally {
                operationLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setPolls, setUsers, markMutation, signTransaction]
    );

    // ── Edit poll ──
    const editPoll = useCallback(
        async (
            pollId: string,
            updates: Partial<Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">>
        ): Promise<boolean> => {
            if (!walletAddress) return false;
            const lockKey = `edit:${pollId}`;
            if (operationLock.current.has(lockKey)) return false;
            operationLock.current.add(lockKey);

            const poll = pollsRef.current.find((p) => p.id === pollId);
            if (!poll) { operationLock.current.delete(lockKey); return false; }

            const admin = isAdminWallet(walletAddress);
            if (!admin) {
                // HIGH-01 FIX: Release lock before early returns to avoid permanent lock leak.
                if (poll.creator !== walletAddress) {
                    toast.error("You can only edit polls you created.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
                if (poll.status !== PollStatus.Active) {
                    toast.error("This poll is no longer active and cannot be edited.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
                const now = Math.floor(Date.now() / 1000);
                if (now >= poll.endTime) {
                    toast.error("This poll has ended and cannot be edited.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
                const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
                if (totalVotes > 0) {
                    toast.error("Cannot edit a poll that already has votes.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
                if (updates.options && updates.options.length !== poll.options.length) {
                    toast.error("Cannot change the number of options.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
                if (updates.endTime && updates.endTime <= now) {
                    toast.error("New end time must be in the future.", { id: "edit-poll" });
                    operationLock.current.delete(lockKey); return false;
                }
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

            try {
                const pubkey = new PublicKey(walletAddress);

                // ── Determine if on-chain edit is possible ──
                // The on-chain edit_poll instruction requires:
                //   1. Creator's signature (PDA seeded by creator)
                //   2. Poll is active (not settled)
                //   3. Poll has not ended
                //   4. No votes cast
                // Admin edits on ended/voted/non-owned polls bypass on-chain
                // and only update Supabase + local state.
                const isCreator = poll.creator === walletAddress;
                const now = Math.floor(Date.now() / 1000);
                const pollEnded = now >= poll.endTime;
                const hasVotes = poll.voteCounts.reduce((a, b) => a + b, 0) > 0;
                const canEditOnChain = isCreator && poll.status === PollStatus.Active && !pollEnded && !hasVotes;

                // ── Pre-flight balance check ──
                const bal = await getWalletBalance(pubkey);
                if (bal !== undefined && bal < 0.001) {
                    toast.error("Insufficient SOL for transaction fee. Please add at least 0.001 SOL to your wallet.", { id: "edit-poll" });
                    return false;
                }

                let sig: string;

                if (canEditOnChain) {
                    toast.loading("Editing poll on Solana...", { id: "edit-poll" });

                    // ── Creator on-chain edit ──
                    const ix = await buildEditPollIx(
                        pubkey, poll.pollId,
                        updates.title ?? poll.title, updates.description ?? poll.description,
                        updates.category ?? poll.category, updates.imageUrl ?? poll.imageUrl,
                        updates.options ?? poll.options, updates.endTime ?? poll.endTime
                    );
                    sig = await sendTransaction([ix], pubkey, signTransaction!);
                } else if (admin) {
                    toast.loading("Admin editing poll on Solana...", { id: "edit-poll" });

                    // ── Admin on-chain edit (bypasses ended/votes/creator checks) ──
                    const pollCreator = new PublicKey(poll.creator);
                    const ix = await buildAdminEditPollIx(
                        pubkey, pollCreator, poll.pollId,
                        updates.title ?? poll.title, updates.description ?? poll.description,
                        updates.category ?? poll.category, updates.imageUrl ?? poll.imageUrl,
                        updates.options ?? poll.options, updates.endTime ?? poll.endTime
                    );
                    sig = await sendTransaction([ix], pubkey, signTransaction!);
                } else {
                    // Non-admin can't edit — guards above should have caught this
                    toast.error("Cannot edit this poll.", { id: "edit-poll" });
                    return false;
                }

                // ── Background: confirm tx landed on-chain ──
                confirmTransactionBg(sig).then(confirmed => {
                    if (!confirmed) {
                        console.warn("Edit poll tx not confirmed — will re-sync on next fetch");
                    }
                }).catch(e => console.warn("Background confirm failed:", e));

                // ── Apply update optimistically ──
                setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));
                markMutation();

                // ── Sync to Supabase (AWAIT — option images are Supabase-only) ──
                if (isSupabaseConfigured) {
                    let editSyncOk = false;
                    try {
                        const editResult = await authenticatedFetch("/api/rpc/edit-poll", {
                            p_poll_id: pollId,
                            p_title: updates.title ?? poll.title,
                            p_description: updates.description ?? poll.description,
                            p_category: updates.category ?? poll.category,
                            p_image_url: updates.imageUrl ?? poll.imageUrl,
                            p_option_images: updates.optionImages ?? poll.optionImages,
                            p_options: updates.options ?? poll.options,
                            p_end_time: updates.endTime ?? poll.endTime,
                        });
                        editSyncOk = editResult.success === true;
                        if (!editSyncOk) {
                            console.warn("Supabase edit-poll RPC returned failure:", editResult.error);
                        }
                    } catch (e) {
                        console.warn("Supabase edit-poll sync threw:", e);
                    }

                    // Fallback: direct update for images/metadata if RPC failed
                    if (!editSyncOk) {
                        try {
                            const fallbackResult = await authenticatedFetch("/api/rpc/sync-poll", {
                                id: pollId,
                                poll_id: poll.pollId,
                                title: updates.title ?? poll.title,
                                description: updates.description ?? poll.description,
                                category: updates.category ?? poll.category,
                                image_url: updates.imageUrl ?? poll.imageUrl,
                                option_images: updates.optionImages ?? poll.optionImages,
                                options: updates.options ?? poll.options,
                                unit_price_cents: poll.unitPriceLamports,
                                end_time: updates.endTime ?? poll.endTime,
                                total_pool_cents: poll.totalPoolLamports,
                                creator_investment_cents: poll.creatorInvestmentLamports,
                                platform_fee_cents: poll.platformFeeLamports,
                                creator_reward_cents: poll.creatorRewardLamports,
                                created_at: poll.createdAt,
                            });
                            if (fallbackResult.success) {
                                console.log("Supabase fallback sync succeeded for edit", pollId);
                            } else {
                                console.warn("Supabase fallback sync returned failure:", fallbackResult.error);
                                toast.error("Edit saved on-chain but image sync failed. Images may not persist after refresh.", { id: "edit-poll-sync" });
                            }
                        } catch (fallbackErr) {
                            console.warn("Supabase fallback sync threw:", fallbackErr);
                            toast.error("Edit saved on-chain but image sync failed. Images may not persist after refresh.", { id: "edit-poll-sync" });
                        }
                    }
                }

                toast.success("Poll edited!", { id: "edit-poll" });
                return true;
            } catch (e: any) {
                console.error("Edit poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Edit"), { id: "edit-poll" });
                return false;
            } finally {
                operationLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setPolls, markMutation, signTransaction]
    );

    // ── Delete poll ──
    const deletePoll = useCallback(
        async (pollId: string): Promise<boolean> => {
            if (!walletAddress) {
                toast.error("Connect your wallet first", { id: "delete-poll" });
                return false;
            }
            const lockKey = `delete:${pollId}`;
            if (operationLock.current.has(lockKey)) {
                toast.error("Delete already in progress", { id: "delete-poll" });
                return false;
            }
            operationLock.current.add(lockKey);

            const currentPolls = pollsRef.current;
            const currentVotes = votesRef.current;
            const currentUsers = usersRef.current;
            const poll = currentPolls.find((p) => p.id === pollId);
            if (!poll) {
                operationLock.current.delete(lockKey);
                toast.error("Poll not found", { id: "delete-poll" });
                return false;
            }

            const admin = isAdminWallet(walletAddress);
            if (!admin) {
                // HIGH-01 FIX: Release lock before early returns to avoid permanent lock leak.
                if (poll.creator !== walletAddress) {
                    operationLock.current.delete(lockKey);
                    toast.error("You can only delete your own polls", { id: "delete-poll" });
                    return false;
                }
                if (poll.status !== PollStatus.Active) {
                    operationLock.current.delete(lockKey);
                    toast.error("Only active polls can be deleted", { id: "delete-poll" });
                    return false;
                }
                const now = Math.floor(Date.now() / 1000);
                if (now >= poll.endTime) {
                    operationLock.current.delete(lockKey);
                    toast.error("Cannot delete ended polls", { id: "delete-poll" });
                    return false;
                }
                const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
                if (totalVotes > 0) {
                    operationLock.current.delete(lockKey);
                    toast.error("Cannot delete polls with votes", { id: "delete-poll" });
                    return false;
                }
            }

            const prevPolls = currentPolls;
            const prevUsers = currentUsers;
            const prevVotes = currentVotes;
            const pollVotes = currentVotes.filter(v => v.pollId === pollId);

            try {
                const pubkey = new PublicKey(walletAddress);
                toast.loading("Deleting poll & refunding balances...", { id: "delete-poll" });

                // ── On-chain transaction (MANDATORY — real SOL refunded) ──
                const ix = await buildDeletePollIx(pubkey, poll.pollId);
                const sig = await sendTransaction([ix], pubkey, signTransaction!);

                // ── Wait for on-chain confirmation before updating UI ──
                toast.loading("Confirming deletion on-chain...", { id: "delete-poll" });
                const confirmed = await confirmTransactionBg(sig);
                if (!confirmed) {
                    throw new Error("Delete transaction failed or timed out on-chain");
                }

                tracker.deletedPollIds.current.add(pollId);
                markMutation();

                // ── Sync to Supabase (AWAIT to ensure data consistency) ──
                if (isSupabaseConfigured) {
                    try {
                        await authenticatedFetch("/api/rpc/delete-poll", {
                            p_poll_id: pollId,
                        });
                    } catch (e) {
                        console.warn("Supabase delete-poll sync failed (on-chain succeeded):", e);
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

                // Optimistic balance update
                setUsers(prev => prev.map(u => {
                    if (u.wallet !== walletAddress) return u;
                    return {
                        ...u,
                        pollsCreated: u.wallet === poll.creator ? Math.max(0, u.pollsCreated - 1) : u.pollsCreated,
                    };
                }));

                setTimeout(() => { tracker.deletedPollIds.current.delete(pollId); }, 300_000);

                const refundTotal = poll.creatorInvestmentLamports + pollVotes.reduce((s, v) => s + v.totalStakedLamports, 0);
                toast.success(`Poll deleted! ${formatSOL(refundTotal)} refunded.`, { id: "delete-poll" });

                // Notify dependent pages (e.g. polls listing) to re-fetch
                bumpDataVersion();

                // ── Refresh real balance (tx already confirmed above) ──
                refreshOnChainBalance(walletAddress).then(freshBal => {
                    if (freshBal !== undefined) {
                        setUsers(prev => prev.map(u =>
                            u.wallet === walletAddress ? { ...u, balance: freshBal } : u
                        ));
                    }
                }).catch(e => console.warn("Balance refresh failed:", e));
                return true;
            } catch (e: any) {
                tracker.deletedPollIds.current.delete(pollId);
                setPolls(prevPolls);
                setUsers(prevUsers);
                setVotes(prevVotes);
                console.error("Delete poll failed:", e);
                toast.error(friendlyErrorMessage(e, "Delete"), { id: "delete-poll" });
                return false;
            } finally {
                operationLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setPolls, setVotes, setUsers, markMutation, signTransaction, bumpDataVersion]
    );

    // ── Cast vote ──
    const castVote = useCallback(
        async (pollId: string, optionIndex: number, numCoins: number): Promise<boolean> => {
            if (!walletAddress) return false;
            // Optimistic lock: prevent concurrent votes on same poll (#4)
            const lockKey = `${pollId}-${walletAddress}`;
            if (votingLock.current.has(lockKey)) {
                toast.error("Vote already in progress");
                return false;
            }
            votingLock.current.add(lockKey);
            try {
                // Read fresh state from refs to avoid stale closure
                const currentPolls = pollsRef.current;
                const currentVotes = votesRef.current;
                const poll = currentPolls.find((p) => p.id === pollId);
                if (!poll || poll.status !== PollStatus.Active) return false;
                if (Date.now() / 1000 > poll.endTime) return false;
                if (poll.creator === walletAddress) {
                    toast.error("You cannot vote on your own poll");
                    return false;
                }

                const existing = currentVotes.find(v => v.pollId === pollId && v.voter === walletAddress);
                const currentCoins = existing ? existing.votesPerOption.reduce((a, b) => a + b, 0) : 0;
                if (currentCoins + numCoins > MAX_COINS_PER_POLL) {
                    toast.error(`Max ${MAX_COINS_PER_POLL} coins per poll (you have ${currentCoins})`);
                    return false;
                }

                const cost = numCoins * poll.unitPriceLamports;
                const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
                if (currentUser && cost > currentUser.balance) {
                    toast.error("Insufficient SOL balance");
                    return false;
                }

                const prevPolls = currentPolls;
                const prevVotes = currentVotes;

                try {
                    const pubkey = new PublicKey(walletAddress);
                    const pollCreator = new PublicKey(poll.creator);
                    toast.loading("Casting vote...", { id: "cast-vote" });

                    // ── Pre-flight checks + instruction build in parallel ──
                    const [pollPDA] = getPollPDA(pollCreator, poll.pollId);
                    const [pollInfo, existingUser, voteIx] = await Promise.all([
                        connection.getAccountInfo(pollPDA),
                        fetchUserAccount(pubkey),
                        buildCastVoteIx(pubkey, pollCreator, poll.pollId, optionIndex, numCoins),
                    ]);
                    if (!pollInfo) {
                        toast.error("This poll does not exist on-chain. It may have been created before on-chain mode was enabled.", { id: "cast-vote" });
                        return false;
                    }

                    const instructions = [];
                    if (!existingUser) {
                        instructions.push(await buildInitializeUserIx(pubkey));
                    }
                    instructions.push(voteIx);

                    // ── On-chain transaction (MANDATORY — real SOL) ──
                    const sig = await sendTransaction(instructions, pubkey, signTransaction!);

                    // ── Sync to Supabase (non-blocking stats cache) ──
                    if (isSupabaseConfigured) {
                        authenticatedFetch("/api/rpc/cast-vote", {
                            p_poll_id: pollId,
                            p_option_index: optionIndex,
                            p_num_coins: numCoins,
                        }).catch(e => console.warn("Supabase cast-vote sync failed (on-chain succeeded):", e));
                    }

                    // ── Supabase succeeded — now apply optimistic UI updates ──
                    const updatedPoll = {
                        ...poll,
                        voteCounts: poll.voteCounts.map((c, i) => i === optionIndex ? c + numCoins : c),
                        totalPoolLamports: poll.totalPoolLamports + cost,
                        totalVoters: poll.totalVoters + (existing ? 0 : 1),
                    };
                    setPolls(prev => prev.map(p => p.id === pollId ? updatedPoll : p));
                    markMutation();

                    if (existing) {
                        const updatedVote: DemoVote = {
                            ...existing,
                            votesPerOption: existing.votesPerOption.map((c, i) => i === optionIndex ? c + numCoins : c),
                            totalStakedLamports: existing.totalStakedLamports + cost,
                        };
                        setVotes(prev => prev.map(v =>
                            v.pollId === pollId && v.voter === walletAddress ? updatedVote : v
                        ));
                    } else {
                        const votesPerOption = new Array(poll.options.length).fill(0);
                        votesPerOption[optionIndex] = numCoins;
                        setVotes(prev => [...prev, {
                            pollId, voter: walletAddress, votesPerOption,
                            totalStakedLamports: cost, claimed: false,
                        }]);
                    }

                    // ── Optimistic balance update immediately ──
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== walletAddress) return u;
                        const fresh = withFreshPeriods(u);
                        return {
                            ...fresh,
                            balance: Math.max(0, fresh.balance - cost),
                            totalVotesCast: fresh.totalVotesCast + numCoins,
                            weeklyVotesCast: fresh.weeklyVotesCast + numCoins,
                            monthlyVotesCast: fresh.monthlyVotesCast + numCoins,
                            totalSpentLamports: fresh.totalSpentLamports + cost,
                            weeklySpentLamports: fresh.weeklySpentLamports + cost,
                            monthlySpentLamports: fresh.monthlySpentLamports + cost,
                            totalPollsVoted: fresh.totalPollsVoted + (existing ? 0 : 1),
                            weeklyPollsVoted: fresh.weeklyPollsVoted + (existing ? 0 : 1),
                            monthlyPollsVoted: fresh.monthlyPollsVoted + (existing ? 0 : 1),
                        };
                    }));

                    toast.success(`Voted ${numCoins} coin(s) — ${formatSOL(cost)} SOL sent!`, { id: "cast-vote" });

                    // ── Background: confirm tx + refresh real balance ──
                    confirmTransactionBg(sig).then(() =>
                        refreshOnChainBalance(walletAddress).then(freshBal => {
                            if (freshBal !== undefined) {
                                setUsers(prev => prev.map(u =>
                                    u.wallet === walletAddress ? { ...u, balance: freshBal } : u
                                ));
                            }
                        })
                    ).catch(e => console.warn("Background confirm/refresh failed:", e));
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
                    const rawMsg = e?.message || e?.toString?.() || "Unknown error";
                    console.error("Cast vote failed:", rawMsg, e);
                    const friendly = friendlyErrorMessage(e, "Vote");
                    // Append raw reason when classified as "unknown" so users can report it
                    const detail = friendly.includes("try again") && rawMsg !== "Unknown error"
                        ? `${friendly} (${rawMsg.slice(0, 120)})`
                        : friendly;
                    toast.error(detail, { id: "cast-vote" });
                    return false;
                }
            } finally {
                votingLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setPolls, setVotes, setUsers, addNotification, markMutation, signTransaction]
    );

    // ── Settle poll ──
    const settlePoll = useCallback(
        async (pollId: string, winningOption?: number): Promise<boolean> => {
            const lockKey = `settle:${pollId}`;
            if (operationLock.current.has(lockKey)) {
                toast.error("Settlement already in progress", { id: "settle-poll" });
                return false;
            }
            operationLock.current.add(lockKey);

            const currentPolls = pollsRef.current;
            const poll = currentPolls.find((p) => p.id === pollId);
            if (!poll) {
                operationLock.current.delete(lockKey);
                toast.error("Poll not found", { id: "settle-poll" });
                return false;
            }
            if (poll.status !== PollStatus.Active) {
                operationLock.current.delete(lockKey);
                toast.error("Poll is already settled", { id: "settle-poll" });
                return false;
            }
            if (!walletAddress) {
                operationLock.current.delete(lockKey);
                toast.error("Connect your wallet first", { id: "settle-poll" });
                return false;
            }

            const prevPolls = currentPolls;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollCreator = new PublicKey(poll.creator);
                toast.loading("Settling poll...", { id: "settle-poll" });

                // Determine the winning option
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

                // ── On-chain transaction (MANDATORY — real SOL) ──
                // Admin uses admin_settle_poll (bypasses 7-day grace period, passes winning_option).
                // Non-admin uses settle_poll (permissionless fallback after 7-day grace).
                let ix;
                const admin = isAdminWallet(walletAddress);
                console.log("[Settle] wallet:", walletAddress, "isAdmin:", admin, "winningOption:", finalWinningOption);
                if (admin && finalWinningOption !== WINNING_OPTION_UNSET) {
                    console.log("[Settle] Using admin_settle_poll instruction");
                    ix = await buildAdminSettlePollIx(pubkey, pollCreator, poll.pollId, finalWinningOption);
                } else {
                    console.log("[Settle] Using permissionless settle_poll instruction (7-day grace applies)");
                    ix = await buildSettlePollIx(pubkey, pollCreator, poll.pollId);
                }
                const sig = await sendTransaction([ix], pubkey, signTransaction!);
                console.log("[Settle] Transaction sent:", sig);

                // ── Wait for on-chain confirmation before updating UI ──
                // Settlement is critical — we must verify the tx actually succeeded
                // on-chain before declaring success. Otherwise a silently-failed tx
                // looks like it worked but reverts on refresh.
                toast.loading("Confirming settlement on-chain...", { id: "settle-poll" });
                const confirmed = await confirmTransactionBg(sig);
                console.log("[Settle] On-chain confirmation result:", confirmed, "sig:", sig);
                if (!confirmed) {
                    throw new Error("Settlement transaction failed or timed out on-chain. Check explorer: " + sig);
                }

                // ── Sync to Supabase (AWAIT to ensure data consistency) ──
                if (isSupabaseConfigured) {
                    try {
                        await authenticatedFetch("/api/rpc/settle-poll", {
                            p_poll_id: pollId,
                        });
                    } catch (e) {
                        console.warn("Supabase settle-poll sync failed (on-chain succeeded):", e);
                    }
                }

                // ── Apply UI updates after on-chain success ──
                setPolls(prev => prev.map(p =>
                    p.id === pollId ? { ...p, status: PollStatus.Settled, winningOption: finalWinningOption } : p
                ));
                markMutation();

                // Optimistic balance update
                if (poll.creatorRewardLamports > 0 && poll.creator === walletAddress) {
                    setUsers(prev => prev.map(u => {
                        if (u.wallet !== walletAddress) return u;
                        const fresh = withFreshPeriods(u);
                        return {
                            ...fresh,
                            balance: fresh.balance + poll.creatorRewardLamports,
                            creatorEarningsLamports: fresh.creatorEarningsLamports + poll.creatorRewardLamports,
                            totalWinningsLamports: fresh.totalWinningsLamports + poll.creatorRewardLamports,
                            weeklyWinningsLamports: fresh.weeklyWinningsLamports + poll.creatorRewardLamports,
                            monthlyWinningsLamports: fresh.monthlyWinningsLamports + poll.creatorRewardLamports,
                        };
                    }));
                }

                toast.success("Poll settled!", { id: "settle-poll" });

                // Notify dependent pages (e.g. polls listing) to re-fetch
                bumpDataVersion();

                // ── Refresh real balance (tx already confirmed above) ──
                refreshOnChainBalance(walletAddress!).then(freshBal => {
                    if (freshBal !== undefined) {
                        setUsers(prev => prev.map(u =>
                            u.wallet === walletAddress ? { ...u, balance: freshBal } : u
                        ));
                    }
                }).catch(e => console.warn("Balance refresh failed:", e));

                const winnerLabel = finalWinningOption < poll.options.length ? poll.options[finalWinningOption] : "N/A";
                addNotification({
                    wallet: walletAddress!,
                    type: "poll_settled",
                    title: "Poll Settled",
                    message: `"${poll.title}" has been settled. Winner: ${winnerLabel}`,
                    pollId,
                });

                const userVote = votesRef.current.find(v => v.pollId === pollId && v.voter === walletAddress);
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
            } finally {
                operationLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setPolls, setUsers, addNotification, markMutation, signTransaction, bumpDataVersion]
    );

    // ── Claim reward ──
    const claimReward = useCallback(
        async (pollId: string): Promise<number> => {
            if (!walletAddress) return 0;
            const lockKey = `claim:${pollId}`;
            if (operationLock.current.has(lockKey)) return 0;
            operationLock.current.add(lockKey);

            const currentPolls = pollsRef.current;
            const currentVotes = votesRef.current;
            const currentUsers = usersRef.current;
            const poll = currentPolls.find((p) => p.id === pollId);
            if (!poll || poll.status !== PollStatus.Settled || poll.winningOption === WINNING_OPTION_UNSET) {
                operationLock.current.delete(lockKey);
                return 0;
            }

            const voteRecord = currentVotes.find(v => v.pollId === pollId && v.voter === walletAddress);
            if (!voteRecord || voteRecord.claimed) {
                operationLock.current.delete(lockKey);
                return 0;
            }

            const userWinningVotes = voteRecord.votesPerOption[poll.winningOption] || 0;
            if (userWinningVotes === 0) {
                operationLock.current.delete(lockKey);
                return 0;
            }

            const prevVotes = currentVotes;
            const prevUsers = currentUsers;

            try {
                const pubkey = new PublicKey(walletAddress);
                const pollCreator = new PublicKey(poll.creator);
                toast.loading("Claiming reward...", { id: "claim-reward" });

                // ── On-chain transaction (MANDATORY — real SOL) ──
                const claimIx = await buildClaimRewardIx(pubkey, pollCreator, poll.pollId);
                const sig = await sendTransaction([claimIx], pubkey, signTransaction!);

                const totalWinningVotes = poll.voteCounts[poll.winningOption] || 0;
                if (totalWinningVotes === 0) {
                    toast.error("No winning votes — cannot calculate reward.", { id: "claim-reward" });
                    return 0;
                }
                const reward = Math.floor(
                    (userWinningVotes / totalWinningVotes) * poll.totalPoolLamports
                );

                // ── Sync to Supabase (non-blocking stats cache) ──
                if (isSupabaseConfigured) {
                    authenticatedFetch("/api/rpc/claim-reward", {
                        p_poll_id: pollId,
                    }).catch(e => console.warn("Supabase claim-reward sync failed (on-chain succeeded):", e));
                }

                // ── Apply optimistic UI updates ──
                setVotes(prev => prev.map(v =>
                    v.pollId === pollId && v.voter === walletAddress ? { ...v, claimed: true } : v
                ));
                setUsers(prev => prev.map(u => {
                    if (u.wallet !== walletAddress) return u;
                    const fresh = withFreshPeriods(u);
                    return {
                        ...fresh,
                        balance: fresh.balance + reward,
                        pollsWon: fresh.pollsWon + 1,
                        weeklyPollsWon: fresh.weeklyPollsWon + 1,
                        monthlyPollsWon: fresh.monthlyPollsWon + 1,
                        totalWinningsLamports: fresh.totalWinningsLamports + reward,
                        weeklyWinningsLamports: fresh.weeklyWinningsLamports + reward,
                        monthlyWinningsLamports: fresh.monthlyWinningsLamports + reward,
                    };
                }));

                toast.success(`Claimed ${formatSOL(reward)}!`, { id: "claim-reward" });

                // ── Background: confirm tx + refresh real balance ──
                confirmTransactionBg(sig).then(() =>
                    refreshOnChainBalance(walletAddress).then(freshBal => {
                        if (freshBal !== undefined) {
                            setUsers(prev => prev.map(u =>
                                u.wallet === walletAddress ? { ...u, balance: freshBal } : u
                            ));
                        }
                    })
                ).catch(e => console.warn("Background confirm/refresh failed:", e));
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
            } finally {
                operationLock.current.delete(lockKey);
            }
        },
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [walletAddress, setVotes, setUsers, addNotification, signTransaction]
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
