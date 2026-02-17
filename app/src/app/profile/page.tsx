"use client";

import { useState, useEffect } from "react";
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
import { useLanguage } from "@/lib/languageContext";

export default function ProfilePage() {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

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
  const { t } = useLanguage();

  // Prevent hydration mismatch — profile content depends on wallet state,
  // timers, and dynamic data that differ between server and client.
  if (!mounted) {
    return (
      <div className="max-w-3xl mx-auto py-20 text-center">
        <div className="w-10 h-10 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto" />
      </div>
    );
  }

  if (!walletConnected) {
    return (
      <div className="text-center py-20">
        <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-surface-100 border border-border flex items-center justify-center">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        </div>
        <p className="text-gray-400 text-lg mb-5 font-medium">{t("connectWalletToView")}</p>
        <button onClick={connectWallet} className="px-7 py-3 bg-brand-500 hover:bg-brand-600 rounded-2xl font-semibold transition-all active:scale-[0.97] shadow-lg shadow-brand-500/15">
          {t("connectPhantom")}
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
      <h1 className="text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 tracking-tight flex items-center gap-2.5">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
        {t("profile")}
      </h1>

      {/* Wallet Card */}
      <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
          <div className="flex items-center gap-3">
            {/* User Avatar */}
            {getAvatarUrl(addr) ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={getAvatarUrl(addr)} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-brand-500/25" />
            ) : (
              <div className="w-14 h-14 rounded-full bg-gradient-to-br from-brand-500 to-brand-500 flex items-center justify-center text-xl font-bold text-white">
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
              className="px-3 py-1.5 text-xs font-medium border border-border text-gray-300 rounded-lg hover:bg-dark-600 transition-colors"
            >
              {t("editProfile")}
            </button>
            <div className="sm:text-right">
              <div className="text-sm text-gray-400">{t("balance")}</div>
              <div className="text-xl font-bold text-brand-400">
                {u ? formatDollars(u.balance) : "0 SOL"}
              </div>
            </div>
          </div>
        </div>

        {/* Profile Editor */}
        {editingProfile && (
          <div className="mb-6 p-4 bg-surface-50 border border-border rounded-xl animate-scaleIn">
            <h3 className="text-sm font-semibold mb-3">{t("editProfile")}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t("displayName")}</label>
                <input
                  type="text"
                  value={profileName}
                  onChange={(e) => setProfileName(e.target.value)}
                  maxLength={24}
                  placeholder={t("enterDisplayName")}
                  className="w-full px-3 py-2 bg-surface-0 border border-border rounded-lg text-sm focus:border-brand-500 outline-none"
                />
                <span className="text-[10px] text-gray-600">{profileName.length}/24</span>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1">{t("profilePicture")}</label>
                <div className="flex items-center gap-3">
                  {profileAvatarPreview ? (
                    <div className="relative group">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={profileAvatarPreview} alt="Preview" className="w-12 h-12 rounded-full object-cover border border-border" />
                      <button
                        type="button"
                        onClick={() => { setProfileAvatarFile(null); setProfileAvatarPreview(null); }}
                        className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <label className="flex items-center gap-2 px-3 py-2 bg-surface-100 border border-border border-dashed rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                      <span className="text-xs text-gray-500">{t("uploadAvatar")}</span>
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
                  className="flex-1 px-3 py-2 text-sm border border-border text-gray-400 rounded-lg hover:bg-surface-100"
                >
                  {t("cancel")}
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
                          toast.error(t("avatarUploadFailed"));
                          setSavingProfile(false);
                          return;
                        }
                      }
                      if (!profileAvatarPreview) avatarUrl = "";
                      const ok = await updateProfile(addr, sanitizeDisplayName(profileName), avatarUrl);
                      if (ok) {
                        toast.success(t("profileUpdated"));
                        setEditingProfile(false);
                      } else {
                        toast.error(t("failedToSaveProfile"));
                      }
                    } finally {
                      setSavingProfile(false);
                    }
                  }}
                  className="flex-1 px-3 py-2 text-sm bg-brand-600 hover:bg-primary-700 text-white rounded-lg font-semibold"
                >
                  {savingProfile ? t("saving") : t("save")}
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
              <div className="text-sm font-medium text-purple-300">{t("welcomeBonusClaimed")}</div>
              <div className="text-xs text-gray-500">{t("onChainActive")}</div>
            </div>
          </div>
        )}

        {/* Daily Reward */}
        {u && <DailyClaimCard lastClaimTs={u.lastWeeklyRewardTs} onClaim={claimDailyReward} />}

        {/* Stats grid */}
        {u && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <Stat label={t("pollsCreated")} value={u.pollsCreated.toString()} />
            <Stat label={t("pollsVoted")} value={u.totalPollsVoted.toString()} />
            <Stat label={t("totalVotes")} value={u.totalVotesCast.toString()} />
            <Stat label={t("pollsWon")} value={u.pollsWon.toString()} />
            <Stat label={t("totalSpent")} value={formatDollars(u.totalSpentCents)} />
            <Stat label={t("totalWon")} value={formatDollars(u.totalWinningsCents)} highlight />
            <Stat
              label={t("netProfit")}
              value={`${netProfit >= 0 ? "+" : ""}${formatDollars(netProfit)}`}
              highlight
            />
            <Stat label={t("creatorEarnings")} value={formatDollars(u.creatorEarningsCents)} />
          </div>
        )}
      </div>

      {/* Referral / Invite */}
      <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-brand-400">
            <path d="M16 21v-2a4 4 0 00-4-4H5a4 4 0 00-4-4v2" /><circle cx="8.5" cy="7" r="4" /><line x1="20" y1="8" x2="20" y2="14" /><line x1="23" y1="11" x2="17" y2="11" />
          </svg>
          {t("inviteFriends")}
        </h2>

        {/* Referral link */}
        <div className="mb-4 p-3 bg-surface-50/60 border border-border rounded-xl">
          <div className="text-xs text-gray-400 mb-1.5">{t("yourReferralLink")}</div>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-sm font-mono text-brand-300 truncate bg-surface-0/50 px-3 py-2 rounded-lg">
              {referralLink || t("connectWalletGetLink")}
            </code>
            <button
              onClick={() => {
                copyReferralLink();
                toast.success(t("referralCopied"));
              }}
              disabled={!referralLink}
              className="px-3 py-2 text-xs font-semibold bg-brand-600 hover:bg-brand-500 rounded-lg transition-colors disabled:opacity-40"
            >
              {t("copy")}
            </button>
          </div>
          {referralCode && (
            <div className="text-[10px] text-gray-500 mt-1.5">Code: <span className="font-mono text-gray-400">{referralCode}</span></div>
          )}
        </div>

        {/* Referral stats */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="text-center p-3 bg-surface-50 rounded-xl">
            <div className="text-lg font-bold text-brand-400">{referralCount}</div>
            <div className="text-xs text-gray-500 mt-1">{t("friendsInvited")}</div>
          </div>
          <div className="text-center p-3 bg-surface-50 rounded-xl">
            <div className="text-lg font-bold">{referredBy ? "Yes" : "—"}</div>
            <div className="text-xs text-gray-500 mt-1">{t("referredBy")}</div>
          </div>
        </div>

        {/* Recent referrals */}
        {referrals.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-400 mb-2">{t("recentReferrals")}</h3>
            <div className="space-y-2">
              {referrals.slice(0, 5).map((r, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 bg-surface-50/30 rounded-lg text-sm">
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
        <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h2 className="font-semibold text-lg mb-4 flex items-center gap-2">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="1" className="text-yellow-400">
              <path d="M19 21l-7-5-7 5V5a2 2 0 012-2h10a2 2 0 012 2z" />
            </svg>
            {t("watchlist")}
          </h2>
          <div className="space-y-3">
            {polls
              .filter((p) => bookmarks.has(p.id))
              .map((p) => (
                <Link key={p.id} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                  <div>
                    <div className="font-medium">{p.title}</div>
                    <div className="text-xs text-gray-500">
                      {p.options.length} options · {p.voteCounts.reduce((a: number, b: number) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolCents)}
                    </div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    p.status === 1 ? "bg-green-600/20 text-green-400" : "bg-brand-500/20 text-brand-400"
                  }`}>
                    {p.status === 1 ? t("settled") : t("active")}
                  </span>
                </Link>
              ))}
          </div>
        </div>
      )}

      {/* My Polls */}
      <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
        <h2 className="font-semibold text-lg mb-4">{t("myCreatedPolls")}</h2>
        {myPolls.length === 0 ? (
          <p className="text-gray-500 text-sm">{t("noPollsCreatedYet")}</p>
        ) : (
          <div className="space-y-3">
            {myPolls.map((p) => (
              <Link key={p.id} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
                <div>
                  <div className="font-medium">{p.title}</div>
                  <div className="text-xs text-gray-500">
                    {p.options.length} options · {p.voteCounts.reduce((a, b) => a + b, 0)} votes · Pool: {formatDollars(p.totalPoolCents)}
                  </div>
                </div>
                <span className={`text-xs font-semibold px-2 py-1 rounded ${
                  p.status === 1 ? "bg-green-600/20 text-green-400" : "bg-brand-500/20 text-brand-400"
                }`}>
{p.status === 1 ? t("settled") : t("active")}
                  </span>
                </Link>
            ))}
          </div>
        )}
      </div>

      {/* ── Creator Dashboard ── */}
      {myPolls.length > 0 && (
        <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-4 sm:mb-6">
          <h2 className="font-semibold text-lg mb-4">{t("creatorDashboard")}</h2>

          {/* Creator summary stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
            <div className="text-center p-3 bg-surface-50 rounded-xl">
              <div className="text-lg font-bold text-brand-400">{myPolls.length}</div>
              <div className="text-xs text-gray-500 mt-1">{t("pollsCreated")}</div>
            </div>
            <div className="text-center p-3 bg-surface-50 rounded-xl">
              <div className="text-lg font-bold">{myPolls.filter(p => p.status === 0).length}</div>
              <div className="text-xs text-gray-500 mt-1">{t("active")}</div>
            </div>
            <div className="text-center p-3 bg-surface-50 rounded-xl">
              <div className="text-lg font-bold text-green-400">
                {formatDollars(myPolls.reduce((s, p) => s + p.creatorRewardCents, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">{t("creatorRevenue")}</div>
            </div>
            <div className="text-center p-3 bg-surface-50 rounded-xl">
              <div className="text-lg font-bold">
                {formatDollars(myPolls.reduce((s, p) => s + p.totalPoolCents, 0))}
              </div>
              <div className="text-xs text-gray-500 mt-1">{t("totalVolume")}</div>
            </div>
          </div>

          {/* Per-poll breakdown */}
          <h3 className="text-sm font-medium text-gray-400 mb-2">{t("perPollBreakdown")}</h3>
          <div className="space-y-2">
            {myPolls.map(p => {
              const totalVotes = p.voteCounts.reduce((a, b) => a + b, 0);
              return (
                <div key={p.id} className="flex items-center justify-between p-3 bg-surface-50/30 rounded-xl text-sm">
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
      <div className="bg-surface-100 border border-border rounded-2xl p-4 sm:p-8 mb-20 sm:mb-6">
        <h2 className="font-semibold text-lg mb-4">{t("myVoteHistory")}</h2>
        {myVotes.length === 0 ? (
          <p className="text-gray-500 text-sm">{t("noVotesCastYet")}</p>
        ) : (
          <div className="space-y-3">
            {myVotes.map((v, i) => {
              const p = polls.find((pl) => pl.id === v.pollId);
              if (!p) return null;
              return (
                <Link key={i} href={`/polls/${p.id}`} className="flex justify-between items-center p-3 bg-surface-50 rounded-xl hover:bg-surface-100 transition-colors">
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
    <div className="text-center p-3 sm:p-4 bg-surface-50 border border-border rounded-xl">
      <div className={`text-lg font-bold font-mono ${highlight ? "text-green-400" : ""}`}>
        {value}
      </div>
      <div className="text-xs text-gray-500 mt-1.5">{label}</div>
    </div>
  );
}

/* ── Daily Claim Card ── */
function DailyClaimCard({ lastClaimTs, onClaim }: { lastClaimTs: number; onClaim: () => Promise<boolean> }) {
  const { timeLeft, canClaim, progress } = useDailyCountdown(lastClaimTs);
  const [claimed, setClaimed] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const { t } = useLanguage();

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
        : "bg-surface-50 border-border"
    }`}>
      <div className="p-3 sm:p-4">
        <div className="flex items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2.5">
            <div className={`w-9 h-9 rounded-full flex items-center justify-center text-lg shrink-0 ${
              canClaim ? "bg-green-600/20 animate-pulse" : "bg-surface-100"
            }`}>
              💰
            </div>
            <div>
              <div className="text-sm font-semibold">{t("dailyReward")}</div>
              <div className="text-xs text-gray-500">{t("claimEvery24h")}</div>
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
            {claimed ? `✓ ${t("claimed")}` : canClaim ? t("claimOneSol") : timeLeft}
          </button>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-surface-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-1000 ${
              canClaim ? "bg-green-500" : "bg-brand-600/60"
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
        <div className="flex justify-between mt-1.5">
          <span className="text-[10px] text-gray-600">{t("lastClaimed")}</span>
          <span className="text-[10px] text-gray-600">
            {canClaim ? t("readyNow") : `${timeLeft} ${t("remaining")}`}
          </span>
        </div>
      </div>
    </div>
  );
}
