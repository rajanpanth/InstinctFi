"use client";

import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { type Lang, type TranslationKey, t as translate } from "./translations";

interface LanguageContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  toggleLang: () => void;
  t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextValue>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (key) => translate(key, "en"),
});

const STORAGE_KEY = "instinctfi_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("en");

  // Hydrate from localStorage
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "ne") setLangState("ne");
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    localStorage.setItem(STORAGE_KEY, l);
    // Update html lang attribute for accessibility
    document.documentElement.lang = l === "ne" ? "ne" : "en";
  }, []);

  const toggleLang = useCallback(() => {
    setLang(lang === "en" ? "ne" : "en");
  }, [lang, setLang]);

  const t = useCallback(
    (key: TranslationKey) => translate(key, lang),
    [lang],
  );

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  return useContext(LanguageContext);
}
