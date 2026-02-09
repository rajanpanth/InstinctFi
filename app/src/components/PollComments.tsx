"use client";

import { useState, useEffect, useCallback } from "react";
import { useApp } from "./Providers";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { shortAddr, timeAgo } from "@/lib/utils";
import { useUserProfiles } from "@/lib/userProfiles";
import { sanitizeComment } from "@/lib/sanitize";
import toast from "react-hot-toast";

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

export default function PollComments({ pollId }: Props) {
  const { walletConnected, walletAddress, connectWallet } = useApp();
  const { getDisplayName, getAvatarUrl } = useUserProfiles();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cooldownEnd, setCooldownEnd] = useState(0);

  const COMMENT_COOLDOWN_MS = 30_000; // 30 seconds between comments

  // Load comments
  const fetchComments = useCallback(async () => {
    if (!isSupabaseConfigured) {
      // Fallback to localStorage
      try {
        const saved = localStorage.getItem(`comments_${pollId}`);
        if (saved) setComments(JSON.parse(saved));
      } catch {}
      setLoading(false);
      return;
    }

    try {
      const { data } = await supabase
        .from("comments")
        .select("*")
        .eq("poll_id", pollId)
        .order("created_at", { ascending: true });
      if (data) setComments(data as Comment[]);
    } catch (e) {
      console.warn("Failed to load comments:", e);
    }
    setLoading(false);
  }, [pollId]);

  useEffect(() => {
    fetchComments();
  }, [fetchComments]);

  // Subscribe to realtime comments if Supabase is configured
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
          if (prev.find(c => c.id === newC.id)) return prev;
          return [...prev, newC];
        });
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [pollId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!walletConnected || !walletAddress) {
      connectWallet();
      return;
    }
    if (!newComment.trim()) return;
    if (newComment.trim().length > 500) {
      toast.error("Comment too long (max 500 chars)");
      return;
    }

    // Rate limiting: 1 comment per 30s
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
        await supabase.from("comments").insert(comment);
      } else {
        // localStorage fallback
        const all = [...comments, comment];
        localStorage.setItem(`comments_${pollId}`, JSON.stringify(all));
      }
      setComments(prev => [...prev, comment]);
      setNewComment("");
      setCooldownEnd(Date.now() + COMMENT_COOLDOWN_MS);
    } catch (e) {
      console.error("Failed to post comment:", e);
      toast.error("Failed to post comment");
    }
    setSubmitting(false);
  };

  return (
    <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6 sm:p-8">
      <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
        Discussion ({comments.length})
      </h2>

      {/* Comment input */}
      <form onSubmit={handleSubmit} className="mb-6">
        <div className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder={walletConnected ? "Share your thoughts..." : "Connect wallet to comment"}
            disabled={!walletConnected}
            maxLength={500}
            className="flex-1 px-4 py-2.5 bg-dark-800 border border-gray-700 rounded-xl text-sm focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors placeholder-gray-600 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={submitting || !newComment.trim() || !walletConnected}
            className="px-4 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:bg-gray-700 disabled:text-gray-500 rounded-xl text-sm font-medium transition-colors shrink-0"
          >
            {submitting ? "..." : "Post"}
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
          No comments yet. Be the first to share your thoughts!
        </p>
      ) : (
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {comments.map((c) => (
            <div key={c.id} className="flex gap-3 group">
              {getAvatarUrl(c.wallet) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={getAvatarUrl(c.wallet)} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-700 shrink-0" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary-600/30 to-accent-500/20 flex items-center justify-center text-xs font-bold text-primary-400 shrink-0 border border-gray-700">
                  {getDisplayName(c.wallet).charAt(0).toUpperCase()}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium text-gray-300">{getDisplayName(c.wallet)}</span>
                  <span className="text-xs text-gray-600">{timeAgo(c.created_at)}</span>
                </div>
                <p className="text-sm text-gray-300 break-words">{c.text}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
