"use client";

import Image from "next/image";
import { sanitizeImageUrl } from "@/lib/uploadImage";

/**
 * Renders a poll-option avatar: either the option image (via next/image for
 * HTTPS, fallback <img> for data URIs) or a coloured initial circle.
 */
export default function OptionAvatar({
  src,
  label,
  index,
  size = "sm",
}: {
  src?: string;
  label: string;
  index: number;
  size?: "sm" | "lg";
}) {
  const sanitized = src ? sanitizeImageUrl(src) : "";
  const colors = [
    "bg-blue-500/20 text-blue-400",
    "bg-red-500/20 text-red-400",
    "bg-green-500/20 text-green-400",
    "bg-purple-500/20 text-purple-400",
    "bg-orange-500/20 text-orange-400",
    "bg-pink-500/20 text-pink-400",
  ];
  const bg = colors[index % colors.length];
  const dim = size === "lg" ? "w-10 h-10" : "w-8 h-8";
  const textSize = size === "lg" ? "text-sm" : "text-xs";

  if (sanitized) {
    const px = size === "lg" ? 40 : 32;
    if (sanitized.startsWith("data:")) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={sanitized}
          alt={label}
          className={`${dim} rounded-full object-cover shrink-0 border border-border`}
        />
      );
    }
    return (
      <Image
        src={sanitized}
        alt={label}
        width={px}
        height={px}
        className={`${dim} rounded-full object-cover shrink-0 border border-border`}
      />
    );
  }

  return (
    <div
      className={`${dim} rounded-full ${bg} flex items-center justify-center ${textSize} font-bold shrink-0`}
    >
      {label.charAt(0).toUpperCase()}
    </div>
  );
}
