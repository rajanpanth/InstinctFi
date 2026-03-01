use anchor_lang::prelude::*;
use crate::state::{PollAccount, PLATFORM_ADMIN};
use crate::errors::InstinctFiError;

/// Admin-edit a poll. Only PLATFORM_ADMIN can call this.
///
/// Unlike `edit_poll` (creator-only, active, not ended, zero votes),
/// admin can edit polls regardless of state — including ended polls.
/// This allows extending deadlines, fixing typos, etc.
///
/// Editable: title, description, category, image_url, option labels, end_time.
/// Locked: unit_price, creator_investment, fees, treasury, vote_counts, status.
///
/// Safety constraints still enforced:
/// - Cannot edit a settled poll (funds already distributed).
/// - end_time must be in the future.
/// - Option count must match (can't add/remove options after creation).
/// - Input length limits are enforced.
pub fn handler(
    ctx: Context<AdminEditPoll>,
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

    // ── Safety checks ──
    require!(poll.is_active(), InstinctFiError::AlreadySettled);

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

    msg!("Poll {} admin-edited by platform admin", poll.poll_id);
    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct AdminEditPoll<'info> {
    /// The platform admin — ONLY this wallet can admin-edit polls.
    #[account(
        mut,
        constraint = admin.key() == PLATFORM_ADMIN @ InstinctFiError::Unauthorized,
    )]
    pub admin: Signer<'info>,

    /// The poll to edit. PDA is seeded by the original creator, not the admin.
    #[account(
        mut,
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,
}
