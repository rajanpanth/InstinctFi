/**
 * Zod validation schemas for RPC route inputs.
 * Used by API route handlers to validate body params before calling Supabase RPCs.
 */

import { z } from "zod";
import { CATEGORIES } from "@/lib/constants";

// ── Common validators ───────────────────────────────────────────────────

const uuidString = z.string().min(1, "poll_id is required").max(200);
const walletString = z.string().min(32).max(64);

// ── Cast Vote ───────────────────────────────────────────────────────────

export const CastVoteInput = z.object({
    p_poll_id: uuidString,
    p_option_index: z.number().int().min(0).max(19, "option_index must be 0-19"),
    p_num_coins: z.number().int().min(1, "Must vote at least 1 coin").max(1000, "Max 1000 coins per vote"),
});

// ── Create Poll ─────────────────────────────────────────────────────────

export const CreatePollInput = z.object({
    p_id: uuidString,
    p_poll_id: z.number().int().min(0),
    p_title: z.string().min(1, "Title is required").max(200, "Title too long"),
    p_description: z.string().max(2000).optional().default(""),
    p_category: z.string().min(1).max(50),
    p_image_url: z.string().max(2000).optional().default(""),
    p_option_images: z.array(z.string().max(2000).nullable()).max(20).optional().default([]),
    p_options: z.array(z.string().min(1).max(200)).min(2, "At least 2 options").max(20, "Max 20 options"),
    p_unit_price_cents: z.number().int().min(1, "Price must be positive"),
    p_end_time: z.number().int().min(1, "End time is required"),
    p_creator_investment_cents: z.number().int().min(0).optional().default(0),
});

// ── Edit Poll ───────────────────────────────────────────────────────────

export const EditPollInput = z.object({
    p_poll_id: uuidString,
    p_title: z.string().min(1).max(200).optional(),
    p_description: z.string().max(2000).optional(),
    p_category: z.string().min(1).max(50).optional(),
    p_image_url: z.string().max(2000).optional(),
    p_option_images: z.array(z.string().max(2000).nullable()).max(20).optional(),
    p_options: z.array(z.string().min(1).max(200)).min(2).max(20).optional(),
    p_end_time: z.number().int().min(1).optional(),
});

// ── Delete/Settle/Claim (poll_id only) ──────────────────────────────────

export const PollIdInput = z.object({
    p_poll_id: uuidString,
});

// ── Comment ─────────────────────────────────────────────────────────────

export const CommentInput = z.object({
    p_poll_id: uuidString,
    p_text: z.string().min(1, "Comment cannot be empty").max(500, "Comment too long (max 500 chars)"),
});
// ── React Comment (BUG-04 FIX) ─────────────────────────────────────────────────────

export const ReactCommentInput = z.object({
    p_comment_id: z.string().uuid("Invalid comment ID"),
    p_emoji: z.string().min(1).max(10, "Emoji too long"),
});
// ── Helper: create a validator function from a Zod schema ───────────────

export function zodValidator<T extends z.ZodTypeAny>(schema: T) {
    return (body: unknown) => {
        const result = schema.safeParse(body);
        if (!result.success) {
            const firstError = result.error.errors[0];
            throw new Error(firstError?.message || "Invalid input");
        }
    };
}
