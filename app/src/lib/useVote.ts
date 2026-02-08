"use client";

import { useState, useCallback } from "react";
import { useApp, formatDollars, MAX_COINS_PER_POLL, DemoPoll } from "@/components/Providers";
import toast from "react-hot-toast";

/**
 * Shared voting logic hook used by PollCard inline voting,
 * VotePopup modal, and poll detail page.
 */
export function useVote(poll: DemoPoll) {
  const { castVote, userAccount, walletConnected, connectWallet, votes, walletAddress } = useApp();

  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [numCoins, setNumCoins] = useState(1);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const now = Math.floor(Date.now() / 1000);
  const isEnded = now >= poll.endTime;
  const isSettled = poll.status === 1;
  const isCreator = walletAddress === poll.creator;
  const canVote = !isEnded && !isSettled && !isCreator && walletConnected;
  const cost = numCoins * poll.unitPriceCents;
  const totalVotes = poll.voteCounts.reduce((a, b) => a + b, 0);

  const vote = votes.find(v => v.pollId === poll.id && v.voter === walletAddress);

  const selectOption = useCallback((index: number): boolean => {
    if (isEnded || isSettled) return false;
    if (!walletConnected) { connectWallet(); return false; }
    if (isCreator) { toast.error("You cannot vote on your own poll"); return false; }
    setSelectedOption(index);
    setNumCoins(1);
    return true;
  }, [isEnded, isSettled, walletConnected, isCreator, connectWallet]);

  const clearSelection = useCallback(() => {
    setSelectedOption(null);
  }, []);

  const submitVote = useCallback(async (): Promise<boolean> => {
    if (selectedOption === null) {
      toast.error("Select an option");
      return false;
    }
    if (!walletConnected) {
      connectWallet();
      return false;
    }
    if (numCoins <= 0) {
      toast.error("Enter at least 1 coin");
      return false;
    }
    if (userAccount && cost > userAccount.balance) {
      toast.error("Insufficient SOL balance");
      return false;
    }

    setLoading(true);
    const ok = await castVote(poll.id, selectedOption, numCoins);
    setLoading(false);

    if (ok) {
      setSuccess(true);
      toast.success(`Bought ${numCoins} coin(s) on "${poll.options[selectedOption]}"`);
      setTimeout(() => { setSuccess(false); setSelectedOption(null); }, 1500);
    } else {
      toast.error("Transaction failed");
    }
    return ok;
  }, [selectedOption, walletConnected, numCoins, userAccount, cost, castVote, poll, connectWallet]);

  return {
    selectedOption,
    setSelectedOption,
    numCoins,
    setNumCoins,
    loading,
    success,
    cost,
    totalVotes,
    isEnded,
    isSettled,
    isCreator,
    canVote,
    vote,
    selectOption,
    clearSelection,
    submitVote,
  };
}
