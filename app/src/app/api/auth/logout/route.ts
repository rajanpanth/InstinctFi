import { NextRequest, NextResponse } from "next/server";
import { getPayloadFromAuth, revokeToken } from "@/lib/jwt";
import { isRateLimited } from "@/lib/rateLimit";
import { log } from "@/lib/logger";

/**
 * POST /api/auth/logout
 *
 * S-08 FIX: Revokes the caller's JWT by adding its JTI to the
 * `revoked_tokens` table. Subsequent requests with this token
 * will be rejected by `getWalletFromAuth`.
 *
 * No request body required — the token is extracted from the
 * Authorization header.
 */
export async function POST(req: NextRequest) {
    try {
        // HIGH-04 FIX: Rate limit logout endpoint to prevent revoked_tokens table flooding.
        const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
        if (await isRateLimited(`auth:${ip}`)) {
            return NextResponse.json(
                { success: false, error: "rate_limited" },
                { status: 429 }
            );
        }

        const payload = await getPayloadFromAuth(req.headers.get("authorization"));
        if (!payload) {
            return NextResponse.json(
                { success: false, error: "unauthorized" },
                { status: 401 }
            );
        }

        if (payload.jti && payload.exp) {
            await revokeToken(payload.jti, payload.wallet, payload.exp);
            log.info("auth_logout", { wallet: payload.wallet, jti: payload.jti });
        }

        return NextResponse.json({ success: true });
    } catch (error: any) {
        log.error("auth_logout_failed", { error: error?.message });
        return NextResponse.json(
            { success: false, error: "internal_error" },
            { status: 500 }
        );
    }
}
