"use client";

import { useState, useCallback, useRef } from "react";
import toast from "react-hot-toast";

export type TxStatus = "idle" | "signing" | "confirming" | "confirmed" | "failed";

interface TxState {
    status: TxStatus;
    signature: string | null;
    error: string | null;
}

const EXPLORER_BASE = "https://explorer.solana.com/tx";
const CLUSTER = "devnet";

function getExplorerLink(sig: string): string {
    return `${EXPLORER_BASE}/${sig}?cluster=${CLUSTER}`;
}

/**
 * Hook that provides transaction lifecycle feedback:
 * - "Signing..." while wallet prompt is open
 * - "Confirming..." while waiting for on-chain confirmation
 * - "Confirmed ✓" or "Failed ✗" with explorer link
 */
export function useTransactionStatus() {
    const [txState, setTxState] = useState<TxState>({
        status: "idle",
        signature: null,
        error: null,
    });

    const toastIdRef = useRef<string | undefined>(undefined);

    const startTransaction = useCallback((label: string) => {
        const id = `tx-${Date.now()}`;
        toastIdRef.current = id;
        setTxState({ status: "signing", signature: null, error: null });

        toast.loading(
            `✍️ Signing — ${label}...`,
            { id, duration: Infinity }
        );
        return id;
    }, []);

    const setConfirming = useCallback((label: string, signature?: string) => {
        setTxState(prev => ({ ...prev, status: "confirming", signature: signature || null }));

        const id = toastIdRef.current;
        if (id) {
            toast.loading(
                `⏳ Confirming${signature ? ` — ${signature.slice(0, 8)}…` : ""}`,
                { id, duration: Infinity }
            );
        }
    }, []);

    const setConfirmed = useCallback((label: string, signature?: string) => {
        setTxState(prev => ({ ...prev, status: "confirmed", signature: signature || prev.signature }));

        const id = toastIdRef.current;
        if (id) {
            const sig = signature || txState.signature;
            const msg = sig
                ? `✅ ${label} confirmed`
                : `✅ ${label} confirmed`;
            toast.success(msg, { id, duration: 4000 });
        }
        toastIdRef.current = undefined;
    }, [txState.signature]);

    const setFailed = useCallback((label: string, error?: string) => {
        setTxState(prev => ({ ...prev, status: "failed", error: error || null }));

        const id = toastIdRef.current;
        if (id) {
            toast.error(
                `❌ ${label} failed${error ? ` — ${error}` : ""}`,
                { id, duration: 5000 }
            );
        }
        toastIdRef.current = undefined;
    }, []);

    const reset = useCallback(() => {
        setTxState({ status: "idle", signature: null, error: null });
        toastIdRef.current = undefined;
    }, []);

    /**
     * Wraps an async transaction function with lifecycle feedback.
     * Example: await trackTransaction("Vote", async () => { ... })
     */
    const trackTransaction = useCallback(async <T>(
        label: string,
        fn: (helpers: {
            onSigned: (sig?: string) => void;
            onConfirmed: (sig?: string) => void;
        }) => Promise<T>,
    ): Promise<T | null> => {
        startTransaction(label);
        try {
            const result = await fn({
                onSigned: (sig) => setConfirming(label, sig),
                onConfirmed: (sig) => setConfirmed(label, sig),
            });
            return result;
        } catch (e: any) {
            const msg = e?.message?.slice(0, 80) || "Unknown error";
            setFailed(label, msg);
            return null;
        }
    }, [startTransaction, setConfirming, setConfirmed, setFailed]);

    return {
        txState,
        startTransaction,
        setConfirming,
        setConfirmed,
        setFailed,
        reset,
        trackTransaction,
        getExplorerLink,
    };
}
