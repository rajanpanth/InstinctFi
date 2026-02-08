// ─── Shared Constants ───────────────────────────────────────────────────────
// Single source of truth for categories and other shared config
// Admin wallets that have full control over all polls
export const ADMIN_WALLETS = [
  "62PFLSvnG4Zp8jYS9AFymETvV5e8xBA2JBW2UhjqyNmS",
];

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

/** Category metadata for navbar/home page category bar */
export const CATEGORY_META: { label: string; icon: string; color: string }[] = [
  { label: "Trending", icon: "🔥", color: "text-orange-400" },
  { label: "Politics", icon: "🏛️", color: "text-blue-400" },
  { label: "Sports", icon: "⚽", color: "text-green-400" },
  { label: "Culture", icon: "🎭", color: "text-pink-400" },
  { label: "Crypto", icon: "◎", color: "text-purple-500" },
  { label: "Climate", icon: "🌍", color: "text-emerald-400" },
  { label: "Economics", icon: "📈", color: "text-emerald-400" },
  { label: "Science", icon: "🔬", color: "text-purple-400" },
  { label: "Tech", icon: "💻", color: "text-cyan-400" },
  { label: "Entertainment", icon: "🎬", color: "text-pink-400" },
  { label: "Mentions", icon: "💬", color: "text-sky-400" },
  { label: "Companies", icon: "🏢", color: "text-indigo-400" },
  { label: "Financials", icon: "💰", color: "text-yellow-400" },
  { label: "Other", icon: "📋", color: "text-gray-400" },
];
