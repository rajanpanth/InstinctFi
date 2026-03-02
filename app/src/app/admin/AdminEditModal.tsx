"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { DemoPoll } from "@/components/Providers";
import ImageUpload from "@/components/ImageUpload";
import { uploadPollImage, sanitizeImageUrl } from "@/lib/uploadImage";

type EditUpdates = Partial<
  Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "optionImages" | "options" | "endTime">
>;

export default function AdminEditModal({
  poll,
  onClose,
  onSave,
}: {
  poll: DemoPoll;
  onClose: () => void;
  onSave: (updates: EditUpdates) => Promise<boolean>;
}) {
  const [title, setTitle] = useState(poll.title);
  const [description, setDescription] = useState(poll.description);
  const [category, setCategory] = useState(poll.category);
  const [imageUrl, setImageUrl] = useState(poll.imageUrl);
  const [options, setOptions] = useState([...poll.options]);
  const [endDate, setEndDate] = useState(() => {
    // Convert unix seconds → local datetime string for <input type="datetime-local">
    const d = new Date(poll.endTime * 1000);
    const y = d.getFullYear();
    const mo = String(d.getMonth() + 1).padStart(2, "0");
    const da = String(d.getDate()).padStart(2, "0");
    const h = String(d.getHours()).padStart(2, "0");
    const mi = String(d.getMinutes()).padStart(2, "0");
    return `${y}-${mo}-${da}T${h}:${mi}`;
  });
  const [saving, setSaving] = useState(false);

  // Option image state
  const [optionImageFiles, setOptionImageFiles] = useState<(File | null)[]>(
    poll.options.map(() => null)
  );
  const [optionImagePreviews, setOptionImagePreviews] = useState<(string | null)[]>(
    poll.optionImages?.map(url => url ? sanitizeImageUrl(url) : null) ?? poll.options.map(() => null)
  );

  const handleOptionImageSelect = (index: number) => (file: File) => {
    const newFiles = [...optionImageFiles];
    newFiles[index] = file;
    setOptionImageFiles(newFiles);
    const newPreviews = [...optionImagePreviews];
    if (newPreviews[index]?.startsWith("blob:")) URL.revokeObjectURL(newPreviews[index]!);
    newPreviews[index] = URL.createObjectURL(file);
    setOptionImagePreviews(newPreviews);
  };

  const handleOptionImageRemove = (index: number) => () => {
    if (optionImagePreviews[index]?.startsWith("blob:")) URL.revokeObjectURL(optionImagePreviews[index]!);
    const newFiles = [...optionImageFiles];
    newFiles[index] = null;
    setOptionImageFiles(newFiles);
    const newPreviews = [...optionImagePreviews];
    newPreviews[index] = null;
    setOptionImagePreviews(newPreviews);
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (options.some((o) => !o.trim())) {
      toast.error("All options must have text");
      return;
    }
    setSaving(true);
    try {
      // Upload option images
      const optionImageUrls: string[] = [];
      for (let i = 0; i < options.length; i++) {
        const file = optionImageFiles[i];
        if (file) {
          try {
            const url = await uploadPollImage(file);
            optionImageUrls.push(url);
          } catch {
            toast.error(`Option ${i + 1} image upload failed`);
            setSaving(false);
            return;
          }
        } else {
          optionImageUrls.push(poll.optionImages?.[i] || "");
        }
      }

      const ok = await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrl: imageUrl.trim(),
        optionImages: optionImageUrls,
        options: options.map((o) => o.trim()),
        endTime: Math.floor(new Date(endDate).getTime() / 1000),
      });
      // Note: editPoll already shows its own error toast on failure,
      // so we don't show a duplicate here.
    } catch (e) {
      console.error("Admin edit save error:", e);
      // editPoll handles its own error toasts; only log here.
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-surface-50 border border-border rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">✏️ Edit Poll (Admin)</h2>
          <button onClick={onClose} aria-label="Close" className="text-gray-400 hover:text-white text-xl">
            &times;
          </button>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Title</label>
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            className="w-full px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50 resize-none"
          />
        </div>

        {/* Category */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Category</label>
          <input
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Image URL */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Image URL</label>
          <input
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50"
            placeholder="https://..."
          />
        </div>

        {/* Options */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">Options</label>
          <div className="space-y-3">
            {options.map((opt, i) => (
              <div key={i} className="space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 w-5">{i + 1}.</span>
                  <input
                    value={opt}
                    onChange={(e) => {
                      const next = [...options];
                      next[i] = e.target.value;
                      setOptions(next);
                    }}
                    className="flex-1 px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50"
                  />
                </div>
                <div className="ml-7">
                  <ImageUpload
                    imagePreview={optionImagePreviews[i]}
                    onFileSelect={handleOptionImageSelect(i)}
                    onRemove={handleOptionImageRemove(i)}
                    uploading={false}
                    compact
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* End Time */}
        <div>
          <label className="block text-xs text-gray-400 mb-1">End Time</label>
          <input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 bg-surface-0 border border-gray-600/50 rounded-lg text-sm text-white focus:outline-none focus:border-brand-500/50"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex-1 px-4 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Saving...
              </span>
            ) : (
              "Save Changes"
            )}
          </button>
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2.5 bg-surface-100 hover:bg-dark-600 border border-gray-600/50 rounded-lg text-sm text-gray-300 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
