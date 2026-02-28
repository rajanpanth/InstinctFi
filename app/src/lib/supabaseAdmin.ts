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

let _client: SupabaseClient | null = null;

/**
 * Returns a singleton Supabase client for server-side RPC calls.
 * All env var checks happen at runtime (not module-load time)
 * so the build doesn't crash when env vars aren't available.
 */
export function getSupabaseAdmin(): SupabaseClient {
    if (_client) return _client;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    const effectiveKey = (serviceRoleKey && serviceRoleKey !== "your-service-role-key-here")
        ? serviceRoleKey
        : anonKey;

    // In production, warn if the service role key is missing
    if (process.env.NODE_ENV === "production" && (!serviceRoleKey || serviceRoleKey === "your-service-role-key-here")) {
        console.warn(
            "[InstinctFi] SUPABASE_SERVICE_ROLE_KEY not set — falling back to anon key. " +
            "Admin API routes may have reduced permissions."
        );
    }

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

