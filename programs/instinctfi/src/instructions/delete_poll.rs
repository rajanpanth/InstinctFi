use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::PollAccount;
use crate::errors::InstinctFiError;

/// Deletes a poll and refunds the creator's SOL investment from the treasury.
/// Only the creator may call this, and only when the poll has zero votes,
/// is still active, and has not ended.
pub fn handler(ctx: Context<DeletePoll>, _poll_id: u64) -> Result<()> {
    let clock = Clock::get()?;

    // Read values before mutable borrow
    let creator_key = ctx.accounts.poll_account.creator;
    let status = ctx.accounts.poll_account.status;
    let end_time = ctx.accounts.poll_account.end_time;
    let vote_counts_sum: u64 = ctx.accounts.poll_account.vote_counts.iter().sum();
    let poll_id_val = ctx.accounts.poll_account.poll_id;
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;

    // ── Permission & safety checks ──
    require!(
        creator_key == ctx.accounts.creator.key(),
        InstinctFiError::UnauthorizedNotCreator
    );
    require!(status == PollAccount::STATUS_ACTIVE, InstinctFiError::PollNotActive);
    require!(clock.unix_timestamp < end_time, InstinctFiError::PollAlreadyEnded);
    require!(vote_counts_sum == 0, InstinctFiError::PollHasVotes);

    // ── Refund treasury SOL to creator ──
    let treasury_balance = ctx.accounts.treasury.lamports();
    if treasury_balance > 0 {
        let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
        let signer_seeds = &[seeds];

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

    // poll_account is closed automatically via `close = creator` constraint
    msg!(
        "Poll {} deleted, {} lamports refunded to creator",
        poll_id_val,
        treasury_balance
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct DeletePoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Poll PDA — closed after handler, rent returned to creator
    #[account(
        mut,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
        close = creator,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// CHECK: Treasury PDA — SOL refunded to creator
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump = poll_account.treasury_bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
