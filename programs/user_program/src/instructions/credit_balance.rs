use anchor_lang::prelude::*;

use crate::state::UserAccount;
use crate::errors::UserError;

// Settlement program ID — use a const array to avoid base58 decode issues.
// This must match settlement_program's declare_id!("Sett1ePrgm111111111111111111111111111111111").
// We use the Pubkey::new_from_array approach for compile-time safety.
mod settlement_id {
    anchor_lang::declare_id!("Sett1ePrgm111111111111111111111111111111111");
}

/// CPI-callable: credit `amount` cents to the user's demo_balance.
/// Only settlement_program may call this — enforced by requiring a PDA signer
/// that only the settlement_program can produce via invoke_signed.
/// Also updates the user's winning stats.
pub fn handler(ctx: Context<CreditBalance>, amount: u64) -> Result<()> {
    let user = &mut ctx.accounts.user_account;
    let clock = Clock::get()?;

    // Auto-reset weekly/monthly BEFORE crediting — prevents freshly
    // credited amounts from being zeroed at period boundaries (#17).
    user.maybe_reset_weekly(clock.unix_timestamp);
    user.maybe_reset_monthly(clock.unix_timestamp);

    user.demo_balance = user
        .demo_balance
        .checked_add(amount)
        .ok_or(UserError::Overflow)?;

    // Update winning stats
    user.total_wins = user.total_wins.checked_add(1).unwrap_or(u64::MAX);
    user.total_winning_amount = user
        .total_winning_amount
        .checked_add(amount)
        .unwrap_or(u64::MAX);
    user.weekly_winning_amount = user
        .weekly_winning_amount
        .checked_add(amount)
        .unwrap_or(u64::MAX);
    user.monthly_winning_amount = user
        .monthly_winning_amount
        .checked_add(amount)
        .unwrap_or(u64::MAX);

    user.last_active_at = clock.unix_timestamp;

    msg!("CreditBalance: user={} amount={}", user.authority, amount);
    Ok(())
}

#[derive(Accounts)]
pub struct CreditBalance<'info> {
    /// The user whose balance is being credited (must be tx signer)
    pub authority: Signer<'info>,

    /// User account PDA (owned by user_program)
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump = user_account.bump,
        has_one = authority @ UserError::Unauthorized,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// CPI authority PDA from settlement_program — proves CPI origin.
    /// Only settlement_program can sign for seeds [b"cpi_authority"] via invoke_signed.
    /// CHECK: Verified by seeds constraint against settlement_program ID.
    #[account(
        seeds = [b"cpi_authority"],
        bump,
        seeds::program = settlement_id::ID,
    )]
    pub caller_program: Signer<'info>,
}

