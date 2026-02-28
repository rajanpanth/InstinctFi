/**
 * Shared helper for authenticated RPC API routes.
 * Extracts wallet from JWT, applies rate limiting, and calls Supabase RPC with the admin client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWalletFromAuth } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

// #34: TODO — In production with serverless/multi-instance deployments,
// replace this in-memory rate limiter with Redis (e.g. @upstash/ratelimit).
// This resets on cold starts and is per-instance only.
const RATE_LIMIT_WINDOW_MS = 60_000; // 1 minute
const RATE_LIMIT_MAX = 30; // max requests per wallet per minute

const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

// #35: Track last prune time for lazy cleanup instead of setInterval
let lastPruneTime = Date.now();
const PRUNE_INTERVAL_MS = 5 * 60_000;

function pruneStaleEntries() {
    const now = Date.now();
    if (now - lastPruneTime < PRUNE_INTERVAL_MS) return;
    lastPruneTime = now;
    Array.from(rateLimitMap.entries()).forEach(([wallet, entry]) => {
        if (now >= entry.resetAt) {
            rateLimitMap.delete(wallet);
        }
    });
}

function isRateLimited(wallet: string): boolean {
    // #35: Lazy pruning on each check instead of module-scope setInterval
    pruneStaleEntries();

    const now = Date.now();
    const entry = rateLimitMap.get(wallet);

    if (!entry || now >= entry.resetAt) {
        rateLimitMap.set(wallet, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
        return false;
    }

    entry.count++;
    if (entry.count > RATE_LIMIT_MAX) {
        return true;
    }
    return false;
}

// ────────────────────────────────────────────────────────────────────────

/**
 * Create an authenticated RPC handler.
 *
 * @param rpcName         Supabase RPC function name
 * @param buildParams     Function that takes (wallet, requestBody) and returns RPC params.
 *                        The wallet is injected from the JWT — never from the client.
 * @param validateInput   Optional function for input validation (e.g. Zod schema).
 *                        Receives the raw body, should throw an Error with a message on failure.
 */
export function createRpcHandler(
    rpcName: string,
    buildParams: (wallet: string, body: any) => Record<string, any>,
    validateInput?: (body: any) => void
) {
    return async function handler(req: NextRequest) {
        try {
            // ── Verify JWT ──
            const wallet = await getWalletFromAuth(req.headers.get("authorization"));
            if (!wallet) {
                return NextResponse.json(
                    { success: false, error: "unauthorized" },
                    { status: 401 }
                );
            }

            // ── Rate limit ──
            if (isRateLimited(wallet)) {
                return NextResponse.json(
                    { success: false, error: "rate_limited" },
                    { status: 429 }
                );
            }

            // ── Parse request body ──
            let body: any = {};
            try {
                body = await req.json();
            } catch {
                // Some routes may not require a body
            }

            // ── Validate input ──
            if (validateInput) {
                try {
                    validateInput(body);
                } catch (e) {
                    return NextResponse.json(
                        { success: false, error: (e as Error).message || "invalid_input" },
                        { status: 400 }
                    );
                }
            }

            // ── Call Supabase RPC with service role ──
            const supabase = getSupabaseAdmin();
            const params = buildParams(wallet, body);
            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) {
                console.error(`[RPC] ${rpcName} error:`, error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            // RPC functions return JSON with { success, ... }
            if (data && typeof data === "object" && "success" in data) {
                return NextResponse.json(data);
            }

            return NextResponse.json({ success: true, data });
        } catch (e) {
            console.error(`[RPC] ${rpcName} unexpected error:`, e);
            return NextResponse.json(
                { success: false, error: "internal_error" },
                { status: 500 }
            );
        }
    };
}

/**
 * Create an ADMIN-ONLY authenticated RPC handler.
 * Same as createRpcHandler, but additionally verifies the caller's wallet
 * is in the `admin_wallets` Supabase table before proceeding.
 *
 * @param rpcName         Supabase RPC function name
 * @param buildParams     Function that takes (wallet, requestBody) and returns RPC params.
 *                        May throw an Error to reject invalid input (message sent as error response).
 * @param validateInput   Optional function for input validation (e.g. Zod schema).
 *                        Receives the raw body, should throw an Error with a message on failure.
 */
export function createAdminRpcHandler(
    rpcName: string,
    buildParams: (wallet: string, body: any) => Record<string, any>,
    validateInput?: (body: any) => void
) {
    return async function handler(req: NextRequest) {
        try {
            // ── Verify JWT ──
            const wallet = await getWalletFromAuth(req.headers.get("authorization"));
            if (!wallet) {
                return NextResponse.json(
                    { success: false, error: "unauthorized" },
                    { status: 401 }
                );
            }

            // ── Rate limit ──
            if (isRateLimited(wallet)) {
                return NextResponse.json(
                    { success: false, error: "rate_limited" },
                    { status: 429 }
                );
            }

            // ── Admin check: verify wallet is in admin_wallets table ──
            const adminSupabase = getSupabaseAdmin();
            const { data: adminRow } = await adminSupabase
                .from("admin_wallets")
                .select("wallet")
                .eq("wallet", wallet)
                .single();

            if (!adminRow) {
                console.warn(`[RPC] ${rpcName}: non-admin wallet ${wallet} attempted admin action`);
                return NextResponse.json(
                    { success: false, error: "not_admin" },
                    { status: 403 }
                );
            }

            // ── Parse request body ──
            let body: any = {};
            try {
                body = await req.json();
            } catch {
                // Some routes may not require a body
            }

            // ── Validate input ──
            if (validateInput) {
                try {
                    validateInput(body);
                } catch (e) {
                    return NextResponse.json(
                        { success: false, error: (e as Error).message || "invalid_input" },
                        { status: 400 }
                    );
                }
            }

            // ── Build params (may throw for input validation) ──
            let params: Record<string, any>;
            try {
                params = buildParams(wallet, body);
            } catch (e) {
                return NextResponse.json(
                    { success: false, error: (e as Error).message || "invalid_input" },
                    { status: 400 }
                );
            }

            // ── Call Supabase RPC with service role ──
            const { data, error } = await adminSupabase.rpc(rpcName, params);

            if (error) {
                console.error(`[RPC] ${rpcName} error:`, error);
                return NextResponse.json(
                    { success: false, error: error.message },
                    { status: 500 }
                );
            }

            if (data && typeof data === "object" && "success" in data) {
                return NextResponse.json(data);
            }

            return NextResponse.json({ success: true, data });
        } catch (e) {
            console.error(`[RPC] ${rpcName} unexpected error:`, e);
            return NextResponse.json(
                { success: false, error: "internal_error" },
                { status: 500 }
            );
        }
    };
}

