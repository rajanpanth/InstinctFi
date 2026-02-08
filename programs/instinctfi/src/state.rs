use anchor_lang::prelude::*;

// ─── User Account ───────────────────────────────────────────────────────────
// PDA seeds: ["user", authority.key]
// Tracks user stats. No "demo balance" — all value is real SOL.
#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    /// Wallet public key (owner)
    pub authority: Pubkey,
    /// Total polls created
    pub total_polls_created: u64,
    /// Total vote-coins purchased across all polls
    pub total_votes_cast: u64,
    /// Number of polls won
    pub polls_won: u64,
    /// Total lamports staked across all polls
    pub total_staked: u64,
    /// Total lamports won across all polls
    pub total_winnings: u64,
    /// Account creation timestamp
    pub created_at: i64,
    /// PDA bump
    pub bump: u8,
}

// ─── Poll Account ───────────────────────────────────────────────────────────
// PDA seeds: ["poll", creator.key, poll_id.to_le_bytes()]
// All monetary values in LAMPORTS.
#[account]
#[derive(InitSpace)]
pub struct PollAccount {
    /// Unique poll id (scoped per creator)
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
    /// Off-chain image URL (max 256 chars)
    #[max_len(256)]
    pub image_url: String,
    /// Option labels (2–6 options, max 32 chars each)
    #[max_len(6, 32)]
    pub options: Vec<String>,
    /// Vote tally per option (same index)
    #[max_len(6)]
    pub vote_counts: Vec<u64>,
    /// Price per option-coin in lamports
    pub unit_price: u64,
    /// Unix timestamp when poll ends
    pub end_time: i64,
    /// Distributable pool in lamports (excludes fees)
    pub total_pool: u64,
    /// Creator's initial investment in lamports
    pub creator_investment: u64,
    /// Platform fee in lamports (1%, stays in treasury)
    pub platform_fee: u64,
    /// Creator reward in lamports (1%, sent to creator on settlement)
    pub creator_reward: u64,
    /// 0 = Active, 1 = Settled
    pub status: u8,
    /// Winning option index (255 = unset)
    pub winning_option: u8,
    /// Treasury PDA bump
    pub treasury_bump: u8,
    /// Poll account PDA bump
    pub bump: u8,
    /// Total unique voters
    pub total_voters: u32,
    /// Created-at timestamp
    pub created_at: i64,
}

impl PollAccount {
    pub const STATUS_ACTIVE: u8 = 0;
    pub const STATUS_SETTLED: u8 = 1;

    pub fn is_active(&self) -> bool {
        self.status == Self::STATUS_ACTIVE
    }

    pub fn is_ended(&self, clock: &Clock) -> bool {
        clock.unix_timestamp >= self.end_time
    }
}

// ─── Vote Account ───────────────────────────────────────────────────────────
// PDA seeds: ["vote", poll_account.key, voter.key]
// Tracks a single user's votes across all options in one poll.
#[account]
#[derive(InitSpace)]
pub struct VoteAccount {
    /// The poll this vote belongs to
    pub poll: Pubkey,
    /// The voter's public key
    pub voter: Pubkey,
    /// Option-coins bought per option
    #[max_len(6)]
    pub votes_per_option: Vec<u64>,
    /// Total lamports staked in this poll
    pub total_staked: u64,
    /// Whether rewards have been claimed
    pub claimed: bool,
    /// PDA bump
    pub bump: u8,
}
