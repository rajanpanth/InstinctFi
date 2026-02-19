"use client";

import { useState } from "react";
import toast from "react-hot-toast";
import type { DemoPoll } from "@/components/Providers";

type EditUpdates = Partial<
  Pick<DemoPoll, "title" | "description" | "category" | "imageUrl" | "options" | "endTime">
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
    const d = new Date(poll.endTime * 1000);
    return d.toISOString().slice(0, 16);
  });
  const [saving, setSaving] = useState(false);

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
      const ok = await onSave({
        title: title.trim(),
        description: description.trim(),
        category,
        imageUrl: imageUrl.trim(),
        options: options.map((o) => o.trim()),
        endTime: Math.floor(new Date(endDate).getTime() / 1000),
      });
      if (!ok) {
        toast.error("Failed to save changes");
      }
    } catch (e) {
      console.error("Admin edit save error:", e);
      toast.error("Failed to save changes");
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
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
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
