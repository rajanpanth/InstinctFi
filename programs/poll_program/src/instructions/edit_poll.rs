use anchor_lang::prelude::*;

use crate::state::PollAccount;
use crate::errors::PollError;

/// Edits an existing poll. Only the creator may call this,
/// and only when the poll has zero votes, is still active, and has not ended.
///
/// Editable fields: title, description, category, image_url, option labels, end_time.
/// Locked fields: unit_price_cents, creator_investment_cents, fees, treasury.
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
        PollError::UnauthorizedNotCreator
    );
    require!(poll.is_active(), PollError::PollNotActive);
    require!(!poll.is_ended(&clock), PollError::PollAlreadyEnded);

    // Check zero votes
    let total_votes: u64 = poll.vote_counts.iter().sum();
    require!(total_votes == 0, PollError::PollHasVotes);

    // ── Validate new inputs ──
    require!(title.len() <= 64, PollError::TitleTooLong);
    require!(description.len() <= 256, PollError::DescriptionTooLong);
    require!(category.len() <= 32, PollError::CategoryTooLong);
    require!(image_url.len() <= 256, PollError::ImageUrlTooLong);
    require!(
        options.len() == poll.options.len(),
        PollError::OptionCountMismatch
    );
    for opt in &options {
        require!(opt.len() <= 32, PollError::OptionLabelTooLong);
    }
    require!(end_time > clock.unix_timestamp, PollError::EndTimeInPast);

    // ── Apply edits (preserve locked fields) ──
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
    /// The poll creator (must match poll_account.creator)
    #[account(mut)]
    pub creator: Signer<'info>,

    /// Poll PDA: seeds = ["poll", creator, poll_id]
    #[account(
        mut,
        seeds = [b"poll", creator.key().as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
