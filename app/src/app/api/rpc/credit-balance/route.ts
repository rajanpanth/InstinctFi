import { createAdminRpcHandler } from "../_handler";

const MAX_CREDIT_AMOUNT = 100_000_000_000; // ~100 SOL max per call (in lamports)

// BUG-02 FIX: Admin-only — prevents arbitrary users from minting unlimited
// virtual currency. Only admin wallets (verified via admin_wallets table) can call.
export const POST = createAdminRpcHandler("credit_balance", (wallet, body) => {
    const amount = Number(body.p_amount);
    if (!amount || amount <= 0 || amount > MAX_CREDIT_AMOUNT) {
        throw new Error(`Invalid credit amount (max: ${MAX_CREDIT_AMOUNT})`);
    }
    return {
        p_wallet: wallet,       // always self — never from body
        p_amount: amount,
    };
});
