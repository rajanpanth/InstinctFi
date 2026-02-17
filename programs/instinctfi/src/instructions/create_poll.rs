use anchor_lang::prelude::*;
use anchor_lang::system_program;
use crate::state::{PollAccount, UserAccount};
use crate::errors::InstinctFiError;

/// Creates a new prediction poll with a real SOL investment.
///
/// Fee structure:
///   Platform fee: 1% of investment (stays in treasury)
///   Creator reward: 1% of investment (sent to creator on settlement)
///   Pool seed: 98% of investment (distributed to winners)
///
/// The creator's SOL is transferred to the treasury PDA.
pub fn handler(
    ctx: Context<CreatePoll>,
    poll_id: u64,
    title: String,
    description: String,
    category: String,
    image_url: String,
    options: Vec<String>,
    unit_price: u64,
    end_time: i64,
    creator_investment: u64,
) -> Result<()> {
    // ── Validate inputs ──
    require!(title.len() <= 64, InstinctFiError::TitleTooLong);
    require!(description.len() <= 256, InstinctFiError::DescriptionTooLong);
    require!(category.len() <= 32, InstinctFiError::CategoryTooLong);
    require!(image_url.len() <= 256, InstinctFiError::ImageUrlTooLong);
    require!(options.len() >= 2 && options.len() <= 6, InstinctFiError::InvalidOptionCount);
    for opt in &options {
        require!(opt.len() <= 32, InstinctFiError::OptionLabelTooLong);
    }
    require!(unit_price > 0, InstinctFiError::InvalidUnitPrice);

    let clock = Clock::get()?;
    require!(end_time > clock.unix_timestamp, InstinctFiError::EndTimeInPast);
    require!(creator_investment >= unit_price, InstinctFiError::InvestmentTooLow);

    // ── Fee math (all in lamports) ──
    let platform_fee = std::cmp::max(creator_investment / 100, 1);
    let creator_reward = std::cmp::max(creator_investment / 100, 1);
    let pool_seed = creator_investment
        .checked_sub(platform_fee)
        .ok_or(InstinctFiError::Overflow)?
        .checked_sub(creator_reward)
        .ok_or(InstinctFiError::Overflow)?;

    // ── Transfer real SOL from creator → treasury PDA ──
    system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            system_program::Transfer {
                from: ctx.accounts.creator.to_account_info(),
                to: ctx.accounts.treasury.to_account_info(),
            },
        ),
        creator_investment,
    )?;

    // ── Initialize poll account ──
    let poll = &mut ctx.accounts.poll_account;
    let num_options = options.len();

    poll.poll_id = poll_id;
    poll.creator = ctx.accounts.creator.key();
    poll.title = title;
    poll.description = description;
    poll.category = category;
    poll.image_url = image_url;
    poll.options = options;
    poll.vote_counts = vec![0u64; num_options];
    poll.unit_price = unit_price;
    poll.end_time = end_time;
    poll.total_pool = pool_seed;
    poll.creator_investment = creator_investment;
    poll.platform_fee = platform_fee;
    poll.creator_reward = creator_reward;
    poll.status = PollAccount::STATUS_ACTIVE;
    poll.winning_option = 255;
    poll.treasury_bump = ctx.bumps.treasury;
    poll.bump = ctx.bumps.poll_account;
    poll.total_voters = 0;
    poll.created_at = clock.unix_timestamp;

    // ── Update user stats ──
    let user = &mut ctx.accounts.user_account;
    user.total_polls_created = user.total_polls_created
        .checked_add(1)
        .ok_or(InstinctFiError::Overflow)?;

    msg!(
        "Poll {} created with {} options, pool={} lamports, treasury={}",
        poll.poll_id,
        num_options,
        pool_seed,
        ctx.accounts.treasury.key()
    );
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct CreatePoll<'info> {
    /// The poll creator (pays SOL investment + account rent)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Creator's user profile
    #[account(
        mut,
        seeds = [b"user", creator.key().as_ref()],
        bump = user_account.bump,
    )]
    pub user_account: Account<'info, UserAccount>,

    /// Poll PDA: seeds = ["poll", creator, poll_id]
    #[account(
        init,
        payer = creator,
        space = 8 + PollAccount::INIT_SPACE,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// Treasury PDA: holds real SOL for this poll
    /// CHECK: This is a PDA vault that holds SOL — no data stored.
    /// Validated by seeds constraint.
    #[account(
        mut,
        seeds = [b"treasury", poll_account.key().as_ref()],
        bump,
    )]
    pub treasury: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}
