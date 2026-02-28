"use client";

import React, { Component, type ReactNode } from "react";

interface Props {
    children: ReactNode;
}

interface State {
    hasError: boolean;
    error: Error | null;
}

/**
 * Internal class-based error boundary (React requires class components for
 * error boundaries). Wrapped by the exported function component below for
 * compatibility with React Fast Refresh in Next.js dev mode.
 */
class WalletErrorBoundaryClass extends Component<Props, State> {
    constructor(props: Props) {
        super(props);
        this.state = { hasError: false, error: null };
    }

    static getDerivedStateFromError(error: Error): State {
        return { hasError: true, error };
    }

    componentDidCatch(error: Error, info: React.ErrorInfo) {
        console.error("[WalletErrorBoundary] Caught error:", error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, error: null });
    };

    render() {
        if (this.state.hasError) {
            return (
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        minHeight: "100vh",
                        padding: "2rem",
                        background: "#0a0a0a",
                        color: "#e5e5e5",
                        fontFamily: "system-ui, sans-serif",
                        textAlign: "center",
                    }}
                >
                    <div
                        style={{
                            maxWidth: "28rem",
                            padding: "2rem",
                            borderRadius: "1rem",
                            background: "#161616",
                            border: "1px solid #222",
                        }}
                    >
                        <div style={{ fontSize: "3rem", marginBottom: "1rem" }}>⚠️</div>
                        <h2 style={{ fontSize: "1.25rem", fontWeight: 600, marginBottom: "0.5rem" }}>
                            Wallet Connection Error
                        </h2>
                        <p style={{ color: "#999", fontSize: "0.875rem", marginBottom: "1.5rem", lineHeight: 1.5 }}>
                            Something went wrong with the wallet adapter. This can happen if a browser
                            extension was updated or is incompatible.
                        </p>
                        <div style={{ display: "flex", gap: "0.75rem", justifyContent: "center" }}>
                            <button
                                onClick={this.handleRetry}
                                style={{
                                    padding: "0.625rem 1.5rem",
                                    borderRadius: "0.75rem",
                                    background: "#7c3aed",
                                    color: "white",
                                    border: "none",
                                    fontWeight: 600,
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                }}
                            >
                                Try Again
                            </button>
                            <button
                                onClick={() => window.location.reload()}
                                style={{
                                    padding: "0.625rem 1.5rem",
                                    borderRadius: "0.75rem",
                                    background: "#222",
                                    color: "#ccc",
                                    border: "1px solid #333",
                                    fontWeight: 500,
                                    cursor: "pointer",
                                    fontSize: "0.875rem",
                                }}
                            >
                                Reload Page
                            </button>
                        </div>
                        {this.state.error && (
                            <details style={{ marginTop: "1rem", textAlign: "left" }}>
                                <summary style={{ color: "#666", fontSize: "0.75rem", cursor: "pointer" }}>
                                    Error details
                                </summary>
                                <pre
                                    style={{
                                        marginTop: "0.5rem",
                                        padding: "0.75rem",
                                        background: "#0a0a0a",
                                        borderRadius: "0.5rem",
                                        fontSize: "0.6875rem",
                                        color: "#ef4444",
                                        overflow: "auto",
                                        maxHeight: "8rem",
                                        whiteSpace: "pre-wrap",
                                        wordBreak: "break-all",
                                    }}
                                >
                                    {this.state.error.message}
                                </pre>
                            </details>
                        )}
                    </div>
                </div>
            );
        }

        return this.props.children;
    }
}

/**
 * Functional wrapper around the class-based error boundary.
 * React Fast Refresh in Next.js 15 dev mode doesn't handle class
 * components properly when they're directly exported from "use client"
 * modules. Wrapping in a function component fixes this.
 */
export function WalletErrorBoundary({ children }: { children: ReactNode }) {
    return <WalletErrorBoundaryClass>{children}</WalletErrorBoundaryClass>;
}
