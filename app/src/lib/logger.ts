/**
 * Lightweight structured logger for API routes.
 *
 * Outputs JSON lines (one object per log) that are parseable by any
 * log aggregator (Datadog, Grafana Loki, CloudWatch, Vercel Logs).
 *
 * In development, falls back to pretty console output.
 *
 * Usage:
 *   import { log } from "@/lib/logger";
 *   log.info("poll_created", { pollId, wallet });
 *   log.warn("rate_limited", { wallet });
 *   log.error("rpc_failed", { rpc: "cast_vote_atomic", error: err.message });
 */

type LogLevel = "info" | "warn" | "error";

interface LogEntry {
    level: LogLevel;
    msg: string;
    ts: string;
    [key: string]: unknown;
}

const IS_PROD = process.env.NODE_ENV === "production";

function emit(level: LogLevel, msg: string, meta?: Record<string, unknown>) {
    const entry: LogEntry = {
        level,
        msg,
        ts: new Date().toISOString(),
        ...meta,
    };

    if (IS_PROD) {
        // Structured JSON for production log aggregators
        const line = JSON.stringify(entry);
        if (level === "error") {
            process.stderr.write(line + "\n");
        } else {
            process.stdout.write(line + "\n");
        }
    } else {
        // Pretty console output for development
        const fn = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
        const prefix = `[${level.toUpperCase()}]`;
        fn(prefix, msg, meta ?? "");
    }
}

export const log = {
    info: (msg: string, meta?: Record<string, unknown>) => emit("info", msg, meta),
    warn: (msg: string, meta?: Record<string, unknown>) => emit("warn", msg, meta),
    error: (msg: string, meta?: Record<string, unknown>) => emit("error", msg, meta),
};
