use anchor_lang::prelude::*;

pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("Sett1ePrgm1111111111111111111111111111111111");

#[program]
pub mod settlement_program {
    use super::*;

    /// Settle a poll: determine winning option (most votes).
    /// Can only be called after end_time. Sets poll status to Settled.
    pub fn settle_poll(
        ctx: Context<SettlePoll>,
        poll_id: u64,
    ) -> Result<()> {
        instructions::settle_poll::handler(ctx, poll_id)
    }

    /// Claim reward: winning voters call this to get their share.
    /// reward = (user_winning_votes / total_winning_votes) * total_pool
    /// Creator reward and platform fee are also distributed here on first claim.
    pub fn claim_reward(
        ctx: Context<ClaimReward>,
        poll_id: u64,
    ) -> Result<()> {
        instructions::claim_reward::handler(ctx, poll_id)
    }
}
