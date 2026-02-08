"use client";

import { useState, useEffect } from "react";
import { DemoPoll, useApp } from "./Providers";
import { CATEGORIES } from "@/lib/constants";
import ImageUpload from "./ImageUpload";
import { uploadPollImage, sanitizeImageUrl } from "@/lib/uploadImage";
import Modal from "./Modal";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  poll: DemoPoll;
};

export default function EditPollModal({ isOpen, onClose, poll }: Props) {
  const { editPoll } = useApp();

  // ── Form state (pre-filled from poll) ──
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description);
  const [category, setCategory] = useState(poll.category);
  const [options, setOptions] = useState<string[]>([...poll.options]);
  const [endDate, setEndDate] = useState("");
  const [endTimeStr, setEndTimeStr] = useState("");
  const [saving, setSaving] = useState(false);

  // Image state
  const [imagePreview, setImagePreview] = useState<string | null>(
    poll.imageUrl ? sanitizeImageUrl(poll.imageUrl) : null
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(poll.imageUrl);
  const [uploading, setUploading] = useState(false);

  // Reset form when poll changes or modal opens
  useEffect(() => {
    if (isOpen) {
      setTitle(poll.title);
      setDescription(poll.description);
      setCategory(poll.category);
      setOptions([...poll.options]);
      setImagePreview(poll.imageUrl ? sanitizeImageUrl(poll.imageUrl) : null);
      setImageFile(null);
      setImageUrl(poll.imageUrl);
      setSaving(false);
      setUploading(false);

      // Convert endTime (unix seconds) to local date/time
      const d = new Date(poll.endTime * 1000);
      const y = d.getFullYear();
      const mo = String(d.getMonth() + 1).padStart(2, "0");
      const da = String(d.getDate()).padStart(2, "0");
      const h = String(d.getHours()).padStart(2, "0");
      const mi = String(d.getMinutes()).padStart(2, "0");
      setEndDate(`${y}-${mo}-${da}`);
      setEndTimeStr(`${h}:${mi}`);
    }
  }, [isOpen, poll]);

  const handleImageSelect = async (file: File) => {
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleImageRemove = () => {
    setImageFile(null);
    setImagePreview(null);
    setImageUrl("");
  };

  const handleOptionChange = (index: number, value: string) => {
    setOptions((prev) => prev.map((o, i) => (i === index ? value : o)));
  };

  const handleSave = async () => {
    // Validation
    if (!title.trim()) return toast.error("Title is required");
    if (title.length > 64) return toast.error("Title must be 64 characters or less");
    if (description.length > 256) return toast.error("Description must be 256 characters or less");
    if (!category.trim()) return toast.error("Category is required");
    if (options.some((o) => !o.trim())) return toast.error("All options must have labels");
    if (options.some((o) => o.length > 32)) return toast.error("Option labels must be 32 characters or less");
    if (!endDate || !endTimeStr) return toast.error("End date and time are required");

    const endTime = Math.floor(new Date(`${endDate}T${endTimeStr}`).getTime() / 1000);
    const now = Math.floor(Date.now() / 1000);
    if (endTime <= now) return toast.error("End time must be in the future");

    setSaving(true);

    // Upload new image if selected
    let finalImageUrl = imageUrl;
    if (imageFile) {
      setUploading(true);
      try {
        finalImageUrl = await uploadPollImage(imageFile);
      } catch {
        toast.error("Image upload failed");
        setSaving(false);
        setUploading(false);
        return;
      }
      setUploading(false);
    }

    const success = await editPoll(poll.id, {
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      imageUrl: finalImageUrl,
      options: options.map((o) => o.trim()),
      endTime,
    });

    setSaving(false);

    if (success) {
      toast.success("Poll updated successfully!");
      onClose();
    } else {
      toast.error("Failed to update poll. Check permissions and try again.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} maxWidth="max-w-2xl" className="max-h-[90vh] overflow-y-auto shadow-purple-900/20">
        {/* Header */}
        <div className="sticky top-0 bg-dark-800 border-b border-gray-700 p-6 rounded-t-2xl z-10">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Edit Poll</h2>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white rounded-lg hover:bg-dark-700 transition-colors"
              aria-label="Close"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Title <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={64}
              className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white placeholder-gray-500"
              placeholder="Poll title"
            />
            <p className="text-xs text-gray-400 mt-1">{title.length}/64</p>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Description</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={256}
              rows={3}
              className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white placeholder-gray-500 resize-none"
              placeholder="Describe your poll..."
            />
            <p className="text-xs text-gray-400 mt-1">{description.length}/256</p>
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Category <span className="text-red-400">*</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white"
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Image */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">Cover Image</label>
            <ImageUpload
              imagePreview={imagePreview}
              onFileSelect={handleImageSelect}
              onRemove={handleImageRemove}
              uploading={uploading}
            />
          </div>

          {/* Options (labels only — can't add/remove) */}
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1.5">
              Option Labels
            </label>
            <p className="text-xs text-gray-400 mb-3">
              You can rename options but cannot add or remove them.
            </p>
            <div className="space-y-2">
              {options.map((opt, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-gray-400 font-mono w-6">{String.fromCharCode(65 + i)}.</span>
                  <input
                    type="text"
                    value={opt}
                    onChange={(e) => handleOptionChange(i, e.target.value)}
                    maxLength={32}
                    className="flex-1 px-4 py-2.5 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white placeholder-gray-500"
                    placeholder={`Option ${String.fromCharCode(65 + i)}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* End Date/Time */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                End Date <span className="text-red-400">*</span>
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1.5">
                End Time <span className="text-red-400">*</span>
              </label>
              <input
                type="time"
                value={endTimeStr}
                onChange={(e) => setEndTimeStr(e.target.value)}
                className="w-full px-4 py-3 bg-dark-900 border border-gray-700 rounded-xl focus:border-primary-500 outline-none text-white"
              />
            </div>
          </div>

          {/* Locked fields notice */}
          <div className="bg-dark-900/50 border border-gray-700/50 rounded-xl p-4">
            <p className="text-sm text-gray-400">
              <span className="text-yellow-400 font-medium">Note:</span> Unit price, investment, and fees cannot be changed after creation.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-dark-800 border-t border-gray-700 p-6 rounded-b-2xl flex gap-3 justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2.5 border border-gray-700 text-gray-300 rounded-xl hover:bg-dark-700 transition-colors font-medium"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-6 py-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </div>
    </Modal>
  );
}
