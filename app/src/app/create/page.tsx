"use client";

import { useState } from "react";
import { useApp, formatDollars, CENTS } from "@/components/Providers";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Crypto",
  "Sports",
  "Politics",
  "Tech",
  "Entertainment",
  "Science",
  "Other",
];

export default function CreatePollPage() {
  const { walletConnected, walletAddress, userAccount, createPoll, connectWallet } = useApp();
  const router = useRouter();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [options, setOptions] = useState(["", ""]);
  const [unitPrice, setUnitPrice] = useState("1");
  const [durationHours, setDurationHours] = useState("24");
  const [investment, setInvestment] = useState("100");

  if (!walletConnected) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-400 text-lg mb-4">Connect your Phantom wallet to create polls</p>
        <button onClick={connectWallet} className="px-6 py-3 bg-purple-600 hover:bg-purple-700 rounded-xl font-semibold transition-colors">
          Connect Phantom
        </button>
      </div>
    );
  }

  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) return toast.error("Title is required");
    if (options.some((o) => !o.trim())) return toast.error("All options must have labels");
    if (parseFloat(unitPrice) <= 0) return toast.error("Invalid unit price");
    if (parseFloat(investment) <= 0) return toast.error("Invalid investment");

    const unitPriceCents = Math.floor(parseFloat(unitPrice) * CENTS);
    const investmentCents = Math.floor(parseFloat(investment) * CENTS);
    const endTime = Math.floor(Date.now() / 1000) + parseInt(durationHours) * 3600;

    if (userAccount && investmentCents > userAccount.balance) {
      return toast.error("Insufficient balance");
    }

    if (investmentCents < unitPriceCents) {
      return toast.error("Investment must be >= unit price");
    }

    const poll = createPoll({
      pollId: Date.now(),
      creator: walletAddress!,
      title: title.trim(),
      description: description.trim(),
      category,
      options: options.map((o) => o.trim()),
      voteCounts: [],
      unitPriceCents,
      endTime,
      totalPoolCents: 0,
      creatorInvestmentCents: investmentCents,
      platformFeeCents: 0,
      creatorRewardCents: 0,
      status: 0,
      winningOption: 255,
      totalVoters: 0,
      createdAt: Math.floor(Date.now() / 1000),
    });

    if (poll) {
      toast.success("Poll created!");
      router.push(`/polls/${poll.id}`);
    } else {
      toast.error("Failed to create poll — check your balance");
    }
  };

  // Preview math
  const investCents = Math.floor(parseFloat(investment || "0") * CENTS);
  const platformFee = Math.max(Math.floor(investCents / 100), 1);
  const creatorReward = Math.max(Math.floor(investCents / 100), 1);
  const poolSeed = Math.max(investCents - platformFee - creatorReward, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-3xl font-bold mb-8">Create a Poll</h1>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Poll Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={64}
            placeholder="Will BTC hit $100k by March 2026?"
            className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={256}
            rows={3}
            placeholder="Describe the poll conditions and how the winner is determined..."
            className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 focus:ring-1 focus:ring-primary-500 outline-none transition-colors resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  category === cat
                    ? "bg-primary-600 text-white"
                    : "bg-dark-700 text-gray-400 hover:text-white border border-gray-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Options */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Options (2-6)</label>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="flex gap-2">
                <div className="w-8 h-10 flex items-center justify-center text-gray-500 font-mono text-sm">
                  {String.fromCharCode(65 + i)}
                </div>
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => updateOption(i, e.target.value)}
                  maxLength={32}
                  placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  className="flex-1 px-4 py-2.5 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 outline-none transition-colors"
                />
                {options.length > 2 && (
                  <button type="button" onClick={() => removeOption(i)} className="px-3 text-red-400 hover:text-red-300">x</button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button type="button" onClick={addOption} className="mt-3 text-sm text-primary-400 hover:text-primary-300">
              + Add Option
            </button>
          )}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Unit Price ($)</label>
            <input
              type="number"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              step="0.01"
              min="0.01"
              className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 outline-none transition-colors"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Duration (hours)</label>
            <input
              type="number"
              value={durationHours}
              onChange={(e) => setDurationHours(e.target.value)}
              min="1"
              max="720"
              className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 outline-none transition-colors"
            />
          </div>
        </div>

        {/* Investment */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Creator Investment ($)</label>
          <input
            type="number"
            value={investment}
            onChange={(e) => setInvestment(e.target.value)}
            step="1"
            min="1"
            className="w-full px-4 py-3 bg-dark-700 border border-gray-700 rounded-xl focus:border-primary-500 outline-none transition-colors"
          />
        </div>

        {/* Preview */}
        <div className="bg-dark-700/50 border border-gray-800 rounded-2xl p-6">
          <h3 className="font-semibold mb-4 text-gray-300">Tokenomics Preview</h3>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="text-gray-400">Pool Seed:</div>
            <div className="text-right font-mono">{formatDollars(poolSeed)}</div>
            <div className="text-gray-400">Platform Fee (1%):</div>
            <div className="text-right font-mono">{formatDollars(platformFee)}</div>
            <div className="text-gray-400">Creator Reward (1%):</div>
            <div className="text-right font-mono">{formatDollars(creatorReward)}</div>
            <div className="text-gray-400 font-semibold border-t border-gray-700 pt-2">Total Investment:</div>
            <div className="text-right font-mono font-semibold border-t border-gray-700 pt-2">{formatDollars(investCents)}</div>
          </div>
        </div>

        {/* Balance check */}
        {userAccount && (
          <div className="text-sm text-gray-400">
            Your balance: <span className="text-accent-400 font-semibold">{formatDollars(userAccount.balance)}</span>
          </div>
        )}

        {/* Submit */}
        <button
          type="submit"
          className="w-full py-4 bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.01]"
        >
          Create Poll
        </button>
      </form>
    </div>
  );
}
