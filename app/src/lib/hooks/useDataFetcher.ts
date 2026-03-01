"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
    rowToUserAccount,
} from "@/lib/dataConverters";
import { type DemoPoll, type DemoVote, type UserAccount } from "@/lib/types";

/** Mutation tracking refs shared between fetcher and operations hooks. */
export interface MutationTracker {
    mutationGeneration: React.MutableRefObject<number>;
    lastMutationTs: React.MutableRefObject<number>;
    deletedPollIds: React.MutableRefObject<Set<string>>;
}

/** Polls that have received a vote within the last 60 seconds (for live indicators). */
const LIVE_WINDOW_MS = 60_000;

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
    const pollsRef = useRef<DemoPoll[]>([]);
    const votesRef = useRef<DemoVote[]>([]);
    const optionImagesCache = useRef<Record<string, string[]>>({});

    const MUTATION_COOLDOWN_MS = 10_000;

    // ── Live indicator tracking ──
    // Maps poll_id → timestamp of last vote event received via realtime
    const liveTimestamps = useRef<Map<string, number>>(new Map());
    const [recentlyVotedPollIds, setRecentlyVotedPollIds] = useState<Set<string>>(new Set());

    // Keep up-to-date refs for async closures
    const updateUsersRef = useCallback((users: UserAccount[]) => {
        usersRef.current = users;
    }, []);
    const updatePollsRef = useCallback((polls: DemoPoll[]) => {
        pollsRef.current = polls;
    }, []);
    const updateVotesRef = useCallback((votes: DemoVote[]) => {
        votesRef.current = votes;
    }, []);

    // Prune stale live timestamps every 15s
    useEffect(() => {
        const pruneInterval = setInterval(() => {
            const now = Date.now();
            const map = liveTimestamps.current;
            let changed = false;
            Array.from(map.entries()).forEach(([id, ts]) => {
                if (now - ts > LIVE_WINDOW_MS) {
                    map.delete(id);
                    changed = true;
                }
            });
            if (changed) {
                setRecentlyVotedPollIds(new Set(map.keys()));
            }
        }, 15_000);
        return () => clearInterval(pruneInterval);
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
                // Try on-chain first
                let onChainPollsLoaded = false;
                try {
                    const [onChainPolls, onChainUsers] = await Promise.all([
                        fetchAllPolls(),
                        fetchAllUsers(),
                    ]);

                    const demoPolls = onChainPolls.map((p) =>
                        onChainPollToDemo(p)
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

                    if (onChainFiltered.length > 0 && gen === tracker.mutationGeneration.current) {
                        // Supplement on-chain polls with Supabase data (option_images, etc.)
                        // Option images are only stored in Supabase, not on-chain.
                        if (isSupabaseConfigured) {
                            try {
                                const ids = onChainFiltered.map(p => p.id);
                                const { data: sbRows } = await supabase
                                    .from("polls")
                                    .select("id, image_url, option_images")
                                    .in("id", ids);
                                if (sbRows && sbRows.length > 0) {
                                    const sbMap = new Map(sbRows.map(r => [r.id, r]));
                                    for (const p of onChainFiltered) {
                                        const row = sbMap.get(p.id);
                                        if (row) {
                                            // Use Supabase image_url if on-chain is empty
                                            if (!p.imageUrl && row.image_url) {
                                                p.imageUrl = row.image_url;
                                            }
                                            // Always prefer Supabase option_images (not on-chain)
                                            if (row.option_images && row.option_images.length > 0) {
                                                p.optionImages = row.option_images.map((s: string | null) => s ?? "");
                                            }
                                        }
                                    }
                                }
                            } catch (e) {
                                console.warn("Failed to supplement on-chain polls with Supabase images:", e);
                            }
                        }

                        setPolls(onChainFiltered);

                        // On-chain wallet balance is the source of truth.
                        // Real SOL balance reflects all on-chain transactions
                        // (create poll, vote, settle, claim).
                        setUsers(usersWithBalances);
                        onChainPollsLoaded = true;
                    }

                    if (walletAddress && gen === tracker.mutationGeneration.current) {
                        try {
                            const userVotes = await fetchVotesForUser(new PublicKey(walletAddress));
                            if (userVotes.length > 0) {
                                setVotes(userVotes.map(onChainVoteToDemo));
                            }
                        } catch (e) {
                            console.warn("Failed to fetch on-chain votes:", e);
                        }
                    }
                } catch (e) {
                    console.warn("On-chain fetch failed, falling back to Supabase:", e);
                }

                // Fallback / supplement: also load from Supabase if on-chain returned nothing
                if (!onChainPollsLoaded && isSupabaseConfigured) {
                    try {
                        const [pollsRes, votesRes] = await Promise.all([
                            // P-02 FIX: Limit initial load instead of unbounded SELECT *
                            supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(500),
                            supabase.from("votes").select("*").limit(5000),
                        ]);

                        if (pollsRes.data) {
                            const fetched = pollsRes.data.map(rowToDemoPoll);
                            const filtered = tracker.deletedPollIds.current.size > 0
                                ? fetched.filter((p: DemoPoll) => !tracker.deletedPollIds.current.has(p.id))
                                : fetched;

                            if (gen === tracker.mutationGeneration.current) {
                                setPolls(filtered);
                            }
                        }
                        if (votesRes.data && gen === tracker.mutationGeneration.current) {
                            setVotes(votesRes.data.map(rowToDemoVote));
                        }

                        // Only fetch the current user's row (not all users) to prevent
                        // financial data leakage via browser devtools (#14).
                        if (walletAddress && gen === tracker.mutationGeneration.current) {
                            const usersRes = await supabase
                                .from("users")
                                .select("*")
                                .eq("wallet", walletAddress)
                                .single();
                            if (usersRes.data) {
                                const currentUser = rowToUserAccount(usersRes.data);
                                // Fetch real on-chain balance — Supabase balance is not trusted
                                try {
                                    const realBal = await getWalletBalance(new PublicKey(walletAddress));
                                    currentUser.balance = realBal;
                                } catch (e) {
                                    console.warn("Failed to fetch on-chain balance for Supabase fallback user:", e);
                                }
                                setUsers(prev => {
                                    const others = prev.filter(u => u.wallet !== walletAddress);
                                    return [...others, currentUser];
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to load from Supabase:", e);
                    }
                }

            } else {
                // Demo mode (PROGRAM_DEPLOYED = false)
                if (isSupabaseConfigured) {
                    try {
                        // P-02 FIX: Limit initial load to prevent loading thousands of rows
                        const [pollsRes, votesRes] = await Promise.all([
                            supabase.from("polls").select("*").order("created_at", { ascending: false }).limit(500),
                            supabase.from("votes").select("*").limit(5000),
                        ]);

                        if (pollsRes.data) {
                            const fetched = pollsRes.data.map(rowToDemoPoll);
                            const filtered = tracker.deletedPollIds.current.size > 0
                                ? fetched.filter((p: DemoPoll) => !tracker.deletedPollIds.current.has(p.id))
                                : fetched;

                            if (gen === tracker.mutationGeneration.current) {
                                setPolls(filtered);
                            }
                        }
                        if (votesRes.data && gen === tracker.mutationGeneration.current) {
                            setVotes(votesRes.data.map(rowToDemoVote));
                        }

                        // Only fetch the current user's row (not all users) to prevent
                        // financial data leakage via browser devtools (#14).
                        if (walletAddress && gen === tracker.mutationGeneration.current) {
                            const usersRes = await supabase
                                .from("users")
                                .select("*")
                                .eq("wallet", walletAddress)
                                .single();
                            if (usersRes.data) {
                                const currentUser = rowToUserAccount(usersRes.data);
                                // Fetch real on-chain balance — Supabase balance is not trusted
                                try {
                                    const realBal = await getWalletBalance(new PublicKey(walletAddress));
                                    currentUser.balance = realBal;
                                } catch (e) {
                                    console.warn("Failed to fetch on-chain balance for demo-mode user:", e);
                                }
                                setUsers(prev => {
                                    const others = prev.filter(u => u.wallet !== walletAddress);
                                    return [...others, currentUser];
                                });
                            }
                        }
                    } catch (e) {
                        console.warn("Failed to load from Supabase:", e);
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
        // Poll every 60s as a safety-net fallback — realtime handles the fast path
        const interval = setInterval(fetchAll, 60_000);

        let channel: ReturnType<typeof supabase.channel> | null = null;
        let realtimeDebounce: ReturnType<typeof setTimeout> | null = null;
        if (isSupabaseConfigured) {
            // Debounce realtime events to avoid double-fetching with polling (#17)
            const debouncedFetch = () => {
                if (realtimeDebounce) clearTimeout(realtimeDebounce);
                realtimeDebounce = setTimeout(fetchAll, 500);
            };

            // Track live votes for the LiveIndicator component
            const handleVoteEvent = (payload: any) => {
                // Extract poll_id from the realtime payload
                const pollId = payload?.new?.poll_id || payload?.old?.poll_id;
                if (pollId) {
                    liveTimestamps.current.set(pollId, Date.now());
                    setRecentlyVotedPollIds(new Set(liveTimestamps.current.keys()));
                }
                debouncedFetch();
            };

            channel = supabase
                .channel("polls-votes-realtime")
                .on("postgres_changes", { event: "*", schema: "public", table: "polls" }, debouncedFetch)
                .on("postgres_changes", { event: "*", schema: "public", table: "votes" }, handleVoteEvent)
                .on("postgres_changes", { event: "INSERT", schema: "public", table: "comments" }, debouncedFetch)
                .subscribe();
        }

        return () => {
            clearInterval(interval);
            if (realtimeDebounce) clearTimeout(realtimeDebounce);
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
        pollsRef,
        votesRef,
        updateUsersRef,
        updatePollsRef,
        updateVotesRef,
        recentlyVotedPollIds,
    };
}
