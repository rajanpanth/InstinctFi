use anchor_lang::prelude::*;
use crate::state::UserAccount;

/// Creates a new user account with $5000 demo signup bonus.
/// PDA seed: ["user", authority]
pub fn handler(ctx: Context<Signup>, is_demo: bool) -> Result<()> {
    let clock = Clock::get()?;
    let user = &mut ctx.accounts.user_account;

    user.authority = ctx.accounts.authority.key();
    user.is_demo = is_demo;
    user.bump = ctx.bumps.user_account;
    user.created_at = clock.unix_timestamp;
    user.last_active_at = clock.unix_timestamp;

    // ── Signup bonus: $5000 demo dollars ──
    if is_demo {
        user.demo_balance = UserAccount::SIGNUP_BONUS;
        user.signup_bonus_claimed = true;
        user.last_weekly_reward_ts = clock.unix_timestamp;
    } else {
        user.demo_balance = 0;
        user.signup_bonus_claimed = false;
        user.last_weekly_reward_ts = 0;
    }

    user.real_balance = 0;
    user.total_votes = 0;
    user.total_wins = 0;
    user.total_losses = 0;
    user.total_winning_amount = 0;
    user.weekly_winning_amount = 0;
    user.monthly_winning_amount = 0;
    user.weekly_reset_ts = clock.unix_timestamp;
    user.monthly_reset_ts = clock.unix_timestamp;
    user.polls_created = 0;
    user.creator_earnings = 0;

    msg!("User signed up: {} demo={} balance=${}", 
        user.authority, is_demo, user.demo_balance / 100);
    Ok(())
}

#[derive(Accounts)]
pub struct Signup<'info> {
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
