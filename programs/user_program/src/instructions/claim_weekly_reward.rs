use anchor_lang::prelude::*;
use crate::state::UserAccount;
use crate::errors::UserError;

/// Claims $1000 weekly reward for demo users (auto on login).
/// Only available if 7+ days since last claim.
pub fn handler(ctx: Context<ClaimWeeklyReward>) -> Result<()> {
    let clock = Clock::get()?;
    let user = &mut ctx.accounts.user_account;

    user.last_active_at = clock.unix_timestamp;

    // Reset leaderboard periods if needed
    user.maybe_reset_weekly(clock.unix_timestamp);
    user.maybe_reset_monthly(clock.unix_timestamp);

    // Credit weekly reward
    require!(
        user.maybe_credit_weekly_reward(clock.unix_timestamp),
        UserError::WeeklyRewardNotReady
    );

    msg!("Weekly reward claimed: user={} new_balance=${}",
        user.authority, user.demo_balance / 100);
    Ok(())
}

#[derive(Accounts)]
pub struct ClaimWeeklyReward<'info> {
    pub authority: Signer<'info>,

    #[account(
        mut,
        seeds = [b"user", authority.key().as_ref()],
        bump = user_account.bump,
        has_one = authority @ UserError::Unauthorized,
    )]
    pub user_account: Account<'info, UserAccount>,
}
