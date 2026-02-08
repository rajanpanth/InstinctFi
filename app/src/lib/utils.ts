// ─── Shared UI Utilities ─────────────────────────────────────────────────────
// Single source of truth for duplicated helper functions

/**
 * Truncate a wallet address for display: "XXXX...XXXX"
 * Consistent formatting across Navbar, Profile, Leaderboard, PollCard.
 */
export function shortAddr(addr: string, chars = 4): string {
  if (addr.length <= chars * 2 + 3) return addr;
  return `${addr.slice(0, chars)}...${addr.slice(-chars)}`;
}

/**
 * Badge color palettes for poll options.
 * Moved out of PollCard to avoid re-creating on every render.
 */
export const OPTION_BADGE_COLORS = [
  { bg: "bg-blue-500/15", text: "text-blue-400", border: "border-blue-500/30", bgHover: "group-hover/opt:bg-blue-500/25", borderHover: "group-hover/opt:border-blue-500/50" },
  { bg: "bg-red-500/15", text: "text-red-400", border: "border-red-500/30", bgHover: "group-hover/opt:bg-red-500/25", borderHover: "group-hover/opt:border-red-500/50" },
  { bg: "bg-purple-500/15", text: "text-purple-400", border: "border-purple-500/30", bgHover: "group-hover/opt:bg-purple-500/25", borderHover: "group-hover/opt:border-purple-500/50" },
  { bg: "bg-orange-500/15", text: "text-orange-400", border: "border-orange-500/30", bgHover: "group-hover/opt:bg-orange-500/25", borderHover: "group-hover/opt:border-orange-500/50" },
] as const;
