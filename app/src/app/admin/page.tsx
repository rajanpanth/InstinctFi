"use client";

import { useState, useMemo, useEffect } from "react";
import { useApp, formatDollars, type DemoPoll, PollStatus } from "@/components/Providers";
import { isAdminWallet } from "@/lib/constants";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import toast from "react-hot-toast";
import AdminEditModal from "./AdminEditModal";

type TabFilter = "ended" | "active" | "settled" | "all";

/** Resolution proofs stored per poll id */
type ResolutionProofs = Record<string, string>;

function loadProofs(): ResolutionProofs {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem("instinctfi_resolution_proofs") || "{}"); } catch { return {}; }
}

function saveProofsLocal(proofs: ResolutionProofs) {
  try { localStorage.setItem("instinctfi_resolution_proofs", JSON.stringify(proofs)); } catch { }
}

export default function AdminPage() {
  const { walletConnected, walletAddress, polls, votes, settlePoll, deletePoll, editPoll } = useApp();
  const isAdmin = isAdminWallet(walletAddress);
  const [tab, setTab] = useState<TabFilter>("ended");
  const [settlingId, setSettlingId] = useState<string | null>(null);
  const [selectedWinners, setSelectedWinners] = useState<Record<string, number>>({});
  const [resolutionSources, setResolutionSources] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [editingPoll, setEditingPoll] = useState<DemoPoll | null>(null);
  const [proofs, setProofs] = useState<ResolutionProofs>(loadProofs);
  const [confirmModal, setConfirmModal] = useState<{ title: string; message: string; onConfirm: () => void } | null>(null);

  // Load proofs from Supabase on mount
  useEffect(() => {
    if (!isSupabaseConfigured) return;
    (async () => {
      const { data } = await supabase.from("resolution_proofs").select("poll_id, source_url");
      if (data) {
        const map: ResolutionProofs = {};
        data.forEach((r: any) => { map[r.poll_id] = r.source_url; });
        setProofs((prev) => ({ ...prev, ...map }));
      }
    })();
  }, []);

  // Keep `now` fresh every 30s so filters don't go stale
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 30_000);
    return () => clearInterval(interval);
  }, []);

  const filteredPolls = useMemo(() => {
    let list = [...polls];

    // Filter by tab
    switch (tab) {
      case "ended":
        list = list.filter(p => p.status === PollStatus.Active && now >= p.endTime);
        break;
      case "active":
        list = list.filter(p => p.status === PollStatus.Active && now < p.endTime);
        break;
      case "settled":
        list = list.filter(p => p.status === PollStatus.Settled);
        break;
      case "all":
        break;
    }

    // Filter by search
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(p =>
        p.title.toLowerCase().includes(q) ||
        p.category.toLowerCase().includes(q) ||
        p.creator.toLowerCase().includes(q)
      );
    }

    // Sort: ended unsettled first, then by created date desc
    list.sort((a, b) => {
      const aEnded = a.status === PollStatus.Active && now >= a.endTime;
      const bEnded = b.status === PollStatus.Active && now >= b.endTime;
      if (aEnded && !bEnded) return -1;
      if (!aEnded && bEnded) return 1;
      return b.createdAt - a.createdAt;
    });

    return list;
  }, [polls, tab, search, now]);

  const handleSettle = async (pollId: string) => {
    const winner = selectedWinners[pollId];
    if (winner === undefined) {
      toast.error("Select a winning option first");
      return;
    }
    setSettlingId(pollId);
    try {
      const ok = await settlePoll(pollId, winner);
      if (ok) {
        // Save resolution proof if provided
        const sourceUrl = resolutionSources[pollId]?.trim();
        // Validate URL format
        if (sourceUrl && !/^https?:\/\//i.test(sourceUrl)) {
          toast.error("Resolution source must be a valid http/https URL");
          setSettlingId(null);
          return;
        }
        if (sourceUrl) {
          const newProofs = { ...proofs, [pollId]: sourceUrl };
          setProofs(newProofs);
          saveProofsLocal(newProofs);
          if (isSupabaseConfigured) {
            await supabase.from("resolution_proofs").upsert({ poll_id: pollId, source_url: sourceUrl });
          }
        }
        toast.success("Poll settled with your chosen winner!");
      }
    } finally {
      setSettlingId(null);
    }
  };

  const handleAutoSettle = async (pollId: string) => {
    setSettlingId(pollId);
    try {
      const ok = await settlePoll(pollId);
      if (ok) {
        toast.success("Poll auto-settled by highest votes!");
      }
    } finally {
      setSettlingId(null);
    }
  };

  const getVotersForPoll = (pollId: string) => {
    return votes.filter(v => v.pollId === pollId);
  };

  const totalPool = polls.reduce((s, p) => s + p.totalPoolCents, 0);
  const totalVoters = polls.reduce((s, p) => s + p.totalVoters, 0);
  const endedUnsettled = polls.filter(p => p.status === PollStatus.Active && now >= p.endTime).length;
  const activeCount = polls.filter(p => p.status === PollStatus.Active && now < p.endTime).length;
  const settledCount = polls.filter(p => p.status === PollStatus.Settled).length;

  if (!walletConnected) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">🔒</div>
        <h1 className="text-2xl font-bold text-white">Admin Panel</h1>
        <p className="text-gray-400">Connect your wallet to access admin controls</p>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <div className="text-6xl">⛔</div>
        <h1 className="text-2xl font-bold text-white">Access Denied</h1>
        <p className="text-gray-400">Your wallet is not authorized to access the admin panel</p>
        <p className="text-xs text-gray-600 font-mono">{walletAddress}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            ⚙ Admin Panel
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Manage polls, settle winners, and control the platform
          </p>
        </div>
        {endedUnsettled > 0 && (
          <div className="px-3 py-1.5 bg-red-500/10 border border-red-500/30 rounded-lg">
            <span className="text-red-400 text-sm font-semibold">
              ⚠ {endedUnsettled} poll{endedUnsettled !== 1 ? "s" : ""} need settlement
            </span>
          </div>
        )}
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: "Total Polls", value: polls.length, color: "text-white" },
          { label: "Active", value: activeCount, color: "text-green-400" },
          { label: "Needs Settlement", value: endedUnsettled, color: "text-red-400" },
          { label: "Settled", value: settledCount, color: "text-blue-400" },
          { label: "Total Pool", value: formatDollars(totalPool), color: "text-brand-400" },
        ].map(stat => (
          <div key={stat.label} className="bg-surface-50 border border-border rounded-xl p-3 text-center">
            <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
            <div className="text-xs text-gray-500">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Tabs + Search */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
        <div className="flex bg-surface-50 border border-border rounded-lg p-0.5">
          {(["ended", "active", "settled", "all"] as TabFilter[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors capitalize ${tab === t
                ? t === "ended" ? "bg-red-600/20 text-red-400" : "bg-brand-600/20 text-brand-400"
                : "text-gray-400 hover:text-white"
                }`}
            >
              {t === "ended" ? `Ended (${endedUnsettled})` : t}
            </button>
          ))}
        </div>
        <input
          type="text"
          placeholder="Search polls..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full sm:w-64 px-3 py-2 bg-surface-50 border border-border rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-brand-500/50"
        />
      </div>

      {/* Polls list */}
      <div className="space-y-3">
        {filteredPolls.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <div className="text-4xl mb-2">📭</div>
            No polls in this category
          </div>
        )}

        {filteredPolls.map(poll => {
          const isEnded = now >= poll.endTime;
          const isSettled = poll.status === PollStatus.Settled;
          const needsSettlement = poll.status === PollStatus.Active && isEnded;
          const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
          const pollVoters = getVotersForPoll(poll.id);
          const highestIdx = poll.voteCounts.indexOf(Math.max(...poll.voteCounts));

          return (
            <div
              key={poll.id}
              className={`bg-surface-50 border rounded-xl p-4 transition-colors ${needsSettlement
                ? "border-red-500/40 bg-red-500/5"
                : isSettled
                  ? "border-green-500/30"
                  : "border-border"
                }`}
            >
              {/* Poll header */}
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-white truncate">{poll.title}</h3>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${needsSettlement
                      ? "bg-red-500/20 text-red-400"
                      : isSettled
                        ? "bg-green-500/20 text-green-400"
                        : "bg-blue-500/20 text-blue-400"
                      }`}>
                      {needsSettlement ? "⏰ NEEDS SETTLEMENT" : isSettled ? "✓ SETTLED" : "● ACTIVE"}
                    </span>
                    {poll.category && (
                      <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-700/50 text-gray-400">
                        {poll.category}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                    <span>by {poll.creator.slice(0, 4)}...{poll.creator.slice(-4)}</span>
                    <span>•</span>
                    <span>{totalVotes} votes</span>
                    <span>•</span>
                    <span>{poll.totalVoters} voters</span>
                    <span>•</span>
                    <span>Pool: {formatDollars(poll.totalPoolCents)}</span>
                    <span>•</span>
                    <span>
                      {isEnded
                        ? `Ended ${new Date(poll.endTime * 1000).toLocaleDateString()}`
                        : `Ends ${new Date(poll.endTime * 1000).toLocaleDateString()}`
                      }
                    </span>
                  </div>
                </div>
              </div>

              {/* Options with vote bars */}
              <div className="space-y-2 mb-3">
                {poll.options.map((opt, i) => {
                  const count = poll.voteCounts[i] || 0;
                  const pct = totalVotes > 0 ? (count / totalVotes) * 100 : 0;
                  const isWinner = isSettled && poll.winningOption === i;
                  const isSelected = selectedWinners[poll.id] === i;
                  const isHighest = i === highestIdx && totalVotes > 0;

                  return (
                    <div key={i} className="relative">
                      <button
                        disabled={isSettled || !needsSettlement}
                        onClick={() => setSelectedWinners(prev => ({ ...prev, [poll.id]: i }))}
                        className={`w-full text-left relative overflow-hidden rounded-lg px-3 py-2 border transition-all ${isWinner
                          ? "border-green-500/60 bg-green-500/10"
                          : isSelected
                            ? "border-brand-500/60 bg-brand-500/10 ring-1 ring-brand-500/30"
                            : needsSettlement
                              ? "border-gray-600/50 hover:border-gray-500/70 cursor-pointer"
                              : "border-border/30"
                          }`}
                      >
                        {/* Progress bar background */}
                        <div
                          className={`absolute inset-0 opacity-15 ${isWinner ? "bg-green-500" : isSelected ? "bg-brand-500" : "bg-gray-500"
                            }`}
                          style={{ width: `${pct}%` }}
                        />

                        <div className="relative flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            {needsSettlement && (
                              <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${isSelected ? "border-brand-500 bg-brand-500" : "border-gray-500"
                                }`}>
                                {isSelected && (
                                  <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3">
                                    <polyline points="20 6 9 17 4 12" />
                                  </svg>
                                )}
                              </div>
                            )}
                            {isWinner && <span className="text-green-400">🏆</span>}
                            <span className={`text-sm ${isWinner ? "text-green-300 font-semibold" : "text-gray-300"}`}>
                              {opt}
                            </span>
                            {isHighest && !isSettled && (
                              <span className="text-[10px] px-1 py-0.5 bg-yellow-500/20 text-yellow-400 rounded">
                                Leading
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-gray-400">{count} votes</span>
                            <span className={`text-xs font-mono ${isWinner ? "text-green-400" : "text-gray-500"}`}>
                              {pct.toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Action buttons */}
              {needsSettlement && (
                <div className="space-y-2 pt-2 border-t border-border/30">
                  {/* Resolution source URL */}
                  <div className="flex items-center gap-2">
                    <label className="text-xs text-gray-500 shrink-0">🔗 Source:</label>
                    <input
                      type="url"
                      placeholder="Resolution proof URL (optional)"
                      value={resolutionSources[poll.id] || ""}
                      onChange={(e) => setResolutionSources((prev) => ({ ...prev, [poll.id]: e.target.value }))}
                      className="flex-1 bg-surface-50 border border-border rounded-lg px-3 py-1.5 text-xs text-gray-300 placeholder:text-gray-600 focus:outline-none focus:border-brand-500/50"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleSettle(poll.id)}
                      disabled={settlingId === poll.id || selectedWinners[poll.id] === undefined}
                      className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${selectedWinners[poll.id] !== undefined
                        ? "bg-brand-500 hover:bg-brand-600 text-white"
                        : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
                        }`}
                    >
                      {settlingId === poll.id ? (
                        <span className="flex items-center gap-2">
                          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                          </svg>
                          Settling...
                        </span>
                      ) : selectedWinners[poll.id] !== undefined ? (
                        `✓ Settle → "${poll.options[selectedWinners[poll.id]]}"`
                      ) : (
                        "Select a winner above"
                      )}
                    </button>
                    <button
                      onClick={() => handleAutoSettle(poll.id)}
                      disabled={settlingId === poll.id || totalVotes === 0}
                      className="px-3 py-2 bg-surface-100 hover:bg-dark-600 border border-gray-600/50 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-40"
                      title="Auto-settle by highest votes"
                    >
                      ⚡ Auto (highest votes)
                    </button>
                    <button
                      onClick={() => setEditingPoll(poll)}
                      className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: "Delete Poll",
                          message: "Delete this poll? This cannot be undone.",
                          onConfirm: () => { deletePoll(poll.id); setConfirmModal(null); },
                        });
                      }}
                      disabled={settlingId === poll.id}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors ml-auto"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Show resolution proof for settled polls */}
              {isSettled && proofs[poll.id] && (
                <div className="mt-2 flex items-center gap-2 text-xs text-gray-500">
                  <span>🔗 Resolution:</span>
                  <a
                    href={proofs[poll.id]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand-400 hover:text-brand-300 underline underline-offset-2 truncate max-w-xs"
                  >
                    {proofs[poll.id]}
                  </a>
                </div>
              )}

              {/* Admin actions for active polls */}
              {!isSettled && !needsSettlement && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <button
                    onClick={() => setEditingPoll(poll)}
                    className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => {
                      setConfirmModal({
                        title: "Delete Active Poll",
                        message: "Delete this active poll? This cannot be undone.",
                        onConfirm: () => { deletePoll(poll.id); setConfirmModal(null); },
                      });
                    }}
                    className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
                  >
                    🗑 Delete
                  </button>
                </div>
              )}

              {/* Admin actions for settled polls */}
              {isSettled && (
                <div className="flex items-center gap-2 pt-2 border-t border-border/30">
                  <span className="text-xs text-gray-500">Winner:</span>
                  <span className="text-sm text-green-400 font-semibold">
                    🏆 {poll.winningOption < poll.options.length ? poll.options[poll.winningOption] : "None"}
                  </span>
                  <span className="text-xs text-gray-500">
                    {poll.winningOption < poll.options.length ? `${poll.voteCounts[poll.winningOption]} winning votes` : ""} • Pool: {formatDollars(poll.totalPoolCents)}
                  </span>
                  <div className="flex items-center gap-2 ml-auto">
                    <button
                      onClick={() => setEditingPoll(poll)}
                      className="px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg text-sm text-blue-400 transition-colors"
                    >
                      ✏️ Edit
                    </button>
                    <button
                      onClick={() => {
                        setConfirmModal({
                          title: "Delete Settled Poll",
                          message: "Delete this settled poll? This cannot be undone.",
                          onConfirm: () => { deletePoll(poll.id); setConfirmModal(null); },
                        });
                      }}
                      className="px-3 py-2 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 rounded-lg text-sm text-red-400 transition-colors"
                    >
                      🗑 Delete
                    </button>
                  </div>
                </div>
              )}

              {/* Voters breakdown (collapsible) */}
              {pollVoters.length > 0 && (
                <details className="mt-2">
                  <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
                    View {pollVoters.length} voter{pollVoters.length !== 1 ? "s" : ""} details
                  </summary>
                  <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
                    {pollVoters.map((v, vi) => (
                      <div key={vi} className="flex items-center justify-between text-xs bg-surface-0/50 rounded-lg px-3 py-1.5">
                        <span className="text-gray-400 font-mono">
                          {v.voter.slice(0, 4)}...{v.voter.slice(-4)}
                        </span>
                        <div className="flex items-center gap-3">
                          {v.votesPerOption.map((count, oi) => (
                            count > 0 && (
                              <span key={oi} className={`${isSettled && poll.winningOption === oi ? "text-green-400" : "text-gray-500"
                                }`}>
                                {poll.options[oi]}: {count}
                              </span>
                            )
                          ))}
                          <span className="text-brand-400">{formatDollars(v.totalStakedCents)}</span>
                          {v.claimed && <span className="text-green-500">✓ claimed</span>}
                        </div>
                      </div>
                    ))}
                  </div>
                </details>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Modal */}
      {editingPoll && (
        <AdminEditModal
          poll={editingPoll}
          onClose={() => setEditingPoll(null)}
          onSave={async (updates) => {
            const ok = await editPoll(editingPoll.id, updates);
            if (ok) {
              setEditingPoll(null);
            }
            return ok;
          }}
        />
      )}

      {/* Confirm Modal */}
      {confirmModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmModal(null)}>
          <div className="bg-surface-100 border border-border rounded-2xl p-6 mx-4 max-w-sm w-full shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-neutral-100 mb-2">{confirmModal.title}</h3>
            <p className="text-sm text-neutral-400 mb-5">{confirmModal.message}</p>
            <div className="flex gap-3">
              <button
                onClick={() => setConfirmModal(null)}
                className="flex-1 py-2.5 border border-border rounded-lg text-sm font-medium text-neutral-400 hover:bg-surface-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmModal.onConfirm}
                className="flex-1 py-2.5 bg-red-500 hover:bg-red-600 rounded-lg text-sm font-semibold text-white transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
