"use client";

import { useEffect } from "react";

export default function EmbedError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    useEffect(() => {
        console.error("Embed error:", error);
    }, [error]);

    return (
        <div className="flex items-center justify-center min-h-[40vh]">
            <div className="text-center space-y-3 max-w-sm p-4">
                <div className="text-3xl">📊</div>
                <h2 className="text-lg font-semibold">Poll unavailable</h2>
                <p className="text-xs text-gray-400">
                    {error.message || "This embedded poll couldn't be loaded."}
                </p>
                <button
                    onClick={reset}
                    className="px-4 py-2 bg-brand-500 hover:bg-brand-600 rounded-lg text-xs font-medium transition-colors"
                >
                    Retry
                </button>
            </div>
        </div>
    );
}
