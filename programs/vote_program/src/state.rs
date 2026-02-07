use anchor_lang::prelude::*;

// ─── Vote Record ────────────────────────────────────────────────────────────
// PDA seed: ["vote", poll_account.key, voter.key]
// Tracks a single user's votes across all options in one poll.
// All monetary values in CENTS ($1 = 100).
#[account]
#[derive(InitSpace)]
pub struct VoteAccount {
    /// The poll this vote belongs to
    pub poll: Pubkey,
    /// The voter's public key
    pub voter: Pubkey,
    /// Number of option-coins bought per option (same indices as poll.options)
    #[max_len(6)]
    pub votes_per_option: Vec<u64>,
    /// Total cents this voter has staked in this poll
    pub total_staked_cents: u64,
    /// Whether this voter has claimed rewards (post-settlement)
    pub claimed: bool,
    /// Bump for PDA
    pub bump: u8,
}
