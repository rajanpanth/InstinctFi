use anchor_lang::prelude::*;
use crate::state::UserAccount;

/// Creates a new on-chain user profile.
/// No signup bonus — users bring their own devnet SOL.
pub fn handler(ctx: Context<InitializeUser>) -> Result<()> {
    let clock = Clock::get()?;
    let user = &mut ctx.accounts.user_account;

    user.authority = ctx.accounts.authority.key();
    user.total_polls_created = 0;
    user.total_votes_cast = 0;
    user.polls_won = 0;
    user.total_staked = 0;
    user.total_winnings = 0;
    user.created_at = clock.unix_timestamp;
    user.bump = ctx.bumps.user_account;

    msg!("User initialized: {}", user.authority);
    Ok(())
}

#[derive(Accounts)]
pub struct InitializeUser<'info> {
    #[account(mut)]
    pub authority: Signer<'info>,

    #[account(
        init,
        payer = authority,
        space = 8 + UserAccount::INIT_SPACE,
        seeds = [b"user", authority.key().as_ref()],
        bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    pub system_program: Program<'info, System>,
}
