use anchor_lang::prelude::*;

use crate::state::VoteAccount;
use crate::errors::VoteError;

/// Hardcoded settlement_program ID to avoid circular dependency.
mod settlement_program_id {
    anchor_lang::declare_id!("Sett1ePrgm111111111111111111111111111111111");
}

/// CPI-callable instruction: marks a vote as claimed and sets the reward amount.
/// Only the settlement_program may call this via CPI — enforced by requiring a PDA
/// signer that only the settlement_program can produce via invoke_signed.
pub fn handler(
    ctx: Context<MarkClaimed>,
    _poll_id: u64,
    reward_amount: u64,
) -> Result<()> {
    let vote = &mut ctx.accounts.vote_account;

    require!(!vote.claimed, VoteError::AlreadyClaimed);

    vote.claimed = true;
    vote.reward_amount = reward_amount;

    msg!(
        "MarkClaimed: voter={} reward={}",
        vote.voter,
        reward_amount,
    );
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct MarkClaimed<'info> {
    /// The claimer
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// Vote record for this user on this poll (owned by vote_program)
    #[account(
        mut,
        seeds = [b"vote", vote_account.poll.as_ref(), claimer.key().as_ref()],
        bump = vote_account.bump,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    /// CPI authority PDA from settlement_program — proves CPI origin.
    /// Only settlement_program can sign for seeds [b"cpi_authority"] via invoke_signed.
    /// CHECK: Verified by seeds constraint against settlement_program ID.
    #[account(
        seeds = [b"cpi_authority"],
        bump,
        seeds::program = settlement_program_id::ID,
    )]
    pub cpi_authority: Signer<'info>,
}

