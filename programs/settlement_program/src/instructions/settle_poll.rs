use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use crate::errors::SettlementError;

/// Settle a poll after its end time.
/// Determines the winning option by highest vote count.
/// Ties go to the lower index (first option wins).
pub fn handler(
    ctx: Context<SettlePoll>,
    _poll_id: u64,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;
    let clock = Clock::get()?;

    // ── Guards ──
    require!(poll.is_active(), SettlementError::PollNotActive);
    require!(poll.is_ended(&clock), SettlementError::PollNotEnded);

    // ── Determine winner: option with most votes ──
    let mut max_votes: u64 = 0;
    let mut winning_idx: u8 = 0;
    let mut has_votes = false;

    for (i, &count) in poll.vote_counts.iter().enumerate() {
        if count > max_votes {
            max_votes = count;
            winning_idx = i as u8;
            has_votes = true;
        }
    }

    if !has_votes {
        poll.status = PollAccount::STATUS_SETTLED;
        poll.winning_option = 255;
        msg!("Poll {} settled with no votes", poll.poll_id);
        return Ok(());
    }

    poll.status = PollAccount::STATUS_SETTLED;
    poll.winning_option = winning_idx;

    msg!(
        "Poll {} settled. Winner: option {} ('{}') with {} votes. Pool: ${}.{}",
        poll.poll_id,
        winning_idx,
        poll.options[winning_idx as usize],
        max_votes,
        poll.total_pool_cents / 100,
        poll.total_pool_cents % 100,
    );

    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct SettlePoll<'info> {
    /// Anyone can trigger settlement (permissionless crank)
    #[account(mut)]
    pub settler: Signer<'info>,

    /// The poll to settle
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        seeds::program = poll_program::ID,
    )]
    pub poll_account: Account<'info, PollAccount>,

    pub system_program: Program<'info, System>,
}
