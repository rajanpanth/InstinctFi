use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::PollAccount;
use crate::errors::InstinctFiError;

/// Sweep residual dust (platform fees + rounding residual) from a settled
/// poll's treasury to a designated platform admin wallet.
///
/// This instruction addresses two audit findings:
/// - #48: No mechanism to withdraw accumulated platform fees
/// - #49: Integer-division truncation leaves dust lamports in treasury
///
/// Can be called by anyone (permissionless crank) once a poll is settled.
/// The treasury keeps its rent-exempt minimum; everything above that is swept.
pub fn handler(ctx: Context<SweepDust>, _poll_id: u64) -> Result<()> {
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;
    let status = ctx.accounts.poll_account.status;

    // ── Guards ──
    require!(status == PollAccount::STATUS_SETTLED, InstinctFiError::NotSettled);

    // Calculate available dust (everything above rent-exempt minimum)
    let rent = Rent::get()?;
    let rent_exempt_min = rent.minimum_balance(0);
    let treasury_lamports = ctx.accounts.treasury.lamports();
    let available = treasury_lamports.saturating_sub(rent_exempt_min);

    if available == 0 {
        msg!("SweepDust: no dust to sweep for poll {}", _poll_id);
        return Ok(());
    }

    // Transfer dust to platform admin
    let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
    let signer_seeds = &[seeds];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.platform_admin.to_account_info(),
            },
            signer_seeds,
        ),
        available,
    )?;

    msg!(
        "SweepDust: poll={} swept {} lamports to admin {}",
        _poll_id,
        available,
        ctx.accounts.platform_admin.key()
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct SweepDust<'info> {
    /// Anyone can trigger the sweep (permissionless crank)
    #[account(mut)]
    pub sweeper: Signer<'info>,

    /// CHECK: Platform admin wallet — receives dust. For now this is the poll
    /// creator; in production, constrain this to a known platform wallet PDA
    /// or a governance-controlled multisig.
    #[account(
        mut,
        constraint = platform_admin.key() == poll_account.creator @ InstinctFiError::UnauthorizedNotCreator,
    )]
    pub platform_admin: UncheckedAccount<'info>,

    /// The settled poll
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// CHECK: Treasury PDA — dust source
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
