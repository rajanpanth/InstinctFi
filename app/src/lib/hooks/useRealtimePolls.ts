/**
 * useRealtimePolls — subscribes to Supabase Realtime for live poll/vote updates.
 *
 * Listens to postgres_changes on `polls` and `votes` tables, merging
 * incoming changes into the app state so users see live vote counts
 * without refreshing.
 */
import { useEffect, useRef } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { rowToDemoPoll, rowToDemoVote } from "@/lib/dataConverters";
import type { DemoPoll, DemoVote } from "@/components/Providers";
import type { RealtimeChannel } from "@supabase/supabase-js";

type RealtimePollsOptions = {
    setPolls: React.Dispatch<React.SetStateAction<DemoPoll[]>>;
    setVotes: React.Dispatch<React.SetStateAction<DemoVote[]>>;
    enabled?: boolean;
};

export function useRealtimePolls({ setPolls, setVotes, enabled = true }: RealtimePollsOptions) {
    const channelRef = useRef<RealtimeChannel | null>(null);

    useEffect(() => {
        if (!enabled || !isSupabaseConfigured) return;

        const channel = supabase
            .channel("realtime-polls-votes")
            // ── Poll changes ────────────────────────────────────────────────
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "polls" },
                (payload) => {
                    try {
                        const newPoll = rowToDemoPoll(payload.new);
                        setPolls((prev) => {
                            if (prev.some((p) => p.id === newPoll.id)) return prev;
                            return [newPoll, ...prev];
                        });
                    } catch (e) {
                        console.warn("[Realtime] Failed to parse new poll:", e);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "polls" },
                (payload) => {
                    try {
                        const updated = rowToDemoPoll(payload.new);
                        setPolls((prev) =>
                            prev.map((p) => (p.id === updated.id ? updated : p))
                        );
                    } catch (e) {
                        console.warn("[Realtime] Failed to parse updated poll:", e);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "DELETE", schema: "public", table: "polls" },
                (payload) => {
                    const deletedId = (payload.old as any)?.id;
                    if (deletedId) {
                        setPolls((prev) => prev.filter((p) => p.id !== deletedId));
                    }
                }
            )
            // ── Vote changes ────────────────────────────────────────────────
            .on(
                "postgres_changes",
                { event: "INSERT", schema: "public", table: "votes" },
                (payload) => {
                    try {
                        const newVote = rowToDemoVote(payload.new);
                        setVotes((prev) => {
                            const existing = prev.findIndex(
                                (v) => v.pollId === newVote.pollId && v.voter === newVote.voter
                            );
                            if (existing >= 0) {
                                const copy = [...prev];
                                copy[existing] = newVote;
                                return copy;
                            }
                            return [...prev, newVote];
                        });
                    } catch (e) {
                        console.warn("[Realtime] Failed to parse new vote:", e);
                    }
                }
            )
            .on(
                "postgres_changes",
                { event: "UPDATE", schema: "public", table: "votes" },
                (payload) => {
                    try {
                        const updated = rowToDemoVote(payload.new);
                        setVotes((prev) =>
                            prev.map((v) =>
                                v.pollId === updated.pollId && v.voter === updated.voter
                                    ? updated
                                    : v
                            )
                        );
                    } catch (e) {
                        console.warn("[Realtime] Failed to parse updated vote:", e);
                    }
                }
            )
            .subscribe((status) => {
                if (status === "SUBSCRIBED") {
                    console.log("[Realtime] Subscribed to polls & votes changes");
                } else if (status === "CHANNEL_ERROR") {
                    console.warn("[Realtime] Channel error — will auto-reconnect");
                }
            });

        channelRef.current = channel;

        return () => {
            channel.unsubscribe();
            channelRef.current = null;
        };
    }, [enabled, setPolls, setVotes]);
}
