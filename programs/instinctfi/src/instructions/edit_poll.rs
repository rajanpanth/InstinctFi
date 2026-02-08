use anchor_lang::prelude::*;
use crate::state::PollAccount;
use crate::errors::InstinctFiError;

/// Edits an existing poll. Only the creator may call this,
/// and only when the poll has zero votes, is still active, and has not ended.
///
/// Editable: title, description, category, image_url, option labels, end_time.
/// Locked: unit_price, creator_investment, fees, treasury.
pub fn handler(
    ctx: Context<EditPoll>,
    _poll_id: u64,
    title: String,
    description: String,
    category: String,
    image_url: String,
    options: Vec<String>,
    end_time: i64,
) -> Result<()> {
    let poll = &mut ctx.accounts.poll_account;
    let clock = Clock::get()?;

    // ── Permission & safety checks ──
    require!(
        poll.creator == ctx.accounts.creator.key(),
        InstinctFiError::UnauthorizedNotCreator
    );
    require!(poll.is_active(), InstinctFiError::PollNotActive);
    require!(!poll.is_ended(&clock), InstinctFiError::PollAlreadyEnded);

    let total_votes: u64 = poll.vote_counts.iter().sum();
    require!(total_votes == 0, InstinctFiError::PollHasVotes);

    // ── Validate new inputs ──
    require!(title.len() <= 64, InstinctFiError::TitleTooLong);
    require!(description.len() <= 256, InstinctFiError::DescriptionTooLong);
    require!(category.len() <= 32, InstinctFiError::CategoryTooLong);
    require!(image_url.len() <= 256, InstinctFiError::ImageUrlTooLong);
    require!(
        options.len() == poll.options.len(),
        InstinctFiError::OptionCountMismatch
    );
    for opt in &options {
        require!(opt.len() <= 32, InstinctFiError::OptionLabelTooLong);
    }
    require!(end_time > clock.unix_timestamp, InstinctFiError::EndTimeInPast);

    // ── Apply edits ──
    poll.title = title;
    poll.description = description;
    poll.category = category;
    poll.image_url = image_url;
    poll.options = options;
    poll.end_time = end_time;

    msg!("Poll {} edited by creator", poll.poll_id);
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct EditPoll<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        mut,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
