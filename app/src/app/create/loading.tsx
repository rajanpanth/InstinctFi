export default function CreatePollLoading() {
    return (
        <div className="max-w-2xl mx-auto animate-pulse">
            <div className="w-48 h-8 bg-surface-100 rounded mb-2" />
            <div className="w-64 h-4 bg-surface-100 rounded mb-6" />

            {/* Templates skeleton */}
            <div className="flex gap-2 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-28 h-8 bg-surface-100 border border-border rounded-lg" />
                ))}
            </div>

            {/* Form skeleton */}
            <div className="space-y-6">
                <div className="w-full h-32 bg-surface-100 border border-border rounded-xl" />
                <div className="space-y-2">
                    <div className="w-20 h-4 bg-surface-100 rounded" />
                    <div className="w-full h-12 bg-surface-100 border border-border rounded-xl" />
                </div>
                <div className="space-y-2">
                    <div className="w-24 h-4 bg-surface-100 rounded" />
                    <div className="w-full h-24 bg-surface-100 border border-border rounded-xl" />
                </div>
                <div className="space-y-2">
                    <div className="w-20 h-4 bg-surface-100 rounded" />
                    <div className="flex gap-2 flex-wrap">
                        {Array.from({ length: 6 }).map((_, i) => (
                            <div key={i} className="w-20 h-9 bg-surface-100 border border-border rounded-lg" />
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
