use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// CPI-callable instruction: settles a poll by setting its winner.
/// Only callable after the poll has ended.
pub fn handler(
    ctx: Context<SettlePollCpi>,
    _poll_id: u64,
    winning_option: u8,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;

    require!(poll.is_active(), PollError::PollNotActive);

    let clock = Clock::get()?;
    require!(poll.is_ended(&clock), PollError::EndTimeInPast); // reuse: poll must have ended

    poll.status = PollAccount::STATUS_SETTLED;
    poll.winning_option = winning_option;

    msg!("SettlePollCpi: poll={} winner={}", poll.poll_id, winning_option);
    Ok(())
}

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct SettlePollCpi<'info> {
    /// The settler (anyone can trigger)
    #[account(mut)]
    pub settler: Signer<'info>,

    /// The poll to settle
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
