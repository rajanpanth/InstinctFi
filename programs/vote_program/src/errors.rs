use anchor_lang::prelude::*;

#[error_code]
pub enum VoteError {
    #[msg("Poll is not active")]
    PollNotActive,
    #[msg("Poll has ended")]
    PollEnded,
    #[msg("Invalid option index")]
    InvalidOption,
    #[msg("Must buy at least 1 option-coin")]
    ZeroCoins,
    #[msg("Creator cannot vote on own poll")]
    CreatorCannotVote,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Insufficient funds for vote")]
    InsufficientFunds,
    #[msg("Already claimed rewards")]
    AlreadyClaimed,
    #[msg("Poll not settled yet")]
    NotSettled,
}
