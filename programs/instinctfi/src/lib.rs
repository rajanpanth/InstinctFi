use anchor_lang::prelude::*;

pub mod state;
pub mod errors;
pub mod instructions;

use instructions::*;

declare_id!("Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS");

#[program]
pub mod instinctfi {
    use super::*;

    /// Create a user profile (PDA). Required before creating polls or voting.
    pub fn initialize_user(ctx: Context<InitializeUser>) -> Result<()> {
        instructions::initialize_user::handler(ctx)
    }

    /// Create a prediction poll with real SOL investment.
    pub fn create_poll(
        ctx: Context<CreatePoll>,
        poll_id: u64,
        title: String,
        description: String,
        category: String,
        image_url: String,
        options: Vec<String>,
        unit_price: u64,
        end_time: i64,
        creator_investment: u64,
    ) -> Result<()> {
        instructions::create_poll::handler(
            ctx, poll_id, title, description, category, image_url,
            options, unit_price, end_time, creator_investment,
        )
    }

    /// Edit a poll (creator only, zero votes, active, not ended).
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
            ctx, poll_id, title, description, category, image_url, options, end_time,
        )
    }

    /// Delete a poll and refund SOL to creator (zero votes, active, not ended).
    pub fn delete_poll(ctx: Context<DeletePoll>, poll_id: u64) -> Result<()> {
        instructions::delete_poll::handler(ctx, poll_id)
    }

    /// Buy option-coins by sending real SOL to the treasury.
    pub fn cast_vote(
        ctx: Context<CastVote>,
        poll_id: u64,
        option_index: u8,
        num_coins: u64,
    ) -> Result<()> {
        instructions::cast_vote::handler(ctx, poll_id, option_index, num_coins)
    }

    /// Settle a poll after end time. Anyone can call (permissionless).
    pub fn settle_poll(ctx: Context<SettlePoll>, poll_id: u64) -> Result<()> {
        instructions::settle_poll::handler(ctx, poll_id)
    }

    /// Claim winnings — real SOL transferred from treasury to winner.
    pub fn claim_reward(ctx: Context<ClaimReward>, poll_id: u64) -> Result<()> {
        instructions::claim_reward::handler(ctx, poll_id)
    }
}
