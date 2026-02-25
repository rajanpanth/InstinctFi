import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("delete_poll_atomic", (wallet, body) => ({
    p_wallet: wallet,
    p_poll_id: body.p_poll_id,
}));
