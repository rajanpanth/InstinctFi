export default function SkeletonCard() {
  return (
    <div role="status" aria-label="Loading poll" className="bg-dark-700/60 border border-gray-800/60 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-10 h-10 rounded-lg bg-gray-700/50 shrink-0" />
          <div className="flex-1 min-w-0">
            <div className="h-4 bg-gray-700/50 rounded w-3/4 mb-2" />
            <div className="flex gap-2">
              <div className="h-4 w-14 bg-gray-700/50 rounded" />
              <div className="h-4 w-12 bg-gray-700/50 rounded" />
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-700/30 shrink-0" />
        </div>

        {/* Option rows */}
        <div className="space-y-1.5">
          <div className="h-10 bg-gray-700/20 rounded-lg" />
          <div className="h-10 bg-gray-700/20 rounded-lg" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-gray-800/80">
          <div className="flex gap-3">
            <div className="h-3 w-16 bg-gray-700/30 rounded" />
            <div className="h-3 w-14 bg-gray-700/30 rounded" />
          </div>
          <div className="h-6 w-14 bg-gray-700/30 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
