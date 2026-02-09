"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "./Providers";

export default function LoadingScreen() {
  const { isLoading } = useApp();
  const [show, setShow] = useState(true);

  // Keep visible for a minimum time so it doesn't flash
  useEffect(() => {
    if (!isLoading) {
      const t = setTimeout(() => setShow(false), 600);
      return () => clearTimeout(t);
    }
  }, [isLoading]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="loading-screen"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.02 }}
          transition={{ duration: 0.5, ease: "easeInOut" }}
        >
          {/* Animated background particles */}
          <div className="loading-particles">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="loading-particle"
                style={{
                  left: `${Math.random() * 100}%`,
                  top: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 3}s`,
                  animationDuration: `${3 + Math.random() * 4}s`,
                  width: `${2 + Math.random() * 4}px`,
                  height: `${2 + Math.random() * 4}px`,
                }}
              />
            ))}
          </div>

          {/* Central loading content */}
          <div className="loading-center">
            {/* Orbiting rings */}
            <div className="loading-rings">
              <div className="loading-ring loading-ring-1" />
              <div className="loading-ring loading-ring-2" />
              <div className="loading-ring loading-ring-3" />
            </div>

            {/* Logo icon */}
            <div className="loading-logo">
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
                <defs>
                  <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="50%" stopColor="#a78bfa" />
                    <stop offset="100%" stopColor="#c084fc" />
                  </linearGradient>
                </defs>
                {/* Lightning bolt / chart arrow — represents prediction */}
                <path
                  d="M16 6L10 24h10l-4 18 16-22H22l4-14z"
                  fill="url(#logoGrad)"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {/* Brand name */}
            <motion.h1
              className="loading-brand"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
            >
              Instinct<span className="loading-brand-accent">Fi</span>
            </motion.h1>

            {/* Tagline */}
            <motion.p
              className="loading-tagline"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.5 }}
            >
              Predict. Vote. Win.
            </motion.p>

            {/* Loading bar */}
            <motion.div
              className="loading-bar-track"
              initial={{ opacity: 0, scaleX: 0.8 }}
              animate={{ opacity: 1, scaleX: 1 }}
              transition={{ delay: 0.7, duration: 0.3 }}
            >
              <div className="loading-bar-fill" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
