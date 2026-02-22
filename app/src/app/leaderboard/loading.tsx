export default function LeaderboardLoading() {
    return (
        <div className="animate-pulse">
            <div className="flex items-center justify-between mb-6 sm:mb-8">
                <div className="w-40 h-8 bg-surface-100 rounded" />
            </div>

            {/* Period tabs skeleton */}
            <div className="flex gap-2 mb-3">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-24 h-9 bg-surface-100 rounded-lg" />
                ))}
            </div>

            {/* Sort tabs skeleton */}
            <div className="flex gap-2 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-20 h-9 bg-surface-100 rounded-lg" />
                ))}
            </div>

            {/* Table skeleton */}
            <div className="bg-surface-100 border border-border rounded-2xl overflow-hidden">
                <div className="h-12 bg-surface-200/30 border-b border-border" />
                {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-4 px-6 py-4 border-b border-border">
                        <div className="w-6 h-5 bg-surface-200 rounded" />
                        <div className="w-8 h-8 rounded-full bg-surface-200" />
                        <div className="flex-1 h-4 bg-surface-200 rounded" />
                        <div className="w-20 h-4 bg-surface-200 rounded" />
                        <div className="w-14 h-4 bg-surface-200 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
