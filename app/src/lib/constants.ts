// ─── Shared Constants ───────────────────────────────────────────────────────
// Single source of truth for categories and other shared config

// Admin wallets — used client-side for UI gating (showing edit/delete buttons).
// ⚠ The AUTHORITATIVE admin check is in the `admin_wallets` Supabase table,
//   which is queried by `createAdminRpcHandler` on every admin API call.
//   This client-side list is ONLY for UI gating — never for security decisions.
const ADMIN_WALLETS_ENV = process.env.NEXT_PUBLIC_ADMIN_WALLETS;
export const ADMIN_WALLETS: string[] = ADMIN_WALLETS_ENV
  ? ADMIN_WALLETS_ENV.split(",").map(w => w.trim()).filter(Boolean)
  : process.env.NODE_ENV === "development"
    ? [
        // BUG-15 FIX: Fallback only in development — in production
        // NEXT_PUBLIC_ADMIN_WALLETS env var MUST be set.
        "62PFLSvnG4Zp8jYS9AFymETvV5e8xBA2JBW2UhjqyNmS",
      ]
    : [];

export function isAdminWallet(wallet: string | null): boolean {
  return wallet ? ADMIN_WALLETS.includes(wallet) : false;
}
export const CATEGORIES = [
  "Crypto",
  "Sports",
  "Politics",
  "Tech",
  "Entertainment",
  "Science",
  "Economics",
  "Culture",
  "Climate",
  "Mentions",
  "Companies",
  "Financials",
  "Other",
] as const;

export type Category = (typeof CATEGORIES)[number];

// #61: CategoryLabel includes CATEGORIES + UI-only filters like "Trending"
type CategoryLabel = Category | "Trending";

/**
 * Category metadata for navbar/home page category bar.
 * NOTE: "Trending" is a UI-only filter (not in CATEGORIES) — it shows
 * recently active polls, not polls tagged as "Trending".
 */
export const CATEGORY_META: {
  label: CategoryLabel;
  icon: string;
  color: string;
  bgGradient?: string;  // gradient for poll card category banner
  borderColor?: string; // accent border for cards
  isFilter?: boolean;   // true = UI filter only, not a valid poll category
}[] = [
    { label: "Trending", icon: "🔥", color: "text-orange-400", bgGradient: "from-orange-600/20 to-red-600/20", borderColor: "border-orange-500/30", isFilter: true },
    { label: "Politics", icon: "🏛️", color: "text-blue-400", bgGradient: "from-blue-600/20 to-brand-600/20", borderColor: "border-blue-500/30" },
    { label: "Sports", icon: "⚽", color: "text-green-400", bgGradient: "from-green-600/20 to-emerald-600/20", borderColor: "border-green-500/30" },
    { label: "Culture", icon: "🎭", color: "text-pink-400", bgGradient: "from-pink-600/20 to-rose-600/20", borderColor: "border-pink-500/30" },
    { label: "Crypto", icon: "◎", color: "text-purple-500", bgGradient: "from-purple-600/20 to-violet-600/20", borderColor: "border-purple-500/30" },
    { label: "Climate", icon: "🌍", color: "text-emerald-400", bgGradient: "from-emerald-600/20 to-teal-600/20", borderColor: "border-emerald-500/30" },
    { label: "Economics", icon: "📈", color: "text-emerald-400", bgGradient: "from-emerald-600/20 to-green-600/20", borderColor: "border-emerald-500/30" },
    { label: "Science", icon: "🔬", color: "text-purple-400", bgGradient: "from-purple-600/20 to-fuchsia-600/20", borderColor: "border-purple-500/30" },
    { label: "Tech", icon: "💻", color: "text-cyan-400", bgGradient: "from-cyan-600/20 to-sky-600/20", borderColor: "border-cyan-500/30" },
    { label: "Entertainment", icon: "🎬", color: "text-pink-400", bgGradient: "from-pink-600/20 to-purple-600/20", borderColor: "border-pink-500/30" },
    { label: "Mentions", icon: "💬", color: "text-sky-400", bgGradient: "from-sky-600/20 to-blue-600/20", borderColor: "border-sky-500/30" },
    { label: "Companies", icon: "🏢", color: "text-brand-400", bgGradient: "from-indigo-600/20 to-blue-600/20", borderColor: "border-brand-500/20" },
    { label: "Financials", icon: "💰", color: "text-yellow-400", bgGradient: "from-yellow-600/20 to-amber-600/20", borderColor: "border-yellow-500/30" },
    { label: "Other", icon: "📋", color: "text-gray-400", bgGradient: "from-gray-600/20 to-slate-600/20", borderColor: "border-gray-500/30" },
  ];

/** Helper to look up category meta by label */
export function getCategoryMeta(label: string) {
  return CATEGORY_META.find((c) => c.label === label) ?? CATEGORY_META[CATEGORY_META.length - 1];
}

// #61: Dev-mode assertion — detect drift between CATEGORIES and CATEGORY_META
if (process.env.NODE_ENV === "development") {
  const metaLabels = new Set(CATEGORY_META.map(c => c.label));
  for (const cat of CATEGORIES) {
    if (!metaLabels.has(cat)) {
      console.warn(`[constants] Category "${cat}" missing from CATEGORY_META`);
    }
  }
}
