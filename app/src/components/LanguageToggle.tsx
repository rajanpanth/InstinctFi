"use client";

import { useLanguage } from "@/lib/languageContext";

/**
 * Compact EN / ने toggle button for the navbar.
 * Styled to match the existing DarkModeToggle size & shape.
 */
export default function LanguageToggle() {
  const { lang, toggleLang } = useLanguage();

  return (
    <button
      onClick={toggleLang}
      className="h-8 px-1.5 flex items-center gap-0.5 rounded-lg hover:bg-dark-700 transition-colors text-gray-400 hover:text-white select-none"
      title={lang === "en" ? "नेपालीमा परिवर्तन गर्नुहोस्" : "Switch to English"}
      aria-label={lang === "en" ? "Switch to Nepali" : "Switch to English"}
    >
      {/* Globe icon */}
      <svg
        width="15"
        height="15"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="shrink-0"
      >
        <circle cx="12" cy="12" r="10" />
        <line x1="2" y1="12" x2="22" y2="12" />
        <path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" />
      </svg>
      {/* Active language label */}
      <span className="text-[11px] font-bold leading-none">
        {lang === "en" ? "EN" : "ने"}
      </span>
    </button>
  );
}
