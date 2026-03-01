/**
 * S-07 FIX: Production-grade rate limiter.
 *
 * Uses @upstash/ratelimit + @upstash/redis when UPSTASH_REDIS_REST_URL is configured.
 * Falls back to the in-memory Map implementation for local dev / when Upstash is not set.
 *
 * Configuration via environment variables:
 *   UPSTASH_REDIS_REST_URL   — Upstash REST URL (from dashboard)
 *   UPSTASH_REDIS_REST_TOKEN — Upstash REST token (from dashboard)
 *
 * Free tier: 10K commands/day — enough for beta.
 */

// ── Types ───────────────────────────────────────────────────────────────────

interface RateLimitResult {
    limited: boolean;
    /** Remaining requests in the window */
    remaining: number;
    /** Unix ms when the window resets */
    resetAt: number;
}

interface RateLimiter {
    check(key: string): Promise<RateLimitResult>;
}

// ── Configuration ───────────────────────────────────────────────────────────

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 30;  // per wallet per window

// ── In-memory fallback (for local dev) ──────────────────────────────────────

function createMemoryLimiter(): RateLimiter {
    const map = new Map<string, { count: number; resetAt: number }>();
    let lastPrune = Date.now();
    const PRUNE_INTERVAL = 5 * 60_000;

    return {
        async check(key: string): Promise<RateLimitResult> {
            const now = Date.now();

            // Lazy prune
            if (now - lastPrune > PRUNE_INTERVAL) {
                lastPrune = now;
                map.forEach((v, k) => {
                    if (now >= v.resetAt) map.delete(k);
                });
            }

            const entry = map.get(key);
            if (!entry || now >= entry.resetAt) {
                map.set(key, { count: 1, resetAt: now + WINDOW_MS });
                return { limited: false, remaining: MAX_REQUESTS - 1, resetAt: now + WINDOW_MS };
            }

            entry.count++;
            const remaining = Math.max(0, MAX_REQUESTS - entry.count);
            return {
                limited: entry.count > MAX_REQUESTS,
                remaining,
                resetAt: entry.resetAt,
            };
        },
    };
}

// ── Upstash Redis limiter ───────────────────────────────────────────────────

async function createUpstashLimiter(): Promise<RateLimiter | null> {
    const url = process.env.UPSTASH_REDIS_REST_URL;
    const token = process.env.UPSTASH_REDIS_REST_TOKEN;
    if (!url || !token) return null;

    try {
        const { Redis } = await import("@upstash/redis");
        const { Ratelimit } = await import("@upstash/ratelimit");

        const redis = new Redis({ url, token });
        const ratelimit = new Ratelimit({
            redis,
            limiter: Ratelimit.slidingWindow(MAX_REQUESTS, `${WINDOW_MS / 1000} s`),
            analytics: true,
            prefix: "instinctfi:rl",
        });

        return {
            async check(key: string): Promise<RateLimitResult> {
                const result = await ratelimit.limit(key);
                return {
                    limited: !result.success,
                    remaining: result.remaining,
                    resetAt: result.reset,
                };
            },
        };
    } catch (e) {
        console.warn("[RateLimit] Failed to initialize Upstash — falling back to in-memory:", (e as Error).message);
        return null;
    }
}

// ── Singleton ───────────────────────────────────────────────────────────────

let _limiter: RateLimiter | null = null;
let _initPromise: Promise<RateLimiter> | null = null;

async function getLimiter(): Promise<RateLimiter> {
    if (_limiter) return _limiter;
    if (_initPromise) return _initPromise;

    _initPromise = (async () => {
        const upstash = await createUpstashLimiter();
        _limiter = upstash ?? createMemoryLimiter();
        if (upstash) {
            console.log("[RateLimit] Using Upstash Redis rate limiter");
        } else {
            console.log("[RateLimit] Using in-memory rate limiter (dev/fallback)");
        }
        return _limiter;
    })();

    return _initPromise;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Check if a wallet has exceeded the rate limit.
 * Returns { limited, remaining, resetAt }.
 */
export async function checkRateLimit(wallet: string): Promise<RateLimitResult> {
    const limiter = await getLimiter();
    return limiter.check(wallet);
}

/**
 * Simple boolean check — backward compatible with old `isRateLimited(wallet)`.
 */
export async function isRateLimited(wallet: string): Promise<boolean> {
    const result = await checkRateLimit(wallet);
    return result.limited;
}
