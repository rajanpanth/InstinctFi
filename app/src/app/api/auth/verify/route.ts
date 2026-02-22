import { NextRequest, NextResponse } from "next/server";
import nacl from "tweetnacl";

/**
 * POST /api/auth/verify
 *
 * Wallet-based authentication endpoint.
 * 1. Client signs a message with their wallet private key.
 * 2. This endpoint verifies the signature using tweetnacl.
 * 3. If valid, returns a session token (wallet address) for authenticated requests.
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

        // Verify that the message contains the expected wallet address
        if (!message.includes(walletAddress)) {
            return NextResponse.json(
                { error: "Message does not match wallet address" },
                { status: 400 }
            );
        }

        // Verify the timestamp is recent (within 5 minutes)
        const timestampMatch = message.match(/Timestamp: (\d+)/);
        if (timestampMatch) {
            const messageTimestamp = parseInt(timestampMatch[1], 10);
            const now = Date.now();
            const fiveMinutes = 5 * 60 * 1000;
            if (Math.abs(now - messageTimestamp) > fiveMinutes) {
                return NextResponse.json(
                    { error: "Message timestamp has expired. Please sign a fresh message." },
                    { status: 401 }
                );
            }
        }

        // Decode the signature and public key
        const signatureBytes = Uint8Array.from(
            Buffer.from(signature, "base64")
        );
        const messageBytes = new TextEncoder().encode(message);

        // Decode the wallet address (base58) to public key bytes
        // We use dynamic import to handle the ESM bs58 module
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

        // Authentication successful — return a session token
        // In production, you'd issue a JWT here and set it as an httpOnly cookie
        const sessionToken = Buffer.from(
            JSON.stringify({
                wallet: walletAddress,
                issuedAt: Date.now(),
                expiresAt: Date.now() + 24 * 60 * 60 * 1000, // 24h
            })
        ).toString("base64");

        return NextResponse.json({
            success: true,
            wallet: walletAddress,
            token: sessionToken,
        });
    } catch (error: any) {
        console.error("Auth verification error:", error);
        return NextResponse.json(
            { error: "Internal server error during authentication" },
            { status: 500 }
        );
    }
}
