"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";

/**
 * Lightweight page-transition wrapper.
 * Uses the CSS `sectionFadeUp` keyframe already defined in globals.css
 * instead of the heavy framer-motion library (~30 KB gzip).
 */
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();

  return (
    <div
      key={pathname}
      style={{ animation: "sectionFadeUp 0.2s ease-in-out both" }}
    >
      {children}
    </div>
  );
}
