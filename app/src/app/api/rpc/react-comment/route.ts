import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler(
    "toggle_reaction",
    (wallet, body) => ({
        p_comment_id: body.p_comment_id,
        p_wallet: wallet,
        p_emoji: body.p_emoji,
    })
);
