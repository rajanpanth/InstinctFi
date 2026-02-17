"use client";

import { useEffect, useState } from "react";
import { useApp } from "./Providers";
import { Zap } from "lucide-react";

/**
 * CSS-only loading splash (replaces framer-motion version).
 * Fade-in classes live in globals.css; the exit fade uses an inline transition.
 */
export default function LoadingScreen() {
  const { isLoading } = useApp();
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      setFadeOut(true);
      const t = setTimeout(() => setShow(false), 500); // matches CSS transition
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className="loading-screen"
      style={{
        opacity: fadeOut ? 0 : 1,
        transition: "opacity 0.4s ease-in-out",
      }}
    >
      <div className="loading-center">
        {/* Logo icon */}
        <div className="loading-logo">
          <Zap size={24} className="text-brand-500" />
        </div>

        {/* Brand name – uses simple CSS fade-in */}
        <h1
          className="loading-brand"
          style={{
            animation: "sectionFadeUp 0.4s 0.15s ease-out both",
          }}
        >
          Instinct<span className="loading-brand-accent">Fi</span>
        </h1>

        {/* Loading bar */}
        <div
          className="loading-bar-track"
          style={{
            animation: "sectionFadeUp 0.3s 0.4s ease-out both",
          }}
        >
          <div className="loading-bar-fill" />
        </div>
      </div>
    </div>
  );
}
