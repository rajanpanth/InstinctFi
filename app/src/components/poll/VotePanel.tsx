"use client";

import { formatDollars, formatDollarsShort } from "@/components/Providers";
import { Minus, Plus } from "lucide-react";
import OptionAvatar from "@/components/OptionAvatar";
import { useLanguage } from "@/lib/languageContext";
import type { UserAccount } from "@/lib/types";

interface VotePanelProps {
    optionIndex: number;
    optionLabel: string;
    optionImage?: string | null;
    numCoins: number;
    setNumCoins: (n: number) => void;
    cost: number;
    userAccount: UserAccount | null;
    voteLoading: boolean;
    voteSuccess: boolean;
    onSubmit: () => Promise<boolean>;
    onCancel: () => void;
    onSuccess?: () => void;
    onError?: () => void;
}

/**
 * Extracted inline vote panel from PollCard.
 * Shows the selected option, coin input, cost, and submit/cancel buttons.
 */
export default function VotePanel({
    optionIndex,
    optionLabel,
    optionImage,
    numCoins,
    setNumCoins,
    cost,
    userAccount,
    voteLoading,
    voteSuccess,
    onSubmit,
    onCancel,
    onSuccess,
    onError,
}: VotePanelProps) {
    const { t } = useLanguage();

    const handleSubmit = async () => {
        const ok = await onSubmit();
        if (ok) onSuccess?.();
        else onError?.();
    };

    return (
        <div className="bg-surface-200 border border-border rounded-lg p-4 mt-3 animate-scaleIn">
            <div className="flex items-center gap-2.5 mb-3">
                <OptionAvatar
                    src={optionImage ?? undefined}
                    label={optionLabel}
                    index={optionIndex}
                    size="lg"
                />
                <div>
                    <p className="text-[11px] text-neutral-500">{t("buyingCoinsOn")}</p>
                    <p className="text-sm font-semibold text-neutral-200">
                        {optionLabel}
                    </p>
                </div>
            </div>

            <div className="bg-surface-0 border border-border rounded-lg p-3 mb-3">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-[11px] text-neutral-500">{t("coins")}</p>
                        {userAccount && (
                            <p className="text-[10px] text-brand-500/70 mt-0.5">
                                {t("bal")} {formatDollars(userAccount.balance)}
                            </p>
                        )}
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={() => setNumCoins(Math.max(1, numCoins - 1))}
                            aria-label="Decrease coin count"
                            className="w-7 h-7 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors"
                        >
                            <Minus size={14} />
                        </button>
                        <input
                            type="number"
                            value={numCoins}
                            onChange={(e) =>
                                setNumCoins(Math.max(1, parseInt(e.target.value) || 1))
                            }
                            min={1}
                            aria-label="Number of coins to vote"
                            className="w-12 text-center text-lg font-semibold bg-transparent outline-none text-neutral-200"
                        />
                        <button
                            onClick={() => setNumCoins(numCoins + 1)}
                            aria-label="Increase coin count"
                            className="w-7 h-7 rounded-lg bg-surface-200 hover:bg-surface-300 text-neutral-400 flex items-center justify-center transition-colors"
                        >
                            <Plus size={14} />
                        </button>
                    </div>
                </div>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-border">
                    <span className="text-[11px] text-neutral-500">{t("totalCost")}</span>
                    <span className="text-sm font-semibold text-neutral-200">
                        {formatDollars(cost)}
                    </span>
                </div>
            </div>

            <div className="flex gap-2">
                <button
                    onClick={onCancel}
                    className="flex-1 py-2.5 text-sm border border-border text-neutral-400 rounded-lg hover:bg-surface-300 transition-colors font-medium"
                >
                    {t("cancel")}
                </button>
                <button
                    onClick={handleSubmit}
                    disabled={voteLoading}
                    className={`flex-1 py-2.5 text-sm rounded-lg font-semibold transition-all ${voteSuccess
                        ? "bg-green-600 text-white"
                        : voteLoading
                            ? "bg-brand-600/60 text-white/60 cursor-wait"
                            : "bg-brand-500 hover:bg-brand-600 text-white"
                        }`}
                >
                    {voteSuccess
                        ? t("success")
                        : voteLoading
                            ? t("processing")
                            : `${t("buyCoins")} ${numCoins} ${numCoins > 1 ? t("coins") : t("coin")}`}
                </button>
            </div>
        </div>
    );
}
