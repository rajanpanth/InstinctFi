import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("credit_balance", (wallet, body) => ({
    p_wallet: wallet,
    p_amount: body.p_amount,
}));
