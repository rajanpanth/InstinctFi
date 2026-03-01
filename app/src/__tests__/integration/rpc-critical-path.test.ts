/**
 * @jest-environment node
 */

/**
 * Integration tests for the critical RPC path:
 *   signup → create-poll → cast-vote → settle-poll → claim-reward
 *
 * Tests exercise the real route handlers end-to-end with mocked
 * Supabase and JWT layers, validating auth, validation, sanitization,
 * and error handling at each step.
 */

import { NextRequest } from "next/server";

/* ────────────────────────────────────────────────────────────
 * Mocks — must be declared before any route imports
 * ──────────────────────────────────────────────────────────── */

const MOCK_WALLET = "7xKXtg2CW87d95ZxPVAe3TUrWhZPXfBFZs6X5woGhFa7";
const MOCK_ADMIN_WALLET = "AdminWallet1111111111111111111111111111111";

// Supabase mock
const mockRpc = jest.fn();
const mockFrom = jest.fn();
const mockSingle = jest.fn();
const mockSelect = jest.fn(() => ({ eq: jest.fn(() => ({ single: mockSingle })) }));
mockFrom.mockReturnValue({ select: mockSelect });

jest.mock("@/lib/supabaseAdmin", () => ({
    getSupabaseAdmin: () => ({
        rpc: mockRpc,
        from: mockFrom,
    }),
}));

// JWT mock
const mockGetWalletFromAuth = jest.fn();
jest.mock("@/lib/jwt", () => ({
    getWalletFromAuth: (...args: any[]) => mockGetWalletFromAuth(...args),
}));

// Rate limiter mock — uses an in-memory counter (same semantics as production fallback)
const rlMap = new Map<string, { count: number; resetAt: number }>();
jest.mock("@/lib/rateLimit", () => ({
    isRateLimited: async (wallet: string): Promise<boolean> => {
        const now = Date.now();
        const entry = rlMap.get(wallet);
        if (!entry || now >= entry.resetAt) {
            rlMap.set(wallet, { count: 1, resetAt: now + 60_000 });
            return false;
        }
        entry.count++;
        return entry.count > 30;
    },
}));

// Sanitize mock — passthrough (sanitize has its own unit tests)
jest.mock("@/lib/sanitize", () => ({
    sanitizeText: (s: string) => s,
    sanitizeUrl: (s: string) => s,
}));

/* ────────────────────────────────────────────────────────────
 * Route handler imports (after mocks)
 * ──────────────────────────────────────────────────────────── */

import { POST as signupHandler } from "@/app/api/rpc/signup/route";
import { POST as createPollHandler } from "@/app/api/rpc/create-poll/route";
import { POST as castVoteHandler } from "@/app/api/rpc/cast-vote/route";
import { POST as settlePollHandler } from "@/app/api/rpc/settle-poll/route";
import { POST as claimRewardHandler } from "@/app/api/rpc/claim-reward/route";

/* ────────────────────────────────────────────────────────────
 * Helpers
 * ──────────────────────────────────────────────────────────── */

function makeRequest(body: Record<string, any>, token = "valid-token"): NextRequest {
    return new NextRequest("http://localhost:3000/api/rpc/test", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(body),
    });
}

async function parseJson(res: Response) {
    return res.json();
}

/* ────────────────────────────────────────────────────────────
 * Tests
 * ──────────────────────────────────────────────────────────── */

beforeEach(() => {
    jest.clearAllMocks();
    mockGetWalletFromAuth.mockResolvedValue(MOCK_WALLET);
    mockRpc.mockResolvedValue({ data: { success: true }, error: null });
    mockSingle.mockResolvedValue({ data: null }); // non-admin by default
});

// ─── 1. Auth layer ──────────────────────────────────────────

describe("Auth layer", () => {
    it("rejects missing JWT with 401", async () => {
        mockGetWalletFromAuth.mockResolvedValue(null);
        const res = await signupHandler(makeRequest({}));
        expect(res.status).toBe(401);
        const body = await parseJson(res);
        expect(body.error).toBe("unauthorized");
    });

    it("passes wallet from JWT to Supabase RPC (never from client)", async () => {
        await signupHandler(makeRequest({ p_wallet: "attacker-wallet" }));
        expect(mockRpc).toHaveBeenCalledWith(
            "signup_user",
            expect.objectContaining({ p_wallet: MOCK_WALLET })
        );
    });
});

// ─── 2. Signup ──────────────────────────────────────────────

describe("POST /api/rpc/signup", () => {
    it("calls signup_user with wallet from JWT", async () => {
        const res = await signupHandler(makeRequest({}));
        expect(res.status).toBe(200);
        expect(mockRpc).toHaveBeenCalledWith("signup_user", { p_wallet: MOCK_WALLET });
    });

    it("returns Supabase error as 500", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "duplicate_user" } });
        const res = await signupHandler(makeRequest({}));
        expect(res.status).toBe(500);
        const body = await parseJson(res);
        expect(body.error).toBe("duplicate_user");
    });
});

// ─── 3. Create Poll ────────────────────────────────────────

describe("POST /api/rpc/create-poll", () => {
    const validBody = {
        p_id: "uuid-1234",
        p_poll_id: 1,
        p_title: "Will SOL hit $200?",
        p_description: "Prediction for Solana price",
        p_category: "crypto",
        p_image_url: "",
        p_option_images: ["", ""],
        p_options: ["Yes", "No"],
        p_unit_price_cents: 100,
        p_end_time: Math.floor(Date.now() / 1000) + 86400,
        p_creator_investment_cents: 0,
    };

    it("creates poll with valid input", async () => {
        const res = await createPollHandler(makeRequest(validBody));
        expect(res.status).toBe(200);
        expect(mockRpc).toHaveBeenCalledWith(
            "create_poll_atomic",
            expect.objectContaining({ p_title: "Will SOL hit $200?", p_wallet: MOCK_WALLET })
        );
    });

    it("rejects missing title (Zod validation) with 400", async () => {
        const res = await createPollHandler(makeRequest({ ...validBody, p_title: "" }));
        expect(res.status).toBe(400);
    });

    it("rejects title over 200 chars with 400", async () => {
        const res = await createPollHandler(makeRequest({ ...validBody, p_title: "x".repeat(201) }));
        expect(res.status).toBe(400);
    });

    it("rejects fewer than 2 options with 400", async () => {
        const res = await createPollHandler(makeRequest({ ...validBody, p_options: ["Only one"] }));
        expect(res.status).toBe(400);
    });

    it("rejects more than 20 options with 400", async () => {
        const opts = Array.from({ length: 21 }, (_, i) => `Option ${i}`);
        const res = await createPollHandler(makeRequest({ ...validBody, p_options: opts }));
        expect(res.status).toBe(400);
    });

    it("rejects negative unit_price_cents with 400", async () => {
        const res = await createPollHandler(makeRequest({ ...validBody, p_unit_price_cents: 0 }));
        expect(res.status).toBe(400);
    });
});

// ─── 4. Cast Vote ──────────────────────────────────────────

describe("POST /api/rpc/cast-vote", () => {
    const validBody = {
        p_poll_id: "poll-abc",
        p_option_index: 0,
        p_num_coins: 5,
    };

    it("casts vote with valid input", async () => {
        const res = await castVoteHandler(makeRequest(validBody));
        expect(res.status).toBe(200);
        expect(mockRpc).toHaveBeenCalledWith(
            "cast_vote_atomic",
            expect.objectContaining({
                p_wallet: MOCK_WALLET,
                p_poll_id: "poll-abc",
                p_option_index: 0,
                p_num_coins: 5,
            })
        );
    });

    it("rejects p_num_coins > 1000 with 400", async () => {
        const res = await castVoteHandler(makeRequest({ ...validBody, p_num_coins: 1001 }));
        expect(res.status).toBe(400);
    });

    it("rejects p_num_coins < 1 with 400", async () => {
        const res = await castVoteHandler(makeRequest({ ...validBody, p_num_coins: 0 }));
        expect(res.status).toBe(400);
    });

    it("rejects p_option_index < 0 with 400", async () => {
        const res = await castVoteHandler(makeRequest({ ...validBody, p_option_index: -1 }));
        expect(res.status).toBe(400);
    });

    it("rejects p_option_index > 19 with 400", async () => {
        const res = await castVoteHandler(makeRequest({ ...validBody, p_option_index: 20 }));
        expect(res.status).toBe(400);
    });

    it("returns Supabase error when vote fails", async () => {
        mockRpc.mockResolvedValue({ data: null, error: { message: "insufficient_balance" } });
        const res = await castVoteHandler(makeRequest(validBody));
        expect(res.status).toBe(500);
        const body = await parseJson(res);
        expect(body.error).toBe("insufficient_balance");
    });
});

// ─── 5. Settle Poll (admin-only) ───────────────────────────

describe("POST /api/rpc/settle-poll", () => {
    const validBody = { p_poll_id: "poll-abc" };

    it("rejects non-admin wallet with 403", async () => {
        mockSingle.mockResolvedValue({ data: null }); // not in admin_wallets table
        const res = await settlePollHandler(makeRequest(validBody));
        expect(res.status).toBe(403);
        const body = await parseJson(res);
        expect(body.error).toBe("not_admin");
    });

    it("settles poll when caller is admin", async () => {
        mockSingle.mockResolvedValue({ data: { wallet: MOCK_WALLET } }); // is admin
        const res = await settlePollHandler(makeRequest(validBody));
        expect(res.status).toBe(200);
        expect(mockRpc).toHaveBeenCalledWith(
            "settle_poll_atomic",
            expect.objectContaining({ p_wallet: MOCK_WALLET, p_poll_id: "poll-abc" })
        );
    });

    it("rejects missing p_poll_id with 400", async () => {
        mockSingle.mockResolvedValue({ data: { wallet: MOCK_WALLET } });
        const res = await settlePollHandler(makeRequest({}));
        expect(res.status).toBe(400);
    });
});

// ─── 6. Claim Reward ───────────────────────────────────────

describe("POST /api/rpc/claim-reward", () => {
    const validBody = { p_poll_id: "poll-abc" };

    it("claims reward with valid input", async () => {
        const res = await claimRewardHandler(makeRequest(validBody));
        expect(res.status).toBe(200);
        expect(mockRpc).toHaveBeenCalledWith(
            "claim_reward_atomic",
            expect.objectContaining({ p_wallet: MOCK_WALLET, p_poll_id: "poll-abc" })
        );
    });

    it("rejects missing p_poll_id with 400", async () => {
        const res = await claimRewardHandler(makeRequest({}));
        expect(res.status).toBe(400);
    });
});

// ─── 7. Rate Limiting ──────────────────────────────────────

describe("Rate limiting", () => {
    it("blocks after 30 requests in one minute", async () => {
        // Use a unique wallet so prior tests don't consume the quota
        const rlWallet = `RateLimitWallet_${Date.now()}`;
        mockGetWalletFromAuth.mockResolvedValue(rlWallet);

        // Fire 30 requests (should all succeed)
        for (let i = 0; i < 30; i++) {
            const res = await signupHandler(makeRequest({}));
            expect(res.status).toBe(200);
        }

        // 31st request should be rate limited
        const res = await signupHandler(makeRequest({}));
        expect(res.status).toBe(429);
        const body = await parseJson(res);
        expect(body.error).toBe("rate_limited");
    });
});

// ─── 8. Full Critical Path (happy path) ────────────────────

describe("Critical path: signup → create → vote → settle → claim", () => {
    it("completes the full lifecycle", async () => {
        // Use a unique wallet so rate limiter doesn't interfere
        const cpWallet = `CritPathWallet_${Date.now()}`;
        mockGetWalletFromAuth.mockResolvedValue(cpWallet);

        // Step 1: Signup
        mockRpc.mockResolvedValueOnce({ data: { success: true, balance: 1000 }, error: null });
        const signupRes = await signupHandler(makeRequest({}));
        expect(signupRes.status).toBe(200);
        expect(mockRpc).toHaveBeenLastCalledWith("signup_user", { p_wallet: cpWallet });

        // Step 2: Create poll
        mockRpc.mockResolvedValueOnce({ data: { success: true, poll_id: "new-poll" }, error: null });
        const createRes = await createPollHandler(
            makeRequest({
                p_id: "uuid-5678",
                p_poll_id: 1,
                p_title: "Test Poll",
                p_description: "A test",
                p_category: "test",
                p_image_url: "",
                p_option_images: ["", ""],
                p_options: ["Yes", "No"],
                p_unit_price_cents: 50,
                p_end_time: Math.floor(Date.now() / 1000) + 3600,
                p_creator_investment_cents: 0,
            })
        );
        expect(createRes.status).toBe(200);

        // Step 3: Cast vote
        mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
        const voteRes = await castVoteHandler(
            makeRequest({ p_poll_id: "new-poll", p_option_index: 0, p_num_coins: 3 })
        );
        expect(voteRes.status).toBe(200);

        // Step 4: Settle poll (admin)
        mockSingle.mockResolvedValue({ data: { wallet: cpWallet } }); // admin check
        mockRpc.mockResolvedValueOnce({ data: { success: true }, error: null });
        const settleRes = await settlePollHandler(
            makeRequest({ p_poll_id: "new-poll" })
        );
        expect(settleRes.status).toBe(200);

        // Step 5: Claim reward
        mockRpc.mockResolvedValueOnce({ data: { success: true, reward: 150 }, error: null });
        const claimRes = await claimRewardHandler(
            makeRequest({ p_poll_id: "new-poll" })
        );
        expect(claimRes.status).toBe(200);
    });
});
