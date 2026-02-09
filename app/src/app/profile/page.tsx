"use client";

import { useState } from "react";
import Link from "next/link";
import { useApp, formatDollars } from "@/components/Providers";
import { useDailyCountdown } from "@/lib/useCountdown";
import { shortAddr } from "@/lib/utils";
import { useUserProfiles } from "@/lib/userProfiles";
import { useBookmarks } from "@/lib/bookmarks";
import { useReferralData } from "@/lib/referrals";
import { uploadPollImage } from "@/lib/uploadImage";
import { sanitizeDisplayName } from "@/lib/sanitize";
import toast from "react-hot-toast";

export default function ProfilePage() {
  const {
    walletConnected,
    walletAddress,
    userAccount,
    polls,
    votes,
    connectWallet,
    claimDailyReward,
  } = useApp();

  const { getProfile, getDisplayName, getAvatarUrl, updateProfile } = useUserProfiles();
  const { bookmarks } = useBookmarks();
  const { referralCode, referralLink, copyReferralLink, referredBy, referrals, referralCount } = useReferralData(walletAddress);
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState("");
  const [profileAvatarFile, setProfileAvatarFile] = useState<File | null>(null);
  const [profileAvatarPreview, setProfileAvatarPreview] = useState<string | null>(null);
  const [savingProfile, setSavingProfile] = useState(false);

  if (!walletConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Connect your Phantom wallet to view your profile</p>
        <button onClick={connectWallet} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors">
          Connect Phantom
        </button>
      </div>
    );
  }

  const addr = walletAddress || "";
  const myPolls = polls.filter((p) => p.creator === addr);
  const myVotes = votes.filter((v) => v.voter === addr);
  const u = userAccount;

  const netProfit = u ? u.totalWinningsCents - u.totalSpentCents : 0;

  return (
    <div className="max-w-3xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8">Profile</h1>

      {/* Wallet Card */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            {getAvatarUrl(addr) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getAvatarUrl(addr)} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-primary-500/30" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center text-xl font-bold text-white">
                {getDisplayName(addr).charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <div className="font-semibold text-lg">{getDisplayName(addr)}</div>
              <div className="font-mono text-xs text-gray-500">{shortAddr(addr)}</div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setEditingProfile(true);
                setProfileName(getProfile(addr)?.displayName || "");
                setProfileAvatarPreview(getAvatarUrl(addr) || null);
              }}
              className="px-3 py-1.5 text-xs font-medium border border-gray-700 text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
            >
              Edit Profile
            </button>
            <div className="sm:text-right">
              <div className="text-sm text-gray-400">Balance</div>
              <div className="text-xl font-bold text-accent-400">
                {u ? formatDollars(u.balance) : "0 SOL"}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Editor */}
        {editingProfile && (
          <div className="mb-6 p-4 bg-dark-800/80 border border-gray-700 rounded-xl animate-scaleIn">
            <h3 className="text-sm font-semibold mb-3">Edit Profile</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Display Name</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={24}
                  placeholder="Enter a display name..."
                  className="w-full px-3 py-2 bg-dark-900 border border-gray-700 rounded-lg text-sm focus:border-primary-500 outline-none"
                />
                <span className="text-[10px] text-gray-600">{profileName.length}/24</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">Profile Picture</label>
                <div className="flex items-center gap-3">
                  {profileAvatarPreview ? (
                    <div className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={profileAvatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-gray-700" />
                      <button
                        type="button"
                        onClick={() => { setProfileAvatarFile(null); setProfileAvatarPreview(null); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 border border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                      <span className="text-xs text-gray-500">Upload avatar</span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setProfileAvatarFile(file);
                            setProfileAvatarPreview(URL.createObjectURL(file));
                          }
                          e.target.value = "";
                        }}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => setEditingProfile(false)}
                  className="flex-1 px-3 py-2 text-sm border border-gray-700 text-gray-400 rounded-lg hover:bg-dark-700"
                >
                  Cancel
                </button>
                <button
                  disabled={savingProfile}
                  onClick={async () => {
                    setSavingProfile(true);
                    try {
                      let avatarUrl = getAvatarUrl(addr);
                      if (profileAvatarFile) {
                        try {
                          avatarUrl = await uploadPollImage(profileAvatarFile);
                        } catch {
                          toast.error("Avatar upload failed");
                          setSavingProfile(false);
                          return;
                        }
                      }
                      if (!profileAvatarPreview) avatarUrl = "";
                      const ok = await updateProfile(addr, sanitizeDisplayName(profileName), avatarUrl);
                      if (ok) {
                        toast.success("Profile updated!");
                        setEditingProfile(false);
                      } else {
                        toast.error("Failed to save profile");
                      }
                    } finally {
                      setSavingProfile(false);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-primary-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
                >
                  {savingProfile ? "Saving..." : "Save"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Signup Bonus Badge */}
        {u?.signupBonusClaimed && (
          <div className="mb-4 p-3 bg-purple-600/10 border border-purple-500/20 rounded-xl flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600/20 flex items-center justify-center text-lg shrink-0">🎁</div>
            <div>
              <div className="text-sm font-medium text-purple-300">Welcome Bonus Claimed</div>
              <div className="text-xs text-gray-500">On-chain account active</div>
            </div>
          </div>
        )}

        {/* Daily Reward */}
        {u && <DailyClaimCard lastClaimTs={u.lastWeeklyRewardTs} onClaim={claimDailyReward} />}

        {/* Stats grid */}
        {u && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label="Polls Created" value={u.pollsCreated.toString()} />
            <Stat label="Polls Voted" value={u.totalPollsVoted.toString()} />
            <Stat label="Total Votes" value={u.totalVotesCast.toString()} />
            <Stat label="Polls Won" value={u.pollsWon.toString()} />
            <Stat label="Total Spent" value={formatDollars(u.totalSpentCents)} />
            <Stat label="Total Won" value={formatDollars(u.totalWinningsCents)} highlight />
            <Stat
              label="Net Profit"
              value={`${netProfit >= 0 ? "+" : ""}${formatDollars(netProfit)}`}
              highlight
            />
            <Stat label="Creator Earnings" value={formatDollars(u.creatorEarningsCents)} />
          </div>
        )}
      </div>

      {/* Referral / Invite */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-primary-400">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          Invite Friends
        </h2>

        {/* Referral link */}
        <div className="mb-4 p-3 bg-dark-800/60 border border-gray-700 rounded-xl">
          <div className="text-xs text-gray-400 mb-1.5">Your Referral Link</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-primary-300 truncate bg-dark-900/50 px-3 py-2 rounded-lg">
              {referralLink || "Connect wallet to get link"}
            </code>
            <button
              onClick={() => {
                copyReferralLink();
                toast.success("Referral link copied!");
              }}
              disabled={!referralLink}
              className="px-3 py-2 text-xs font-semibold bg-primary-600 hover:bg-primary-500 rounded-lg transition-colors disabled:opacity-40"
            >
              Copy
            </button>
          </div>
          {referralCode && (
            <div className="text-[10px] text-gray-500 mt-1.5">Code: <span className="font-mono text-gray-400">{referralCode}</span></div>
          )}
        </div>

        {/* Referral stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-dark-800/50 rounded-xl">
            <div className="text-lg font-bold text-primary-400">{referralCount}</div>
            <div className="text-xs text-gray-500 mt-1">Friends Invited</div>
          </div>
          <div className="text-center p-3 bg-dark-800/50 rounded-xl">
            <div className="text-lg font-bold">{referredBy ? "Yes" : "—"}</div>
            <div className="text-xs text-gray-500 mt-1">Referred By</div>
          </div>
        </div>

        {/* Recent referrals */}
        {referrals.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">Recent Referrals</h3>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-dark-800/30 rounded-lg text-sm">
                  <span className="font-mono text-xs text-gray-300">{shortAddr(r.referee)}</span>
                  <span className="text-[10px] text-gray-500">
                    {new Date(r.createdAt).toLocaleDateString()}
                  </span>
                </div>
              ))}
              {referrals.length > 5 && (
                <div className="text-xs text-gray-500 text-center">+{referrals.length - 5} more</div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Bookmarked / Watchlist */}
      {bookmarks.size > 0 && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-yellow-400">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            Watchlist
          </h2>
          <div className="space-y-3">
            {polls
              .filter((p) => bookmarks.has(p.id))
              .map((p) => (
                <Link key={p.id} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-dark-800/50 rounded-xl hover:bg-dark-700/50 transition-colors">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      {p.options.length} options · {p.voteCounts.reduce((a: number, b: number) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolCents)}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    p.status === 1 ? "bg-green-600/20 text-green-400" : "bg-accent-500/20 text-accent-400"
                  }`}>
                    {p.status === 1 ? "Settled" : "Active"}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* My Polls */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <h2 className="font-semibold text-lg mb-4">My Created Polls</h2>
        {myPolls.length === 0 ? (
          <p className="text-gray-500 text-sm">No polls created yet.</p>
        ) : (
          <div className="space-y-3">
            {myPolls.map((p) => (
              <Link key={p.id} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-dark-800/50 rounded-xl hover:bg-dark-700/50 transition-colors">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    {p.options.length} options · {p.voteCounts.reduce((a, b) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolCents)}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  p.status === 1 ? "bg-green-600/20 text-green-400" : "bg-accent-500/20 text-accent-400"
                }`}>
                  {p.status === 1 ? "Settled" : "Active"}
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Creator Dashboard ── */}
      {myPolls.length > 0 && (
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h2 className="font-semibold text-lg mb-4">Creator Dashboard</h2>

          {/* Creator summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="text-center p-3 bg-dark-800/50 rounded-xl">
              <div className="text-lg font-bold text-primary-400">{myPolls.length}</div>
              <div className="text-xs text-gray-500 mt-1">Polls Created</div>
            </div>
            <div className="text-center p-3 bg-dark-800/50 rounded-xl">
              <div className="text-lg font-bold">{myPolls.filter(p => p.status === 0).length}</div>
              <div className="text-xs text-gray-500 mt-1">Active</div>
            </div>
            <div className="text-center p-3 bg-dark-800/50 rounded-xl">
              <div className="text-lg font-bold text-green-400">
                {formatDollars(myPolls.reduce((s, p) => s + p.creatorRewardCents, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Creator Revenue</div>
            </div>
            <div className="text-center p-3 bg-dark-800/50 rounded-xl">
              <div className="text-lg font-bold">
                {formatDollars(myPolls.reduce((s, p) => s + p.totalPoolCents, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">Total Volume</div>
            </div>
          </div>

          {/* Per-poll breakdown */}
          <h3 className="text-sm font-medium text-gray-400 mb-2">Per-Poll Breakdown</h3>
          <div className="space-y-2">
            {myPolls.map(p => {
              const totalVotes = p.voteCounts.reduce((a, b) => a + b, 0);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-dark-800/30 rounded-xl text-sm">
                  <div className="flex-1 min-w-0">
                    <Link href={`/polls/${p.id}`} className="font-medium hover:underline truncate block">{p.title}</Link>
                    <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
                      <span>{totalVotes} votes</span>
                      <span>{p.totalVoters} voters</span>
                      <span>Pool: {formatDollars(p.totalPoolCents)}</span>
                    </div>
                  </div>
                  <div className="text-right shrink-0 ml-3">
                    <div className="text-green-400 font-mono text-xs">{formatDollars(p.creatorRewardCents)}</div>
                    <div className="text-[10px] text-gray-500">reward</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* My Vote History */}
      <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-4 sm:p-8">
        <h2 className="font-semibold text-lg mb-4">My Vote History</h2>
        {myVotes.length === 0 ? (
          <p className="text-gray-500 text-sm">No votes cast yet.</p>
        ) : (
          <div className="space-y-3">
            {myVotes.map((v, i) => {
              const p = polls.find((pl) => pl.id === v.pollId);
              if (!p) return null;
              return (
                <Link key={i} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-dark-800/50 rounded-xl hover:bg-dark-700/50 transition-colors">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      {v.votesPerOption
                        .map((count, idx) => count > 0 ? `${p.options[idx]}: ${count}` : null)
                        .filter(Boolean)
                        .join(", ")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono">{formatDollars(v.totalStakedCents)}</div>
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

function Stat({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="text-center p-3 bg-dark-800/50 rounded-xl">
      <div className={`text-lg font-bold font-mono ${highlight ? "text-green-400" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

/* ── Daily Claim Card ── */
function DailyClaimCard({ lastClaimTs, onClaim }: { lastClaimTs: number; onClaim: () => Promise<boolean> }) {
  const { timeLeft, canClaim, progress } = useDailyCountdown(lastClaimTs);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);

  const handleClaim = async () => {
    if (claiming) return;
    setClaiming(true);
    try {
      const ok = await onClaim();
      if (ok) setClaimed(true);
      setTimeout(() => setClaimed(false), 2000);
    } finally {
      setClaiming(false);
    }
  };

  return (
    <div className={`mb-6 rounded-xl border overflow-hidden transition-all ${
      canClaim
        ? "bg-gradient-to-r from-green-600/10 to-emerald-600/10 border-green-500/30"
        : "bg-dark-800/50 border-gray-700/50"
    }`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
              canClaim ? "bg-green-600/20 animate-pulse" : "bg-dark-700"
            }`}>
              💰
            </div>
            <div>
              <div className="text-sm font-semibold">Daily Reward</div>
              <div className="text-xs text-gray-500">Claim 1 SOL every 24 hours</div>
            </div>
          </div>
          <button
            onClick={handleClaim}
            disabled={!canClaim}
            className={`px-4 py-2 rounded-xl text-sm font-bold transition-all ${
              claimed
                ? "bg-green-600 text-white scale-95"
                : canClaim
                ? "bg-green-600 hover:bg-green-500 text-white shadow-lg shadow-green-600/20 hover:scale-105"
                : "bg-gray-700/50 text-gray-500 cursor-not-allowed"
            }`}
          >
            {claimed ? "✓ Claimed!" : canClaim ? "Claim 1 SOL" : timeLeft}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-dark-700 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              canClaim ? "bg-green-500" : "bg-primary-600/60"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-600">Last claimed</span>
          <span className="text-[10px] text-gray-600">
            {canClaim ? "Ready now!" : `${timeLeft} remaining`}
          </span>
        </div>
      </div>
    </div>
  );
}
