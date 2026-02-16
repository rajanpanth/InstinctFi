"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useApp } from "./Providers";
import { Zap } from "lucide-react";

export default function LoadingScreen() {
  const { isLoading } = useApp();
  const [show, setShow] = useState(true);

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
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4, ease: "easeInOut" }}
        >
          <div className="loading-center">
            {/* Logo icon */}
            <div className="loading-logo">
              <Zap size={24} className="text-brand-500" />
            </div>

            {/* Brand name */}
            <motion.h1
              className="loading-brand"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15, duration: 0.4 }}
            >
              Instinct<span className="loading-brand-accent">Fi</span>
            </motion.h1>

            {/* Loading bar */}
            <motion.div
              className="loading-bar-track"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 0.3 }}
            >
              <div className="loading-bar-fill" />
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
