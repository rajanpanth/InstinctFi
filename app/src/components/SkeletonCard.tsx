export default function SkeletonCard() {
  return (
    <div
      role="status"
      aria-label="Loading poll"
      className="bg-surface-100 border border-border rounded-xl overflow-hidden animate-pulse"
    >
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <div className="w-12 h-12 rounded-lg bg-surface-300 shrink-0" />
          <div className="flex-1 min-w-0 pt-1">
            <div className="h-3.5 bg-surface-300 rounded w-4/5 mb-2" />
            <div className="flex gap-2">
              <div className="h-3.5 w-14 bg-surface-200 rounded" />
              <div className="h-3.5 w-12 bg-surface-200 rounded" />
            </div>
          </div>
          <div className="w-7 h-7 rounded-lg bg-surface-200 shrink-0" />
        </div>

        {/* Option rows */}
        <div className="space-y-1.5">
          <div className="h-10 bg-surface-50 rounded-lg" />
          <div className="h-10 bg-surface-50 rounded-lg" />
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-3 pt-3 border-t border-border">
          <div className="flex gap-2">
            <div className="h-5 w-14 bg-surface-200 rounded" />
            <div className="h-5 w-10 bg-surface-200 rounded" />
          </div>
          <div className="h-6 w-14 bg-surface-200 rounded" />
        </div>
      </div>
    </div>
  );
}
