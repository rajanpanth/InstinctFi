"use client";

import { formatDollars } from "@/components/Providers";
import { CheckCircle } from "lucide-react";
import { useLanguage } from "@/lib/languageContext";

interface ClaimRewardPanelProps {
    potentialReward: number;
    isClaimed: boolean;
    onClaim: () => Promise<void>;
}

/**
 * Extracted claim-reward section from PollCard.
 * Shows the reward amount and claim button when a user has won.
 */
export default function ClaimRewardPanel({
    potentialReward,
    isClaimed,
    onClaim,
}: ClaimRewardPanelProps) {
    const { t } = useLanguage();

    if (isClaimed) {
        return (
            <div className="text-center text-[11px] text-neutral-500 mt-3 flex items-center justify-center gap-1">
                <CheckCircle size={12} />
                {t("rewardClaimed")}
            </div>
        );
    }

    return (
        <div className="bg-green-500/5 border border-green-500/15 rounded-lg p-3 mt-3">
            <p className="text-sm font-medium text-green-400 mb-1 flex items-center gap-1.5">
                <CheckCircle size={14} />
                {t("youWon")}
            </p>
            <p className="text-[11px] text-neutral-500 mb-2">
                {t("reward")}{" "}
                <span className="text-green-400 font-semibold">
                    {formatDollars(potentialReward)}
                </span>
            </p>
            <button
                onClick={onClaim}
                className="w-full py-2.5 bg-green-600 hover:bg-green-700 rounded-lg text-sm font-semibold text-white transition-colors"
            >
                {t("claimReward")}
            </button>
        </div>
    );
}
