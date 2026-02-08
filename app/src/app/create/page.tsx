"use client";

import { useState } from "react";
import { useApp, formatDollars, CENTS } from "@/components/Providers";
import ImageUpload from "@/components/ImageUpload";
import { uploadPollImage } from "@/lib/uploadImage";
import toast from "react-hot-toast";
import { useRouter } from "next/navigation";

const CATEGORIES = [
  "Crypto",
  "Sports",
  "Politics",
  "Tech",
  "Entertainment",
  "Science",
  "Economics",
  "Mentions",
  "Companies",
  "Financials",
  "Tech & Science",
  "Other",
];

export default function CreatePollPage() {
  const { walletConnected, walletAddress, userAccount, createPoll, connectWallet } = useApp();
  const router = useRouter();

  // ── Form state ──
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Crypto");
  const [options, setOptions] = useState(["", ""]);
  const [unitPrice, setUnitPrice] = useState("1");
  const [durationHours, setDurationHours] = useState("24");
  const [investment, setInvestment] = useState("100");

  // ── Main image state ──
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // ── Option image states (for first 2 options) ──
  const [optionImageFiles, setOptionImageFiles] = useState<(File | null)[]>([null, null]);
  const [optionImagePreviews, setOptionImagePreviews] = useState<(string | null)[]>([null, null]);
  const [optionImageErrors, setOptionImageErrors] = useState<(string | null)[]>([null, null]);

  const [submitting, setSubmitting] = useState(false);

  // ── Auth gate ──
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

  // ── Main image handlers ──
  const handleImageSelect = (file: File) => {
    setImageFile(file);
    setImageError(null);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageRemove = () => {
    if (imagePreview?.startsWith("blob:")) URL.revokeObjectURL(imagePreview);
    setImageFile(null);
    setImagePreview(null);
    setImageError(null);
  };

  // ── Option image handlers ──
  const handleOptionImageSelect = (index: number) => (file: File) => {
    const newFiles = [...optionImageFiles];
    newFiles[index] = file;
    setOptionImageFiles(newFiles);

    const newPreviews = [...optionImagePreviews];
    newPreviews[index] = URL.createObjectURL(file);
    setOptionImagePreviews(newPreviews);

    const newErrors = [...optionImageErrors];
    newErrors[index] = null;
    setOptionImageErrors(newErrors);
  };

  const handleOptionImageRemove = (index: number) => () => {
    const preview = optionImagePreviews[index];
    if (preview?.startsWith("blob:")) URL.revokeObjectURL(preview);

    const newFiles = [...optionImageFiles];
    newFiles[index] = null;
    setOptionImageFiles(newFiles);

    const newPreviews = [...optionImagePreviews];
    newPreviews[index] = null;
    setOptionImagePreviews(newPreviews);

    const newErrors = [...optionImageErrors];
    newErrors[index] = null;
    setOptionImageErrors(newErrors);
  };

  // ── Option handlers ──
  const addOption = () => {
    if (options.length < 6) setOptions([...options, ""]);
  };

  const removeOption = (idx: number) => {
    if (options.length > 2) setOptions(options.filter((_, i) => i !== idx));
  };

  const updateOption = (idx: number, val: string) => {
    setOptions(options.map((o, i) => (i === idx ? val : o)));
  };

  // ── Submit handler ──
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;

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

    setSubmitting(true);

    try {
      // Upload main image
      let imageUrl = "";
      if (imageFile) {
        setImageUploading(true);
        try {
          imageUrl = await uploadPollImage(imageFile);
        } catch (err: any) {
          setImageError(err.message || "Image upload failed");
          setImageUploading(false);
          setSubmitting(false);
          return toast.error(err.message || "Image upload failed");
        }
        setImageUploading(false);
      }

      // Upload option images
      const optionImageUrls: string[] = [];
      for (let i = 0; i < 2; i++) {
        const file = optionImageFiles[i];
        if (file) {
          try {
            const url = await uploadPollImage(file);
            optionImageUrls.push(url);
          } catch (err: any) {
            const newErrors = [...optionImageErrors];
            newErrors[i] = err.message || "Upload failed";
            setOptionImageErrors(newErrors);
            setSubmitting(false);
            return toast.error(`Option ${i + 1} image upload failed`);
          }
        } else {
          optionImageUrls.push("");
        }
      }

      const poll = createPoll({
        pollId: Date.now(),
        creator: walletAddress!,
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrl,
        optionImages: optionImageUrls,
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
    } finally {
      setSubmitting(false);
    }
  };

  // ── Preview math ──
  const investCents = Math.floor(parseFloat(investment || "0") * CENTS);
  const platformFee = Math.max(Math.floor(investCents / 100), 1);
  const creatorReward = Math.max(Math.floor(investCents / 100), 1);
  const poolSeed = Math.max(investCents - platformFee - creatorReward, 0);

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-2xl sm:text-3xl font-bold mb-2">Create a Poll</h1>
      <p className="text-gray-500 text-sm mb-6 sm:mb-8">Set up a prediction market for others to vote on.</p>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Main Poll Image (optional) */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">
            Poll Image <span className="text-gray-600">(optional)</span>
          </label>
          <ImageUpload
            imagePreview={imagePreview}
            onFileSelect={handleImageSelect}
            onRemove={handleImageRemove}
            uploading={imageUploading}
            error={imageError}
          />
        </div>

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
          <div className="text-xs text-gray-600 mt-1 text-right">{title.length}/64</div>
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
          <div className="text-xs text-gray-600 mt-1 text-right">{description.length}/256</div>
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
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  category === cat
                    ? "bg-primary-600 text-white shadow-lg shadow-primary-600/20"
                    : "bg-dark-700 text-gray-400 hover:text-white border border-gray-700 hover:border-gray-600"
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
              <div key={i} className="space-y-2">
                <div className="flex gap-2 items-center">
                  <div className="w-8 h-10 flex items-center justify-center text-gray-500 font-mono text-sm shrink-0">
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
                    <button
                      type="button"
                      onClick={() => removeOption(i)}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-red-400 hover:bg-red-600/10 hover:text-red-300 transition-colors shrink-0"
                      aria-label={`Remove option ${String.fromCharCode(65 + i)}`}
                    >
                      <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M1 1l12 12M13 1L1 13" />
                      </svg>
                    </button>
                  )}
                </div>
                {/* Option image upload for first 2 options */}
                {i < 2 && (
                  <div className="ml-8">
                    <label className="block text-xs text-gray-500 mb-1.5">
                      Option {String.fromCharCode(65 + i)} Avatar <span className="text-gray-600">(optional)</span>
                    </label>
                    <div className="max-w-[200px]">
                      {optionImagePreviews[i] ? (
                        <div className="relative group w-16 h-16">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={optionImagePreviews[i]!}
                            alt={`Option ${String.fromCharCode(65 + i)}`}
                            className="w-16 h-16 rounded-full object-cover border-2 border-gray-700"
                          />
                          <button
                            type="button"
                            onClick={handleOptionImageRemove(i)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-600 text-white rounded-full flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            &times;
                          </button>
                        </div>
                      ) : (
                        <label className="flex items-center gap-2 px-3 py-2 bg-dark-700/50 border border-gray-700 border-dashed rounded-lg cursor-pointer hover:border-gray-500 transition-colors">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-gray-500">
                            <rect x="3" y="3" width="18" height="18" rx="9" />
                            <path d="M12 8v8M8 12h8" />
                          </svg>
                          <span className="text-xs text-gray-500">Add avatar</span>
                          <input
                            type="file"
                            accept="image/jpeg,image/png,image/webp"
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              if (file) handleOptionImageSelect(i)(file);
                              e.target.value = "";
                            }}
                            className="hidden"
                          />
                        </label>
                      )}
                      {optionImageErrors[i] && (
                        <p className="text-xs text-red-400 mt-1">{optionImageErrors[i]}</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button
              type="button"
              onClick={addOption}
              className="mt-3 text-sm text-primary-400 hover:text-primary-300 flex items-center gap-1 transition-colors"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M7 1v12M1 7h12" />
              </svg>
              Add Option
            </button>
          )}
        </div>

        {/* Pricing */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
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
          disabled={submitting || imageUploading}
          className={`w-full py-4 rounded-xl font-semibold text-lg transition-all transform hover:scale-[1.01] ${
            submitting || imageUploading
              ? "bg-gray-700 text-gray-500 cursor-not-allowed"
              : "bg-gradient-to-r from-primary-600 to-primary-700 hover:from-primary-500 hover:to-primary-600"
          }`}
        >
          {submitting
            ? imageUploading
              ? "Uploading Images..."
              : "Creating Poll..."
            : "Create Poll"}
        </button>
      </form>
    </div>
  );
}
