/**
 * Error recovery utilities for InstinctFi.
 * Provides retry logic, error classification, and user-friendly messages.
 */

// ─── Error Categories ───────────────────────────────────────────────────────
export type ErrorCategory =
  | "network"        // Connection / RPC failures
  | "wallet"         // Wallet rejected / disconnected
  | "balance"        // Insufficient funds
  | "timeout"        // Transaction timeout
  | "program"        // Solana program error
  | "unknown";       // Unclassified

/** Classify an error into a category for targeted handling */
export function classifyError(error: unknown): ErrorCategory {
  const msg = errorMessage(error).toLowerCase();

  if (
    msg.includes("user rejected") ||
    msg.includes("user denied") ||
    msg.includes("cancelled") ||
    msg.includes("wallet") && msg.includes("disconnect")
  ) {
    return "wallet";
  }

  if (
    msg.includes("insufficient") ||
    msg.includes("not enough") ||
    msg.includes("0x1") // InsufficientFunds Solana error
  ) {
    return "balance";
  }

  if (
    msg.includes("timeout") ||
    msg.includes("blockhash") ||
    msg.includes("expired")
  ) {
    return "timeout";
  }

  if (
    msg.includes("network") ||
    msg.includes("fetch") ||
    msg.includes("econnrefused") ||
    msg.includes("failed to fetch") ||
    msg.includes("503") ||
    msg.includes("429")
  ) {
    return "network";
  }

  if (
    msg.includes("custom program error") ||
    msg.includes("0x") ||
    msg.includes("instruction")
  ) {
    return "program";
  }

  return "unknown";
}

/** Get a user-friendly error message based on category */
export function friendlyErrorMessage(error: unknown, action: string): string {
  const category = classifyError(error);

  switch (category) {
    case "wallet":
      return "Transaction was rejected in your wallet.";
    case "balance":
      return "Insufficient SOL balance. Please add funds.";
    case "timeout":
      return `${action} timed out. The network may be congested — please try again.`;
    case "network":
      return "Network error. Check your connection and try again.";
    case "program":
      return `${action} failed due to a program error. The state may have changed.`;
    case "unknown":
    default:
      return `${action} failed. Please try again.`;
  }
}

/** Extract a message string from any error shape */
export function errorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  if (typeof error === "string") return error;
  if (error && typeof error === "object" && "message" in error) {
    return String((error as any).message);
  }
  return "Unknown error";
}

// ─── Retry Logic ────────────────────────────────────────────────────────────

export interface RetryOptions {
  /** Max number of attempts (including the first). Default: 3 */
  maxAttempts?: number;
  /** Initial delay in ms before first retry. Default: 1000 */
  baseDelayMs?: number;
  /** Whether to use exponential backoff. Default: true */
  exponential?: boolean;
  /** Error categories that should NOT be retried */
  noRetry?: ErrorCategory[];
  /** Optional callback before each retry */
  onRetry?: (attempt: number, error: unknown) => void;
}

const DEFAULT_NO_RETRY: ErrorCategory[] = ["wallet", "balance"];

/**
 * Retry an async operation with exponential backoff.
 * Does NOT retry wallet rejections or balance errors.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const {
    maxAttempts = 3,
    baseDelayMs = 1000,
    exponential = true,
    noRetry = DEFAULT_NO_RETRY,
    onRetry,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      // Don't retry certain error categories
      const category = classifyError(error);
      if (noRetry.includes(category)) throw error;

      // Don't retry if we've exhausted attempts
      if (attempt >= maxAttempts) throw error;

      // Notify before retry
      onRetry?.(attempt, error);

      // Wait before retrying
      const delay = exponential
        ? baseDelayMs * Math.pow(2, attempt - 1)
        : baseDelayMs;
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  throw lastError;
}
