import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export const isSupabaseConfigured = !!(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    "[InstinctFi] Supabase env vars missing (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY). " +
    "Running in offline/demo mode."
  );
}

/** Public (anonymous) Supabase client — used for reads and unauthenticated operations */
export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseAnonKey || "placeholder-key"
);

// ── Authenticated client ────────────────────────────────────────────────

const AUTH_TOKEN_KEY = "instinctfi_auth_token";

/** Store the auth token from the /api/auth/verify endpoint */
export function setAuthToken(token: string) {
  if (typeof window !== "undefined") {
    localStorage.setItem(AUTH_TOKEN_KEY, token);
  }
}

/** Get the stored auth token */
export function getAuthToken(): string | null {
  if (typeof window !== "undefined") {
    return localStorage.getItem(AUTH_TOKEN_KEY);
  }
  return null;
}

/**
 * Check whether the stored JWT is present and not expired.
 * Decodes the payload without cryptographic verification (that happens server-side).
 */
export function isAuthTokenValid(): boolean {
  const token = getAuthToken();
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, "+").replace(/_/g, "/")));
    const now = Math.floor(Date.now() / 1000);
    // Consider expired if less than 60 seconds remaining
    return typeof payload.exp === "number" && payload.exp > now + 60;
  } catch {
    return false;
  }
}

/** Clear the auth token (on disconnect) */
export function clearAuthToken() {
  if (typeof window !== "undefined") {
    localStorage.removeItem(AUTH_TOKEN_KEY);
  }
}

/**
 * Create an authenticated Supabase client using the wallet auth token.
 * Falls back to the anonymous client if no token is available.
 */
export function createAuthenticatedClient() {
  const token = getAuthToken();
  if (!token || !isSupabaseConfigured) return supabase;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        "x-instinctfi-auth": token,
      },
    },
  });
}
