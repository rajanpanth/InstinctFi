/**
 * Input sanitization utilities for XSS prevention.
 * Used on all user-generated content before storing or displaying.
 */

/**
 * Strip HTML tags and dangerous content from user text.
 * #41: Multi-pass approach to handle malformed/nested tags more robustly.
 * For full protection in rendering contexts, also use CSP and React's built-in escaping.
 */
export function sanitizeText(input: string): string {
  let result = input
    // Remove null bytes that could bypass regex
    .replace(/\0/g, "")
    // Remove HTML comments (including unclosed ones)
    .replace(/<!--[\s\S]*?(?:-->|$)/g, "")
    // Remove CDATA sections
    .replace(/<!\[CDATA\[[\s\S]*?\]\]>/gi, "")
    // Remove complete HTML tags (including self-closing)
    .replace(/<\/?[a-z][^>]*\/?>/gi, "")
    // Remove any remaining incomplete tag fragments (e.g. `<script`, `< img`)
    .replace(/<\/?[a-z\s][^>]*$/gi, "")
    .replace(/^[^<]*>/g, "")
    // Remove javascript: and data: URIs (with whitespace/encoding bypass prevention)
    .replace(/j\s*a\s*v\s*a\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, "")
    .replace(/d\s*a\s*t\s*a\s*:/gi, "")
    .replace(/v\s*b\s*s\s*c\s*r\s*i\s*p\s*t\s*:/gi, "")
    // Remove on* event handlers if somehow present
    .replace(/on\w+\s*=/gi, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();
  // Second pass: catch any remaining angle brackets
  result = result.replace(/<[^>]*>/g, "");
  return result;
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
  return sanitizeText(title).slice(0, 200);
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
