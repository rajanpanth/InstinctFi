use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// Deletes a poll and refunds the creator's initial investment.
/// Only the creator may call this, and only when the poll has zero votes,
/// is still active, and has not ended.
///
/// Fund handling:
///   - Refund creator_investment_cents (conceptual, tracked off-chain)
///   - Close the PollAccount (rent returned to creator)
///   - No platform or creator fees distributed on deletion
pub fn handler(ctx: Context<DeletePoll>, _poll_id: u64) -> Result<()> {
    let poll = &ctx.accounts.poll_account;
    let clock = Clock::get()?;

    // ── Permission & safety checks ──
    require!(
        poll.creator == ctx.accounts.creator.key(),
        PollError::UnauthorizedNotCreator
    );
    require!(poll.is_active(), PollError::PollNotActive);
    require!(!poll.is_ended(&clock), PollError::PollAlreadyEnded);

    // Check zero votes
    let total_votes: u64 = poll.vote_counts.iter().sum();
    require!(total_votes == 0, PollError::PollHasVotes);

    msg!(
        "Poll {} deleted by creator. Investment of {} cents refunded.",
        poll.poll_id,
        poll.creator_investment_cents
    );

    // The account is closed via the `close = creator` constraint below.
    // Rent lamports are returned to the creator automatically.
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct DeletePoll<'info> {
    /// The poll creator (must match poll_account.creator, receives rent refund)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Poll PDA: seeds = ["poll", creator, poll_id]
    /// close = creator → closes account and refunds rent to creator
    #[account(
        mut,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        close = creator,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
