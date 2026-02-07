use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("UserPrgm11111111111111111111111111111111111");

/// Dollar amounts stored as cents (u64). $1.00 = 100 cents.
/// This avoids floating point and matches on-chain precision.

#[program]
pub mod user_program {
    use super::*;

    /// Sign up a new user. Awards $5000 signup bonus (demo mode).
    pub fn signup(ctx: Context<Signup>, is_demo: bool) -> Result<()> {
        instructions::signup::handler(ctx, is_demo)
    }

    /// Claim weekly reward ($1000 demo dollars). Auto-called on login.
    pub fn claim_weekly_reward(ctx: Context<ClaimWeeklyReward>) -> Result<()> {
        instructions::claim_weekly_reward::handler(ctx)
    }
}
