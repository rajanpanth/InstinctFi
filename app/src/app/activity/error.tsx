"use client";

import { useEffect } from "react";

export default function ActivityError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Activity error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">📭</div>
        <h2 className="text-xl font-semibold">Activity feed unavailable</h2>
        <p className="text-sm text-gray-400">
          {error.message || "We couldn't load the activity feed. Please try again."}
        </p>
        <button
          onClick={reset}
          className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-medium transition-colors"
        >
          Try Again
        </button>
      </div>
    </div>
  );
}
