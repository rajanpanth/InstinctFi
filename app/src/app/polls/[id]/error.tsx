"use client";

import { useEffect } from "react";

export default function PollDetailError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Poll detail error:", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-center space-y-4 max-w-md">
                <div className="text-4xl">📊</div>
                <h2 className="text-xl font-semibold">Couldn&apos;t load this poll</h2>
                <p className="text-sm text-gray-400">
                    {error.message || "Something went wrong loading the poll. It may have been removed or the network is down."}
                </p>
                <div className="flex gap-3 justify-center">
                    <button
                        onClick={reset}
                        className="px-5 py-2.5 bg-brand-500 hover:bg-brand-600 rounded-xl text-sm font-medium transition-colors"
                    >
                        Try Again
                    </button>
                    <a
                        href="/polls"
                        className="px-5 py-2.5 bg-surface-100 hover:bg-surface-200 border border-border rounded-xl text-sm font-medium transition-colors text-neutral-300"
                    >
                        Back to Polls
                    </a>
                </div>
            </div>
        </div>
    );
}
