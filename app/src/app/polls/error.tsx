"use client";

import { useEffect } from "react";
import Link from "next/link";

export default function PollsError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Polls error:", error);
  }, [error]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center space-y-4 max-w-md">
        <div className="text-4xl">📊</div>
        <h2 className="text-xl font-semibold">Failed to load poll</h2>
        <p className="text-sm text-gray-400">
          {error.message || "We couldn't load this poll. It may have been removed or the connection failed."}
        </p>
        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-medium transition-colors"
          >
            Try Again
          </button>
          <Link
            href="/"
            className="px-5 py-2.5 bg-surface-100 hover:bg-surface-200 rounded-xl text-sm font-medium transition-colors"
          >
            Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
}
