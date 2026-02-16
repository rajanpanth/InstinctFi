"use client";

import { useState, useEffect } from "react";
import { DemoPoll, useApp, formatDollars } from "./Providers";
import Modal from "./Modal";
import toast from "react-hot-toast";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  poll: DemoPoll;
  onDeleted: () => void;
};

export default function DeletePollModal({ isOpen, onClose, poll, onDeleted }: Props) {
  const { deletePoll } = useApp();
  const [deleting, setDeleting] = useState(false);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) setDeleting(false);
  }, [isOpen]);

  const handleDelete = async () => {
    setDeleting(true);
    const success = await deletePoll(poll.id);
    setDeleting(false);

    if (success) {
      toast.success("Poll deleted. SOL refunded to your wallet.");
      onClose();
      onDeleted();
    } else {
      toast.error("Failed to delete poll. Check permissions and try again.");
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} className="shadow-red-900/20">
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
                  will be refunded to your wallet.
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
              className="flex-1 px-6 py-3 border border-border text-gray-300 rounded-xl hover:bg-surface-100 transition-colors font-medium"
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
    </Modal>
  );
}
