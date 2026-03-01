/**
 * GET /api/polls
 *
 * Server-side paginated poll listing (#45).
 * Supports query params:
 *   - page: page number (default 1)
 *   - limit: items per page (default 12, max 50)
 *   - category: filter by category
 *   - status: 'active' | 'settled' | 'all' (default 'all')
 *   - sort: 'latest' | 'oldest' | 'most-voted' (default 'latest')
 *   - q: search query (matches title/description)
 *
 * Returns JSON with { polls, total, page, pageSize, totalPages }
 */

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { log } from "@/lib/logger";

const DEFAULT_PAGE_SIZE = 12;
const MAX_PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
    try {
        const { searchParams } = req.nextUrl;

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(
            MAX_PAGE_SIZE,
            Math.max(1, parseInt(searchParams.get("limit") || String(DEFAULT_PAGE_SIZE), 10))
        );
        const category = searchParams.get("category") || "";
        const status = searchParams.get("status") || "all";
        const sort = searchParams.get("sort") || "latest";
        const search = searchParams.get("q")?.trim() || "";

        const supabase = getSupabaseAdmin();

        // Build query
        let query = supabase.from("polls").select("*", { count: "exact" });

        // Filters
        if (category) {
            query = query.eq("category", category);
        }
        if (status === "active") {
            query = query.eq("status", 0);
        } else if (status === "settled") {
            query = query.eq("status", 1);
        }
        if (search) {
            // BUG-03 FIX: Sanitize search input — strip PostgREST filter chars
            // and backslash (PostgreSQL LIKE escape) to prevent injection.
            const safeSearch = search.replace(/[%_,().!*\\]/g, "").slice(0, 100);
            if (safeSearch) {
                query = query.or(`title.ilike.%${safeSearch}%,description.ilike.%${safeSearch}%`);
            }
        }

        // Sort
        switch (sort) {
            case "oldest":
                query = query.order("created_at", { ascending: true });
                break;
            case "most-voted":
                query = query.order("total_voters", { ascending: false });
                break;
            case "highest-pool":
                query = query.order("total_pool_cents", { ascending: false });
                break;
            case "ending-soon":
                query = query.order("end_time", { ascending: true });
                break;
            case "latest":
            default:
                query = query.order("created_at", { ascending: false });
                break;
        }

        // Pagination
        const from = (page - 1) * limit;
        const to = from + limit - 1;
        query = query.range(from, to);

        const { data, error, count } = await query;

        if (error) {
            log.error("polls_query_failed", { error: error.message, code: error.code });
            return NextResponse.json(
                { error: "Failed to fetch polls" },
                { status: 500 }
            );
        }

        const total = count ?? 0;
        const totalPages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
            polls: data || [],
            total,
            page,
            pageSize: limit,
            totalPages,
        });
    } catch (e) {
        log.error("polls_unexpected", { error: (e as Error).message });
        return NextResponse.json(
            { error: "Internal server error" },
            { status: 500 }
        );
    }
}
