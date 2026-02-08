"use client";

import { useState } from "react";
import Image from "next/image";
import { sanitizeImageUrl } from "@/lib/uploadImage";

type Props = {
  /** The image URL (may be empty) */
  src: string;
  /** Alt text for accessibility */
  alt: string;
  /** Aspect ratio class (default: aspect-video) */
  aspect?: string;
  /** Additional CSS classes */
  className?: string;
};

/**
 * Displays a poll image with:
 * - Skeleton loader while loading
 * - Gradient fallback placeholder when no image
 * - Smooth fade-in transition
 */
export default function PollImage({
  src,
  alt,
  aspect = "aspect-video",
  className = "",
}: Props) {
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);
  const sanitized = sanitizeImageUrl(src);
  const hasImage = !!sanitized && !errored;

  if (!hasImage) {
    // Gradient placeholder with icon
    return (
      <div
        className={`${aspect} bg-gradient-to-br from-primary-600/20 via-dark-800 to-accent-500/10 flex items-center justify-center ${className}`}
      >
        <svg
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1"
          className="text-gray-700"
        >
          <rect x="3" y="3" width="18" height="18" rx="3" />
          <circle cx="8.5" cy="8.5" r="1.5" />
          <path d="M21 15l-5-5L5 21" />
        </svg>
      </div>
    );
  }

  const isDataUrl = sanitized.startsWith("data:");

  return (
    <div className={`${aspect} relative overflow-hidden bg-dark-800 ${className}`}>
      {/* Skeleton loader */}
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-r from-dark-800 via-dark-700 to-dark-800 bg-[length:200%_100%]" />
      )}
      {isDataUrl ? (
        /* eslint-disable-next-line @next/next/no-img-element */
        <img
          src={sanitized}
          alt={alt}
          loading="lazy"
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
          className={`w-full h-full object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : (
        <Image
          src={sanitized}
          alt={alt}
          fill
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className={`object-cover transition-opacity duration-300 ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
