/**
 * Authenticated API client for InstinctFi.
 *
 * All write operations (votes, polls, claims, etc.) go through
 * server-side API routes that verify the JWT before calling Supabase RPCs.
 * This prevents wallet impersonation attacks.
 */

import { getAuthToken } from "./supabase";

export interface ApiResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

/**
 * Make an authenticated POST request to a server-side API route.
 * Automatically includes the JWT from localStorage.
 *
 * @param path   API route path, e.g. "/api/rpc/cast-vote"
 * @param body   Request body (will be JSON-serialized)
 * @returns      Parsed JSON response
 */
export async function authenticatedFetch<T = any>(
    path: string,
    body: Record<string, any> = {}
): Promise<ApiResult<T>> {
    const token = getAuthToken();

    if (!token) {
        return { success: false, error: "not_authenticated" };
    }

    try {
        const res = await fetch(path, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
        });

        const json = await res.json();

        if (!res.ok) {
            return {
                success: false,
                error: json.error || `HTTP ${res.status}`,
            };
        }

        return json;
    } catch (e) {
        console.error(`[API] ${path} failed:`, e);
        return {
            success: false,
            error: "network_error",
        };
    }
}
