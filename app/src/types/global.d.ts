/**
 * Type declarations for Solana wallet adapters available in `window`.
 * Eliminates `as any` casts when accessing `window.solana` or `window.phantom`.
 */

interface SolanaWallet {
    isPhantom?: boolean;
    isConnected?: boolean;
    publicKey?: { toBase58(): string; toString(): string };
    connect(opts?: { onlyIfTrusted?: boolean }): Promise<{ publicKey: { toBase58(): string } }>;
    disconnect(): Promise<void>;
    signMessage?(message: Uint8Array, encoding?: string): Promise<{ signature: Uint8Array }>;
    signTransaction?(transaction: unknown): Promise<unknown>;
    signAllTransactions?(transactions: unknown[]): Promise<unknown[]>;
    on?(event: string, cb: (...args: unknown[]) => void): void;
    off?(event: string, cb: (...args: unknown[]) => void): void;
}

interface Window {
    solana?: SolanaWallet;
    phantom?: {
        solana?: SolanaWallet;
    };
    webkitAudioContext?: typeof AudioContext;
}
