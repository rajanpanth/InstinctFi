export default function PollDetailLoading() {
    return (
        <div className="max-w-3xl mx-auto animate-pulse">
            {/* Back button skeleton */}
            <div className="w-28 h-5 bg-surface-100 rounded mb-6" />

            {/* Header card */}
            <div className="bg-surface-100 border border-border rounded-2xl overflow-hidden mb-6">
                <div className="w-full h-48 bg-surface-200" />
                <div className="p-5 sm:p-8 space-y-4">
                    <div className="flex items-center justify-between">
                        <div className="w-20 h-6 bg-surface-200 rounded-lg" />
                        <div className="w-24 h-6 bg-surface-200 rounded-lg" />
                    </div>
                    <div className="w-3/4 h-7 bg-surface-200 rounded" />
                    <div className="w-full h-4 bg-surface-200 rounded" />
                    <div className="w-2/3 h-4 bg-surface-200 rounded" />
                    <div className="grid grid-cols-4 gap-4 p-4 bg-surface-50 rounded-xl">
                        {Array.from({ length: 4 }).map((_, i) => (
                            <div key={i} className="text-center space-y-2">
                                <div className="w-16 h-6 bg-surface-200 rounded mx-auto" />
                                <div className="w-10 h-3 bg-surface-200 rounded mx-auto" />
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Options card */}
            <div className="bg-surface-100 border border-border rounded-2xl p-5 sm:p-8 mb-6 space-y-3">
                <div className="w-24 h-6 bg-surface-200 rounded" />
                {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="w-full h-16 bg-surface-50 border border-border rounded-xl" />
                ))}
            </div>
        </div>
    );
}
