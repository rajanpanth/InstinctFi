use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("VotePrgm11111111111111111111111111111111111");

#[program]
pub mod vote_program {
    use super::*;

    /// Buy option-coins (= cast votes) on a poll.
    /// Each coin costs unit_price_cents. Internal dollar accounting.
    pub fn cast_vote(
        ctx: Context<CastVote>,
        poll_id: u64,
        option_index: u8,
        num_coins: u64,
    ) -> Result<()> {
        instructions::cast_vote::handler(ctx, poll_id, option_index, num_coins)
    }
}
