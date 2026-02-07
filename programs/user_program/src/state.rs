use anchor_lang::prelude::*;

/// All dollar amounts stored in CENTS. $1.00 = 100.
/// $5000 = 500_000 cents. $1000 = 100_000 cents.

#[account]
#[derive(InitSpace)]
pub struct UserAccount {
    /// Wallet pubkey = primary identity
    pub authority: Pubkey,
    /// Demo or real user
    pub is_demo: bool,

    // ── Balances (in cents: $1 = 100) ──
    pub demo_balance: u64,   // demo dollars in cents
    pub real_balance: u64,   // real dollars in cents (future use)

    // ── Reward tracking ──
    pub signup_bonus_claimed: bool,
    pub last_weekly_reward_ts: i64,

    // ── Vote stats ──
    pub total_votes: u64,
    pub total_wins: u64,
    pub total_losses: u64,

    // ── Earnings (in cents) ──
    pub total_winning_amount: u64,
    pub weekly_winning_amount: u64,
    pub monthly_winning_amount: u64,

    // ── Leaderboard reset timestamps ──
    pub weekly_reset_ts: i64,
    pub monthly_reset_ts: i64,

    // ── Creator stats ──
    pub polls_created: u64,
    pub creator_earnings: u64,

    // ── Timestamps ──
    pub created_at: i64,
    pub last_active_at: i64,

    /// PDA bump
    pub bump: u8,
}

impl UserAccount {
    /// $5000 signup bonus in cents
    pub const SIGNUP_BONUS: u64 = 500_000;
    /// $1000 weekly reward in cents
    pub const WEEKLY_REWARD: u64 = 100_000;
    /// 7 days in seconds
    pub const WEEK_SECONDS: i64 = 7 * 24 * 60 * 60;
    /// 30 days in seconds
    pub const MONTH_SECONDS: i64 = 30 * 24 * 60 * 60;

    /// Resets weekly stats if a week has passed
    pub fn maybe_reset_weekly(&mut self, now: i64) {
        if now - self.weekly_reset_ts >= Self::WEEK_SECONDS {
            self.weekly_winning_amount = 0;
            self.weekly_reset_ts = now;
        }
    }

    /// Resets monthly stats if a month has passed
    pub fn maybe_reset_monthly(&mut self, now: i64) {
        if now - self.monthly_reset_ts >= Self::MONTH_SECONDS {
            self.monthly_winning_amount = 0;
            self.monthly_reset_ts = now;
        }
    }

    /// Check & credit weekly reward if eligible
    pub fn maybe_credit_weekly_reward(&mut self, now: i64) -> bool {
        if self.is_demo && (now - self.last_weekly_reward_ts >= Self::WEEK_SECONDS) {
            self.demo_balance += Self::WEEKLY_REWARD;
            self.last_weekly_reward_ts = now;
            return true;
        }
        false
    }
}
