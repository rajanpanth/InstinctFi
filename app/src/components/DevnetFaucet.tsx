"use client";

import { useState } from "react";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL } from "@solana/web3.js";
import { Droplets, Loader2, CheckCircle, ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

/**
 * DevnetFaucet — button to request a devnet SOL airdrop.
 * Only shown when connected to devnet.
 */
export default function DevnetFaucet() {
    const { connection } = useConnection();
    const { publicKey } = useWallet();
    const [loading, setLoading] = useState(false);
    const [lastSig, setLastSig] = useState<string | null>(null);

    const requestAirdrop = async () => {
        if (!publicKey) {
            toast.error("Connect your wallet first");
            return;
        }

        setLoading(true);
        try {
            const sig = await connection.requestAirdrop(publicKey, 1 * LAMPORTS_PER_SOL);
            await connection.confirmTransaction(sig, "confirmed");
            setLastSig(sig);
            toast.success("Received 1 SOL on devnet!", { icon: "💧" });
        } catch (err: any) {
            console.error("Airdrop failed:", err);
            if (err?.message?.includes("429") || err?.message?.includes("rate")) {
                toast.error("Rate limited — try again in a minute");
            } else {
                toast.error("Airdrop failed. Devnet may be congested.");
            }
        } finally {
            setLoading(false);
        }
    };

    if (!publicKey) return null;

    return (
        <div className="flex items-center gap-2">
            <button
                onClick={requestAirdrop}
                disabled={loading}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium
          bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/20
          rounded-lg transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Request 1 SOL airdrop on devnet"
            >
                {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                ) : lastSig ? (
                    <CheckCircle size={14} />
                ) : (
                    <Droplets size={14} />
                )}
                {loading ? "Requesting..." : "Faucet"}
            </button>

            {lastSig && (
                <a
                    href={`https://explorer.solana.com/tx/${lastSig}?cluster=devnet`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-cyan-500/60 hover:text-cyan-400 transition-colors"
                    title="View on Solana Explorer"
                >
                    <ExternalLink size={12} />
                </a>
            )}
        </div>
    );
}
