use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// Creates a new poll with seed investment from the creator.
/// All monetary values are in CENTS ($1 = 100 cents).
/// Uses internal accounting – no SOL transfers.
///
/// Tokenomics:
///   Platform fee: 1% of investment
///   Creator reward: 1% of investment
///   Pool seed = investment - fees
pub fn handler(
    ctx: Context<CreatePoll>,
    poll_id: u64,
    title: String,
    description: String,
    category: String,
    options: Vec<String>,
    unit_price_cents: u64,
    end_time: i64,
    creator_investment_cents: u64,
) -> Result<()> {
    // ── Validate inputs ──
    require!(title.len() <= 64, PollError::TitleTooLong);
    require!(description.len() <= 256, PollError::DescriptionTooLong);
    require!(category.len() <= 32, PollError::CategoryTooLong);
    require!(options.len() >= 2 && options.len() <= 6, PollError::InvalidOptionCount);
    for opt in &options {
        require!(opt.len() <= 32, PollError::OptionLabelTooLong);
    }
    require!(unit_price_cents > 0, PollError::InvalidUnitPrice);

    let clock = Clock::get()?;
    require!(end_time > clock.unix_timestamp, PollError::EndTimeInPast);
    require!(creator_investment_cents >= unit_price_cents, PollError::InvestmentTooLow);

    // ── Fee math (all in cents) ──
    let platform_fee = std::cmp::max(creator_investment_cents / 100, 1);
    let creator_reward = std::cmp::max(creator_investment_cents / 100, 1);
    let pool_seed = creator_investment_cents
        .checked_sub(platform_fee)
        .ok_or(PollError::Overflow)?
        .checked_sub(creator_reward)
        .ok_or(PollError::Overflow)?;

    // ── Initialize poll account ──
    let poll = &mut ctx.accounts.poll_account;
    let num_options = options.len();

    poll.poll_id = poll_id;
    poll.creator = ctx.accounts.creator.key();
    poll.title = title;
    poll.description = description;
    poll.category = category;
    poll.options = options;
    poll.vote_counts = vec![0u64; num_options];
    poll.unit_price_cents = unit_price_cents;
    poll.end_time = end_time;
    poll.total_pool_cents = pool_seed;
    poll.creator_investment_cents = creator_investment_cents;
    poll.platform_fee_cents = platform_fee;
    poll.creator_reward_cents = creator_reward;
    poll.status = PollAccount::STATUS_ACTIVE;
    poll.winning_option = 255; // unset
    poll.treasury_bump = ctx.bumps.treasury;
    poll.bump = ctx.bumps.poll_account;
    poll.total_voters = 0;
    poll.created_at = clock.unix_timestamp;

    msg!("Poll created: {} with {} options, pool=${}", poll.poll_id, num_options, pool_seed / 100);
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CreatePoll<'info> {
    /// The poll creator (pays for account rent)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Poll PDA: seeds = ["poll", creator, poll_id]
    #[account(
        init,
        payer = creator,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// Treasury PDA: kept for compatibility (no SOL held in dollar mode)
    /// seeds = ["treasury", poll_account]
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump,
    )]
    /// CHECK: This is a PDA used as a vault, no data stored
    pub treasury: SystemAccount<'info>,

    pub system_program: Program<'info, System>,
}
