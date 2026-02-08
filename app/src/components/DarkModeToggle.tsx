"use client";

import { useEffect, useState } from "react";

export default function DarkModeToggle() {
  const [isDark, setIsDark] = useState(true);

  useEffect(() => {
    const saved = localStorage.getItem("instinctfi_theme");
    if (saved === "light") {
      setIsDark(false);
      document.documentElement.classList.remove("dark");
      document.documentElement.style.setProperty("--foreground-rgb", "17, 24, 39");
      document.documentElement.style.setProperty("--background-start-rgb", "249, 250, 251");
      document.documentElement.style.setProperty("--background-end-rgb", "243, 244, 246");
    } else {
      document.documentElement.classList.add("dark");
    }
  }, []);

  const toggle = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add("dark");
      document.documentElement.style.setProperty("--foreground-rgb", "255, 255, 255");
      document.documentElement.style.setProperty("--background-start-rgb", "13, 14, 36");
      document.documentElement.style.setProperty("--background-end-rgb", "26, 27, 46");
      localStorage.setItem("instinctfi_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.style.setProperty("--foreground-rgb", "17, 24, 39");
      document.documentElement.style.setProperty("--background-start-rgb", "249, 250, 251");
      document.documentElement.style.setProperty("--background-end-rgb", "243, 244, 246");
      localStorage.setItem("instinctfi_theme", "light");
    }
  };

  return (
    <button
      onClick={toggle}
      className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white"
      title={isDark ? "Switch to light mode" : "Switch to dark mode"}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
    >
      {isDark ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="5" />
          <line x1="12" y1="1" x2="12" y2="3" />
          <line x1="12" y1="21" x2="12" y2="23" />
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
          <line x1="1" y1="12" x2="3" y2="12" />
          <line x1="21" y1="12" x2="23" y2="12" />
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
        </svg>
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
        </svg>
      )}
    </button>
  );
}
