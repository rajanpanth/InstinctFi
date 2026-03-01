import { createRpcHandler } from "../_handler";

export const POST = createRpcHandler("signup_user", (wallet, _body) => {
    // Balance is NEVER synced from client — on-chain is the sole source of truth.
    // Supabase only stores stats/metadata, not financial data.
    // p_initial_balance is passed explicitly to disambiguate the PostgREST
    // overload (PGRST203) when an old single-arg version still exists in the DB.
    return { p_wallet: wallet, p_initial_balance: 5000000000 };
});
