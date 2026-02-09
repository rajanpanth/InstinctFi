"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode } from "react";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

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

/** Short wallet address fallback */
function shortAddr(addr: string): string {
  if (addr.length <= 11) return addr;
  return `${addr.slice(0, 4)}...${addr.slice(-4)}`;
}

export function UserProfileProvider({ children }: { children: ReactNode }) {
  const [profiles, setProfiles] = useState<Record<string, UserProfile>>({});

  // Load all profiles at mount
  useEffect(() => {
    if (!isSupabaseConfigured) {
      // Try localStorage fallback
      try {
        const saved = localStorage.getItem("instinctfi_profiles");
        if (saved) setProfiles(JSON.parse(saved));
      } catch {}
      return;
    }

    const loadAll = async () => {
      try {
        const { data } = await supabase.from("user_profiles").select("*");
        if (data) {
          const map: Record<string, UserProfile> = {};
          for (const row of data) {
            map[row.wallet] = {
              wallet: row.wallet,
              displayName: row.display_name || "",
              avatarUrl: row.avatar_url || "",
              createdAt: row.created_at || Date.now(),
            };
          }
          setProfiles(map);
        }
      } catch (e) {
        console.warn("Failed to load user profiles:", e);
      }
    };
    loadAll();
  }, []);

  // Persist to localStorage as fallback
  useEffect(() => {
    if (!isSupabaseConfigured) {
      try { localStorage.setItem("instinctfi_profiles", JSON.stringify(profiles)); } catch {}
    }
  }, [profiles]);

  const loadProfile = useCallback(async (wallet: string) => {
    if (profiles[wallet]) return;
    if (!isSupabaseConfigured) return;

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
      }
    } catch {}
  }, [profiles]);

  const getProfile = useCallback((wallet: string): UserProfile | null => {
    return profiles[wallet] || null;
  }, [profiles]);

  const getDisplayName = useCallback((wallet: string): string => {
    const p = profiles[wallet];
    return p?.displayName || shortAddr(wallet);
  }, [profiles]);

  const getAvatarUrl = useCallback((wallet: string): string => {
    return profiles[wallet]?.avatarUrl || "";
  }, [profiles]);

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
        await supabase.from("user_profiles").upsert({
          wallet,
          display_name: displayName,
          avatar_url: avatarUrl,
          created_at: profile.createdAt,
        }, { onConflict: "wallet" });
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
