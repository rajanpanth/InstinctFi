"use client";

import React, { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react";

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
  const [bookmarks, setBookmarks] = useState<Set<string>>(loadBookmarks);

  useEffect(() => {
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
