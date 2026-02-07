use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use vote_program::state::VoteAccount;
use crate::errors::SettlementError;

/// Claim reward for a winning voter (dollar-based internal accounting).
///
/// Reward formula:
///   reward_cents = (user_winning_votes / total_winning_votes) * distributable_pool_cents
///
/// Where distributable_pool = total_pool_cents (fees carved out at creation).
/// No SOL transfer — reward tracked on-chain; frontend credits UserAccount balance.
pub fn handler(
    ctx: Context<ClaimReward>,
    _poll_id: u64,
) -> Result<()> {
    let poll = &ctx.accounts.poll_account;

    // ── Guards ──
    require!(poll.status == PollAccount::STATUS_SETTLED, SettlementError::NotSettled);
    require!(poll.winning_option != 255, SettlementError::NoVotes);

    let vote_account = &mut ctx.accounts.vote_account;
    require!(!vote_account.claimed, SettlementError::AlreadyClaimed);

    let winning_idx = poll.winning_option as usize;
    let user_winning_votes = vote_account.votes_per_option[winning_idx];
    require!(user_winning_votes > 0, SettlementError::NotAWinner);

    let total_winning_votes = poll.vote_counts[winning_idx];

    // ── Distributable pool (cents) ──
    let distributable = poll.total_pool_cents;

    // ── User's share ──
    let reward_cents = (user_winning_votes as u128)
        .checked_mul(distributable as u128)
        .ok_or(SettlementError::Overflow)?
        .checked_div(total_winning_votes as u128)
        .ok_or(SettlementError::Overflow)? as u64;

    // Mark as claimed (no SOL transfer - frontend credits balance)
    vote_account.claimed = true;

    msg!(
        "Claim: user={} poll={} votes={}/{} reward=${}.{}",
        ctx.accounts.claimer.key(),
        poll.poll_id,
        user_winning_votes,
        total_winning_votes,
        reward_cents / 100,
        reward_cents % 100,
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

    /// The settled poll
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        seeds::program = poll_program::ID,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// Treasury PDA for this poll (kept for compatibility)
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
        seeds::program = poll_program::ID,
    )]
    /// CHECK: Treasury PDA vault
    pub treasury: SystemAccount<'info>,

    /// Vote record for this user on this poll
    #[account(
        mut,
        seeds = [b"vote", poll_account.key().as_ref(), claimer.key().as_ref()],
        bump = vote_account.bump,
        seeds::program = vote_program::ID,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    pub system_program: Program<'info, System>,
}
