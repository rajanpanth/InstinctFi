"use client";

import React, { Component, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null; retryCount: number; lastErrorTime: number };

class ErrorBoundaryInner extends Component<Props & { pathname: string }, State> {
  constructor(props: Props & { pathname: string }) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0, lastErrorTime: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error, lastErrorTime: Date.now() };
  }

  componentDidUpdate(prevProps: Props & { pathname: string }) {
    // Reset error state when the route changes
    if (prevProps.pathname !== this.props.pathname && this.state.hasError) {
      this.setState({ hasError: false, error: null, retryCount: 0, lastErrorTime: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // #30: Structured error reporting — integrate with Sentry or similar
    // Replace console.error with your error reporting service:
    // e.g. Sentry.captureException(error, { extra: { componentStack: errorInfo.componentStack } });
    console.error("ErrorBoundary caught:", error, errorInfo);
    if (typeof window !== "undefined" && (window as any).__ERROR_REPORTER__) {
      try {
        (window as any).__ERROR_REPORTER__.captureException(error, {
          componentStack: errorInfo.componentStack,
          pathname: this.props.pathname,
        });
      } catch { /* reporter failed — don't crash the error boundary */ }
    }
  }

  // #56: Debounced retry — if re-error within 1s, auto-cap retries
  handleRetry = () => {
    const now = Date.now();
    const tooFast = this.state.lastErrorTime > 0 && (now - this.state.lastErrorTime) < 1000;
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: tooFast ? 3 : prev.retryCount + 1, // cap at max if looping
      lastErrorTime: 0,
    }));
  };

  render() {
    if (this.state.hasError) {
      const maxRetries = this.state.retryCount >= 3;

      return (
        this.props.fallback || (
          <div className="text-center py-20 px-4">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-neutral-300">
              Something went wrong
            </h2>
            {/* #29: Show generic message instead of internal error details */}
            <p className="text-neutral-400 mb-6 text-sm max-w-md mx-auto">
              An unexpected error occurred. Please try again or reload the page.
            </p>
            <div className="flex items-center justify-center gap-3">
              {!maxRetries ? (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-brand-500 hover:bg-brand-600 rounded-xl font-semibold transition-colors"
                >
                  Try Again {this.state.retryCount > 0 && `(${this.state.retryCount}/3)`}
                </button>
              ) : (
                <button
                  onClick={() => window.location.reload()}
                  className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-xl font-semibold transition-colors"
                >
                  Reload Page
                </button>
              )}
              {this.state.retryCount > 0 && !maxRetries && (
                <button
                  onClick={() => window.location.reload()}
                  className="px-4 py-3 border border-neutral-600 text-neutral-400 hover:text-white rounded-xl text-sm transition-colors"
                >
                  Reload
                </button>
              )}
            </div>
            {maxRetries && (
              <p className="text-xs text-neutral-500 mt-4">
                This error persists. Try reloading the page or clearing your browser cache.
              </p>
            )}
          </div>
        )
      );
    }
    return this.props.children;
  }
}

/**
 * ErrorBoundary wrapper that resets on route changes.
 * Uses `usePathname()` to detect navigation and clear the error state.
 */
export function ErrorBoundary({ children, fallback }: Props) {
  const pathname = usePathname();
  return (
    <ErrorBoundaryInner pathname={pathname} fallback={fallback}>
      {children}
    </ErrorBoundaryInner>
  );
}
