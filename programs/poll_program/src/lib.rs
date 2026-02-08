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
        image_url: String,
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
            image_url,
            options,
            unit_price_cents,
            end_time,
            creator_investment_cents,
        )
    }

    /// Edits an existing poll (creator-only, zero votes, active, not ended).
    pub fn edit_poll(
        ctx: Context<EditPoll>,
        poll_id: u64,
        title: String,
        description: String,
        category: String,
        image_url: String,
        options: Vec<String>,
        end_time: i64,
    ) -> Result<()> {
        instructions::edit_poll::handler(
            ctx,
            poll_id,
            title,
            description,
            category,
            image_url,
            options,
            end_time,
        )
    }

    /// Deletes a poll and refunds the creator (creator-only, zero votes, active, not ended).
    pub fn delete_poll(ctx: Context<DeletePoll>, poll_id: u64) -> Result<()> {
        instructions::delete_poll::handler(ctx, poll_id)
    }

    /// CPI-callable: Records a vote on a poll (called by vote_program via CPI).
    pub fn record_vote(
        ctx: Context<RecordVote>,
        poll_id: u64,
        option_index: u8,
        num_coins: u64,
        cost: u64,
        is_new_voter: bool,
    ) -> Result<()> {
        instructions::record_vote::handler(ctx, poll_id, option_index, num_coins, cost, is_new_voter)
    }

    /// CPI-callable: Settles a poll (called by settlement_program via CPI).
    pub fn settle_poll_cpi(
        ctx: Context<SettlePollCpi>,
        poll_id: u64,
        winning_option: u8,
    ) -> Result<()> {
        instructions::settle_cpi::handler(ctx, poll_id, winning_option)
    }
}
