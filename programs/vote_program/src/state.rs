use anchor_lang::prelude::*;

// ─── Vote Record ────────────────────────────────────────────────────────────
// PDA seed: ["vote", poll_account.key, voter.key]
// Tracks a single user's votes across all options in one poll.
// All monetary values in lamports (1 SOL = 1e9 lamports).
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
    /// Total lamports this voter has staked in this poll
    pub total_staked_cents: u64,
    /// Whether this voter has claimed rewards (post-settlement)
    pub claimed: bool,
    /// The reward amount credited when claimed (in lamports)
    pub reward_amount: u64,
    /// Bump for PDA
    pub bump: u8,
}
