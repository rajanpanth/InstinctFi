use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PollAccount, VoteAccount, UserAccount};
use crate::errors::InstinctFiError;

/// Buy `num_coins` option-coins for `option_index` on a poll.
/// Cost = num_coins × unit_price (in lamports).
/// Real SOL is transferred from the voter to the treasury PDA.
pub fn handler(
    ctx: Context<CastVote>,
    _poll_id: u64,
    option_index: u8,
    num_coins: u64,
) -> Result<()> {
    let clock = Clock::get()?;

    // Read poll data immutably first
    let poll_status = ctx.accounts.poll_account.status;
    let poll_end_time = ctx.accounts.poll_account.end_time;
    let poll_options_len = ctx.accounts.poll_account.options.len();
    let poll_unit_price = ctx.accounts.poll_account.unit_price;
    let poll_creator = ctx.accounts.poll_account.creator;

    // ── Guards ──
    require!(poll_status == PollAccount::STATUS_ACTIVE, InstinctFiError::PollNotActive);
    require!(clock.unix_timestamp < poll_end_time, InstinctFiError::PollAlreadyEnded);
    require!((option_index as usize) < poll_options_len, InstinctFiError::InvalidOption);
    require!(num_coins > 0, InstinctFiError::ZeroCoins);
    require!(
        ctx.accounts.voter.key() != poll_creator,
        InstinctFiError::CreatorCannotVote
    );

    // ── Calculate cost in lamports ──
    let cost = num_coins
        .checked_mul(poll_unit_price)
        .ok_or(InstinctFiError::Overflow)?;

    // ── Transfer real SOL from voter → treasury PDA ──
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.voter.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        cost,
    )?;

    // ── Update poll vote counts & pool ──
    let poll_key = ctx.accounts.poll_account.key();
    let poll = &mut ctx.accounts.poll_account;
    poll.vote_counts[option_index as usize] = poll.vote_counts[option_index as usize]
        .checked_add(num_coins)
        .ok_or(InstinctFiError::Overflow)?;
    poll.total_pool = poll.total_pool
        .checked_add(cost)
        .ok_or(InstinctFiError::Overflow)?;

    // ── Update or init VoteAccount ──
    let vote_account = &mut ctx.accounts.vote_account;
    if vote_account.voter == Pubkey::default() {
        // First vote by this user on this poll
        vote_account.poll = poll_key;
        vote_account.voter = ctx.accounts.voter.key();
        vote_account.votes_per_option = vec![0u64; poll_options_len];
        vote_account.total_staked = 0;
        vote_account.claimed = false;
        vote_account.bump = ctx.bumps.vote_account;
        poll.total_voters = poll.total_voters
            .checked_add(1)
            .ok_or(InstinctFiError::Overflow)?;
    }
    vote_account.votes_per_option[option_index as usize] = vote_account.votes_per_option
        [option_index as usize]
        .checked_add(num_coins)
        .ok_or(InstinctFiError::Overflow)?;
    vote_account.total_staked = vote_account
        .total_staked
        .checked_add(cost)
        .ok_or(InstinctFiError::Overflow)?;

    // ── Update user stats ──
    let user = &mut ctx.accounts.user_account;
    user.total_votes_cast = user.total_votes_cast
        .checked_add(num_coins)
        .ok_or(InstinctFiError::Overflow)?;
    user.total_staked = user.total_staked
        .checked_add(cost)
        .ok_or(InstinctFiError::Overflow)?;

    msg!(
        "Vote: {} coins on option {} for poll {}, cost={} lamports",
        num_coins,
        option_index,
        ctx.accounts.poll_account.poll_id,
        cost
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CastVote<'info> {
    /// Voter (pays SOL)
    #[account(mut)]
    pub voter: Signer<'info>,

    /// Voter's user profile
    #[account(
        mut,
        seeds = [b"user", voter.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// The poll being voted on
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// CHECK: Treasury PDA for this poll — receives SOL
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

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
