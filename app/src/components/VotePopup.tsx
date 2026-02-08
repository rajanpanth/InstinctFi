"use client";

import { useState, useEffect } from "react";
import { DemoPoll, useApp, formatDollars, MAX_COINS_PER_POLL } from "./Providers";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import { useVote } from "@/lib/useVote";
import Modal from "./Modal";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  poll: DemoPoll;
  /** Pre-selected option index */
  optionIndex: number;
};

export default function VotePopup({ isOpen, onClose, poll, optionIndex }: Props) {
  const { userAccount } = useApp();
  const {
    selectedOption, setSelectedOption,
    numCoins, setNumCoins,
    cost, totalVotes,
    submitVote,
  } = useVote(poll);

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedOption(optionIndex);
      setNumCoins(1);
    }
  }, [isOpen, optionIndex, setSelectedOption, setNumCoins]);

  const mainImage = sanitizeImageUrl(poll.imageUrl);

  const handleBuy = async () => {
    const ok = await submitVote();
    if (ok) onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-sm">
        {/* Header */}
        <div className="flex items-start gap-3 p-5 pb-3">
          {mainImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mainImage}
              alt=""
              className="w-12 h-12 rounded-lg object-cover shrink-0 border border-gray-700"
            />
          ) : (
            <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-primary-600/30 to-accent-500/20 shrink-0 border border-gray-700" />
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm text-gray-400 leading-snug line-clamp-2">
              {poll.title}
            </p>
            <p className="text-sm font-semibold mt-0.5">
              <span className="text-primary-400">Vote on option</span>
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="w-7 h-7 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Option selection — show all poll options */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {poll.options.map((opt, i) => {
              const optVotes = poll.voteCounts[i] || 0;
              const pct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 0;
              const isSelected = selectedOption === i;
              return (
                <button
                  key={i}
                  onClick={() => setSelectedOption(i)}
                  className={`w-full py-2.5 px-3 rounded-xl text-sm font-medium border transition-all text-left flex items-center justify-between ${
                    isSelected
                      ? "border-primary-500 bg-primary-500/15 text-primary-400"
                      : "border-gray-700 text-gray-400 hover:border-gray-600 hover:text-gray-300"
                  }`}
                >
                  <span className="truncate mr-2">{opt}</span>
                  <span className="text-xs shrink-0 tabular-nums">{pct}% · {optVotes} votes</span>
                </button>
              );
            })}
          </div>

          {/* Amount input */}
          <div className="bg-dark-900 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Coins <span className="text-gray-600">(max {MAX_COINS_PER_POLL}/poll)</span></p>
                {userAccount && (
                  <p className="text-xs text-green-400/70 mt-0.5">
                    Balance: {formatDollars(userAccount.balance)}
                  </p>
                )}
              </div>
              <input
                type="number"
                value={numCoins}
                onChange={(e) =>
                  setNumCoins(Math.max(1, parseInt(e.target.value) || 1))
                }
                min={1}
                className="w-24 text-right text-2xl font-semibold bg-transparent outline-none text-white placeholder-gray-600"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
              <span className="text-xs text-gray-400">Cost</span>
              <span className="text-sm font-medium text-gray-300">{formatDollars(cost)}</span>
            </div>
            <div className="flex items-center justify-between mt-1">
              <span className="text-xs text-gray-600">Platform fee (1%)</span>
              <span className="text-xs text-gray-400">{formatDollars(Math.max(Math.floor(cost / 100), cost > 0 ? 1 : 0))}</span>
            </div>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            className="w-full py-3.5 rounded-xl font-semibold text-sm transition-all bg-blue-600 hover:bg-blue-700 text-white"
          >
            {`Buy ${numCoins > 0 ? numCoins + " Coins" : ""}`}
          </button>
        </div>
    </Modal>
  );
}
