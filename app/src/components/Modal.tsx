"use client";

import { useEffect, useRef, ReactNode } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  /** Additional className for the inner container */
  className?: string;
  /** Max width class (default: "max-w-md") */
  maxWidth?: string;
};

/**
 * Shared modal wrapper — handles:
 * - Escape key to close
 * - Body scroll lock
 * - Click-outside-to-close on overlay
 * - Fade + scale animation
 */
export default function Modal({ isOpen, onClose, children, className = "", maxWidth = "max-w-md" }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === overlayRef.current) onClose();
      }}
      role="dialog"
      aria-modal="true"
    >
      <div className={`relative bg-dark-800 border border-gray-700 rounded-2xl ${maxWidth} w-full mx-4 shadow-2xl shadow-primary-900/20 animate-scaleIn ${className}`}>
        {children}
      </div>
    </div>
  );
}
