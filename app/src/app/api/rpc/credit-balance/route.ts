import { createRpcHandler } from "../_handler";

const MAX_CREDIT_AMOUNT = 100_000_000_000; // ~100 SOL max per call (in lamports)

// Uses createRpcHandler (not Admin) so non-admin users can credit
// their own devnet balance during signup. The wallet is always
// injected from the JWT — users can only credit *themselves*.
export const POST = createRpcHandler("credit_balance", (wallet, body) => {
    const amount = Number(body.p_amount);
    if (!amount || amount <= 0 || amount > MAX_CREDIT_AMOUNT) {
        throw new Error(`Invalid credit amount (max: ${MAX_CREDIT_AMOUNT})`);
    }
    return {
        p_wallet: wallet,       // always self — never from body
        p_amount: amount,
    };
});
