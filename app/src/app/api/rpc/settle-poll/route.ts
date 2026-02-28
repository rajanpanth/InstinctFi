import { createAdminRpcHandler } from "../_handler";
import { PollIdInput, zodValidator } from "../_validation";

export const POST = createAdminRpcHandler(
    "settle_poll_atomic",
    (wallet, body) => ({
        p_wallet: wallet,
        p_poll_id: body.p_poll_id,
    }),
    zodValidator(PollIdInput)
);
