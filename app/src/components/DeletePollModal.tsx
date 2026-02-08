"use client";

import { useState, useEffect, useRef } from "react";
import { DemoPoll, useApp, formatDollars } from "./Providers";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  poll: DemoPoll;
  onDeleted: () => void;
};

export default function DeletePollModal({ isOpen, onClose, poll, onDeleted }: Props) {
  const { deletePoll } = useApp();
  const overlayRef = useRef<HTMLDivElement>(null);
  const [deleting, setDeleting] = useState(false);

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

  // Reset state when opened
  useEffect(() => {
    if (isOpen) setDeleting(false);
  }, [isOpen]);

  if (!isOpen) return null;

  const handleDelete = () => {
    setDeleting(true);
    const success = deletePoll(poll.id);
    setDeleting(false);

    if (success) {
      toast.success("Poll deleted. Investment refunded to your balance.");
      onClose();
      onDeleted();
    } else {
      toast.error("Failed to delete poll. Check permissions and try again.");
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
      <div className="relative bg-dark-800 border border-gray-700 rounded-2xl max-w-md w-full mx-4 shadow-2xl shadow-red-900/20 animate-scaleIn">
        {/* Icon */}
        <div className="flex justify-center pt-8">
          <div className="w-16 h-16 rounded-full bg-red-600/15 flex items-center justify-center">
            <svg
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-red-400"
            >
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
              <line x1="10" y1="11" x2="10" y2="17" />
              <line x1="14" y1="11" x2="14" y2="17" />
            </svg>
          </div>
        </div>

        {/* Content */}
        <div className="p-8 text-center">
          <h2 className="text-xl font-bold mb-2">Delete Poll</h2>
          <p className="text-gray-400 text-sm mb-6">
            Are you sure you want to delete <span className="text-white font-medium">&ldquo;{poll.title}&rdquo;</span>?
          </p>

          {/* Warning box */}
          <div className="bg-red-600/10 border border-red-600/30 rounded-xl p-4 mb-6 text-left">
            <p className="text-red-400 text-sm font-medium mb-2">This action is irreversible.</p>
            <ul className="text-sm text-gray-400 space-y-1.5">
              <li className="flex items-start gap-2">
                <span className="text-green-400 mt-0.5">+</span>
                <span>
                  Your investment of{" "}
                  <span className="text-green-400 font-medium">{formatDollars(poll.creatorInvestmentCents)}</span>{" "}
                  will be refunded to your balance.
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&minus;</span>
                <span>The poll and all associated data will be permanently removed.</span>
              </li>
              <li className="flex items-start gap-2">
                <span className="text-red-400 mt-0.5">&minus;</span>
                <span>Account rent will be returned automatically.</span>
              </li>
            </ul>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-700 text-gray-300 rounded-xl hover:bg-dark-700 transition-colors font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 px-6 py-3 bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-xl font-semibold transition-colors"
            >
              {deleting ? "Deleting..." : "Confirm Delete"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
