/**
 * GET /api/leaderboard
 *
 * Returns public leaderboard data for all users.
 * Only exposes non-sensitive fields (no balance, no raw wallet stats).
 *
 * Query params:
 *   ?period=weekly|monthly|allTime (default: allTime)
 *   ?sortBy=profit|pollsWon|votes|creatorEarnings (default: profit)
 *   ?page=1 (default: 1, 50 users per page)
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { log } from "@/lib/logger";

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
    "login_streak",
].join(",");

const PAGE_SIZE = 50;

type ValidSort = "profit" | "pollsWon" | "votes" | "creatorEarnings";
type ValidPeriod = "weekly" | "monthly" | "allTime";

/** Map frontend sort keys to Supabase column for ORDER BY */
function getSortColumn(sortBy: ValidSort, period: ValidPeriod): string {
    if (period === "weekly") {
        switch (sortBy) {
            case "profit": return "weekly_winnings_cents";
            case "pollsWon": return "weekly_polls_won";
            case "votes": return "weekly_votes_cast";
            case "creatorEarnings": return "creator_earnings_cents";
        }
    }
    if (period === "monthly") {
        switch (sortBy) {
            case "profit": return "monthly_winnings_cents";
            case "pollsWon": return "monthly_polls_won";
            case "votes": return "monthly_votes_cast";
            case "creatorEarnings": return "creator_earnings_cents";
        }
    }
    // allTime
    switch (sortBy) {
        case "profit": return "total_winnings_cents";
        case "pollsWon": return "polls_won";
        case "votes": return "total_votes_cast";
        case "creatorEarnings": return "creator_earnings_cents";
    }
}

const VALID_SORTS: ValidSort[] = ["profit", "pollsWon", "votes", "creatorEarnings"];
const VALID_PERIODS: ValidPeriod[] = ["weekly", "monthly", "allTime"];

export async function GET(req: NextRequest) {
    try {
        const url = new URL(req.url);
        const periodParam = url.searchParams.get("period") || "allTime";
        const sortParam = url.searchParams.get("sortBy") || "profit";
        const pageParam = parseInt(url.searchParams.get("page") || "1", 10);

        const period: ValidPeriod = VALID_PERIODS.includes(periodParam as ValidPeriod)
            ? (periodParam as ValidPeriod) : "allTime";
        const sortBy: ValidSort = VALID_SORTS.includes(sortParam as ValidSort)
            ? (sortParam as ValidSort) : "profit";
        const page = Math.max(1, Math.min(pageParam, 100)); // cap at page 100

        const sortColumn = getSortColumn(sortBy, period);
        const offset = (page - 1) * PAGE_SIZE;

        const supabase = getSupabaseAdmin();

        let query = supabase
            .from("users")
            .select(LEADERBOARD_COLUMNS)
            .order(sortColumn, { ascending: false })
            .range(offset, offset + PAGE_SIZE - 1);

        // For weekly/monthly periods, filter to only users whose reset_ts is fresh.
        // A user's period counters are valid if their reset_ts is within the period window.
        const nowMs = Date.now();
        if (period === "weekly") {
            const weekAgoMs = nowMs - 7 * 24 * 60 * 60 * 1000;
            query = query.gte("weekly_reset_ts", weekAgoMs);
        } else if (period === "monthly") {
            const monthAgoMs = nowMs - 30 * 24 * 60 * 60 * 1000;
            query = query.gte("monthly_reset_ts", monthAgoMs);
        }

        const { data, error } = await query;

        if (error) {
            log.error("leaderboard_query_failed", { error: error.message, code: error.code });
            return NextResponse.json(
                { error: "Failed to fetch leaderboard" },
                { status: 500 }
            );
        }

        return NextResponse.json({
            users: data || [],
            page,
            pageSize: PAGE_SIZE,
            period,
            sortBy,
        });
    } catch (e) {
        log.error("leaderboard_unexpected", { error: (e as Error).message });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
