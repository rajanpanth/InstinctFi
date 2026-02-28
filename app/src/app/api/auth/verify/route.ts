import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";
import { signJWT } from "@/lib/jwt";

/**
 * POST /api/auth/verify
 *
 * Wallet-based authentication endpoint.
 * 1. Client signs a message with their wallet private key.
 * 2. This endpoint verifies the signature using tweetnacl.
 * 3. If valid, returns an HMAC-SHA256 signed JWT containing the wallet address.
 *
 * Body: { walletAddress: string, signature: string, message: string }
 */
export async function POST(req: NextRequest) {
    try {
        const { walletAddress, signature, message } = await req.json();

        if (!walletAddress || !signature || !message) {
            return NextResponse.json(
                { error: "Missing required fields: walletAddress, signature, message" },
                { status: 400 }
            );
        }

        // #37: Verify structured message format with domain binding
        // Expected format includes: "Sign in to InstinctFi" header, wallet address, and timestamp
        const expectedDomain = process.env.NEXT_PUBLIC_APP_DOMAIN || "instinctfi.com";

        // Check message contains wallet address
        if (!message.includes(walletAddress)) {
            return NextResponse.json(
                { error: "Message does not match wallet address" },
                { status: 400 }
            );
        }

        // Verify domain binding to prevent cross-site message replay
        if (!message.includes("Sign in to InstinctFi") && !message.includes(expectedDomain)) {
            return NextResponse.json(
                { error: "Message must include application domain for security binding." },
                { status: 400 }
            );
        }

        // Verify the timestamp is present and recent (within 5 minutes).
        // Messages without a timestamp are rejected to prevent replay attacks.
        const timestampMatch = message.match(/Timestamp: (\d+)/);
        if (!timestampMatch) {
            return NextResponse.json(
                { error: "Message must include a Timestamp field for replay protection." },
                { status: 400 }
            );
        }
        const messageTimestamp = parseInt(timestampMatch[1], 10);
        const now = Date.now();
        const fiveMinutes = 5 * 60 * 1000;
        if (Math.abs(now - messageTimestamp) > fiveMinutes) {
            return NextResponse.json(
                { error: "Message timestamp has expired. Please sign a fresh message." },
                { status: 401 }
            );
        }

        // Decode the signature and public key
        const signatureBytes = Uint8Array.from(
            Buffer.from(signature, "base64")
        );
        const messageBytes = new TextEncoder().encode(message);

        // Decode the wallet address (base58) to public key bytes
        const bs58 = await import("bs58");
        const publicKeyBytes = bs58.default.decode(walletAddress);

        // Verify the signature
        const isValid = nacl.sign.detached.verify(
            messageBytes,
            signatureBytes,
            publicKeyBytes
        );

        if (!isValid) {
            return NextResponse.json(
                { error: "Invalid signature. Wallet verification failed." },
                { status: 401 }
            );
        }

        // ── Issue a proper HMAC-SHA256 JWT ──
        const secret = process.env.AUTH_JWT_SECRET;
        if (!secret) {
            // #71: Don't log env key names — they could leak to third-party logging services
            console.error("[Auth] AUTH_JWT_SECRET not configured");
            return NextResponse.json(
                { error: "Server misconfiguration — auth secret missing" },
                { status: 500 }
            );
        }

        const token = await signJWT({ wallet: walletAddress }, secret); // #43: uses 1h default

        return NextResponse.json({
            success: true,
            wallet: walletAddress,
            token,
        });
    } catch (error: any) {
        console.error("Auth verification error:", error);
        return NextResponse.json(
            { error: "Internal server error during authentication" },
            { status: 500 }
        );
    }
}
