import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Diagnostic endpoint to verify environment configuration.
 */
export async function GET() {
    return NextResponse.json({
        ok: true,
        hasAuthSecret: !!process.env.AUTH_JWT_SECRET,
        hasSupabaseUrl: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
        hasSupabaseKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        hasServiceRole: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
        nodeEnv: process.env.NODE_ENV,
        timestamp: new Date().toISOString(),
    });
}
