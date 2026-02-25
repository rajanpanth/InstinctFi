/**
 * Shared helper for authenticated RPC API routes.
 * Extracts wallet from JWT and calls Supabase RPC with the admin client.
 */

import { NextRequest, NextResponse } from "next/server";
import { getWalletFromAuth } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Create an authenticated RPC handler.
 *
 * @param rpcName         Supabase RPC function name
 * @param buildParams     Function that takes (wallet, requestBody) and returns RPC params.
 *                        The wallet is injected from the JWT — never from the client.
 */
export function createRpcHandler(
    rpcName: string,
    buildParams: (wallet: string, body: any) => Record<string, any>
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

            // ── Parse request body ──
            let body: any = {};
            try {
                body = await req.json();
            } catch {
                // Some routes may not require a body
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
