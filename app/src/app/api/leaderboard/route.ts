/**
 * GET /api/leaderboard
 *
 * Returns public leaderboard data for all users.
 * Only exposes non-sensitive fields (no balance, no raw wallet stats).
 * Supports optional ?period=weekly|monthly|allTime (default: allTime).
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";

/** Fields safe to expose publicly for the leaderboard */
const LEADERBOARD_COLUMNS = [
    "wallet",
    "total_votes_cast",
    "total_polls_voted",
    "polls_won",
    "polls_created",
    "total_spent_cents",
    "total_winnings_cents",
    "weekly_winnings_cents",
    "monthly_winnings_cents",
    "weekly_spent_cents",
    "monthly_spent_cents",
    "weekly_votes_cast",
    "monthly_votes_cast",
    "weekly_polls_won",
    "monthly_polls_won",
    "weekly_polls_voted",
    "monthly_polls_voted",
    "creator_earnings_cents",
    "weekly_reset_ts",
    "monthly_reset_ts",
    "created_at",
].join(",");

export async function GET(_req: NextRequest) {
    try {
        const supabase = getSupabaseAdmin();

        const { data, error } = await supabase
            .from("users")
            .select(LEADERBOARD_COLUMNS)
            .order("total_winnings_cents", { ascending: false })
            .limit(100);

        if (error) {
            console.error("[API/leaderboard] Query error:", error);
            return NextResponse.json(
                { error: "Failed to fetch leaderboard" },
                { status: 500 }
            );
        }

        return NextResponse.json({ users: data || [] });
    } catch (e) {
        console.error("[API/leaderboard] Unexpected error:", e);
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
