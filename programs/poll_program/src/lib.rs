use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("Po11CrtrPrgm1111111111111111111111111111111");

#[program]
pub mod poll_program {
    use super::*;

    /// Creates a new poll.
    /// All monetary values in CENTS ($1 = 100).
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        title: String,
        description: String,
        category: String,
        options: Vec<String>,
        unit_price_cents: u64,
        end_time: i64,
        creator_investment_cents: u64,
    ) -> Result<()> {
        instructions::create_poll::handler(
            ctx,
            poll_id,
            title,
            description,
            category,
            options,
            unit_price_cents,
            end_time,
            creator_investment_cents,
        )
    }
}
