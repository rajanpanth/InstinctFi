import { Zap } from "lucide-react";

export default function Loading() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="flex flex-col items-center gap-5">
        {/* Dual-ring spinner with brand icon */}
        <div className="relative w-14 h-14">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full border-2 border-brand-500/20" />
          {/* Spinning arc */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-brand-500 border-r-brand-500/40 animate-spin" />
          {/* Inner pulsing icon */}
          <div className="absolute inset-0 flex items-center justify-center">
            <Zap size={18} className="text-brand-500 animate-pulse" />
          </div>
        </div>
        {/* Animated dots */}
        <div className="flex items-center gap-1.5">
          <span className="text-sm text-gray-400 font-medium">Loading</span>
          <span className="flex gap-0.5">
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "0ms" }} />
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "150ms" }} />
            <span className="w-1 h-1 rounded-full bg-brand-500 animate-bounce" style={{ animationDelay: "300ms" }} />
          </span>
        </div>
      </div>
    </div>
  );
}
