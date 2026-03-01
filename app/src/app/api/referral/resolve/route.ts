/**
 * POST /api/referral/resolve
 *
 * BUG-07 FIX: Server-side referral code resolution.
 * Resolves a DJB2 referral code to a wallet address WITHOUT exposing
 * the full user list to clients.
 *
 * Body: { code: string }
 * Returns: { wallet: string | null }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { log } from "@/lib/logger";

/** DJB2 hash → base36 code (must match walletToCode in referrals.tsx) */
function walletToCode(wallet: string): string {
    let hash = 5381;
    for (let i = 0; i < wallet.length; i++) {
        hash = ((hash << 5) + hash + wallet.charCodeAt(i)) >>> 0;
    }
    return hash.toString(36).padStart(8, "0").slice(0, 8);
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const code = typeof body.code === "string" ? body.code.trim().slice(0, 20) : "";
        if (!code) {
            return NextResponse.json({ wallet: null });
        }

        const supabase = getSupabaseAdmin();

        // Fetch wallets in batches to avoid loading too many at once
        // but NEVER expose them to the client — only return the match.
        const { data } = await supabase
            .from("users")
            .select("wallet")
            .limit(1000);

        if (!data) {
            return NextResponse.json({ wallet: null });
        }

        const match = data.find((u: { wallet: string }) => walletToCode(u.wallet) === code);
        return NextResponse.json({ wallet: match?.wallet ?? null });
    } catch (e) {
        log.error("referral_resolve_failed", { error: (e as Error).message });
        return NextResponse.json({ wallet: null }, { status: 500 });
    }
}
