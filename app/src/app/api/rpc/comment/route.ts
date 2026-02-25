import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("insert_comment_atomic", (wallet, body) => ({
    p_wallet: wallet,
    p_poll_id: body.p_poll_id,
    p_text: body.p_text,
}));
