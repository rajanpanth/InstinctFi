use anchor_lang::prelude::*;

use poll_program::state::PollAccount;
use crate::state::VoteAccount;
use crate::errors::VoteError;

/// Buy `num_coins` option-coins for `option_index` on a poll.
/// Cost = num_coins * unit_price_cents (internal dollar accounting, no SOL transfer).
/// Updates vote tallies on the poll via CPI to poll_program, and the voter's VoteAccount locally.
pub fn handler(
    ctx: Context<CastVote>,
    poll_id: u64,
    option_index: u8,
    num_coins: u64,
) -> Result<()> {
    let poll = &ctx.accounts.poll_account;
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

    // ── Determine if this is a new voter ──
    let vote_account = &mut ctx.accounts.vote_account;
    let is_new_voter = vote_account.voter == Pubkey::default();

    // ── Update poll via CPI to poll_program::record_vote ──
    let cpi_program = ctx.accounts.poll_program.to_account_info();
    let cpi_accounts = poll_program::cpi::accounts::RecordVote {
        caller: ctx.accounts.voter.to_account_info(),
        poll_account: ctx.accounts.poll_account.to_account_info(),
    };
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    poll_program::cpi::record_vote(cpi_ctx, poll_id, option_index, num_coins, cost, is_new_voter)?;

    // ── Update or init VoteAccount (owned by vote_program) ──
    if is_new_voter {
        vote_account.poll = ctx.accounts.poll_account.key();
        vote_account.voter = ctx.accounts.voter.key();
        vote_account.votes_per_option = vec![0u64; poll.options.len()];
        vote_account.total_staked_cents = 0;
        vote_account.claimed = false;
        vote_account.bump = ctx.bumps.vote_account;
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
        "Vote: user={} poll={} option={} coins={} cost={}",
        ctx.accounts.voter.key(),
        poll_id,
        option_index,
        num_coins,
        cost,
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

    /// The poll being voted on (mutable — CPI will update it)
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        seeds::program = poll_program::ID,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// Vote record PDA: tracks this voter's coins in this poll
    #[account(
        init_if_needed,
        payer = voter,
        space = 8 + VoteAccount::INIT_SPACE,
        seeds = [b"vote", poll_account.key().as_ref(), voter.key().as_ref()],
        bump,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    /// The poll_program for CPI calls
    /// CHECK: Verified by address constraint
    #[account(address = poll_program::ID)]
    pub poll_program: AccountInfo<'info>,

    pub system_program: Program<'info, System>,
}
