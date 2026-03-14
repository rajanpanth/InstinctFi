"use client";

import { useMemo, useState, useEffect } from "react";
import Image from "next/image";
import Link from "next/link";
import { Bookmark, Link2, TrendingUp } from "lucide-react";
import { DemoPoll, formatDollarsShort } from "@/lib/types";
import { sanitizeImageUrl } from "@/lib/uploadImage";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";


/* ── types ── */
type OptionSlice = {
  name: string;
  percent: number;
  color: string;
};

/* ── palette ── */
const LINE_COLORS = ["#3B82F6", "#A78BFA", "#F59E0B", "#EF4444", "#10B981", "#EC4899"];

/* ── comments data ── */
const MOCK_COMMENTS = [
  {
    username: "negativePNL",
    color: "#A3E635",
    message: "Leo will win. Timothee's Oscar's campaign is lowbrow and anti-Academy in ethos",
  },
  {
    username: "cassiusclay123",
    color: "#818CF8",
    message: "Leo or hawke I'm telling you. Come back to this when they win",
  },
  {
    username: "biglebo",
    color: "#F59E0B",
    message: "why did i sell ethan hawke man",
  },
  {
    username: "whale_watcher",
    color: "#34D399",
    message: "huge volume spike just now 👀",
  },
  {
    username: "solana_degen",
    color: "#F472B6",
    message: "this market is free money honestly",
  },
  {
    username: "crystalball",
    color: "#60A5FA",
    message: "don't underestimate the late momentum swing",
  },
];

/* ── helpers ── */
function buildOptionSlice(poll: DemoPoll): OptionSlice[] {
  const total = poll.voteCounts.reduce((s, c) => s + c, 0);
  const raw = poll.options.map((name, idx) => {
    const votes = poll.voteCounts[idx] ?? 0;
    const percent =
      total > 0
        ? (votes / total) * 100
        : 100 / Math.max(1, poll.options.length);
    return { name, percent, color: LINE_COLORS[idx % LINE_COLORS.length] };
  });
  return raw
    .sort((a, b) => b.percent - a.percent)
    .slice(0, 2)
    .map((item) => ({
      ...item,
      percent: Math.round(item.percent * 10) / 10,
    }));
}

function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
}

function hash(value: string): number {
  let out = 0;
  for (let i = 0; i < value.length; i++) {
    out = (out << 5) - out + value.charCodeAt(i);
    out |= 0;
  }
  return Math.abs(out);
}

/* smoother data — cubic interpolation uses more points */
function generateMockTimeseries(pollId: string, slices: OptionSlice[]) {
  const data: Record<string, number>[] = [];
  const now = Date.now();
  const rand = seededRandom(hash(pollId));
  const POINTS = 60;

  const startValues = slices.map((s) =>
    Math.max(2, Math.min(95, s.percent + (rand() - 0.5) * 50))
  );

  for (let i = 0; i < POINTS; i++) {
    const point: Record<string, number> = {
      time: now - (POINTS - i) * 3600000, // 1 hour intervals
    };
    const progress = i / (POINTS - 1);

    slices.forEach((slice, idx) => {
      const sv = startValues[idx];
      // smoother cubic easing + small noise
      const ease = progress * progress * (3 - 2 * progress); // smoothstep
      const noise = (rand() - 0.5) * 6 * (1 - progress * 0.7);
      const wave = Math.sin(i * 0.3 + idx * 1.5) * 3 * (1 - progress * 0.5);
      const val = sv + (slice.percent - sv) * ease + noise + wave;
      point[slice.name] = Math.max(0, Math.min(100, val));
    });
    data.push(point);
  }
  // pin last point to actual
  const last: Record<string, number> = { time: now };
  slices.forEach((s) => (last[s.name] = s.percent));
  data[data.length - 1] = last;
  return data;
}

/* ── Custom tooltip ── */
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-[#0f1923]/95 backdrop-blur-lg border border-white/10 py-2.5 px-3.5 rounded-xl shadow-2xl text-xs">
        <p className="text-neutral-500 mb-2 text-[0.65rem] uppercase tracking-wider font-medium">
          {new Date(payload[0].payload.time).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })}{" "}
          {new Date(payload[0].payload.time).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
        <div className="space-y-1">
          {payload
            .sort((a: any, b: any) => b.value - a.value)
            .map((e: any, i: number) => (
              <div
                key={i}
                className="flex justify-between items-center gap-5 leading-snug"
              >
                <span className="flex items-center gap-1.5">
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: e.color }}
                  />
                  <span className="text-neutral-300 font-medium">
                    {e.name}
                  </span>
                </span>
                <span className="text-white font-bold tabular-nums">
                  {e.value.toFixed(1)}%
                </span>
              </div>
            ))}
        </div>
      </div>
    );
  }
  return null;
};

/* ── Smooth auto-scroll comments ── */
function AnimatedComments({ pollId }: { pollId: string }) {
  // Double the list so the scroll loops seamlessly
  const doubled = [...MOCK_COMMENTS, ...MOCK_COMMENTS];
  const totalHeight = MOCK_COMMENTS.length * 44; // ~44px per comment row
  const duration = MOCK_COMMENTS.length * 4; // 4s per comment

  return (
    <div className="mt-auto pt-3 overflow-hidden h-[140px] relative">
      {/* Fade masks */}
      <div className="absolute inset-x-0 top-0 h-4 z-10 bg-gradient-to-b from-[#0c141f] to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 h-4 z-10 bg-gradient-to-t from-[#0c141f] to-transparent pointer-events-none" />

      <div
        key={pollId}
        className="animate-comment-scroll"
        style={{
          // @ts-ignore -- CSS custom properties
          "--scroll-distance": `-${totalHeight}px`,
          "--scroll-duration": `${duration}s`,
        } as React.CSSProperties}
      >
        {doubled.map((c, i) => (
          <div key={`${pollId}-${i}`} className="flex items-start gap-2.5 mb-2 h-[40px]">
            <div
              className="mt-1 h-3 w-3 rounded-full shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: c.color }}
            />
            <div className="min-w-0">
              <p className="text-[0.78rem] font-semibold text-neutral-300 leading-none mb-0.5">
                {c.username}
              </p>
              <p className="text-[0.72rem] text-neutral-500 leading-snug line-clamp-2">
                {c.message}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ── Main component ── */
export default function FeaturedPollHeroCard({ poll }: { poll: DemoPoll }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const optionSlices = buildOptionSlice(poll);
  const hiddenOptionCount = Math.max(0, poll.options.length - optionSlices.length);
  const mainImage = poll.imageUrl ? sanitizeImageUrl(poll.imageUrl) : "";
  const endsAt = new Date(poll.endTime * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  const chartData = useMemo(
    () => (mounted ? generateMockTimeseries(poll.id, optionSlices) : []),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [poll.id, mounted]
  );

  // Generate unique gradient IDs per option to avoid SVG conflicts
  const gradientIds = useMemo(
    () => optionSlices.map((_, i) => `grad-${poll.id.slice(0, 6)}-${i}`),
    [poll.id, optionSlices]
  );

  return (
    <Link href={`/polls/${poll.id}`} className="block cursor-pointer">
      <div className="rounded-2xl border border-[#1c2a3a] bg-[#0c141f] shadow-[0_16px_64px_-24px_rgba(0,0,0,.9)] overflow-hidden transition-all duration-300 hover:border-[#263a52] hover:shadow-[0_20px_80px_-24px_rgba(0,0,0,.95)]">
        {/* ── Header row ── */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-2 sm:px-5 sm:pt-5 sm:pb-3">
          <div className="h-11 w-11 shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#121d2a]">
            {mainImage ? (
              mainImage.startsWith("data:") ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={mainImage}
                  alt={poll.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <Image
                  src={mainImage}
                  alt={poll.title}
                  width={44}
                  height={44}
                  className="h-full w-full object-cover"
                  unoptimized
                />
              )
            ) : (
              <div className="flex h-full w-full items-center justify-center text-lg text-[#f2c230]">
                🏆
              </div>
            )}
          </div>

          <h3 className="flex-1 min-w-0 text-[1.05rem] sm:text-lg font-bold text-white leading-snug truncate">
            {poll.title}
          </h3>

          <div className="flex items-center gap-1 text-neutral-500 shrink-0">
            <button
              aria-label="Copy link"
              className="p-1.5 rounded-lg hover:bg-white/5 hover:text-neutral-300 transition-colors"
            >
              <Link2 size={15} />
            </button>
            <button
              aria-label="Bookmark"
              className="p-1.5 rounded-lg hover:bg-white/5 hover:text-neutral-300 transition-colors"
            >
              <Bookmark size={15} />
            </button>
          </div>
        </div>

        {/* ── Body: options (left) + chart (right) ── */}
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] min-h-0 lg:min-h-[300px]">
          {/* Left column — Options + Comments */}
          <div className="flex flex-col px-4 pb-3 sm:px-5 sm:pb-4">
            {/* Option list */}
            <div className="space-y-0">
              {optionSlices.map((opt, idx) => (
                <div
                  key={opt.name}
                  className={`flex items-center justify-between py-2.5 px-3 -mx-3 rounded-xl transition-colors hover:bg-white/5 cursor-pointer ${idx < optionSlices.length - 1 || hiddenOptionCount > 0
                    ? "border-b border-white/[0.06] hover:border-transparent"
                    : ""
                    }`}
                >
                  <span className="text-[0.9rem] text-neutral-200 font-medium truncate pr-3">
                    {opt.name}
                  </span>
                  <span className="text-[1.3rem] sm:text-[1.6rem] font-bold text-white tabular-nums tracking-tight whitespace-nowrap">
                    {Math.round(opt.percent)}%
                  </span>
                </div>
              ))}
              {hiddenOptionCount > 0 && (
                <div className="py-2 text-center text-[0.78rem] text-neutral-500">
                  +{hiddenOptionCount} more option{hiddenOptionCount > 1 ? "s" : ""}
                </div>
              )}
            </div>

            {/* Animated comments — hidden on mobile to save space */}
            <div className="hidden lg:block">
              <AnimatedComments pollId={poll.id} />
            </div>
          </div>

          {/* Right column — Chart legend + Chart */}
          <div className="flex flex-col px-3 pb-3 lg:pl-0">
            {/* Legend row */}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 px-2 pb-2 text-[0.68rem]">
              {optionSlices.map((opt) => (
                <span
                  key={opt.name}
                  className="flex items-center gap-1 text-neutral-400"
                >
                  <span
                    className="w-[7px] h-[7px] rounded-full inline-block"
                    style={{ backgroundColor: opt.color }}
                  />
                  <span className="truncate max-w-[7rem]">{opt.name}</span>{" "}
                  <span className="font-bold text-neutral-200">
                    {opt.percent}%
                  </span>
                </span>
              ))}
            </div>

            {/* Chart area */}
            <div className="h-[200px] sm:h-[280px] w-full rounded-xl overflow-hidden bg-gradient-to-b from-[#0a1018] to-[#0d1520] border border-[#162030]">
              {mounted && chartData.length > 0 && (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={chartData}
                    margin={{ top: 12, right: 42, left: 0, bottom: 6 }}
                  >
                    <defs>
                      {optionSlices.map((opt, i) => (
                        <linearGradient
                          key={gradientIds[i]}
                          id={gradientIds[i]}
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="0%"
                            stopColor={opt.color}
                            stopOpacity={0.15}
                          />
                          <stop
                            offset="100%"
                            stopColor={opt.color}
                            stopOpacity={0}
                          />
                        </linearGradient>
                      ))}
                    </defs>
                    <CartesianGrid
                      strokeDasharray="2 6"
                      stroke="#1a2536"
                      vertical={false}
                    />
                    <XAxis dataKey="time" hide />
                    <YAxis
                      domain={[0, 100]}
                      ticks={[0, 20, 40, 60, 80]}
                      axisLine={false}
                      tickLine={false}
                      orientation="right"
                      width={36}
                      tick={{ fill: "#4b5563", fontSize: 10, fontWeight: 500 }}
                      tickFormatter={(v: number) => `${v}%`}
                    />
                    <Tooltip
                      content={<CustomTooltip />}
                      cursor={{
                        stroke: "rgba(255,255,255,0.06)",
                        strokeWidth: 1,
                        strokeDasharray: "4 4",
                      }}
                    />
                    {optionSlices.map((opt, i) => (
                      <Area
                        key={opt.name}
                        type="natural"
                        dataKey={opt.name}
                        stroke={opt.color}
                        strokeWidth={2}
                        fill={`url(#${gradientIds[i]})`}
                        dot={false}
                        activeDot={{
                          r: 4,
                          strokeWidth: 2,
                          stroke: opt.color,
                          fill: "#0c141f",
                        }}
                        isAnimationActive
                        animationDuration={1500}
                        animationEasing="ease-in-out"
                      />
                    ))}
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div className="flex items-center justify-between px-5 py-2.5 border-t border-white/[0.06] text-[0.78rem] text-neutral-500">
          <span className="font-medium">
            {formatDollarsShort(poll.totalPoolLamports)}{" "}
            <span className="text-neutral-600">Vol</span>
          </span>
          <span className="inline-flex items-center gap-2">
            Ends {endsAt}
            <span className="inline-flex items-center gap-1 text-neutral-400">
              · <TrendingUp size={12} /> InstinctFi
            </span>
          </span>
        </div>
      </div>
    </Link>
  );
}
