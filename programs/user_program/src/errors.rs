use anchor_lang::prelude::*;

#[error_code]
pub enum UserError {
    #[msg("Signup bonus already claimed")]
    BonusAlreadyClaimed,
    #[msg("Weekly reward not yet available")]
    WeeklyRewardNotReady,
    #[msg("Insufficient balance")]
    InsufficientBalance,
    #[msg("Arithmetic overflow")]
    Overflow,
    #[msg("Unauthorized")]
    Unauthorized,
}
