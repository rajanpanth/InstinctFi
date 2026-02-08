"use client";

import { useState, useEffect, useRef } from "react";
import { DemoPoll, useApp, formatDollars } from "./Providers";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  poll: DemoPoll;
  /** Pre-selected option index */
  optionIndex: number;
};

export default function VotePopup({ isOpen, onClose, poll, optionIndex }: Props) {
  const { castVote, userAccount, walletConnected, connectWallet } = useApp();
  const overlayRef = useRef<HTMLDivElement>(null);

  const [selectedTab, setSelectedTab] = useState<"buy" | "sell">("buy");
  const [selectedSide, setSelectedSide] = useState<"yes" | "no">("yes");
  const [numCoins, setNumCoins] = useState(1);

  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);
  const optVotes = poll.voteCounts[optionIndex] || 0;
  const yesPct = totalVotes > 0 ? Math.round((optVotes / totalVotes) * 100) : 50;
  const noPct = 100 - yesPct;
  const yesPrice = yesPct; // cents
  const noPrice = noPct;

  const cost = numCoins * poll.unitPriceCents;
  const mainImage = sanitizeImageUrl(poll.imageUrl);
  const optLabel = poll.options[optionIndex] || "";

  // Reset on open
  useEffect(() => {
    if (isOpen) {
      setSelectedTab("buy");
      setSelectedSide("yes");
      setNumCoins(1);
    }
  }, [isOpen, optionIndex]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Prevent body scroll
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBuy = async () => {
    if (!walletConnected) {
      await connectWallet();
      return;
    }
    if (numCoins <= 0) return toast.error("Enter at least 1 coin");
    if (userAccount && cost > userAccount.balance)
      return toast.error("Insufficient balance");

    const success = await castVote(poll.id, optionIndex, numCoins);
    if (success) {
      toast.success(
        `Bought ${numCoins} coin(s) on "${optLabel}"`
      );
      onClose();
    } else {
      toast.error("Transaction failed");
    }
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
    >
      <div className="relative bg-dark-800 border border-gray-700 rounded-2xl max-w-sm w-full mx-4 shadow-2xl shadow-primary-900/20 animate-scaleIn">
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
              <span className="text-green-400">Buy Yes</span>
              <span className="text-gray-500"> &middot; </span>
              <span className="text-white">{optLabel}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 flex items-center justify-center text-gray-500 hover:text-white rounded-lg hover:bg-dark-700 transition-colors shrink-0"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M2 2l12 12M14 2L2 14" />
            </svg>
          </button>
        </div>

        <div className="px-5 pb-5 space-y-4">
          {/* Buy / Sell tabs */}
          <div className="flex bg-dark-900 rounded-xl p-1 gap-1">
            {(["buy", "sell"] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setSelectedTab(tab)}
                className={`flex-1 py-2 text-sm font-medium rounded-lg capitalize transition-all ${
                  selectedTab === tab
                    ? "bg-dark-700 text-white shadow"
                    : "text-gray-500 hover:text-gray-300"
                }`}
              >
                {tab}
              </button>
            ))}
          </div>

          {/* Yes / No buttons */}
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => setSelectedSide("yes")}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedSide === "yes"
                  ? "border-green-500 bg-green-500/15 text-green-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              Yes {yesPrice}&cent;
            </button>
            <button
              onClick={() => setSelectedSide("no")}
              className={`py-2.5 rounded-xl text-sm font-semibold border transition-all ${
                selectedSide === "no"
                  ? "border-red-500 bg-red-500/15 text-red-400"
                  : "border-gray-700 text-gray-400 hover:border-gray-600"
              }`}
            >
              No {noPrice}&cent;
            </button>
          </div>

          {/* Amount input */}
          <div className="bg-dark-900 border border-gray-700 rounded-xl p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Coins</p>
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
                  setNumCoins(Math.max(0, parseInt(e.target.value) || 0))
                }
                min={0}
                className="w-24 text-right text-2xl font-semibold bg-transparent outline-none text-white placeholder-gray-600"
                placeholder="0"
              />
            </div>
            <div className="flex items-center justify-between mt-2 pt-2 border-t border-gray-800">
              <span className="text-xs text-gray-500">Cost</span>
              <span className="text-sm font-medium text-gray-300">{formatDollars(cost)}</span>
            </div>
          </div>

          {/* Buy button */}
          <button
            onClick={handleBuy}
            disabled={!walletConnected && false}
            className={`w-full py-3.5 rounded-xl font-semibold text-sm transition-all ${
              walletConnected
                ? "bg-blue-600 hover:bg-blue-700 text-white"
                : "bg-purple-600 hover:bg-purple-700 text-white"
            }`}
          >
            {walletConnected
              ? selectedTab === "buy"
                ? `Buy ${numCoins > 0 ? numCoins + " Coins" : ""}`
                : "Sell"
              : "Connect Wallet"}
          </button>
        </div>
      </div>
    </div>
  );
}
