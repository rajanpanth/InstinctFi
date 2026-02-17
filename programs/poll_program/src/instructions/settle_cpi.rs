use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// Hardcoded settlement_program ID to avoid circular dependency.
mod settlement_program_id {
    anchor_lang::declare_id!("Sett1ePrgm111111111111111111111111111111111");
}

/// CPI-callable instruction: settles a poll by setting its winner.
/// Only the settlement_program may call this — enforced by caller_program constraint.
pub fn handler(
    ctx: Context<SettlePollCpi>,
    _poll_id: u64,
    winning_option: u8,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;

    require!(poll.is_active(), PollError::PollNotActive);

    let clock = Clock::get()?;
    require!(poll.is_ended(&clock), PollError::PollNotEnded);

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

    /// CHECK: The calling program — must be the settlement_program.
    /// This prevents unauthorized programs or direct calls from settling polls.
    #[account(address = settlement_program_id::ID)]
    pub caller_program: AccountInfo<'info>,
}
