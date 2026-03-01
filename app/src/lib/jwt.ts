/**
 * Server-side JWT utilities for InstinctFi wallet authentication.
 * Uses Web Crypto API (HMAC-SHA256) — zero dependencies.
 *
 * Features:
 * - S-08 FIX: JTI-based token revocation via Supabase `revoked_tokens` table
 * - S-10 FIX: Dual-key secret rotation (AUTH_JWT_SECRET + AUTH_JWT_SECRET_PREV)
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
    /** JWT ID for revocation support (#43) */
    jti?: string;
    /** #65: Issuer claim */
    iss?: string;
    /** #65: Audience claim */
    aud?: string;
}

/**
 * Create an HMAC-SHA256 signed JWT.
 * @param payload  Must include `wallet`. `iat` and `exp` are set automatically if missing.
 * @param secret   The `AUTH_JWT_SECRET` env var (always signs with the CURRENT key).
 * @param ttlSec   Token lifetime in seconds (default: 1 hour).
 */
export async function signJWT(
    payload: { wallet: string; iat?: number; exp?: number },
    secret: string,
    ttlSec: number = 3600 // #43: Default to 1 hour instead of 24 hours
): Promise<string> {
    const now = Math.floor(Date.now() / 1000);
    // #43: Generate a JTI for potential token blacklisting
    const jti = `${payload.wallet}-${now}-${Math.random().toString(36).slice(2, 10)}`;
    const fullPayload: JWTPayload = {
        wallet: payload.wallet,
        iat: payload.iat ?? now,
        exp: payload.exp ?? now + ttlSec,
        jti,
        iss: "instinctfi",      // #65: issuer claim
        aud: "instinctfi-api",  // #65: audience claim
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
 * S-10 FIX: Supports dual-key rotation — tries `secret` first, then `prevSecret`.
 * Throws if the signature is invalid or the token is expired.
 */
export async function verifyJWT(
    token: string,
    secret: string,
    prevSecret?: string
): Promise<JWTPayload> {
    const parts = token.split(".");
    if (parts.length !== 3) throw new Error("Malformed JWT");

    const [header, body, signature] = parts;
    const signingInput = `${header}.${body}`;

    // Try current secret first
    const key = await getKey(secret);
    const sigBytes = base64urlDecode(signature);
    const verifyData = new TextEncoder().encode(signingInput);
    let valid = await crypto.subtle.verify(
        "HMAC",
        key,
        sigBytes.buffer as ArrayBuffer,
        verifyData.buffer as ArrayBuffer
    );

    // S-10: If current key fails and a previous key is configured, try that
    if (!valid && prevSecret) {
        const prevKey = await getKey(prevSecret);
        valid = await crypto.subtle.verify(
            "HMAC",
            prevKey,
            sigBytes.buffer as ArrayBuffer,
            verifyData.buffer as ArrayBuffer
        );
    }

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

    // #65: Verify issuer and audience claims
    if (payload.iss && payload.iss !== "instinctfi") {
        throw new Error("JWT issuer mismatch");
    }
    if (payload.aud && payload.aud !== "instinctfi-api") {
        throw new Error("JWT audience mismatch");
    }

    return payload;
}

/**
 * Check if a JTI has been revoked.
 * Uses the Supabase `revoked_tokens` table (S-08 FIX).
 * Returns false (not revoked) if Supabase is unavailable — fail-open
 * to avoid locking out all users during a DB outage.
 */
async function isTokenRevoked(jti: string): Promise<boolean> {
    try {
        // Dynamic import to avoid circular dependency
        const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
        const supabase = getSupabaseAdmin();
        const { data } = await supabase
            .from("revoked_tokens")
            .select("jti")
            .eq("jti", jti)
            .maybeSingle();
        return data !== null;
    } catch {
        // Fail-open: if the DB is down, don't block all requests
        return false;
    }
}

/**
 * Revoke a JWT by its JTI. Called on logout.
 * Stores the JTI in the `revoked_tokens` table with an
 * `expires_at` matching the token's natural expiration for auto-cleanup.
 */
export async function revokeToken(jti: string, wallet: string, expiresAt: number): Promise<void> {
    const { getSupabaseAdmin } = await import("@/lib/supabaseAdmin");
    const supabase = getSupabaseAdmin();
    await supabase.from("revoked_tokens").upsert({
        jti,
        wallet,
        expires_at: new Date(expiresAt * 1000).toISOString(),
    });
}

/**
 * Extract and verify wallet from an Authorization header.
 * S-08: Checks token revocation via Supabase.
 * S-10: Supports dual-key rotation (AUTH_JWT_SECRET + AUTH_JWT_SECRET_PREV).
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
        // S-10: Pass previous secret for rotation support
        const prevSecret = process.env.AUTH_JWT_SECRET_PREV || undefined;
        const payload = await verifyJWT(token, secret, prevSecret);

        // S-08: Check if this token has been revoked (e.g. user logged out)
        if (payload.jti) {
            const revoked = await isTokenRevoked(payload.jti);
            if (revoked) {
                console.warn("[JWT] Token revoked:", payload.jti);
                return null;
            }
        }

        return payload.wallet;
    } catch (e) {
        console.warn("[JWT] Verification failed:", (e as Error).message);
        return null;
    }
}

/**
 * Extract the full JWT payload from an Authorization header.
 * Used by the logout endpoint to get the JTI and expiration for revocation.
 */
export async function getPayloadFromAuth(
    authHeader: string | null
): Promise<JWTPayload | null> {
    if (!authHeader?.startsWith("Bearer ")) return null;

    const secret = process.env.AUTH_JWT_SECRET;
    if (!secret) return null;

    try {
        const token = authHeader.slice(7);
        const prevSecret = process.env.AUTH_JWT_SECRET_PREV || undefined;
        return await verifyJWT(token, secret, prevSecret);
    } catch {
        return null;
    }
}
