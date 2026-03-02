/**
 * Sync poll metadata to Supabase (images, title, etc.)
 * 
 * This is a lightweight endpoint that directly upserts poll data into Supabase
 * WITHOUT balance validation. Used as a fallback when the create_poll_atomic RPC
 * fails (e.g. because the Supabase balance is stale when PROGRAM_DEPLOYED=true).
 * 
 * The on-chain program is the source of truth for financial state — this endpoint
 * only ensures metadata (especially option_images which are Supabase-only) persists.
 */
import { NextRequest, NextResponse } from "next/server";
import { getWalletFromAuth } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { sanitizeText, sanitizeUrl } from "@/lib/sanitize";
import { isRateLimited } from "@/lib/rateLimit";
import { log } from "@/lib/logger";

export async function POST(req: NextRequest) {
    try {
        const wallet = await getWalletFromAuth(req.headers.get("authorization"));
        if (!wallet) {
            return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
        }

        if (await isRateLimited(wallet)) {
            return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
        }

        const body = await req.json();

        // Validate required fields
        if (!body.id || !body.poll_id || !body.title || !body.options) {
            return NextResponse.json({ success: false, error: "missing_fields" }, { status: 400 });
        }

        const supabase = getSupabaseAdmin();

        // Sanitize string fields
        const sanitizedOptionImages = Array.isArray(body.option_images)
            ? body.option_images.map((img: string) => img ? sanitizeUrl(img) : "")
            : [];

        const { error } = await supabase.from("polls").upsert({
            id: body.id,
            poll_id: body.poll_id,
            creator: wallet,  // Use wallet from JWT, not from body (prevent impersonation)
            title: sanitizeText(body.title),
            description: sanitizeText(body.description || ""),
            category: sanitizeText(body.category || ""),
            image_url: body.image_url ? sanitizeUrl(body.image_url) : "",
            option_images: sanitizedOptionImages,
            options: Array.isArray(body.options) ? body.options.map((o: string) => sanitizeText(o)) : [],
            vote_counts: Array.isArray(body.options) ? body.options.map(() => 0) : [],
            unit_price_cents: body.unit_price_cents || 0,
            end_time: body.end_time || 0,
            total_pool_cents: body.total_pool_cents || 0,
            creator_investment_cents: body.creator_investment_cents || 0,
            platform_fee_cents: body.platform_fee_cents || 0,
            creator_reward_cents: body.creator_reward_cents || 0,
            status: 0,
            winning_option: 255,
            total_voters: 0,
            created_at: body.created_at || Math.floor(Date.now() / 1000),
        }, { onConflict: "id" });

        if (error) {
            log.error("sync_poll_failed", { error: error.message, pollId: body.id });
            return NextResponse.json({ success: false, error: "sync_failed" }, { status: 500 });
        }

        return NextResponse.json({ success: true });
    } catch (e) {
        log.error("sync_poll_unexpected", { error: (e as Error).message });
        return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
    }
}
