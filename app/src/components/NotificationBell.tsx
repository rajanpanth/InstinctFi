"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useNotifications, type Notification } from "@/lib/notifications";

function notifIcon(type: Notification["type"]) {
  switch (type) {
    case "poll_ended": return "⏰";
    case "reward_available": return "🎉";
    case "poll_voted": return "🗳️";
    case "reward_claimed": return "💰";
    case "poll_settled": return "✅";
    default: return "🔔";
  }
}

function timeAgoShort(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return "now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  return `${Math.floor(diff / 86400)}d`;
}

export default function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllRead, clearAll } = useNotifications();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative w-8 h-8 flex items-center justify-center rounded-lg bg-dark-700 border border-gray-700 hover:bg-dark-600 transition-colors"
        aria-label="Notifications"
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-gray-400">
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 text-[9px] font-bold text-white px-1 animate-pulse">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 max-h-96 bg-dark-800 border border-gray-700 rounded-xl shadow-2xl overflow-hidden z-50 animate-scaleIn">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700/50">
            <h3 className="text-sm font-semibold">Notifications</h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-[10px] text-primary-400 hover:text-primary-300 font-medium"
                >
                  Mark all read
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  onClick={clearAll}
                  className="text-[10px] text-gray-500 hover:text-gray-400 font-medium"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Notifications list */}
          <div className="overflow-y-auto max-h-80">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-gray-500 text-sm">
                No notifications yet
              </div>
            ) : (
              notifications.slice(0, 20).map((n) => (
                <div
                  key={n.id}
                  onClick={() => markAsRead(n.id)}
                  className={`flex gap-3 px-4 py-3 hover:bg-dark-700/50 transition-colors cursor-pointer border-b border-gray-800/30 ${
                    !n.read ? "bg-primary-600/5" : ""
                  }`}
                >
                  <span className="text-lg shrink-0">{notifIcon(n.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-xs font-semibold truncate ${!n.read ? "text-white" : "text-gray-400"}`}>
                        {n.title}
                      </span>
                      <span className="text-[10px] text-gray-600 shrink-0">{timeAgoShort(n.createdAt)}</span>
                    </div>
                    <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    {n.pollId && (
                      <Link
                        href={`/polls/${n.pollId}`}
                        onClick={(e) => { e.stopPropagation(); setOpen(false); }}
                        className="text-[10px] text-primary-400 hover:text-primary-300 mt-1 inline-block"
                      >
                        View poll &rarr;
                      </Link>
                    )}
                  </div>
                  {!n.read && (
                    <div className="w-2 h-2 rounded-full bg-primary-500 shrink-0 mt-1" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
