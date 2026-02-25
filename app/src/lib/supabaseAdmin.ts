/**
 * Server-only Supabase client for API routes.
 *
 * Uses the SERVICE ROLE key if available (bypasses RLS),
 * otherwise falls back to the ANON key (RPCs still work
 * because they use SECURITY DEFINER).
 *
 * ⚠️  Do NOT import from client components.
 *     Only import in Next.js API routes (app/src/app/api/*).
 */

import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

// Use service role key if available, otherwise fall back to anon key.
// RPCs use SECURITY DEFINER so they work with either key.
// The security benefit comes from JWT verification in the API route.
const effectiveKey = (serviceRoleKey && serviceRoleKey !== "your-service-role-key-here")
    ? serviceRoleKey
    : anonKey;

if (!effectiveKey) {
    console.warn(
        "[InstinctFi] No Supabase key available for server-side RPC calls."
    );
}

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for server-side RPC calls.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (_client) return _client;

    _client = createClient(
        supabaseUrl || "https://placeholder.supabase.co",
        effectiveKey || "placeholder-key",
        {
            auth: {
                autoRefreshToken: false,
                persistSession: false,
            },
        }
    );

    return _client;
}
