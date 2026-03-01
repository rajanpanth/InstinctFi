use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PollAccount, PLATFORM_ADMIN};
use crate::errors::InstinctFiError;

/// Admin-settle a prediction market poll by declaring the real-world outcome.
///
/// This is the Polymarket-style settlement flow:
/// 1. Users bet on outcomes they believe will happen
/// 2. The real-world event occurs
/// 3. The PLATFORM_ADMIN calls this instruction with the correct `winning_option`
/// 4. Winners (those who bet on the declared outcome) can then call `claim_reward`
///
/// Only the PLATFORM_ADMIN wallet can call this instruction.
/// The poll must be active and its end_time must have passed.
/// The admin provides the `winning_option` index — this is the option that
/// **actually happened in reality**, regardless of vote counts.
///
/// If no votes were placed on the winning option, the creator_reward is still
/// paid to the creator, and the remaining pool stays in treasury until swept.
pub fn handler(
    ctx: Context<AdminSettlePoll>,
    _poll_id: u64,
    winning_option: u8,
) -> Result<()> {
    let clock = Clock::get()?;

    // ── Read immutable data ──
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;
    let status = ctx.accounts.poll_account.status;
    let end_time = ctx.accounts.poll_account.end_time;
    let creator_reward = ctx.accounts.poll_account.creator_reward;
    let options_len = ctx.accounts.poll_account.options.len();
    let vote_counts = ctx.accounts.poll_account.vote_counts.clone();
    let poll_id_val = ctx.accounts.poll_account.poll_id;

    // ── Guards ──
    require!(status == PollAccount::STATUS_ACTIVE, InstinctFiError::AlreadySettled);
    require!(clock.unix_timestamp >= end_time, InstinctFiError::PollNotEnded);
    require!((winning_option as usize) < options_len, InstinctFiError::InvalidOption);

    // ── PDA signer seeds for treasury ──
    let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
    let signer_seeds = &[seeds];

    // ── Check if any votes were cast at all ──
    let total_votes: u64 = vote_counts.iter().sum();

    if total_votes == 0 {
        // No votes at all — refund entire treasury to creator
        let treasury_balance = ctx.accounts.treasury.lamports();
        if treasury_balance > 0 {
            system_program::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.system_program.to_account_info(),
                    system_program::Transfer {
                        from: ctx.accounts.treasury.to_account_info(),
                        to: ctx.accounts.creator.to_account_info(),
                    },
                    signer_seeds,
                ),
                treasury_balance,
            )?;
        }

        let poll = &mut ctx.accounts.poll_account;
        poll.status = PollAccount::STATUS_SETTLED;
        poll.winning_option = winning_option;

        msg!(
            "AdminSettle: Poll {} settled by admin with no votes. Winner: option {}. {} lamports refunded to creator.",
            poll_id_val, winning_option, treasury_balance
        );
        return Ok(());
    }

    // ── Pay creator reward ──
    if creator_reward > 0 {
        let rent = Rent::get()?;
        let rent_exempt_min = rent.minimum_balance(0);
        let treasury_available = ctx.accounts.treasury.lamports()
            .saturating_sub(rent_exempt_min);
        require!(
            treasury_available >= creator_reward,
            InstinctFiError::TreasuryInsufficient
        );

        system_program::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.system_program.to_account_info(),
                system_program::Transfer {
                    from: ctx.accounts.treasury.to_account_info(),
                    to: ctx.accounts.creator.to_account_info(),
                },
                signer_seeds,
            ),
            creator_reward,
        )?;
    }

    // ── Mark settled with admin-declared winner ──
    let poll = &mut ctx.accounts.poll_account;
    poll.status = PollAccount::STATUS_SETTLED;
    poll.winning_option = winning_option;

    let winning_votes = vote_counts[winning_option as usize];
    msg!(
        "AdminSettle: Poll {} settled by admin. Winner: option {} ({} votes out of {} total). Creator reward: {} lamports",
        poll_id_val,
        winning_option,
        winning_votes,
        total_votes,
        creator_reward
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64, winning_option: u8)]
pub struct AdminSettlePoll<'info> {
    /// The platform admin — ONLY this wallet can admin-settle polls.
    #[account(
        mut,
        constraint = admin.key() == PLATFORM_ADMIN @ InstinctFiError::Unauthorized,
    )]
    pub admin: Signer<'info>,

    /// CHECK: Poll creator — receives creator reward. Validated by constraint.
    #[account(
        mut,
        constraint = creator.key() == poll_account.creator @ InstinctFiError::UnauthorizedNotCreator,
    )]
    pub creator: UncheckedAccount<'info>,

    /// The poll to settle
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// CHECK: Treasury PDA — SOL source for creator reward
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
