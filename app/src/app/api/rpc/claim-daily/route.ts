import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("claim_daily_reward", (wallet) => ({
    p_wallet: wallet,
}));
