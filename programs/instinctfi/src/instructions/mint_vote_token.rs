use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo};
use crate::state::{PollAccount, VoteAccount};
use crate::errors::InstinctFiError;

/// Mint a "Vote Receipt" NFT to a voter using SPL Token.
///
/// This instruction creates a unique mint (1 supply, 0 decimals) per
/// poll+voter combination. The token acts as an on-chain proof of
/// participation in the prediction market.
///
/// Uses the SPL Token program via anchor-spl for on-chain vote receipts.
pub fn handler(ctx: Context<MintVoteToken>, _poll_id: u64) -> Result<()> {
    let poll = &ctx.accounts.poll_account;
    let vote = &ctx.accounts.vote_account;

    // Guard: poll must be active
    require!(poll.is_active(), InstinctFiError::PollNotActive);

    // Guard: voter must have actually voted (VoteAccount must exist and belong to caller)
    require!(
        vote.voter == ctx.accounts.voter.key(),
        InstinctFiError::Unauthorized
    );
    require!(
        vote.poll == ctx.accounts.poll_account.key(),
        InstinctFiError::Unauthorized
    );
    // Ensure voter has actually cast at least one vote
    let total_votes: u64 = vote.votes_per_option.iter().sum();
    require!(total_votes > 0, InstinctFiError::Unauthorized);

    // Mint exactly 1 token (NFT-like receipt) to the voter's token account
    let poll_key = ctx.accounts.poll_account.key();
    let voter_key = ctx.accounts.voter.key();
    let poll_id_bytes = poll.poll_id.to_le_bytes();

    let seeds: &[&[u8]] = &[
        b"vote_mint",
        poll_key.as_ref(),
        voter_key.as_ref(),
        &poll_id_bytes,
        &[ctx.bumps.vote_mint],
    ];
    let signer_seeds = &[seeds];

    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint: ctx.accounts.vote_mint.to_account_info(),
                to: ctx.accounts.voter_token_account.to_account_info(),
                authority: ctx.accounts.vote_mint.to_account_info(),
            },
            signer_seeds,
        ),
        1, // mint exactly 1 token
    )?;

    msg!(
        "Minted Vote Receipt Token for poll {} to voter {}",
        poll.poll_id,
        ctx.accounts.voter.key()
    );

    Ok(())
}

// ─── Accounts ────────────────────────────────────────────────────────────────

#[derive(Accounts)]
#[instruction(poll_id: u64)]
pub struct MintVoteToken<'info> {
    /// Voter who receives the vote receipt token
    #[account(mut)]
    pub voter: Signer<'info>,

    /// The poll this vote receipt is for
    #[account(
        seeds = [b"poll", poll_account.creator.as_ref(), &poll_id.to_le_bytes()],
        bump = poll_account.bump,
    )]
    pub poll_account: Account<'info, PollAccount>,

    /// The voter's VoteAccount for this poll — proves they actually voted.
    /// Must exist (created by cast_vote) and match the poll+voter combination.
    #[account(
        seeds = [b"vote", poll_account.key().as_ref(), voter.key().as_ref()],
        bump = vote_account.bump,
    )]
    pub vote_account: Account<'info, VoteAccount>,

    /// SPL Token mint for this vote receipt.
    /// PDA seeds: ["vote_mint", poll_account, voter, poll_id]
    /// This ensures one unique mint per voter per poll.
    #[account(
        init,
        payer = voter,
        mint::decimals = 0,
        mint::authority = vote_mint,  // self-authority (PDA signs)
        seeds = [
            b"vote_mint",
            poll_account.key().as_ref(),
            voter.key().as_ref(),
            &poll_id.to_le_bytes(),
        ],
        bump,
    )]
    pub vote_mint: Account<'info, Mint>,

    /// Voter's token account for this mint
    #[account(
        init,
        payer = voter,
        token::mint = vote_mint,
        token::authority = voter,
        seeds = [
            b"vote_receipt",
            vote_mint.key().as_ref(),
            voter.key().as_ref(),
        ],
        bump,
    )]
    pub voter_token_account: Account<'info, TokenAccount>,

    /// SPL Token program
    pub token_program: Program<'info, Token>,

    pub system_program: Program<'info, System>,
}
