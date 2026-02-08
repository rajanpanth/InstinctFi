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
 * Relative time formatting: "3h ago", "2d ago", "just now"
 */
export function timeAgo(unixSeconds: number): string {
  const diff = Math.floor(Date.now() / 1000) - unixSeconds;
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  if (diff < 2592000) return `${Math.floor(diff / 604800)}w ago`;
  return `${Math.floor(diff / 2592000)}mo ago`;
}

/**
 * Format a Unix timestamp (seconds) to a readable date string.
 */
export function formatDate(unixSeconds: number): string {
  return new Date(unixSeconds * 1000).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

/**
 * Copy text to clipboard with fallback.
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    // Fallback for older browsers
    const textarea = document.createElement("textarea");
    textarea.value = text;
    textarea.style.position = "fixed";
    textarea.style.opacity = "0";
    document.body.appendChild(textarea);
    textarea.select();
    try {
      document.execCommand("copy");
      return true;
    } catch {
      return false;
    } finally {
      document.body.removeChild(textarea);
    }
  }
}

/**
 * Generate a share URL for a poll.
 */
export function getPollShareUrl(pollId: string): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/polls/${pollId}`;
}

/**
 * Generate a Twitter/X share URL.
 */
export function getTwitterShareUrl(pollTitle: string, pollId: string): string {
  const url = getPollShareUrl(pollId);
  const text = `🗳️ "${pollTitle}" — Vote now on InstinctFi!\n\n`;
  return `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`;
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
  { bg: "bg-green-500/15", text: "text-green-400", border: "border-green-500/30", bgHover: "group-hover/opt:bg-green-500/25", borderHover: "group-hover/opt:border-green-500/50" },
  { bg: "bg-pink-500/15", text: "text-pink-400", border: "border-pink-500/30", bgHover: "group-hover/opt:bg-pink-500/25", borderHover: "group-hover/opt:border-pink-500/50" },
] as const;
