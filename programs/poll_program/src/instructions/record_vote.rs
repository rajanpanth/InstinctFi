use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// CPI-callable instruction: records a vote on a poll.
/// Only the vote_program may call this via CPI.
pub fn handler(
    ctx: Context<RecordVote>,
    _poll_id: u64,
    option_index: u8,
    num_coins: u64,
    cost: u64,
    is_new_voter: bool,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;

    // Guards
    require!(poll.is_active(), PollError::PollNotActive);
    require!((option_index as usize) < poll.options.len(), PollError::InvalidOption);
    require!(num_coins > 0, PollError::InvalidUnitPrice); // reuse error

    // Update vote counts & pool
    poll.vote_counts[option_index as usize] = poll.vote_counts[option_index as usize]
        .checked_add(num_coins)
        .ok_or(PollError::Overflow)?;
    poll.total_pool_cents = poll.total_pool_cents
        .checked_add(cost)
        .ok_or(PollError::Overflow)?;

    if is_new_voter {
        poll.total_voters = poll.total_voters.checked_add(1).unwrap_or(poll.total_voters);
    }

    msg!("RecordVote: poll={} option={} coins={} cost={}", poll.poll_id, option_index, num_coins, cost);
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct RecordVote<'info> {
    /// The caller (vote_program invokes this via CPI, but signer is the voter)
    #[account(mut)]
    pub caller: Signer<'info>,

    /// The poll to update
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
