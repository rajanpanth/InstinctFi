"use client";

import { ExternalLink } from "lucide-react";
import toast from "react-hot-toast";

/**
 * Show a toast with a clickable Solana Explorer link after a transaction.
 */
export function showTransactionToast(
    signature: string,
    message: string = "Transaction confirmed",
    cluster: "devnet" | "mainnet-beta" = "devnet"
) {
    const explorerUrl = `https://explorer.solana.com/tx/${signature}?cluster=${cluster}`;

    toast.success(
        (t) => (
            <div className="flex items-center gap-2">
                <span className="text-sm">{message}</span>
                <a
                    href={explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={(e) => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0"
                >
                    Explorer
                    <ExternalLink size={10} />
                </a>
            </div>
        ),
        { duration: 6000 }
    );
}

/**
 * Show an error toast for a failed transaction with optional retry.
 */
export function showTransactionError(
    error: string,
    onRetry?: () => void
) {
    toast.error(
        (t) => (
            <div className="flex items-center gap-2">
                <span className="text-sm">{error}</span>
                {onRetry && (
                    <button
                        onClick={() => {
                            toast.dismiss(t.id);
                            onRetry();
                        }}
                        className="text-xs text-brand-400 hover:text-brand-300 transition-colors shrink-0 underline"
                    >
                        Retry
                    </button>
                )}
            </div>
        ),
        { duration: 8000 }
    );
}
