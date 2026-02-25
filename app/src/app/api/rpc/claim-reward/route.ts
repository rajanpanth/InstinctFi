import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("claim_reward_atomic", (wallet, body) => ({
    p_wallet: wallet,
    p_poll_id: body.p_poll_id,
}));
