import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("signup_user", (wallet) => ({
    p_wallet: wallet,
}));
