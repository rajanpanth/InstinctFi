"use client";

/**
 * LiveIndicator — pulsing green dot + "Live" label shown on polls
 * that have received a vote within the last 60 seconds.
 */
export default function LiveIndicator({ className = "" }: { className?: string }) {
    return (
        <span
            className={`inline-flex items-center gap-1 text-[10px] font-medium text-green-400 ${className}`}
            title="A vote was cast recently"
        >
            <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
            </span>
            Live
        </span>
    );
}
