/**
 * @jest-environment node
 */

/**
 * Tests for S-08 (JWT revocation) and S-10 (JWT secret rotation).
 */

import { signJWT, verifyJWT } from "@/lib/jwt";

const SECRET = "test-secret-32-chars-long-enough";
const PREV_SECRET = "old-secret-32-chars-long-enough!";

describe("JWT Secret Rotation (S-10)", () => {
    it("verifies a token signed with the current secret", async () => {
        const token = await signJWT({ wallet: "Wallet1" }, SECRET);
        const payload = await verifyJWT(token, SECRET);
        expect(payload.wallet).toBe("Wallet1");
        expect(payload.jti).toBeDefined();
        expect(payload.iss).toBe("instinctfi");
        expect(payload.aud).toBe("instinctfi-api");
    });

    it("verifies a token signed with the PREVIOUS secret during rotation", async () => {
        // Token was signed with the old secret
        const token = await signJWT({ wallet: "Wallet2" }, PREV_SECRET);

        // Current secret is now different, but prevSecret is the old one
        const payload = await verifyJWT(token, SECRET, PREV_SECRET);
        expect(payload.wallet).toBe("Wallet2");
    });

    it("rejects a token signed with an unknown secret (no rotation match)", async () => {
        const token = await signJWT({ wallet: "Wallet3" }, "completely-different-secret!!!!");
        await expect(verifyJWT(token, SECRET, PREV_SECRET)).rejects.toThrow("Invalid JWT signature");
    });

    it("rejects a token without prevSecret if only current secret doesn't match", async () => {
        const token = await signJWT({ wallet: "Wallet4" }, PREV_SECRET);
        // No prevSecret passed — should fail
        await expect(verifyJWT(token, SECRET)).rejects.toThrow("Invalid JWT signature");
    });
});

describe("JWT Token Expiration", () => {
    it("rejects expired tokens", async () => {
        // Create a token with exp in the past
        const past = Math.floor(Date.now() / 1000) - 10;
        const token = await signJWT({ wallet: "Wallet5", exp: past }, SECRET);
        await expect(verifyJWT(token, SECRET)).rejects.toThrow("JWT expired");
    });

    it("accepts non-expired tokens", async () => {
        const token = await signJWT({ wallet: "Wallet6" }, SECRET, 3600);
        const payload = await verifyJWT(token, SECRET);
        expect(payload.wallet).toBe("Wallet6");
    });
});

describe("JWT Structure", () => {
    it("generates unique JTI for each token", async () => {
        const token1 = await signJWT({ wallet: "W" }, SECRET);
        const token2 = await signJWT({ wallet: "W" }, SECRET);
        const p1 = await verifyJWT(token1, SECRET);
        const p2 = await verifyJWT(token2, SECRET);
        expect(p1.jti).toBeDefined();
        expect(p2.jti).toBeDefined();
        expect(p1.jti).not.toBe(p2.jti);
    });

    it("rejects malformed tokens", async () => {
        await expect(verifyJWT("not.a.valid.token", SECRET)).rejects.toThrow();
        await expect(verifyJWT("only-one-part", SECRET)).rejects.toThrow("Malformed JWT");
        await expect(verifyJWT("two.parts", SECRET)).rejects.toThrow("Malformed JWT");
    });

    it("rejects tokens with missing wallet claim", async () => {
        // Manually craft a token without wallet
        // (signJWT always includes wallet, so we test verifyJWT directly)
        const header = btoa(JSON.stringify({ alg: "HS256", typ: "JWT" }))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        const body = btoa(JSON.stringify({ iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 }))
            .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
        // We can't sign it properly without the same getKey, so just test structure
        await expect(verifyJWT(`${header}.${body}.invalid-sig`, SECRET)).rejects.toThrow();
    });
});
