"use client";

import React, { Component, ReactNode } from "react";
import { usePathname } from "next/navigation";

type Props = { children: ReactNode; fallback?: ReactNode };
type State = { hasError: boolean; error: Error | null };

class ErrorBoundaryInner extends Component<Props & { pathname: string }, State> {
  constructor(props: Props & { pathname: string }) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidUpdate(prevProps: Props & { pathname: string }) {
    // Reset error state when the route changes
    if (prevProps.pathname !== this.props.pathname && this.state.hasError) {
      this.setState({ hasError: false, error: null });
    }
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error("ErrorBoundary caught:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
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
            <button
              onClick={() => this.setState({ hasError: false, error: null })}
              className="px-6 py-3 bg-primary-600 hover:bg-primary-700 rounded-xl font-semibold transition-colors"
            >
              Try Again
            </button>
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
