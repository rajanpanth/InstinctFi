/**
 * Unit tests for jwt.ts — HMAC-SHA256 JWT utilities.
 *
 * Note: crypto.subtle must be available. In Node 20+ jsdom it should be.
 * If not, the tests will skip gracefully.
 */
import { signJWT, verifyJWT, getWalletFromAuth } from "../jwt";

const TEST_SECRET = "test-secret-key-for-unit-tests-only";

// crypto.subtle may not be available in all test environments
const hasCrypto = typeof crypto !== "undefined" && crypto.subtle;

const describeIfCrypto = hasCrypto ? describe : describe.skip;

describeIfCrypto("signJWT", () => {
    it("produces a 3-part JWT string", async () => {
        const token = await signJWT({ wallet: "wallet-abc" }, TEST_SECRET);
        const parts = token.split(".");
        expect(parts).toHaveLength(3);
    });

    it("includes wallet, iat, exp, jti, iss, aud claims", async () => {
        const token = await signJWT({ wallet: "wallet-abc" }, TEST_SECRET);
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        expect(payload.wallet).toBe("wallet-abc");
        expect(payload.iat).toBeGreaterThan(0);
        expect(payload.exp).toBeGreaterThan(payload.iat);
        expect(payload.jti).toBeDefined();
        expect(payload.iss).toBe("instinctfi");
        expect(payload.aud).toBe("instinctfi-api");
    });

    it("respects custom TTL", async () => {
        const token = await signJWT({ wallet: "w" }, TEST_SECRET, 60);
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        expect(payload.exp - payload.iat).toBe(60);
    });

    it("defaults to 1 hour TTL", async () => {
        const token = await signJWT({ wallet: "w" }, TEST_SECRET);
        const payload = JSON.parse(atob(token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/")));
        expect(payload.exp - payload.iat).toBe(3600);
    });
});

describeIfCrypto("verifyJWT", () => {
    it("verifies a valid token", async () => {
        const token = await signJWT({ wallet: "wallet-xyz" }, TEST_SECRET);
        const payload = await verifyJWT(token, TEST_SECRET);
        expect(payload.wallet).toBe("wallet-xyz");
        expect(payload.iss).toBe("instinctfi");
        expect(payload.aud).toBe("instinctfi-api");
    });

    it("rejects a tampered token", async () => {
        const token = await signJWT({ wallet: "w" }, TEST_SECRET);
        const tampered = token.slice(0, -5) + "XXXXX";
        await expect(verifyJWT(tampered, TEST_SECRET)).rejects.toThrow("Invalid JWT signature");
    });

    it("rejects an expired token", async () => {
        const token = await signJWT(
            { wallet: "w", iat: 1000, exp: 1001 },
            TEST_SECRET
        );
        await expect(verifyJWT(token, TEST_SECRET)).rejects.toThrow("JWT expired");
    });

    it("rejects a malformed token (wrong number of parts)", async () => {
        await expect(verifyJWT("a.b", TEST_SECRET)).rejects.toThrow("Malformed JWT");
        await expect(verifyJWT("a.b.c.d", TEST_SECRET)).rejects.toThrow("Malformed JWT");
    });

    it("rejects wrong secret", async () => {
        const token = await signJWT({ wallet: "w" }, TEST_SECRET);
        await expect(verifyJWT(token, "wrong-secret")).rejects.toThrow("Invalid JWT signature");
    });
});

describeIfCrypto("getWalletFromAuth", () => {
    const originalEnv = process.env;

    beforeEach(() => {
        process.env = { ...originalEnv, AUTH_JWT_SECRET: TEST_SECRET };
    });

    afterEach(() => {
        process.env = originalEnv;
    });

    it("returns wallet from a valid Bearer token", async () => {
        const token = await signJWT({ wallet: "wallet-123" }, TEST_SECRET);
        const wallet = await getWalletFromAuth(`Bearer ${token}`);
        expect(wallet).toBe("wallet-123");
    });

    it("returns null for missing header", async () => {
        expect(await getWalletFromAuth(null)).toBeNull();
    });

    it("returns null for non-Bearer header", async () => {
        expect(await getWalletFromAuth("Basic abc123")).toBeNull();
    });

    it("returns null for invalid token", async () => {
        const consoleSpy = jest.spyOn(console, "warn").mockImplementation();
        expect(await getWalletFromAuth("Bearer invalid.token.here")).toBeNull();
        consoleSpy.mockRestore();
    });

    it("returns null when AUTH_JWT_SECRET is missing", async () => {
        delete process.env.AUTH_JWT_SECRET;
        const consoleSpy = jest.spyOn(console, "error").mockImplementation();
        const token = await signJWT({ wallet: "w" }, TEST_SECRET);
        expect(await getWalletFromAuth(`Bearer ${token}`)).toBeNull();
        consoleSpy.mockRestore();
    });
});
