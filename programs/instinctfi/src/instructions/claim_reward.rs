use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PollAccount, VoteAccount, UserAccount};
use crate::errors::InstinctFiError;

/// Claim winnings for a settled poll.
///
/// Reward formula:
///   reward = (user_winning_votes / total_winning_votes) × total_pool
///
/// Real SOL is transferred from the treasury PDA to the claimer.
pub fn handler(ctx: Context<ClaimReward>, _poll_id: u64) -> Result<()> {
    // ── Read data before any mutable borrows ──
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;
    let status = ctx.accounts.poll_account.status;
    let winning_option = ctx.accounts.poll_account.winning_option;
    let total_pool = ctx.accounts.poll_account.total_pool;
    let poll_id_val = ctx.accounts.poll_account.poll_id;

    // ── Guards ──
    require!(status == PollAccount::STATUS_SETTLED, InstinctFiError::NotSettled);
    require!(winning_option != 255, InstinctFiError::NoVotes);

    let winning_idx = winning_option as usize;
    let total_winning_votes = ctx.accounts.poll_account.vote_counts[winning_idx];

    let vote_claimed = ctx.accounts.vote_account.claimed;
    require!(!vote_claimed, InstinctFiError::AlreadyClaimed);

    let user_winning_votes = ctx.accounts.vote_account.votes_per_option[winning_idx];
    require!(user_winning_votes > 0, InstinctFiError::NotAWinner);

    // ── Calculate reward (u128 to avoid overflow) ──
    let reward = (user_winning_votes as u128)
        .checked_mul(total_pool as u128)
        .ok_or(InstinctFiError::Overflow)?
        .checked_div(total_winning_votes as u128)
        .ok_or(InstinctFiError::Overflow)? as u64;

    // ── Ensure treasury has enough SOL (preserve rent-exempt minimum) ──
    let rent = Rent::get()?;
    let rent_exempt_min = rent.minimum_balance(0); // treasury has no data, just SOL
    let available = ctx.accounts.treasury.lamports()
        .saturating_sub(rent_exempt_min);
    require!(
        available >= reward,
        InstinctFiError::TreasuryInsufficient
    );

    // ── Transfer real SOL from treasury → claimer ──
    let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
    let signer_seeds = &[seeds];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.claimer.to_account_info(),
            },
            signer_seeds,
        ),
        reward,
    )?;

    // ── Mark claimed ──
    let vote = &mut ctx.accounts.vote_account;
    vote.claimed = true;

    // ── Update user stats ──
    let user = &mut ctx.accounts.user_account;
    user.total_winnings = user.total_winnings
        .checked_add(reward)
        .ok_or(InstinctFiError::Overflow)?;
    user.polls_won = user.polls_won
        .checked_add(1)
        .ok_or(InstinctFiError::Overflow)?;

    msg!(
        "Claim: poll={} user={} votes={}/{} reward={} lamports",
        poll_id_val,
        ctx.accounts.claimer.key(),
        user_winning_votes,
        total_winning_votes,
        reward
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct ClaimReward<'info> {
    /// The voter claiming their reward
    #[account(mut)]
    pub claimer: Signer<'info>,

    /// Claimer's user profile
    #[account(
        mut,
        seeds = [b"user", claimer.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// The settled poll
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// CHECK: Treasury PDA — SOL source for rewards
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    /// Vote record for this user on this poll
    #[account(
        mut,
        seeds = [b"vote", poll_account.key().as_ref(), claimer.key().as_ref()],
        bump = vote_account.bump,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    pub system_program: Program<'info, System>,
}
