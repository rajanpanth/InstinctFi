"use client";

import { useState, useEffect } from "react";

/**
 * Countdown to a future Unix timestamp (seconds).
 * Returns a formatted time string and whether the target has been reached.
 */
export function useCountdown(endTimeUnixSeconds: number) {
  const [text, setText] = useState("");
  const [ended, setEnded] = useState(false);

  useEffect(() => {
    const tick = () => {
      const diff = endTimeUnixSeconds - Math.floor(Date.now() / 1000);
      if (diff <= 0) {
        setText("Ended");
        setEnded(true);
        return;
      }
      setEnded(false);
      const d = Math.floor(diff / 86400);
      const h = Math.floor((diff % 86400) / 3600);
      const m = Math.floor((diff % 3600) / 60);
      const s = diff % 60;
      setText(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [endTimeUnixSeconds]);

  return { text, ended };
}

/**
 * Countdown for daily (24h) claim cooldown.
 * Takes the last claim timestamp in milliseconds.
 * Returns timeLeft string, canClaim flag, and progress percentage (0-100).
 */
export function useDailyCountdown(lastClaimMs: number) {
  const [timeLeft, setTimeLeft] = useState("");
  const [canClaim, setCanClaim] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const DAY_MS = 24 * 60 * 60 * 1000;
    const tick = () => {
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
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastClaimMs]);

  return { timeLeft, canClaim, progress };
}
