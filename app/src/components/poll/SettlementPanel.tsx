"use client";

import { useState } from "react";
import { AlertCircle } from "lucide-react";
import { isAdminWallet } from "@/lib/constants";
import { useLanguage } from "@/lib/languageContext";

interface SettlementPanelProps {
    walletAddress: string | null;
    onSettle: () => Promise<void>;
}

/**
 * Extracted settlement panel from PollCard.
 * Shows the admin settlement controls for ended polls.
 */
export default function SettlementPanel({
    walletAddress,
    onSettle,
}: SettlementPanelProps) {
    const { t } = useLanguage();
    const [showConfirm, setShowConfirm] = useState(false);

    if (!isAdminWallet(walletAddress)) return null;

    return (
        <div className="bg-yellow-500/5 border border-yellow-500/15 rounded-lg p-3 mt-3">
            <p className="text-sm font-medium text-yellow-400 mb-1 flex items-center gap-1.5">
                <AlertCircle size={14} />
                {t("readyToSettle")}
            </p>
            <p className="text-[11px] text-neutral-500 mb-2">
                Admin settlement: highest-voted option wins by default.
            </p>
            {showConfirm ? (
                <div className="space-y-2">
                    <p className="text-[11px] text-yellow-300">{t("settleConfirm")}</p>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setShowConfirm(false)}
                            className="flex-1 py-2 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-200 transition-colors"
                        >
                            {t("cancel")}
                        </button>
                        <button
                            onClick={async () => {
                                setShowConfirm(false);
                                await onSettle();
                            }}
                            className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                        >
                            {t("confirmSettle")}
                        </button>
                    </div>
                </div>
            ) : (
                <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full py-2.5 bg-yellow-500 hover:bg-yellow-600 text-black rounded-lg text-sm font-semibold transition-colors"
                >
                    {t("settlePoll")}
                </button>
            )}
        </div>
    );
}

