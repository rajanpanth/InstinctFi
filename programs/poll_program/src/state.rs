use anchor_lang::prelude::*;

// ─── Poll Account ───────────────────────────────────────────────────────────
// PDA seed: ["poll", creator.key, poll_id.to_le_bytes()]
// All monetary values in CENTS ($1 = 100 cents).
#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    /// Unique poll id (set by creator, scoped per creator)
    pub poll_id: u64,
    /// Creator's public key
    pub creator: Pubkey,
    /// Poll title (max 64 chars)
    #[max_len(64)]
    pub title: String,
    /// Poll description (max 256 chars)
    #[max_len(256)]
    pub description: String,
    /// Category tag (max 32 chars)
    #[max_len(32)]
    pub category: String,
    /// Off-chain image URL (max 256 chars, optional — empty = no image)
    #[max_len(256)]
    pub image_url: String,
    /// Option labels, e.g. ["Option A", "Option B", "Option C"]
    #[max_len(6, 32)]
    pub options: Vec<String>,
    /// Vote tally per option (same index as options)
    #[max_len(6)]
    pub vote_counts: Vec<u64>,
    /// Price per option-coin in cents ($1 = 100)
    pub unit_price_cents: u64,
    /// Unix timestamp when poll ends
    pub end_time: i64,
    /// Total cents in the pool (creator seed + all votes)
    pub total_pool_cents: u64,
    /// Creator's initial investment in cents
    pub creator_investment_cents: u64,
    /// Platform fee collected in cents (1%)
    pub platform_fee_cents: u64,
    /// Creator reward reserved in cents (1%)
    pub creator_reward_cents: u64,
    /// Poll status: 0=Active, 1=Settled, 2=Cancelled
    pub status: u8,
    /// Winning option index (set at settlement, 255 = unset)
    pub winning_option: u8,
    /// Treasury PDA bump (kept for PDA derivation compatibility)
    pub treasury_bump: u8,
    /// Poll account PDA bump
    pub bump: u8,
    /// Total number of unique voters
    pub total_voters: u32,
    /// Created at timestamp
    pub created_at: i64,
}

impl PollAccount {
    pub const STATUS_ACTIVE: u8 = 0;
    pub const STATUS_SETTLED: u8 = 1;
    pub const STATUS_CANCELLED: u8 = 2;

    pub fn is_active(&self) -> bool {
        self.status == Self::STATUS_ACTIVE
    }

    pub fn is_ended(&self, clock: &Clock) -> bool {
        clock.unix_timestamp >= self.end_time
    }
}
