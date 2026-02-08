"use client";

import { useState, useEffect, useCallback } from "react";

/**
 * Countdown to a future Unix timestamp (seconds).
 * Pauses when the browser tab is hidden to save CPU.
 */
export function useCountdown(endTimeUnixSeconds: number) {
  const [text, setText] = useState("");
  const [ended, setEnded] = useState(false);
  const [progress, setProgress] = useState(0);

  const tick = useCallback(() => {
    const now = Math.floor(Date.now() / 1000);
    const diff = endTimeUnixSeconds - now;
    if (diff <= 0) {
      setText("Ended");
      setEnded(true);
      setProgress(1);
      return;
    }
    setEnded(false);
    // Estimate total duration (assume polls are max 7 days)
    const MAX_DURATION = 7 * 24 * 3600;
    const elapsed = MAX_DURATION - diff;
    setProgress(Math.max(0, Math.min(1, elapsed / MAX_DURATION)));
    const d = Math.floor(diff / 86400);
    const h = Math.floor((diff % 86400) / 3600);
    const m = Math.floor((diff % 3600) / 60);
    const s = diff % 60;
    setText(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
  }, [endTimeUnixSeconds]);

  useEffect(() => {
    tick();
    let id: ReturnType<typeof setInterval> | null = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (id) { clearInterval(id); id = null; }
      } else {
        tick();
        if (!id) id = setInterval(tick, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tick]);

  return { text, ended, progress };
}

/**
 * Countdown for daily (24h) claim cooldown.
 * Pauses when tab is hidden.
 */
export function useDailyCountdown(lastClaimMs: number) {
  const [timeLeft, setTimeLeft] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [progress, setProgress] = useState(0);

  const tick = useCallback(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const nextClaim = lastClaimMs + DAY_MS;
    const diff = nextClaim - Date.now();
    if (diff <= 0) {
      setCanClaim(true);
      setTimeLeft("Ready!");
      setProgress(100);
      return;
    }
    setCanClaim(false);
    setProgress(Math.min(100, ((DAY_MS - diff) / DAY_MS) * 100));
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setTimeLeft(
      `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
    );
  }, [lastClaimMs]);

  useEffect(() => {
    tick();
    let id: ReturnType<typeof setInterval> | null = setInterval(tick, 1000);

    const handleVisibility = () => {
      if (document.hidden) {
        if (id) { clearInterval(id); id = null; }
      } else {
        tick();
        if (!id) id = setInterval(tick, 1000);
      }
    };

    document.addEventListener("visibilitychange", handleVisibility);
    return () => {
      if (id) clearInterval(id);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, [tick]);

  return { timeLeft, canClaim, progress };
}
