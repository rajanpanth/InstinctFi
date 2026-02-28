import { z } from "zod";

// ── Supabase Row Schemas ────────────────────────────────────────────────

/** Validates a poll row from Supabase */
export const PollRowSchema = z.object({
    id: z.string(),
    // #42: Accept both number and string for poll_id to prevent u64 precision loss
    poll_id: z.union([z.number(), z.string()]).transform(v => String(v)),
    creator: z.string(),
    title: z.string(),
    description: z.string().nullable().default(""),
    category: z.string().default("General"),
    image_url: z.string().nullable().default(""),
    option_images: z.array(z.string().nullable()).nullable().default([]),
    options: z.array(z.string()),
    unit_price_cents: z.number(),
    end_time: z.number(),
    creator_investment_cents: z.number().default(0),
    status: z.number().default(0),
    winning_option: z.number().default(255),
    vote_counts: z.array(z.number()).default([]),
    total_pool_cents: z.number().default(0),
    platform_fee_cents: z.number().default(0),
    creator_reward_cents: z.number().default(0),
    total_voters: z.number().default(0),
    created_at: z.string().nullable(),
}).transform(row => {
    // #62: Ensure vote_counts.length matches options.length
    // Pad with zeros if shorter, truncate if longer
    const expectedLen = row.options.length;
    if (row.vote_counts.length !== expectedLen) {
        const padded = Array.from({ length: expectedLen }, (_, i) => row.vote_counts[i] ?? 0);
        return { ...row, vote_counts: padded };
    }
    return row;
});

export type PollRow = z.infer<typeof PollRowSchema>;

/** Validates a vote row from Supabase */
export const VoteRowSchema = z.object({
    poll_id: z.string(),
    voter: z.string(),
    // #62: votes_per_option length is validated at usage site (needs poll context)
    votes_per_option: z.array(z.number()).min(1, "Must have at least 1 option vote"),
    total_staked_cents: z.number(),
    claimed: z.boolean().default(false),
});

export type VoteRow = z.infer<typeof VoteRowSchema>;

/** Validates a user row from Supabase */
export const UserRowSchema = z.object({
    wallet: z.string(),
    signup_bonus_claimed: z.boolean().default(false),
    last_weekly_reward_ts: z.number().default(0),
    polls_created: z.number().default(0),
    total_votes_cast: z.number().default(0),
    total_polls_voted: z.number().default(0),
    polls_won: z.number().default(0),
    total_spent_cents: z.number().default(0),
    total_winnings_cents: z.number().default(0),
    creator_earnings_cents: z.number().default(0),
    balance: z.number().default(0),
    weekly_winnings_cents: z.number().default(0),
    monthly_winnings_cents: z.number().default(0),
    weekly_spent_cents: z.number().default(0),
    monthly_spent_cents: z.number().default(0),
    weekly_reset_ts: z.number().default(0),
    monthly_reset_ts: z.number().default(0),
    created_at: z.string().nullable().optional(),
});

export type UserRow = z.infer<typeof UserRowSchema>;

/** Validates a comment row from Supabase */
export const CommentRowSchema = z.object({
    id: z.string().optional(),
    poll_id: z.string(),
    wallet: z.string(),
    text: z.string().min(1).max(500),
    created_at: z.string().nullable(),
});

export type CommentRow = z.infer<typeof CommentRowSchema>;

// ── Helpers ─────────────────────────────────────────────────────────────

/** Safely parse a Supabase row with validation, logging warnings for bad data */
export function safeParsePollRow(data: unknown): PollRow | null {
    const result = PollRowSchema.safeParse(data);
    if (!result.success) {
        console.warn("[Schema] Invalid poll row:", result.error.format());
        return null;
    }
    return result.data;
}

export function safeParseVoteRow(data: unknown): VoteRow | null {
    const result = VoteRowSchema.safeParse(data);
    if (!result.success) {
        console.warn("[Schema] Invalid vote row:", result.error.format());
        return null;
    }
    return result.data;
}

export function safeParseUserRow(data: unknown): UserRow | null {
    const result = UserRowSchema.safeParse(data);
    if (!result.success) {
        console.warn("[Schema] Invalid user row:", result.error.format());
        return null;
    }
    return result.data;
}
