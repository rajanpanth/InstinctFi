export default function SkeletonCard() {
  return (
    <div role="status" aria-label="Loading poll" className="bg-gradient-to-b from-dark-700/70 to-dark-800/50 border border-gray-800/60 rounded-2xl overflow-hidden animate-pulse">
      <div className="p-4 sm:p-5">
        {/* Header */}
        <div className="flex items-start gap-3.5 mb-4">
          <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-gray-700/40 shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            <div className="h-4 bg-gray-700/40 rounded-md w-4/5 mb-2.5" />
            <div className="flex gap-2">
              <div className="h-4 w-16 bg-gray-700/30 rounded-md" />
              <div className="h-4 w-14 bg-gray-700/30 rounded-md" />
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-gray-700/20 shrink-0" />
        </div>

        {/* Option rows */}
        <div className="space-y-2">
          <div className="h-12 bg-gray-700/15 rounded-xl" />
          <div className="h-12 bg-gray-700/15 rounded-xl" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-gray-800/50">
          <div className="flex gap-2">
            <div className="h-6 w-16 bg-gray-700/20 rounded-lg" />
            <div className="h-6 w-12 bg-gray-700/20 rounded-lg" />
          </div>
          <div className="h-7 w-16 bg-gray-700/25 rounded-lg" />
        </div>
      </div>
    </div>
  );
}
