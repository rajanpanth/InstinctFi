use anchor_lang::prelude::*;

#[error_code]
pub enum PollError {
    #[msg("Poll title too long (max 64 chars)")]
    TitleTooLong,
    #[msg("Poll description too long (max 256 chars)")]
    DescriptionTooLong,
    #[msg("Category too long (max 32 chars)")]
    CategoryTooLong,
    #[msg("Must have between 2 and 6 options")]
    InvalidOptionCount,
    #[msg("Option label too long (max 32 chars)")]
    OptionLabelTooLong,
    #[msg("Unit price must be greater than 0")]
    InvalidUnitPrice,
    #[msg("End time must be in the future")]
    EndTimeInPast,
    #[msg("Creator investment too low")]
    InvestmentTooLow,
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
    #[msg("Image URL too long (max 256 chars)")]
    ImageUrlTooLong,
    #[msg("Creator cannot vote on own poll")]
    CreatorCannotVote,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Insufficient funds")]
    InsufficientFunds,
    #[msg("Only the poll creator can perform this action")]
    UnauthorizedNotCreator,
    #[msg("Poll already has votes and cannot be modified")]
    PollHasVotes,
    #[msg("Option count mismatch with existing poll")]
    OptionCountMismatch,
}
