use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use crate::state::VoteAccount;
use crate::errors::VoteError;

/// Buy `num_coins` option-coins for `option_index` on a poll.
/// Cost = num_coins * unit_price_cents (internal dollar accounting, no SOL transfer).
/// Updates vote tallies on the poll and the voter's VoteAccount.
pub fn handler(
    ctx: Context<CastVote>,
    _poll_id: u64,
    option_index: u8,
    num_coins: u64,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;
    let clock = Clock::get()?;

    // ── Guards ──
    require!(poll.is_active(), VoteError::PollNotActive);
    require!(!poll.is_ended(&clock), VoteError::PollEnded);
    require!((option_index as usize) < poll.options.len(), VoteError::InvalidOption);
    require!(num_coins > 0, VoteError::ZeroCoins);
    require!(
        ctx.accounts.voter.key() != poll.creator,
        VoteError::CreatorCannotVote
    );

    // ── Calculate cost in cents ──
    let cost = num_coins
        .checked_mul(poll.unit_price_cents)
        .ok_or(VoteError::Overflow)?;

    // ── No SOL transfer — internal accounting only ──
    // The frontend deducts from UserAccount.demo_balance

    // ── Update poll vote counts & pool ──
    poll.vote_counts[option_index as usize] = poll.vote_counts[option_index as usize]
        .checked_add(num_coins)
        .ok_or(VoteError::Overflow)?;
    poll.total_pool_cents = poll.total_pool_cents
        .checked_add(cost)
        .ok_or(VoteError::Overflow)?;

    // ── Update or init VoteAccount ──
    let vote_account = &mut ctx.accounts.vote_account;
    if vote_account.voter == Pubkey::default() {
        // First vote by this user on this poll
        vote_account.poll = poll.key();
        vote_account.voter = ctx.accounts.voter.key();
        vote_account.votes_per_option = vec![0u64; poll.options.len()];
        vote_account.total_staked_cents = 0;
        vote_account.claimed = false;
        vote_account.bump = ctx.bumps.vote_account;
        poll.total_voters = poll.total_voters.checked_add(1).ok_or(VoteError::Overflow)?;
    }
    vote_account.votes_per_option[option_index as usize] = vote_account.votes_per_option
        [option_index as usize]
        .checked_add(num_coins)
        .ok_or(VoteError::Overflow)?;
    vote_account.total_staked_cents = vote_account
        .total_staked_cents
        .checked_add(cost)
        .ok_or(VoteError::Overflow)?;

    msg!(
        "Vote: user={} poll={} option={} coins={} cost=${}.{}",
        ctx.accounts.voter.key(),
        poll.poll_id,
        option_index,
        num_coins,
        cost / 100,
        cost % 100,
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64, option_index: u8, num_coins: u64)]
pub struct CastVote<'info> {
    /// Voter
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The poll being voted on (mutable to update vote_counts)
    #[account(
        mut,
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

    /// Vote record PDA: tracks this voter's coins in this poll
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + VoteAccount::INIT_SPACE,
        seeds = [b"vote", poll_account.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    pub system_program: Program<'info, System>,
}
