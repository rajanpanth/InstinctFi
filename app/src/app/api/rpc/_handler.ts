/**
 * Shared helper for authenticated RPC API routes.
 * Extracts wallet from JWT, applies rate limiting, and calls Supabase RPC with the admin client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWalletFromAuth } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";
import { log } from "@/lib/logger";
import { isRateLimited } from "@/lib/rateLimit";

// BUG-11 FIX: Sanitize all string parameters server-side before they reach the
// Supabase RPC. This prevents stored XSS — even if a non-React consumer (email,
// embed, export) renders the data, it's already clean.
function sanitizeParams(params: Record<string, any>): Record<string, any> {
    const sanitized: Record<string, any> = {};
    for (const [key, value] of Object.entries(params)) {
        if (typeof value === "string") {
            // URL fields get URL-specific sanitization; all others get text sanitization
            if (key.includes("url") || key.includes("image")) {
                sanitized[key] = sanitizeUrl(value);
            } else if (key === "p_wallet" || key === "p_id" || key === "p_poll_id" || key === "p_comment_id") {
                // Don't sanitize IDs/wallets — they're validated by Zod or DB constraints
                sanitized[key] = value;
            } else {
                sanitized[key] = sanitizeText(value);
            }
        } else if (Array.isArray(value)) {
            sanitized[key] = value.map((item: any) => {
                if (typeof item === "string") {
                    if (key.includes("image")) return item ? sanitizeUrl(item) : item;
                    return sanitizeText(item);
                }
                return item;
            });
        } else {
            sanitized[key] = value;
        }
    }
    return sanitized;
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
            if (await isRateLimited(wallet)) {
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
            const params = sanitizeParams(buildParams(wallet, body));
            const { data, error } = await supabase.rpc(rpcName, params);

            if (error) {
                log.error("rpc_failed", { rpc: rpcName, error: error.message, code: error.code });
                // MED-02 FIX: Don't leak raw DB error messages to client.
                return NextResponse.json(
                    { success: false, error: "operation_failed" },
                    { status: 500 }
                );
            }

            // RPC functions return JSON with { success, ... }
            if (data && typeof data === "object" && "success" in data) {
                return NextResponse.json(data);
            }

            return NextResponse.json({ success: true, data });
        } catch (e) {
            log.error("rpc_unexpected", { rpc: rpcName, error: (e as Error).message });
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
            if (await isRateLimited(wallet)) {
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
                log.warn("admin_rejected", { rpc: rpcName, wallet });
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
            const { data, error } = await adminSupabase.rpc(rpcName, sanitizeParams(params));

            if (error) {
                log.error("rpc_failed", { rpc: rpcName, error: error.message, code: error.code });
                // MED-02 FIX: Don't leak raw DB error messages to client.
                return NextResponse.json(
                    { success: false, error: "operation_failed" },
                    { status: 500 }
                );
            }

            if (data && typeof data === "object" && "success" in data) {
                return NextResponse.json(data);
            }

            return NextResponse.json({ success: true, data });
        } catch (e) {
            log.error("rpc_unexpected", { rpc: rpcName, error: (e as Error).message });
            return NextResponse.json(
                { success: false, error: "internal_error" },
                { status: 500 }
            );
        }
    };
}

