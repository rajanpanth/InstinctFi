import { createRpcHandler } from "../_handler";
import { zodValidator, ReactCommentInput } from "../_validation";

export const POST = createRpcHandler(
    "toggle_reaction",
    (wallet, body) => {
        // BUG-04 FIX: Validate inputs with Zod before passing to RPC
        zodValidator(ReactCommentInput)(body);
        return {
            p_comment_id: body.p_comment_id,
            p_wallet: wallet,
            p_emoji: body.p_emoji,
        };
    }
);
