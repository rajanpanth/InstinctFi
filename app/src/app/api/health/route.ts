import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Minimal health-check endpoint.
 * Does NOT reveal environment configuration details to prevent
 * attackers from fingerprinting the deployment.
 */
export async function GET() {
    return NextResponse.json({
        ok: true,
        timestamp: new Date().toISOString(),
    });
}
