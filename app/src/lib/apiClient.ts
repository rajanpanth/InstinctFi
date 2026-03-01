/**
 * Authenticated API client for InstinctFi.
 *
 * All write operations (votes, polls, claims, etc.) go through
 * server-side API routes that verify the JWT before calling Supabase RPCs.
 * This prevents wallet impersonation attacks.
 */

import { getAuthToken, isAuthTokenValid } from "./supabase";

export interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

// ── Global re-authentication callback ──────────────────────────────────
// Set by the wallet manager hook so apiClient can trigger re-auth
// without importing React hooks.
let _reauthenticate: (() => Promise<boolean>) | null = null;

/** Register a re-authentication callback (called from useWalletManager). */
export function setReauthenticateCallback(fn: () => Promise<boolean>) {
    _reauthenticate = fn;
}

/** Clear the callback on disconnect. */
export function clearReauthenticateCallback() {
    _reauthenticate = null;
}

/**
 * Make an authenticated POST request to a server-side API route.
 * Automatically includes the JWT from localStorage.
 * If the token is expired/expiring, attempts to re-authenticate first.
 *
 * @param path   API route path, e.g. "/api/rpc/cast-vote"
 * @param body   Request body (will be JSON-serialized)
 * @returns      Parsed JSON response
 */
// #31: Default request timeout (ms) — 30s to tolerate devnet / Supabase latency
const REQUEST_TIMEOUT_MS = 30_000;

// #32: Retry config for transient errors
const MAX_RETRIES = 2;
const RETRY_STATUS_CODES = [502, 503, 504];
const RETRY_BASE_DELAY_MS = 500;

// #59: In-flight request deduplication to prevent double-submit
const _inflight = new Map<string, Promise<ApiResult<any>>>();

// #58: Classify network errors for better UX
export function classifyNetworkError(e: unknown): string {
    if (typeof navigator !== "undefined" && !navigator.onLine) return "network_offline";
    if (e instanceof TypeError) {
        const msg = e.message.toLowerCase();
        if (msg.includes("failed to fetch") || msg.includes("networkerror")) return "network_offline";
        if (msg.includes("cors") || msg.includes("cross-origin")) return "network_cors_error";
    }
    return "network_unknown";
}

export async function authenticatedFetch<T = any>(
    path: string,
    body: Record<string, any> = {}
): Promise<ApiResult<T>> {
    // #59: Deduplicate identical in-flight requests
    const dedupeKey = `${path}:${JSON.stringify(body)}`;
    const existing = _inflight.get(dedupeKey);
    if (existing) return existing as Promise<ApiResult<T>>;

    const promise = _authenticatedFetchInner<T>(path, body);
    _inflight.set(dedupeKey, promise);
    promise.finally(() => _inflight.delete(dedupeKey));
    return promise;
}

async function _authenticatedFetchInner<T = any>(
    path: string,
    body: Record<string, any> = {}
): Promise<ApiResult<T>> {
    // ── Pre-flight token check: auto-refresh if expired ──
    if (!isAuthTokenValid()) {
        if (_reauthenticate) {
            const refreshed = await _reauthenticate();
            if (!refreshed) {
                return { success: false, error: "session_expired" };
            }
        } else {
            return { success: false, error: "session_expired" };
        }
    }

    const token = getAuthToken();
    if (!token) {
        return { success: false, error: "not_authenticated" };
    }

    // #32: Retry loop for transient errors
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        // #31: AbortController for request timeout
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        try {
            const res = await fetch(path, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(body),
                signal: controller.signal,
            });

            clearTimeout(timeoutId);

            // #32: Retry on transient server errors
            if (RETRY_STATUS_CODES.includes(res.status) && attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                continue;
            }

            // #33: Check Content-Type before calling res.json()
            const contentType = res.headers.get("content-type") || "";
            if (!contentType.includes("application/json")) {
                const text = await res.text();
                console.error(`[API] ${path} returned non-JSON (${contentType}):`, text.slice(0, 200));
                return {
                    success: false,
                    error: res.ok ? "unexpected_response_format" : `HTTP ${res.status}`,
                };
            }

            const json = await res.json();

            if (!res.ok) {
                return {
                    success: false,
                    error: json.error || `HTTP ${res.status}`,
                };
            }

            return json;
        } catch (e) {
            clearTimeout(timeoutId);

            // Distinguish timeout from other errors
            if (e instanceof DOMException && e.name === "AbortError") {
                console.error(`[API] ${path} timed out after ${REQUEST_TIMEOUT_MS}ms`);
                return { success: false, error: "request_timeout" };
            }

            // On network error, retry if attempts remain
            if (attempt < MAX_RETRIES) {
                await new Promise(r => setTimeout(r, RETRY_BASE_DELAY_MS * Math.pow(2, attempt)));
                continue;
            }

            // #58: Classify the network error for better UX
            console.error(`[API] ${path} failed:`, e);
            return {
                success: false,
                error: classifyNetworkError(e),
            };
        }
    }

    // Should never reach here, but TypeScript needs it
    return { success: false, error: "network_unknown" };
}
