"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, useRef, ReactNode } from "react";

type BookmarkContextType = {
  bookmarks: Set<string>;
  isBookmarked: (pollId: string) => boolean;
  toggleBookmark: (pollId: string) => void;
};

const BookmarkContext = createContext<BookmarkContextType | null>(null);

export function useBookmarks() {
  const ctx = useContext(BookmarkContext);
  if (!ctx) throw new Error("useBookmarks must be inside <BookmarkProvider>");
  return ctx;
}

function loadBookmarks(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const saved = localStorage.getItem("instinctfi_bookmarks");
    return saved ? new Set(JSON.parse(saved)) : new Set();
  } catch {
    return new Set();
  }
}

export function BookmarkProvider({ children }: { children: ReactNode }) {
  // BUG-16 FIX: Initialize with empty Set to match SSR output,
  // then hydrate from localStorage in useEffect to avoid hydration mismatch.
  const [bookmarks, setBookmarks] = useState<Set<string>>(new Set());
  const hydrated = useRef(false);

  // Hydrate from localStorage on mount (client only)
  useEffect(() => {
    const loaded = loadBookmarks();
    if (loaded.size > 0) setBookmarks(loaded);
    hydrated.current = true;
  }, []);

  // Persist to localStorage — skip until hydration is complete
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      localStorage.setItem("instinctfi_bookmarks", JSON.stringify(Array.from(bookmarks)));
    } catch {}
  }, [bookmarks]);

  const isBookmarked = useCallback((pollId: string) => bookmarks.has(pollId), [bookmarks]);

  const toggleBookmark = useCallback((pollId: string) => {
    setBookmarks((prev) => {
      const next = new Set(prev);
      if (next.has(pollId)) {
        next.delete(pollId);
      } else {
        next.add(pollId);
      }
      return next;
    });
  }, []);

  return (
    <BookmarkContext.Provider value={{ bookmarks, isBookmarked, toggleBookmark }}>
      {children}
    </BookmarkContext.Provider>
  );
}
