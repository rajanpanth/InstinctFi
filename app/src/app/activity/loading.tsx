export default function ActivityLoading() {
    return (
        <div className="animate-pulse">
            <div className="w-36 h-8 bg-surface-100 rounded mb-6" />

            {/* Filter tabs skeleton */}
            <div className="flex gap-2 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-20 h-9 bg-surface-100 rounded-lg" />
                ))}
            </div>

            {/* Activity items skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="bg-surface-100 border border-border rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-surface-200 shrink-0" />
                        <div className="flex-1 space-y-2">
                            <div className="w-3/4 h-4 bg-surface-200 rounded" />
                            <div className="w-1/2 h-3 bg-surface-200 rounded" />
                        </div>
                        <div className="w-16 h-4 bg-surface-200 rounded" />
                    </div>
                ))}
            </div>
        </div>
    );
}
