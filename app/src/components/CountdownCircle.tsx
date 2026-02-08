"use client";

/** Circular countdown progress indicator */
export default function CountdownCircle({
  progress,
  size = 32,
  strokeWidth = 3,
  text,
  className = "",
}: {
  /** 0–1 progress value (0 = just started, 1 = time's up) */
  progress: number;
  size?: number;
  strokeWidth?: number;
  text?: string;
  className?: string;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const remaining = Math.max(0, Math.min(1, 1 - progress));
  const dashOffset = circumference * (1 - remaining);

  // Color transitions: green → yellow → red based on progress
  const color =
    progress < 0.5
      ? "text-green-500"
      : progress < 0.8
      ? "text-yellow-500"
      : "text-red-500";

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className={`-rotate-90 ${color}`} width={size} height={size}>
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-700/50"
        />
        {/* Progress arc */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={dashOffset}
          strokeLinecap="round"
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      {text && (
        <span className="absolute text-[8px] font-mono font-bold text-gray-300 rotate-0">{text}</span>
      )}
    </div>
  );
}
