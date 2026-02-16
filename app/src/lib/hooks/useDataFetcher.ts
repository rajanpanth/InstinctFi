"use client";

import { useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    fetchAllPolls,
    fetchAllUsers,
    fetchVotesForUser,
    getWalletBalance,
    PROGRAM_DEPLOYED,
} from "@/lib/program";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import {
    onChainPollToDemo,
    onChainVoteToDemo,
    onChainUserToAccount,
    rowToDemoPoll,
    rowToDemoVote,
} from "@/lib/dataConverters";
import { type DemoPoll, type DemoVote, type UserAccount } from "@/lib/types";

/** Mutation tracking refs shared between fetcher and operations hooks. */
export interface MutationTracker {
    mutationGeneration: React.MutableRefObject<number>;
    lastMutationTs: React.MutableRefObject<number>;
    deletedPollIds: React.MutableRefObject<Set<string>>;
}

/**
 * Handles all data fetching: initial load, periodic polling, Supabase realtime,
 * and on-chain data reconciliation.
 */
export function useDataFetcher(
    walletAddress: string | null,
    walletConnected: boolean,
    setPolls: React.Dispatch<React.SetStateAction<DemoPoll[]>>,
    setVotes: React.Dispatch<React.SetStateAction<DemoVote[]>>,
    setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>,
    setIsLoading: React.Dispatch<React.SetStateAction<boolean>>,
    tracker: MutationTracker,
) {
    const fetchingRef = useRef(false);
    const initialFetchDone = useRef(false);
    const usersRef = useRef<UserAccount[]>([]);
    const optionImagesCache = useRef<Record<string, string[]>>({});

    const MUTATION_COOLDOWN_MS = 10_000;

    // Keep up-to-date ref for users (for async closures)
    // This is updated by the parent via the exposed ref
    const updateUsersRef = useCallback((users: UserAccount[]) => {
        usersRef.current = users;
    }, []);

    const fetchAll = useCallback(async () => {
        if (fetchingRef.current) return;

        if (initialFetchDone.current && Date.now() - tracker.lastMutationTs.current < MUTATION_COOLDOWN_MS) {
            return;
        }

        fetchingRef.current = true;
        const gen = tracker.mutationGeneration.current;

        try {
            if (PROGRAM_DEPLOYED) {
                const [onChainPolls, onChainUsers] = await Promise.all([
                    fetchAllPolls(),
                    fetchAllUsers(),
                ]);

                let optionImagesMap: Record<string, string[]> = {};
                if (isSupabaseConfigured) {
                    try {
                        const { data } = await supabase
                            .from("poll_images")
                            .select("poll_pda, option_images");
                        if (data) {
                            for (const row of data) {
                                optionImagesMap[row.poll_pda] = row.option_images || [];
                            }
                        }
                    } catch { }
                }
                optionImagesCache.current = optionImagesMap;

                const demoPolls = onChainPolls.map((p) =>
                    onChainPollToDemo(p, optionImagesMap[p.address.toString()])
                );

                const usersWithBalances = await Promise.all(
                    onChainUsers.map(async (u) => {
                        try {
                            const bal = await getWalletBalance(u.authority);
                            return onChainUserToAccount(u, bal);
                        } catch {
                            return onChainUserToAccount(u, 0);
                        }
                    })
                );

                const onChainFiltered = tracker.deletedPollIds.current.size > 0
                    ? demoPolls.filter(p => !tracker.deletedPollIds.current.has(p.id))
                    : demoPolls;

                if (gen === tracker.mutationGeneration.current) {
                    setPolls(onChainFiltered);
                    setUsers(usersWithBalances);
                }

                if (walletAddress && gen === tracker.mutationGeneration.current) {
                    try {
                        const userVotes = await fetchVotesForUser(new PublicKey(walletAddress));
                        setVotes(userVotes.map(onChainVoteToDemo));
                    } catch (e) {
                        console.warn("Failed to fetch votes:", e);
                    }
                }
            } else {
                // Demo mode
                if (isSupabaseConfigured) {
                    try {
                        const [pollsRes, votesRes] = await Promise.all([
                            supabase.from("polls").select("*").order("created_at", { ascending: false }),
                            supabase.from("votes").select("*"),
                        ]);
                        if (pollsRes.data) {
                            const fetched = pollsRes.data.map(rowToDemoPoll);
                            const filtered = tracker.deletedPollIds.current.size > 0
                                ? fetched.filter(p => !tracker.deletedPollIds.current.has(p.id))
                                : fetched;

                            if (gen === tracker.mutationGeneration.current) {
                                setPolls(filtered);
                            }
                        }
                        if (votesRes.data && gen === tracker.mutationGeneration.current) {
                            setVotes(votesRes.data.map(rowToDemoVote));
                        }
                    } catch (e) {
                        console.warn("Failed to load from Supabase:", e);
                    }
                }

                if (PROGRAM_DEPLOYED && walletAddress) {
                    try {
                        const bal = await getWalletBalance(new PublicKey(walletAddress));
                        setUsers(prev => prev.map(u =>
                            u.wallet === walletAddress ? { ...u, balance: bal } : u
                        ));
                    } catch { }
                }

                if (!PROGRAM_DEPLOYED && walletAddress) {
                    const currentUser = usersRef.current.find(u => u.wallet === walletAddress);
                    if (currentUser && currentUser.balance === 0) {
                        try {
                            const bal = await getWalletBalance(new PublicKey(walletAddress));
                            if (bal > 0) {
                                setUsers(prev => prev.map(u => u.wallet === walletAddress ? { ...u, balance: bal } : u));
                            }
                        } catch { }
                    }
                }
            }
        } catch (e) {
            console.error("Failed to fetch data:", e);
        }
        setIsLoading(false);
        initialFetchDone.current = true;
        fetchingRef.current = false;
    }, [walletAddress, setPolls, setVotes, setUsers, setIsLoading, tracker]);

    // Initial fetch + periodic polling + Supabase realtime
    useEffect(() => {
        fetchAll();
        const interval = setInterval(fetchAll, 15_000);

        let channel: ReturnType<typeof supabase.channel> | null = null;
        if (isSupabaseConfigured) {
            channel = supabase
                .channel("polls-votes-realtime")
                .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, () => fetchAll())
                .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, () => fetchAll())
                .subscribe();
        }

        return () => {
            clearInterval(interval);
            if (channel) supabase.removeChannel(channel);
        };
    }, [fetchAll]);

    // Re-fetch on wallet connect/change
    useEffect(() => {
        if (walletConnected && walletAddress) {
            fetchAll();
        }
    }, [walletConnected, walletAddress, fetchAll]);

    return {
        fetchAll,
        initialFetchDone,
        usersRef,
        updateUsersRef,
    };
}
