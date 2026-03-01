"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import { useApp } from "./Providers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { authenticatedFetch } from "@/lib/apiClient";
import { shortAddr, timeAgo } from "@/lib/utils";
import { useUserProfiles } from "@/lib/userProfiles";
import { sanitizeComment } from "@/lib/sanitize";
import toast from "react-hot-toast";
import { useLanguage } from "@/lib/languageContext";

type Comment = {
  id: string;
  poll_id: string;
  wallet: string;
  text: string;
  created_at: number;
};

type Props = {
  pollId: string;
};

const REACTION_EMOJIS = ["👍", "🔥", "🧠"] as const;
type ReactionCounts = Record<string, Record<string, number>>; // commentId -> emoji -> count
type UserReactions = Record<string, Set<string>>; // commentId -> Set of emoji user reacted with

export default function PollComments({ pollId }: Props) {
  const { walletConnected, walletAddress, connectWallet } = useApp();
  const { getDisplayName, getAvatarUrl } = useUserProfiles();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cooldownEnd, setCooldownEnd] = useState(0);
  const { t } = useLanguage();

  // Reaction state
  const [reactionCounts, setReactionCounts] = useState<ReactionCounts>({});
  const [userReactions, setUserReactions] = useState<UserReactions>({});

  const COMMENT_COOLDOWN_MS = 30_000;

  // Load comments
  const fetchComments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      try {
        const saved = localStorage.getItem(`comments_${pollId}`);
        if (saved) setComments(JSON.parse(saved));
      } catch { }
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: true });
      if (data) {
        setComments(data as Comment[]);
        // Fetch reaction counts
        const ids = data.map((c: any) => c.id);
        if (ids.length > 0) {
          const { data: reactData } = await supabase.rpc("get_reaction_counts", { p_comment_ids: ids });
          if (reactData) {
            const counts: ReactionCounts = {};
            reactData.forEach((r: any) => {
              if (!counts[r.comment_id]) counts[r.comment_id] = {};
              counts[r.comment_id][r.emoji] = Number(r.count);
            });
            setReactionCounts(counts);
          }
          // Fetch user's own reactions
          if (walletAddress) {
            const { data: userReactData } = await supabase
              .from("comment_reactions")
              .select("comment_id, emoji")
              .in("comment_id", ids)
              .eq("wallet", walletAddress);
            if (userReactData) {
              const userR: UserReactions = {};
              userReactData.forEach((r: any) => {
                if (!userR[r.comment_id]) userR[r.comment_id] = new Set();
                userR[r.comment_id].add(r.emoji);
              });
              setUserReactions(userR);
            }
          }
        }
      }
    } catch (e) {
      console.warn("Failed to load comments:", e);
    }
    setLoading(false);
  }, [pollId, walletAddress]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Subscribe to realtime comments
  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const channel = supabase
      .channel(`comments-${pollId}`)
      .on("postgres_changes", {
        event: "INSERT",
        schema: "public",
        table: "comments",
        filter: `poll_id=eq.${pollId}`,
      }, (payload: { new: Comment }) => {
        const newC = payload.new as Comment;
        setComments(prev => {
          // MED-05 FIX: Deduplicate by matching on poll_id + wallet + text + approximate time.
          // Client-generated IDs won't match server IDs, so we check content instead.
          if (prev.find(c => c.id === newC.id)) return prev;
          const isDuplicate = prev.some(c =>
            c.poll_id === newC.poll_id &&
            c.wallet === newC.wallet &&
            c.text === newC.text &&
            Math.abs((c.created_at || 0) - (newC.created_at || 0)) < 5
          );
          if (isDuplicate) return prev;
          return [...prev, newC];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pollId]);

  const handleReaction = async (commentId: string, emoji: string) => {
    if (!walletConnected || !walletAddress) {
      connectWallet();
      return;
    }
    // Optimistic update
    const hadReaction = userReactions[commentId]?.has(emoji);
    setUserReactions(prev => {
      const copy = { ...prev };
      if (!copy[commentId]) copy[commentId] = new Set();
      const set = new Set(copy[commentId]);
      if (hadReaction) set.delete(emoji);
      else set.add(emoji);
      copy[commentId] = set;
      return copy;
    });
    setReactionCounts(prev => {
      const copy = { ...prev };
      if (!copy[commentId]) copy[commentId] = {};
      const current = copy[commentId][emoji] || 0;
      copy[commentId] = { ...copy[commentId], [emoji]: hadReaction ? Math.max(0, current - 1) : current + 1 };
      return copy;
    });

    // Server call
    if (isSupabaseConfigured) {
      try {
        await authenticatedFetch("/api/rpc/react-comment", {
          p_comment_id: commentId,
          p_wallet: walletAddress,
          p_emoji: emoji,
        });
      } catch {
        // BUG-20 FIX: Revert BOTH userReactions AND reactionCounts on error.
        // Previously only userReactions was reverted, leaving counts desynced.
        setUserReactions(prev => {
          const copy = { ...prev };
          if (!copy[commentId]) copy[commentId] = new Set();
          const set = new Set(copy[commentId]);
          if (hadReaction) set.add(emoji);
          else set.delete(emoji);
          copy[commentId] = set;
          return copy;
        });
        setReactionCounts(prev => {
          const copy = { ...prev };
          if (!copy[commentId]) copy[commentId] = {};
          const current = copy[commentId][emoji] || 0;
          copy[commentId] = {
            ...copy[commentId],
            [emoji]: hadReaction ? current + 1 : Math.max(0, current - 1),
          };
          return copy;
        });
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !walletAddress) {
      connectWallet();
      return;
    }
    if (!newComment.trim()) return;
    if (newComment.trim().length > 500) {
      toast.error(t("commentTooLong"));
      return;
    }

    const now = Date.now();
    if (now < cooldownEnd) {
      const secsLeft = Math.ceil((cooldownEnd - now) / 1000);
      toast.error(`Please wait ${secsLeft}s before commenting again`);
      return;
    }

    setSubmitting(true);
    const comment: Comment = {
      id: `${pollId}-${walletAddress}-${Date.now()}`,
      poll_id: pollId,
      wallet: walletAddress,
      text: sanitizeComment(newComment),
      created_at: Math.floor(Date.now() / 1000),
    };

    try {
      if (isSupabaseConfigured) {
        const result = await authenticatedFetch("/api/rpc/comment", {
          p_poll_id: comment.poll_id,
          p_text: comment.text,
        });
        if (!result.success) throw new Error(result.error);
      } else {
        const all = [...comments, comment];
        localStorage.setItem(`comments_${pollId}`, JSON.stringify(all));
      }
      setComments(prev => [...prev, comment]);
      setNewComment("");
      setCooldownEnd(Date.now() + COMMENT_COOLDOWN_MS);
    } catch (e) {
      console.error("Failed to post comment:", e);
      toast.error(t("failedToPostComment"));
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-surface-100 border border-border rounded-2xl p-6 sm:p-8">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        {t("discussion")} ({comments.length})
      </h2>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={walletConnected ? t("shareThoughts") : t("connectWalletToComment")}
            disabled={!walletConnected}
            maxLength={500}
            className="flex-1 px-4 py-2.5 bg-surface-50 border border-border rounded-xl text-sm focus:border-brand-500 focus:ring-1 focus:ring-brand-500 outline-none transition-colors placeholder-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim() || !walletConnected}
            className="px-4 py-2.5 bg-brand-500 hover:bg-brand-600 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            {submitting ? "..." : t("post")}
          </button>
        </div>
        {newComment.length > 400 && (
          <p className={`text-xs mt-1 ${newComment.length > 500 ? "text-red-400" : "text-gray-500"}`}>
            {newComment.length}/500
          </p>
        )}
      </form>

      {/* Comments list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2].map(i => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="w-8 h-8 rounded-full bg-gray-700/50 shrink-0" />
              <div className="flex-1">
                <div className="h-3 w-20 bg-gray-700/50 rounded mb-2" />
                <div className="h-4 w-3/4 bg-gray-700/50 rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : comments.length === 0 ? (
        <p className="text-gray-500 text-sm text-center py-6">
          {t("noCommentsYet")}
        </p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              {getAvatarUrl(c.wallet) ? (
                getAvatarUrl(c.wallet).startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={getAvatarUrl(c.wallet)} alt="" className="w-8 h-8 rounded-full object-cover border border-border shrink-0" />
                ) : (
                  <Image src={getAvatarUrl(c.wallet)} alt="" width={32} height={32} className="w-8 h-8 rounded-full object-cover border border-border shrink-0" unoptimized />
                )
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-brand-600/30 to-brand-500/20 flex items-center justify-center text-xs font-bold text-brand-400 shrink-0 border border-border">
                  {getDisplayName(c.wallet).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-gray-300">{getDisplayName(c.wallet)}</span>
                  <span className="text-xs text-gray-600">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 break-words">{c.text}</p>
                {/* Reaction buttons */}
                <div className="flex items-center gap-1.5 mt-1.5">
                  {REACTION_EMOJIS.map(emoji => {
                    const count = reactionCounts[c.id]?.[emoji] || 0;
                    const active = userReactions[c.id]?.has(emoji);
                    return (
                      <button
                        key={emoji}
                        onClick={() => handleReaction(c.id, emoji)}
                        className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs transition-all ${active
                            ? "bg-brand-500/15 border border-brand-500/30 text-brand-400"
                            : "bg-surface-50 border border-border text-gray-500 hover:border-gray-500 hover:text-gray-300"
                          }`}
                      >
                        <span>{emoji}</span>
                        {count > 0 && <span className="font-mono">{count}</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

