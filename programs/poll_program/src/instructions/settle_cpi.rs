use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// Hardcoded settlement_program ID to avoid circular dependency.
mod settlement_program_id {
    anchor_lang::declare_id!("Sett1ePrgm111111111111111111111111111111111");
}

/// CPI-callable instruction: settles a poll by setting its winner.
/// Only the settlement_program may call this — enforced by requiring a PDA
/// signer that only the settlement_program can produce via invoke_signed.
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

