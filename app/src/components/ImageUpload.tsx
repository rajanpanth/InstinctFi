"use client";

import { useState, useRef, useCallback } from "react";
import { validateImageFile } from "@/lib/uploadImage";

type Props = {
  /** Current image preview URL (local blob or remote) */
  imagePreview: string | null;
  /** Called when user selects a valid file */
  onFileSelect: (file: File) => void;
  /** Called when user removes the image */
  onRemove: () => void;
  /** Show upload-in-progress spinner */
  uploading?: boolean;
  /** Error message to display */
  error?: string | null;
};

export default function ImageUpload({
  imagePreview,
  onFileSelect,
  onRemove,
  uploading = false,
  error = null,
}: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const displayError = error || localError;

  const handleFile = useCallback(
    (file: File) => {
      setLocalError(null);
      const err = validateImageFile(file);
      if (err) {
        setLocalError(err);
        return;
      }
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragActive(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    // Reset input so the same file can be re-selected
    if (inputRef.current) inputRef.current.value = "";
  };

  // ── Render: Image preview ──
  if (imagePreview) {
    return (
      <div className="relative group">
        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-border bg-surface-50">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Poll image preview"
            className="w-full h-full object-cover"
          />
          {/* Uploading overlay */}
          {uploading && (
            <div className="absolute inset-0 bg-surface-0/70 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <div className="w-8 h-8 border-2 border-brand-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-sm text-gray-300">Uploading...</span>
              </div>
            </div>
          )}
          {/* Remove button */}
          {!uploading && (
            <button
              type="button"
              onClick={onRemove}
              className="absolute top-3 right-3 w-8 h-8 bg-surface-0/80 hover:bg-red-600 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all focus:opacity-100"
              aria-label="Remove image"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          )}
        </div>
        {displayError && (
          <p className="mt-2 text-sm text-red-400">{displayError}</p>
        )}
      </div>
    );
  }

  // ── Render: Drop zone ──
  return (
    <div>
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
        role="button"
        tabIndex={0}
        aria-label="Upload poll image"
        className={`
          relative w-full aspect-video rounded-2xl border-2 border-dashed cursor-pointer
          flex flex-col items-center justify-center gap-3 transition-all
          ${
            dragActive
              ? "border-brand-400 bg-brand-600/10 scale-[1.01]"
              : "border-border bg-surface-50 hover:border-gray-500 hover:bg-surface-50"
          }
        `}
      >
        {/* Icon */}
        <div className={`p-3 rounded-xl ${dragActive ? "bg-brand-600/20" : "bg-surface-100"}`}>
          <svg
            width="28"
            height="28"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            className={dragActive ? "text-brand-400" : "text-gray-500"}
          >
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <path d="M21 15l-5-5L5 21" />
          </svg>
        </div>
        <div className="text-center">
          <p className={`text-sm font-medium ${dragActive ? "text-brand-300" : "text-gray-400"}`}>
            {dragActive ? "Drop image here" : "Drag & drop or click to upload"}
          </p>
          <p className="text-xs text-gray-600 mt-1">
            JPG, PNG, WEBP &middot; Max 5MB
          </p>
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleInputChange}
          className="hidden"
          aria-hidden="true"
        />
      </div>
      {displayError && (
        <p className="mt-2 text-sm text-red-400">{displayError}</p>
      )}
    </div>
  );
}
