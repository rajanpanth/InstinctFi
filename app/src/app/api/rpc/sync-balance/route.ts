/**
 * Sync the user's Supabase platform balance to match their on-chain wallet balance.
 * Called on login to ensure the displayed balance is accurate.
 *
 * SECURITY FIX (CRIT-01): The server now verifies the on-chain balance via
 * Solana RPC instead of trusting the client-reported value.
 */
import { NextRequest, NextResponse } from "next/server";
import { Connection, PublicKey } from "@solana/web3.js";
import { getWalletFromAuth } from "@/lib/jwt";
import { getSupabaseAdmin } from "@/lib/supabaseAdmin";
import { isRateLimited } from "@/lib/rateLimit";
import { log } from "@/lib/logger";

const MAX_SYNC_AMOUNT = 500_000_000_000; // 500 SOL max — safety cap

const SOLANA_RPC_URL =
    process.env.SOLANA_RPC_URL ||
    process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
    "https://api.devnet.solana.com";

let _connection: Connection | null = null;
function getSolanaConnection(): Connection {
    if (!_connection) {
        _connection = new Connection(SOLANA_RPC_URL, { commitment: "confirmed" });
    }
    return _connection;
}

export async function POST(req: NextRequest) {
    try {
        const wallet = await getWalletFromAuth(req.headers.get("authorization"));
        if (!wallet) {
            return NextResponse.json({ success: false, error: "unauthorized" }, { status: 401 });
        }

        if (await isRateLimited(wallet)) {
            return NextResponse.json({ success: false, error: "rate_limited" }, { status: 429 });
        }

        // CRIT-01 FIX: Verify on-chain balance server-side — NEVER trust client input.
        let targetBalance: number;
        try {
            const conn = getSolanaConnection();
            const pubkey = new PublicKey(wallet);
            targetBalance = await conn.getBalance(pubkey);
        } catch (e) {
            log.error("sync_balance_rpc_fetch_failed", { wallet, error: (e as Error).message });
            return NextResponse.json(
                { success: false, error: "failed_to_verify_onchain_balance" },
                { status: 502 }
            );
        }

        if (!Number.isFinite(targetBalance) || targetBalance < 0 || targetBalance > MAX_SYNC_AMOUNT) {
            return NextResponse.json(
                { success: false, error: "invalid_onchain_balance" },
                { status: 400 }
            );
        }

        const supabase = getSupabaseAdmin();

        // Fetch current Supabase balance
        const { data: user, error: fetchErr } = await supabase
            .from("users")
            .select("balance")
            .eq("wallet", wallet)
            .single();

        if (fetchErr || !user) {
            return NextResponse.json({ success: false, error: "user_not_found" }, { status: 404 });
        }

        const currentBalance = Number(user.balance);
        const diff = targetBalance - currentBalance;

        if (diff === 0) {
            return NextResponse.json({ success: true, new_balance: currentBalance });
        }

        let result;
        if (diff > 0) {
            // Need to credit
            result = await supabase.rpc("credit_balance", {
                p_wallet: wallet,
                p_amount: Math.round(diff),
            });
        } else {
            // Need to spend (reduce)
            result = await supabase.rpc("spend_balance", {
                p_wallet: wallet,
                p_amount: Math.round(Math.abs(diff)),
            });
        }

        if (result.error) {
            log.error("sync_balance_rpc_failed", { wallet, error: result.error.message });
            return NextResponse.json({ success: false, error: "sync_failed" }, { status: 500 });
        }

        const rpcData = result.data as any;
        if (rpcData && !rpcData.success) {
            if (rpcData.error === "insufficient_balance") {
                // Set balance to 0 first by spending what we have, then credit target
                const currentBal = Number(rpcData.balance ?? currentBalance);
                if (currentBal > 0) {
                    await supabase.rpc("spend_balance", { p_wallet: wallet, p_amount: currentBal });
                }
                if (targetBalance > 0) {
                    await supabase.rpc("credit_balance", { p_wallet: wallet, p_amount: Math.round(targetBalance) });
                }
            } else {
                return NextResponse.json({ success: false, error: "sync_failed" }, { status: 500 });
            }
        }

        log.info("balance_synced", { wallet, from: currentBalance, to: targetBalance });
        return NextResponse.json({ success: true, new_balance: targetBalance });
    } catch (e) {
        log.error("sync_balance_unexpected", { error: (e as Error).message });
        return NextResponse.json({ success: false, error: "internal_error" }, { status: 500 });
    }
}
