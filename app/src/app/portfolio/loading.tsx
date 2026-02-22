export default function PortfolioLoading() {
    return (
        <div className="max-w-4xl mx-auto animate-pulse">
            <div className="flex items-center justify-between mb-6">
                <div className="w-36 h-8 bg-surface-100 rounded" />
                <div className="text-right space-y-1">
                    <div className="w-14 h-3 bg-surface-100 rounded ml-auto" />
                    <div className="w-20 h-5 bg-surface-100 rounded ml-auto" />
                </div>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="p-3 rounded-xl border border-border bg-surface-100 space-y-2">
                        <div className="w-16 h-3 bg-surface-200 rounded" />
                        <div className="w-20 h-6 bg-surface-200 rounded" />
                    </div>
                ))}
            </div>
            <div className="flex gap-2 mb-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="w-16 h-8 bg-surface-100 rounded-lg" />
                ))}
            </div>
            <div className="space-y-2">
                {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="h-16 bg-surface-100 border border-border rounded-xl" />
                ))}
            </div>
        </div>
    );
}
