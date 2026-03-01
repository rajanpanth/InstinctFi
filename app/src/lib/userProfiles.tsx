"use client";

import { useState, useEffect, useCallback, useRef, createContext, useContext, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { shortAddr } from "@/lib/utils";

export type UserProfile = {
  wallet: string;
  displayName: string;
  avatarUrl: string;
  createdAt: number;
};

type UserProfileContextType = {
  profiles: Record<string, UserProfile>;
  getProfile: (wallet: string) => UserProfile | null;
  getDisplayName: (wallet: string) => string;
  getAvatarUrl: (wallet: string) => string;
  updateProfile: (wallet: string, displayName: string, avatarUrl: string) => Promise<boolean>;
  loadProfile: (wallet: string) => Promise<void>;
};

const UserProfileContext = createContext<UserProfileContextType | null>(null);

export function useUserProfiles() {
  const ctx = useContext(UserProfileContext);
  if (!ctx) throw new Error("useUserProfiles must be inside <UserProfileProvider>");
  return ctx;
}

/** Short wallet address fallback — uses shared shortAddr from utils */

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});
  // Track which wallets are already being fetched to avoid duplicate requests
  const pendingRef = useRef<Set<string>>(new Set());

  // MED-09 FIX: Load profiles on-demand instead of fetching ALL at mount.
  // Previously did SELECT * from user_profiles with no limit, which degrades at scale.
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Try localStorage fallback
      try {
        const saved = localStorage.getItem("instinctfi_profiles");
        if (saved) setProfiles(JSON.parse(saved));
      } catch { }
      return;
    }
    // No longer loading all profiles at mount.
    // Profiles are loaded on-demand via loadProfile().
  }, []);

  // Persist to localStorage as fallback
  useEffect(() => {
    if (!isSupabaseConfigured) {
      try { localStorage.setItem("instinctfi_profiles", JSON.stringify(profiles)); } catch { }
    }
  }, [profiles]);

  const loadProfile = useCallback(async (wallet: string) => {
    if (!wallet || !isSupabaseConfigured) return;
    // Skip if already loaded or currently fetching
    if (pendingRef.current.has(wallet)) return;

    pendingRef.current.add(wallet);
    try {
      const { data } = await supabase.from("user_profiles").select("*").eq("wallet", wallet).single();
      if (data) {
        setProfiles(prev => ({
          ...prev,
          [wallet]: {
            wallet: data.wallet,
            displayName: data.display_name || "",
            avatarUrl: data.avatar_url || "",
            createdAt: data.created_at || Date.now(),
          },
        }));
      } else {
        // Mark as loaded (empty profile) so we don't keep re-fetching
        setProfiles(prev => ({
          ...prev,
          [wallet]: { wallet, displayName: "", avatarUrl: "", createdAt: 0 },
        }));
      }
    } catch {
      // On error, don't block future retries
      pendingRef.current.delete(wallet);
    }
  }, []);

  /** Batch-load multiple profiles at once (e.g. for all creators on the current page) */
  const loadProfiles = useCallback(async (wallets: string[]) => {
    if (!isSupabaseConfigured) return;
    const toFetch = wallets.filter(w => w && !profiles[w] && !pendingRef.current.has(w));
    if (toFetch.length === 0) return;

    toFetch.forEach(w => pendingRef.current.add(w));
    try {
      const { data } = await supabase.from("user_profiles").select("*").in("wallet", toFetch);
      const fetchedMap = new Map((data || []).map(d => [d.wallet, d]));

      setProfiles(prev => {
        const next = { ...prev };
        for (const w of toFetch) {
          const d = fetchedMap.get(w);
          next[w] = d
            ? { wallet: d.wallet, displayName: d.display_name || "", avatarUrl: d.avatar_url || "", createdAt: d.created_at || 0 }
            : { wallet: w, displayName: "", avatarUrl: "", createdAt: 0 };
        }
        return next;
      });
    } catch {
      toFetch.forEach(w => pendingRef.current.delete(w));
    }
  }, [profiles]);

  const getProfile = useCallback((wallet: string): UserProfile | null => {
    return profiles[wallet] || null;
  }, [profiles]);

  const getDisplayName = useCallback((wallet: string): string => {
    const p = profiles[wallet];
    // Auto-trigger load if not yet fetched
    if (!p && wallet) {
      loadProfile(wallet);
    }
    return p?.displayName || shortAddr(wallet);
  }, [profiles, loadProfile]);

  const getAvatarUrl = useCallback((wallet: string): string => {
    const p = profiles[wallet];
    // Auto-trigger load if not yet fetched
    if (!p && wallet) {
      loadProfile(wallet);
    }
    return p?.avatarUrl || "";
  }, [profiles, loadProfile]);

  const updateProfile = useCallback(async (wallet: string, displayName: string, avatarUrl: string): Promise<boolean> => {
    const profile: UserProfile = {
      wallet,
      displayName,
      avatarUrl,
      createdAt: profiles[wallet]?.createdAt || Date.now(),
    };

    setProfiles(prev => ({ ...prev, [wallet]: profile }));

    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabase.rpc("upsert_user_profile_atomic", {
          p_wallet: wallet,
          p_display_name: displayName,
          p_avatar_url: avatarUrl,
        });
        if (error) throw error;
        const result = typeof data === "string" ? JSON.parse(data) : data;
        if (!result?.success) {
          console.warn("Profile upsert failed:", result);
          return false;
        }
      } catch (e) {
        console.warn("Failed to save profile:", e);
        return false;
      }
    }

    return true;
  }, [profiles]);

  return (
    <UserProfileContext.Provider value={{ profiles, getProfile, getDisplayName, getAvatarUrl, updateProfile, loadProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
}
