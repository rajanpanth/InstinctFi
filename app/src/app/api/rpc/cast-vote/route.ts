import { createRpcHandler } from "../_handler";
import { CastVoteInput, zodValidator } from "../_validation";

export const POST = createRpcHandler(
    "cast_vote_atomic",
    (wallet, body) => ({
        p_wallet: wallet,
        p_poll_id: body.p_poll_id,
        p_option_index: body.p_option_index,
        p_num_coins: body.p_num_coins,
    }),
    zodValidator(CastVoteInput)
);
