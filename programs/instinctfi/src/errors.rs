use anchor_lang::prelude::*;

#[error_code]
pub enum InstinctFiError {
    #[msg("Poll title too long (max 64 chars)")]
    TitleTooLong,
    #[msg("Poll description too long (max 256 chars)")]
    DescriptionTooLong,
    #[msg("Category too long (max 32 chars)")]
    CategoryTooLong,
    #[msg("Invalid number of options (2–6 required)")]
    InvalidOptionCount,
    #[msg("Option label too long (max 32 chars)")]
    OptionLabelTooLong,
    #[msg("Unit price must be greater than 0")]
    InvalidUnitPrice,
    #[msg("End time must be in the future")]
    EndTimeInPast,
    #[msg("Creator investment too low (must cover at least 1 coin)")]
    InvestmentTooLow,
    #[msg("Image URL too long (max 256 chars)")]
    ImageUrlTooLong,
    #[msg("Poll is not active")]
    PollNotActive,
    #[msg("Poll has not ended yet")]
    PollNotEnded,
    #[msg("Poll has already ended")]
    PollAlreadyEnded,
    #[msg("Poll already settled")]
    AlreadySettled,
    #[msg("Invalid option index")]
    InvalidOption,
    #[msg("Must buy at least 1 coin")]
    ZeroCoins,
    #[msg("Creator cannot vote on own poll")]
    CreatorCannotVote,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Insufficient SOL balance")]
    InsufficientFunds,
    #[msg("Only the poll creator can perform this action")]
    UnauthorizedNotCreator,
    #[msg("Poll already has votes and cannot be modified")]
    PollHasVotes,
    #[msg("Option count mismatch with existing poll")]
    OptionCountMismatch,
    #[msg("Poll not settled yet")]
    NotSettled,
    #[msg("No votes were cast on this poll")]
    NoVotes,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("You did not vote for the winning option")]
    NotAWinner,
    #[msg("Treasury has insufficient funds")]
    TreasuryInsufficient,
}
