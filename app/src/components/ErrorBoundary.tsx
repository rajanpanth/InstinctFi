"use client";

import React, { Component, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null; retryCount: number };

class ErrorBoundaryInner extends Component<Props & { pathname: string }, State> {
  constructor(props: Props & { pathname: string }) {
    super(props);
    this.state = { hasError: false, error: null, retryCount: 0 };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props & { pathname: string }) {
    // Reset error state when the route changes
    if (prevProps.pathname !== this.props.pathname && this.state.hasError) {
      this.setState({ hasError: false, error: null, retryCount: 0 });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  handleRetry = () => {
    this.setState((prev) => ({
      hasError: false,
      error: null,
      retryCount: prev.retryCount + 1,
    }));
  };

  render() {
    if (this.state.hasError) {
      const maxRetries = this.state.retryCount >= 3;

      return (
        this.props.fallback || (
          <div className="text-center py-20 px-4">
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-xl font-semibold mb-2 text-gray-300">
              Something went wrong
            </h2>
            <p className="text-gray-400 mb-6 text-sm max-w-md mx-auto">
              {this.state.error?.message || "An unexpected error occurred."}
            </p>
            <div className="flex items-center justify-center gap-3">
              {!maxRetries ? (
                <button
                  onClick={this.handleRetry}
                  className="px-6 py-3 bg-brand-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
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
                  className="px-4 py-3 border border-gray-600 text-gray-400 hover:text-white rounded-xl text-sm transition-colors"
                >
                  Reload
                </button>
              )}
            </div>
            {maxRetries && (
              <p className="text-xs text-gray-500 mt-4">
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
