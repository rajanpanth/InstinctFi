use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use vote_program::state::VoteAccount;
use user_program::state::UserAccount;
use crate::errors::SettlementError;

/// Claim reward for a winning voter.
///
/// Reward formula:
///   reward = (user_winning_votes / total_winning_votes) * distributable_pool
///
/// Where distributable_pool = total_pool_cents (fees carved out at creation).
/// The reward amount is stored on the VoteAccount via CPI to vote_program::mark_claimed.
pub fn handler(
    ctx: Context<ClaimReward>,
    poll_id: u64,
) -> Result<()> {
    let poll = &ctx.accounts.poll_account;

    // ── Guards ──
    require!(poll.status == PollAccount::STATUS_SETTLED, SettlementError::NotSettled);
    require!(poll.winning_option != 255, SettlementError::NoVotes);

    let vote_account = &ctx.accounts.vote_account;
    require!(!vote_account.claimed, SettlementError::AlreadyClaimed);

    let winning_idx = poll.winning_option as usize;
    let user_winning_votes = vote_account.votes_per_option[winning_idx];
    require!(user_winning_votes > 0, SettlementError::NotAWinner);

    let total_winning_votes = poll.vote_counts[winning_idx];

    // ── Distributable pool ──
    let distributable = poll.total_pool_cents;

    // ── User's share ──
    let reward_amount = (user_winning_votes as u128)
        .checked_mul(distributable as u128)
        .ok_or(SettlementError::Overflow)?
        .checked_div(total_winning_votes as u128)
        .ok_or(SettlementError::Overflow)? as u64;

    // ── CPI to vote_program::mark_claimed to update the VoteAccount ──
    let cpi_program = ctx.accounts.vote_program_info.to_account_info();
    let cpi_accounts = vote_program::cpi::accounts::MarkClaimed {
        claimer: ctx.accounts.claimer.to_account_info(),
        vote_account: ctx.accounts.vote_account.to_account_info(),
        caller_program: ctx.accounts.settlement_program_id.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    vote_program::cpi::mark_claimed(cpi_ctx, poll_id, reward_amount)?;

    // ── CPI to user_program::credit_balance to add reward to user's demo_balance ──
    let credit_cpi_program = ctx.accounts.user_program_info.to_account_info();
    let credit_cpi_accounts = user_program::cpi::accounts::CreditBalance {
        authority: ctx.accounts.claimer.to_account_info(),
        user_account: ctx.accounts.user_account.to_account_info(),
        caller_program: ctx.accounts.settlement_program_id.to_account_info(),
    };
    let credit_cpi_ctx = CpiContext::new(credit_cpi_program, credit_cpi_accounts);
    user_program::cpi::credit_balance(credit_cpi_ctx, reward_amount)?;

    msg!(
        "Claim: user={} poll={} votes={}/{} reward={}",
        ctx.accounts.claimer.key(),
        poll_id,
        user_winning_votes,
        total_winning_votes,
        reward_amount,
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

    /// The settled poll (read-only, no mutation needed)
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        seeds::program = poll_program::ID,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// Vote record for this user on this poll (owned by vote_program, mutated via CPI)
    #[account(
        mut,
        seeds = [b"vote", poll_account.key().as_ref(), claimer.key().as_ref()],
        bump = vote_account.bump,
        seeds::program = vote_program::ID,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    /// CHECK: the vote_program executable for CPI
    #[account(address = vote_program::ID)]
    pub vote_program_info: AccountInfo<'info>,

    /// User account PDA (owned by user_program, credited via CPI)
    #[account(
        mut,
        seeds = [b"user", claimer.key().as_ref()],
        bump = user_account.bump,
        seeds::program = user_program::ID,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// CHECK: the user_program executable for CPI
    #[account(address = user_program::ID)]
    pub user_program_info: AccountInfo<'info>,

    /// CHECK: this program's own ID — passed to mark_claimed and credit_balance as caller_program
    #[account(address = crate::ID)]
    pub settlement_program_id: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}

