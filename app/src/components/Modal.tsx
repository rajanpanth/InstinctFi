"use client";

import { useEffect, useRef, ReactNode, useId } from "react";

type ModalProps = {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
  className?: string;
  maxWidth?: string;
  /** Title for aria-labelledby */
  title?: string;
};

/**
 * Shared modal wrapper with:
 * - Escape key to close
 * - Body scroll lock
 * - Click-outside-to-close
 * - Focus trap (WCAG compliant)
 * - Fade + scale animation
 * - aria-labelledby support
 */
export default function Modal({ isOpen, onClose, children, className = "", maxWidth = "max-w-md", title }: ModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const titleId = useId();

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
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  // Focus trap
  useEffect(() => {
    if (!isOpen || !contentRef.current) return;

    // Save previous focus
    previousFocusRef.current = document.activeElement as HTMLElement;

    // Focus the first focusable element
    const focusable = contentRef.current.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    if (focusable.length > 0) {
      focusable[0].focus();
    }

    // Trap focus within modal
    const trapFocus = (e: KeyboardEvent) => {
      if (e.key !== "Tab" || !contentRef.current) return;
      const focusableEls = contentRef.current.querySelectorAll<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (focusableEls.length === 0) return;

      const first = focusableEls[0];
      const last = focusableEls[focusableEls.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    document.addEventListener("keydown", trapFocus);
    return () => {
      document.removeEventListener("keydown", trapFocus);
      // Restore previous focus
      previousFocusRef.current?.focus();
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
      aria-labelledby={title ? titleId : undefined}
    >
      <div
        ref={contentRef}
        className={`relative bg-dark-800 border border-gray-700/80 rounded-2xl ${maxWidth} w-full mx-4 shadow-2xl shadow-black/40 animate-scaleIn ${className}`}
      >
        {title && (
          <span id={titleId} className="sr-only">{title}</span>
        )}
        {children}
      </div>
    </div>
  );
}
