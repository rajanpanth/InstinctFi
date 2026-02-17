use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use crate::errors::SettlementError;

/// Settle a poll after its end time.
/// Determines the winning option by highest vote count.
/// Ties go to the lower index (first option wins).
/// Uses CPI to poll_program::settle_poll_cpi to update the poll state.
pub fn handler(
    ctx: Context<SettlePoll>,
    poll_id: u64,
) -> Result<()> {
    let poll = &ctx.accounts.poll_account;
    let clock = Clock::get()?;

    // ── Guards ──
    require!(poll.is_active(), SettlementError::PollNotActive);
    require!(poll.is_ended(&clock), SettlementError::PollNotEnded);

    // ── Determine winner: option with most votes ──
    let mut max_votes: u64 = 0;
    let mut winning_idx: u8 = 255;

    for (i, &count) in poll.vote_counts.iter().enumerate() {
        if count > max_votes {
            max_votes = count;
            winning_idx = i as u8;
        }
    }

    // If no votes, winning_idx stays 255

    // ── Settle via CPI to poll_program ──
    let cpi_program = ctx.accounts.poll_program.to_account_info();
    let cpi_accounts = poll_program::cpi::accounts::SettlePollCpi {
        settler: ctx.accounts.settler.to_account_info(),
        poll_account: ctx.accounts.poll_account.to_account_info(),
        caller_program: ctx.accounts.settlement_program_id.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    poll_program::cpi::settle_poll_cpi(cpi_ctx, poll_id, winning_idx)?;

    msg!(
        "Poll {} settled. Winner: option {} with {} votes.",
        poll_id,
        winning_idx,
        max_votes,
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

    /// The poll to settle (read via cross-program seeds, mutated via CPI)
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        seeds::program = poll_program::ID,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// The poll_program for CPI calls
    /// CHECK: Verified by address constraint
    #[account(address = poll_program::ID)]
    pub poll_program: AccountInfo<'info>,

    /// CHECK: this program's own ID — passed as caller_program for CPI verification
    #[account(address = crate::ID)]
    pub settlement_program_id: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

