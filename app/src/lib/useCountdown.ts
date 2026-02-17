"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/**
 * Shared global 1-second ticker.
 * All countdown hooks subscribe to a single setInterval instead of
 * each running their own (12 cards = 12 intervals → 1 shared interval). (#15)
 */
const subscribers = new Set<() => void>();
let tickerId: ReturnType<typeof setInterval> | null = null;

function startGlobalTicker() {
  if (tickerId) return;
  tickerId = setInterval(() => {
    subscribers.forEach((fn) => fn());
  }, 1000);

  const handleVisibility = () => {
    if (document.hidden) {
      if (tickerId) { clearInterval(tickerId); tickerId = null; }
    } else {
      subscribers.forEach((fn) => fn());
      if (!tickerId) {
        tickerId = setInterval(() => {
          subscribers.forEach((fn) => fn());
        }, 1000);
      }
    }
  };
  document.addEventListener("visibilitychange", handleVisibility);
}

function subscribe(fn: () => void) {
  subscribers.add(fn);
  if (subscribers.size === 1) startGlobalTicker();
  return () => {
    subscribers.delete(fn);
    if (subscribers.size === 0 && tickerId) {
      clearInterval(tickerId);
      tickerId = null;
    }
  };
}

/**
 * Countdown to a future Unix timestamp (seconds).
 * Uses shared global ticker to avoid per-card intervals.
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
    tick(); // initial
    const unsub = subscribe(tick);
    return unsub;
  }, [tick]);

  return { text, ended, progress };
}

/**
 * Countdown for daily (24h) claim cooldown.
 * Uses shared global ticker.
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
    const unsub = subscribe(tick);
    return unsub;
  }, [tick]);

  return { timeLeft, canClaim, progress };
}
