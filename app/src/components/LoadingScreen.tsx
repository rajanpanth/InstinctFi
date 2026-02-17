"use client";

import { useEffect, useState, useCallback } from "react";
import { useApp } from "./Providers";
import { Zap } from "lucide-react";

/**
 * Premium loading splash with pulsing logo glow, text reveal,
 * stepped progress bar, and smooth exit animation.
 */
export default function LoadingScreen() {
  const { isLoading } = useApp();
  const [show, setShow] = useState(true);
  const [fadeOut, setFadeOut] = useState(false);
  const [progress, setProgress] = useState(0);

  // Simulated stepped progress
  useEffect(() => {
    const steps = [
      { value: 15, delay: 200 },
      { value: 35, delay: 500 },
      { value: 55, delay: 900 },
      { value: 72, delay: 1400 },
      { value: 85, delay: 2000 },
    ];
    const timers = steps.map(({ value, delay }) =>
      setTimeout(() => setProgress(value), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // Jump to 100% and exit when loading finishes
  useEffect(() => {
    if (!isLoading) {
      setProgress(100);
      const t1 = setTimeout(() => setFadeOut(true), 300);
      const t2 = setTimeout(() => setShow(false), 800);
      return () => { clearTimeout(t1); clearTimeout(t2); };
    }
  }, [isLoading]);

  if (!show) return null;

  return (
    <div
      className="loading-screen"
      style={{
        opacity: fadeOut ? 0 : 1,
        transform: fadeOut ? "scale(1.02)" : "scale(1)",
        transition: "opacity 0.5s ease-in-out, transform 0.5s ease-in-out",
      }}
    >
      {/* Ambient background glow */}
      <div className="loading-ambient" />

      <div className="loading-center">
        {/* Logo icon with pulsing glow ring */}
        <div className="loading-logo">
          <div className="loading-logo-glow" />
          <Zap size={24} className="text-brand-500 loading-icon-bounce" />
        </div>

        {/* Brand name with clip-path reveal */}
        <h1 className="loading-brand loading-text-reveal">
          Instinct<span className="loading-brand-accent">Fi</span>
        </h1>

        {/* Tagline */}
        <p
          className="loading-tagline"
          style={{ animation: "sectionFadeUp 0.4s 0.5s ease-out both" }}
        >
          Predict &middot; Vote &middot; Earn
        </p>

        {/* Stepped progress bar */}
        <div
          className="loading-bar-track"
          style={{ animation: "sectionFadeUp 0.3s 0.4s ease-out both" }}
        >
          <div
            className="loading-bar-fill-stepped"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
