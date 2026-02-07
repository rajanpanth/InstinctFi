use anchor_lang::prelude::*;

#[error_code]
pub enum SettlementError {
    #[msg("Poll is not active")]
    PollNotActive,
    #[msg("Poll has not ended yet")]
    PollNotEnded,
    #[msg("Poll already settled")]
    AlreadySettled,
    #[msg("No votes cast on this poll")]
    NoVotes,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Poll not settled yet")]
    NotSettled,
    #[msg("User did not vote for the winning option")]
    NotAWinner,
    #[msg("Reward already claimed")]
    AlreadyClaimed,
    #[msg("Insufficient treasury funds")]
    InsufficientTreasury,
}
