use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PollAccount, VoteAccount};
use crate::errors::InstinctFiError;

/// CRIT-03 FIX: Refund a voter when a poll ended in a tie.
///
/// When `settle_poll` rejects settlement due to a `TiedVote` error, funds
/// would otherwise be permanently locked in the treasury. This instruction
/// allows each voter to individually reclaim their stake.
///
/// Safety invariants:
/// - Poll must be ACTIVE (settling was rejected because of a tie)
/// - Poll end_time must have passed
/// - A genuine tie must exist (two or more options share the highest vote count)
/// - Voter must not have already claimed (prevents double-refund)
/// - Refund amount = voter's `total_staked` from their VoteAccount
pub fn handler(ctx: Context<RefundTiedPoll>, _poll_id: u64) -> Result<()> {
    let clock = Clock::get()?;

    // ── Read immutable data ──
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;
    let status = ctx.accounts.poll_account.status;
    let end_time = ctx.accounts.poll_account.end_time;
    let vote_counts = ctx.accounts.poll_account.vote_counts.clone();

    // ── Guards ──
    // Poll must still be active (settle_poll was blocked by TiedVote)
    require!(status == PollAccount::STATUS_ACTIVE, InstinctFiError::AlreadySettled);
    // Poll must have ended
    require!(clock.unix_timestamp >= end_time, InstinctFiError::PollNotEnded);
    // Voter must not have claimed yet
    require!(!ctx.accounts.vote_account.claimed, InstinctFiError::AlreadyClaimed);

    // ── Verify tie condition ──
    let max_votes = vote_counts.iter().copied().max().unwrap_or(0);
    require!(max_votes > 0, InstinctFiError::NoVotes);
    let tied_count = vote_counts.iter().filter(|&&c| c == max_votes).count();
    require!(tied_count > 1, InstinctFiError::NotATie);

    // ── Calculate refund ──
    let refund_amount = ctx.accounts.vote_account.total_staked;
    require!(refund_amount > 0, InstinctFiError::NoVotes);

    // Ensure treasury has enough (preserve rent-exempt minimum)
    let rent = Rent::get()?;
    let rent_exempt_min = rent.minimum_balance(0);
    let available = ctx.accounts.treasury.lamports().saturating_sub(rent_exempt_min);
    require!(available >= refund_amount, InstinctFiError::TreasuryInsufficient);

    // ── Transfer refund ──
    let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
    let signer_seeds = &[seeds];

    system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.treasury.to_account_info(),
                to: ctx.accounts.voter.to_account_info(),
            },
            signer_seeds,
        ),
        refund_amount,
    )?;

    // Mark as claimed to prevent double-refund
    ctx.accounts.vote_account.claimed = true;

    msg!(
        "RefundTiedPoll: voter {} refunded {} lamports from poll {}",
        ctx.accounts.voter.key(),
        refund_amount,
        _poll_id
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct RefundTiedPoll<'info> {
    /// The voter requesting their refund
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The poll account (must be active + ended + tied)
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// The voter's vote account for this poll
    #[account(
        mut,
        seeds = [b"vote", poll_account.key().as_ref(), voter.key().as_ref()],
        bump = vote_account.bump,
        constraint = vote_account.voter == voter.key() @ InstinctFiError::Unauthorized,
        constraint = vote_account.poll == poll_account.key() @ InstinctFiError::Unauthorized,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    /// CHECK: Treasury PDA — source of refund
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
