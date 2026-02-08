use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::PollAccount;
use crate::errors::InstinctFiError;

/// Settle a poll after its end time.
/// Determines the winning option by highest vote count (ties → lower index).
///
/// If no votes: refunds entire treasury to creator.
/// If votes: sends creator_reward to creator; pool stays for winners to claim.
pub fn handler(ctx: Context<SettlePoll>, _poll_id: u64) -> Result<()> {
    let clock = Clock::get()?;

    // ── Read immutable data first ──
    let poll_key = ctx.accounts.poll_account.key();
    let treasury_bump = ctx.accounts.poll_account.treasury_bump;
    let status = ctx.accounts.poll_account.status;
    let end_time = ctx.accounts.poll_account.end_time;
    let creator_reward = ctx.accounts.poll_account.creator_reward;
    let creator_investment = ctx.accounts.poll_account.creator_investment;
    let vote_counts = ctx.accounts.poll_account.vote_counts.clone();
    let poll_id_val = ctx.accounts.poll_account.poll_id;

    // ── Guards ──
    require!(status == PollAccount::STATUS_ACTIVE, InstinctFiError::AlreadySettled);
    require!(clock.unix_timestamp >= end_time, InstinctFiError::PollNotEnded);

    // ── PDA signer seeds for treasury ──
    let seeds: &[&[u8]] = &[b"treasury", poll_key.as_ref(), &[treasury_bump]];
    let signer_seeds = &[seeds];

    // ── Determine winner ──
    let mut max_votes: u64 = 0;
    let mut winning_idx: u8 = 0;
    let mut has_votes = false;

    for (i, &count) in vote_counts.iter().enumerate() {
        if count > max_votes {
            max_votes = count;
            winning_idx = i as u8;
            has_votes = true;
        }
    }

    if !has_votes {
        // No votes — refund entire treasury to creator
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
        poll.winning_option = 255;

        msg!("Poll {} settled with no votes — {} lamports refunded", poll_id_val, treasury_balance);
        return Ok(());
    }

    // ── Send creator reward from treasury → creator ──
    if creator_reward > 0 {
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

    // ── Mark settled ──
    let poll = &mut ctx.accounts.poll_account;
    poll.status = PollAccount::STATUS_SETTLED;
    poll.winning_option = winning_idx;

    msg!(
        "Poll {} settled. Winner: option {} with {} votes. Creator reward: {} lamports",
        poll_id_val,
        winning_idx,
        max_votes,
        creator_reward
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct SettlePoll<'info> {
    /// Anyone can trigger settlement (permissionless crank)
    #[account(mut)]
    pub settler: Signer<'info>,

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
