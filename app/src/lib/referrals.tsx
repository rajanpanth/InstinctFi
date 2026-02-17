"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

// ─── Types ──────────────────────────────────────────────────────────────────
export type Referral = {
  referrer: string;   // wallet that shared the link
  referee: string;    // wallet that signed up via link
  createdAt: number;  // timestamp in ms
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/**
 * Generate a collision-resistant referral code from a wallet address.
 * Uses a simple hash (DJB2) → base36, producing an 8-char code.
 */
export function walletToCode(wallet: string): string {
  let hash = 5381;
  for (let i = 0; i < wallet.length; i++) {
    hash = ((hash << 5) + hash + wallet.charCodeAt(i)) >>> 0;
  }
  return hash.toString(36).padStart(8, "0").slice(0, 8);
}

/** Get the base URL for referral links */
function getBaseUrl(): string {
  if (typeof window !== "undefined") return window.location.origin;
  return "https://instinctfi.com";
}

export function getReferralLink(wallet: string): string {
  return `${getBaseUrl()}?ref=${walletToCode(wallet)}`;
}

const LS_KEY_PENDING = "instinctfi_pending_referral";
const LS_KEY_MY_REFERRER = "instinctfi_my_referrer";
const LS_KEY_REFERRALS = "instinctfi_referrals";

// ─── ReferralGate ───────────────────────────────────────────────────────────
// A tiny client component that captures ?ref= param on mount. No context needed.
export function ReferralGate({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const refCode = params.get("ref");
    if (refCode) {
      localStorage.setItem(LS_KEY_PENDING, refCode);
      // Clean URL without reload
      const url = new URL(window.location.href);
      url.searchParams.delete("ref");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return <>{children}</>;
}

// ─── Hook: useReferralData ──────────────────────────────────────────────────
// Standalone hook that loads referral info for a given wallet.
export function useReferralData(walletAddress: string | null) {
  const [referredBy, setReferredBy] = useState<string | null>(null);
  const [referrals, setReferrals] = useState<Referral[]>([]);
  const [loading, setLoading] = useState(false);

  // Load referral data + process pending
  useEffect(() => {
    if (!walletAddress) {
      setReferredBy(null);
      setReferrals([]);
      return;
    }

    const load = async () => {
      setLoading(true);

      // ── Load who referred me ──
      let myReferrer: string | null = null;
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from("referrals")
            .select("referrer")
            .eq("referee", walletAddress)
            .single();
          if (data?.referrer) myReferrer = data.referrer;
        } catch {}
      }
      if (!myReferrer) {
        try {
          const saved = localStorage.getItem(LS_KEY_MY_REFERRER);
          if (saved) {
            const parsed = JSON.parse(saved);
            if (parsed.wallet === walletAddress) myReferrer = parsed.referrer;
          }
        } catch {}
      }
      setReferredBy(myReferrer);

      // ── Load my referrals ──
      let refs: Referral[] = [];
      if (isSupabaseConfigured) {
        try {
          const { data } = await supabase
            .from("referrals")
            .select("*")
            .eq("referrer", walletAddress)
            .order("created_at", { ascending: false });
          if (data) {
            refs = data.map((r: any) => ({
              referrer: r.referrer,
              referee: r.referee,
              createdAt: r.created_at,
            }));
          }
        } catch {}
      }
      if (refs.length === 0) {
        try {
          const saved = localStorage.getItem(LS_KEY_REFERRALS);
          if (saved) {
            const all: Referral[] = JSON.parse(saved);
            refs = all.filter((r) => r.referrer === walletAddress);
          }
        } catch {}
      }
      setReferrals(refs);

      // ── Process pending referral ──
      if (!myReferrer) {
        const pending = localStorage.getItem(LS_KEY_PENDING);
        if (pending) {
          const resolved = await resolveAndSaveReferral(pending, walletAddress);
          if (resolved) setReferredBy(resolved);
          localStorage.removeItem(LS_KEY_PENDING);
        }
      }

      setLoading(false);
    };

    load();
  }, [walletAddress]);

  const referralCode = walletAddress ? walletToCode(walletAddress) : null;
  const referralLink = walletAddress ? getReferralLink(walletAddress) : null;

  const copyReferralLink = useCallback(async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
    } catch {}
  }, [referralLink]);

  return {
    referralCode,
    referralLink,
    copyReferralLink,
    referredBy,
    referrals,
    referralCount: referrals.length,
    loading,
  };
}

// ─── Internal: resolve code → wallet and persist ────────────────────────────
async function resolveAndSaveReferral(
  code: string,
  myWallet: string
): Promise<string | null> {
  // Prevent self-referral
  if (walletToCode(myWallet) === code) return null;

  // Find referrer wallet
  let referrerWallet: string | null = null;

  if (isSupabaseConfigured) {
    try {
      const { data } = await supabase.from("users").select("wallet").limit(200);
      if (data) {
        const match = data.find((u: any) => walletToCode(u.wallet) === code);
        if (match) referrerWallet = match.wallet;
      }
    } catch {}
  }

  if (!referrerWallet) {
    try {
      const savedUsers = localStorage.getItem("instinctfi_users");
      if (savedUsers) {
        const users = JSON.parse(savedUsers);
        if (Array.isArray(users)) {
          const match = users.find((u: any) => walletToCode(u.wallet || u) === code);
          if (match) referrerWallet = match.wallet || match;
        }
      }
    } catch {}
  }

  if (!referrerWallet || referrerWallet === myWallet) return null;

  // Save to Supabase
  if (isSupabaseConfigured) {
    try {
      await supabase.from("referrals").upsert(
        { referrer: referrerWallet, referee: myWallet, created_at: Date.now() },
        { onConflict: "referee" }
      );
    } catch (e) {
      console.warn("Failed to save referral:", e);
    }
  }

  // Save to localStorage
  try {
    localStorage.setItem(
      LS_KEY_MY_REFERRER,
      JSON.stringify({ wallet: myWallet, referrer: referrerWallet })
    );
    const saved = localStorage.getItem(LS_KEY_REFERRALS);
    const all: Referral[] = saved ? JSON.parse(saved) : [];
    all.push({ referrer: referrerWallet, referee: myWallet, createdAt: Date.now() });
    localStorage.setItem(LS_KEY_REFERRALS, JSON.stringify(all));
  } catch {}

  return referrerWallet;
}

