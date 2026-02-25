/**
 * Server-side JWT utilities for InstinctFi wallet authentication.
 * Uses Web Crypto API (HMAC-SHA256) — zero dependencies.
 *
 * ⚠️  This module runs on the server only (Next.js API routes).
 *     Do NOT import from client components.
 */

// ─── Helpers ────────────────────────────────────────────────────────────────

function base64url(buf: ArrayBuffer | Uint8Array): string {
    const bytes = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function base64urlDecode(str: string): Uint8Array {
    const padded = str.replace(/-/g, "+").replace(/_/g, "/");
    const binary = atob(padded);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
}

async function getKey(secret: string): Promise<CryptoKey> {
    const enc = new TextEncoder();
    const keyData = enc.encode(secret);
    return crypto.subtle.importKey(
        "raw",
        keyData.buffer as ArrayBuffer,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign", "verify"]
    );
}

// ─── Public API ─────────────────────────────────────────────────────────────

export interface JWTPayload {
    /** Wallet address (base58 public key) */
    wallet: string;
    /** Issued-at timestamp (seconds) */
    iat: number;
    /** Expiration timestamp (seconds) */
    exp: number;
}

/**
 * Create an HMAC-SHA256 signed JWT.
 * @param payload  Must include `wallet`. `iat` and `exp` are set automatically if missing.
 * @param secret   The `AUTH_JWT_SECRET` env var.
 * @param ttlSec   Token lifetime in seconds (default: 24 hours).
 */
export async function signJWT(
    payload: { wallet: string; iat?: number; exp?: number },
    secret: string,
    ttlSec: number = 86400
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    const fullPayload: JWTPayload = {
        wallet: payload.wallet,
        iat: payload.iat ?? now,
        exp: payload.exp ?? now + ttlSec,
    };

    const header = base64url(new TextEncoder().encode(JSON.stringify({ alg: "HS256", typ: "JWT" })));
    const body = base64url(new TextEncoder().encode(JSON.stringify(fullPayload)));
    const signingInput = `${header}.${body}`;

    const key = await getKey(secret);
    const sigData = new TextEncoder().encode(signingInput);
    const sig = await crypto.subtle.sign("HMAC", key, sigData.buffer as ArrayBuffer);

    return `${signingInput}.${base64url(sig)}`;
}

/**
 * Verify an HMAC-SHA256 JWT and return its payload.
 * Throws if the signature is invalid or the token is expired.
 */
export async function verifyJWT(token: string, secret: string): Promise<JWTPayload> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed JWT");

    const [header, body, signature] = parts;
    const signingInput = `${header}.${body}`;

    const key = await getKey(secret);
    const sigBytes = base64urlDecode(signature);
    const verifyData = new TextEncoder().encode(signingInput);
    const valid = await crypto.subtle.verify(
        "HMAC",
        key,
        sigBytes.buffer as ArrayBuffer,
        verifyData.buffer as ArrayBuffer
    );

    if (!valid) throw new Error("Invalid JWT signature");

    const payload: JWTPayload = JSON.parse(
        new TextDecoder().decode(base64urlDecode(body))
    );

    // Check expiration
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp && now > payload.exp) {
        throw new Error("JWT expired");
    }

    if (!payload.wallet) {
        throw new Error("JWT missing wallet claim");
    }

    return payload;
}

/**
 * Extract and verify wallet from an Authorization header.
 * Returns the wallet address string, or null if auth fails.
 */
export async function getWalletFromAuth(
    authHeader: string | null
): Promise<string | null> {
    if (!authHeader?.startsWith("Bearer ")) return null;

    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) {
        console.error("[JWT] AUTH_JWT_SECRET not configured");
        return null;
    }

    try {
        const token = authHeader.slice(7);
        const payload = await verifyJWT(token, secret);
        return payload.wallet;
    } catch (e) {
        console.warn("[JWT] Verification failed:", (e as Error).message);
        return null;
    }
}
