/**
 * Input sanitization utilities for XSS prevention.
 * Used on all user-generated content before storing or displaying.
 */

/** Strip HTML tags and dangerous content from user text */
export function sanitizeText(input: string): string {
  return input
    // Remove HTML tags
    .replace(/<[^>]*>/g, "")
    // Remove javascript: and data: URIs
    .replace(/javascript\s*:/gi, "")
    .replace(/data\s*:/gi, "")
    // Remove on* event handlers if somehow present
    .replace(/on\w+\s*=/gi, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
}

/** Sanitize a URL — only allow http, https protocols */
export function sanitizeUrl(url: string): string {
  const trimmed = url.trim();
  if (!trimmed) return "";
  try {
    const parsed = new URL(trimmed);
    if (!["http:", "https:"].includes(parsed.protocol)) return "";
    return parsed.toString();
  } catch {
    // If it doesn't parse as absolute URL, reject it
    return "";
  }
}

/** Sanitize poll options (array of strings) */
export function sanitizeOptions(options: string[]): string[] {
  return options.map((o) => sanitizeText(o).slice(0, 100));
}

/** Sanitize a poll title */
export function sanitizeTitle(title: string): string {
  return sanitizeText(title).slice(0, 64);
}

/** Sanitize a description */
export function sanitizeDescription(desc: string): string {
  return sanitizeText(desc).slice(0, 500);
}

/** Sanitize a comment */
export function sanitizeComment(text: string): string {
  return sanitizeText(text).slice(0, 500);
}

/** Sanitize a display name */
export function sanitizeDisplayName(name: string): string {
  return sanitizeText(name).slice(0, 30);
}
