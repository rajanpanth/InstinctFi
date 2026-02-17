use anchor_lang::prelude::*;

use crate::state::UserAccount;
use crate::errors::UserError;

// Vote program ID — use declare_id! in a sub-module to avoid base58 decode issues.
// Must match vote_program's declare_id!("VotePrgm11111111111111111111111111111111111").
mod vote_id {
    anchor_lang::declare_id!("VotePrgm11111111111111111111111111111111111");
}

/// CPI-callable: debit `amount` cents from the user's demo_balance.
/// Only vote_program may call this (enforced by `caller_program` address constraint).
pub fn handler(ctx: Context<DebitBalance>, amount: u64) -> Result<()> {
    let user = &mut ctx.accounts.user_account;

    require!(amount > 0, UserError::InsufficientBalance);
    require!(user.demo_balance >= amount, UserError::InsufficientBalance);

    user.demo_balance = user
        .demo_balance
        .checked_sub(amount)
        .ok_or(UserError::Overflow)?;

    msg!("DebitBalance: user={} amount={}", user.authority, amount);
    Ok(())
}

#[derive(Accounts)]
pub struct DebitBalance<'info> {
    /// The user whose balance is being debited (must be tx signer)
    pub authority: Signer<'info>,

    /// User account PDA (owned by user_program)
    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump = user_account.bump,
        has_one = authority @ UserError::Unauthorized,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// CHECK: The calling program — must be vote_program.
    #[account(address = vote_id::ID)]
    pub caller_program: AccountInfo<'info>,
}
