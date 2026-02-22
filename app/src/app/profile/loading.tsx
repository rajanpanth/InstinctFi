export default function ProfileLoading() {
    return (
        <div className="max-w-3xl mx-auto animate-pulse">
            {/* Profile header */}
            <div className="bg-surface-100 border border-border rounded-2xl p-6 mb-6">
                <div className="flex items-center gap-4 mb-4">
                    <div className="w-16 h-16 rounded-full bg-surface-200" />
                    <div className="space-y-2">
                        <div className="w-32 h-6 bg-surface-200 rounded" />
                        <div className="w-48 h-4 bg-surface-200 rounded" />
                    </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="p-3 bg-surface-50 rounded-xl text-center space-y-2">
                            <div className="w-14 h-6 bg-surface-200 rounded mx-auto" />
                            <div className="w-10 h-3 bg-surface-200 rounded mx-auto" />
                        </div>
                    ))}
                </div>
            </div>

            {/* Activity skeleton */}
            <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="w-full h-16 bg-surface-100 border border-border rounded-xl" />
                ))}
            </div>
        </div>
    );
}
