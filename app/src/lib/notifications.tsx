"use client";

import { useState, useEffect, useCallback, createContext, useContext, ReactNode, useMemo } from "react";

export type Notification = {
  id: string;
  wallet: string;
  type: "poll_ended" | "reward_available" | "poll_voted" | "reward_claimed" | "poll_settled";
  title: string;
  message: string;
  pollId?: string;
  read: boolean;
  createdAt: number;
};

type NotificationContextType = {
  notifications: Notification[];
  unreadCount: number;
  addNotification: (n: Omit<Notification, "id" | "createdAt" | "read">) => void;
  markAsRead: (id: string) => void;
  markAllRead: () => void;
  clearAll: () => void;
};

const NotificationContext = createContext<NotificationContextType | null>(null);

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error("useNotifications must be inside <NotificationProvider>");
  return ctx;
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  // HIGH-06 FIX: Initialize with empty array to avoid SSR hydration mismatch.
  // Load from localStorage in useEffect instead.
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Load saved notifications on client mount (avoids SSR/hydration mismatch)
  useEffect(() => {
    try {
      const saved = localStorage.getItem("instinctfi_notifications");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) setNotifications(parsed);
      }
    } catch { /* localStorage unavailable */ }
  }, []);

  // Persist to localStorage
  useEffect(() => {
    try { localStorage.setItem("instinctfi_notifications", JSON.stringify(notifications)); } catch {}
  }, [notifications]);

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications]);

  const addNotification = useCallback((n: Omit<Notification, "id" | "createdAt" | "read">) => {
    const notification: Notification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      read: false,
      createdAt: Date.now(),
    };
    setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
  }, []);

  const markAsRead = useCallback((id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
  }, []);

  const markAllRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  }, []);

  const clearAll = useCallback(() => {
    setNotifications([]);
  }, []);

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, addNotification, markAsRead, markAllRead, clearAll }}>
      {children}
    </NotificationContext.Provider>
  );
}
