"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import { useWallet } from "@solana/wallet-adapter-react";
import { useWalletModal } from "@solana/wallet-adapter-react-ui";
import {
    getWalletBalance,
    PROGRAM_DEPLOYED,
} from "@/lib/program";
import { createPlaceholderUser } from "@/lib/dataConverters";
import { type UserAccount } from "@/lib/types";
import { setAuthToken, clearAuthToken, isAuthTokenValid } from "@/lib/supabase";
import { setReauthenticateCallback, clearReauthenticateCallback } from "@/lib/apiClient";
import toast from "react-hot-toast";

/**
 * Manages wallet connection, disconnection, auto-reconnect, and signature verification.
 * Uses @solana/wallet-adapter-react instead of raw window.solana for multi-wallet support.
 */
export function useWalletManager(
    users: UserAccount[],
    setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>,
) {
    const {
        publicKey,
        connected,
        connect,
        disconnect,
        signMessage,
        signTransaction,
        wallet,
        select,
        connecting,
    } = useWallet();
    const { setVisible } = useWalletModal();

    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    // Track whether we've already attempted auth for the current public key
    const authAttempted = useRef<string | null>(null);

    // ── Wallet signature verification + JWT acquisition ──
    const verifyWalletOwnership = useCallback(async (pubkey: PublicKey): Promise<boolean> => {
        try {
            if (!signMessage) {
                // Wallet doesn't support signMessage — skip verification
                // This can happen with hardware wallets
                console.warn("Wallet does not support signMessage — skipping verification");
                return true;
            }

            const nonce = crypto.getRandomValues(new Uint8Array(32));
            const timestamp = Date.now();
            const message = `Sign in to InstinctFi\nWallet: ${pubkey.toString()}\nNonce: ${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}\nTimestamp: ${timestamp}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signatureBytes = await signMessage(encodedMessage);

            // ── Request a server-signed JWT ──
            try {
                const signatureBase64 = Buffer.from(signatureBytes).toString("base64");
                const res = await fetch("/api/auth/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        walletAddress: pubkey.toString(),
                        signature: signatureBase64,
                        message,
                    }),
                });
                const data = await res.json();
                if (data.success && data.token) {
                    setAuthToken(data.token);
                    return true;
                } else {
                    console.warn("Failed to get auth token:", data.error);
                    toast.error("Authentication failed: " + (data.error || "Unknown error"));
                    return false;
                }
            } catch (e) {
                console.warn("Auth token request failed:", e);
                toast.error("Auth token request failed or server error.");
                return false;
            }
        } catch (e: any) {
            if (e?.code === 4001 || e?.message?.includes('rejected')) {
                toast.error('Signature rejected — please sign to verify wallet ownership');
                return false;
            }
            console.error('Wallet verification error:', e);
            return false;
        }
    }, [signMessage]);

    // ── Helper: add placeholder user and optionally fetch balance ──
    // Uses functional setState to check existing users without depending on
    // the users array (which changes on every state update) (#12).
    const ensureUserAndBalance = useCallback((
        addr: string,
        pubkey: PublicKey,
        skipBalanceFetch: boolean = false,
    ) => {
        let isNewUser = false;
        setUsers(prev => {
            if (prev.find(u => u.wallet === addr)) return prev;
            isNewUser = true;
            return [...prev, createPlaceholderUser(addr)];
        });

        if (!skipBalanceFetch && (PROGRAM_DEPLOYED || isNewUser)) {
            const fetchBalWithRetry = async (attempt = 1): Promise<void> => {
                try {
                    const bal = await getWalletBalance(pubkey);
                    if (bal > 0 || attempt >= 3) {
                        setUsers(prev => prev.map(u => u.wallet === addr ? { ...u, balance: bal } : u));
                    } else if (attempt < 3) {
                        setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
                    }
                } catch (e) {
                    console.error(`Failed to fetch balance (attempt ${attempt}/3):`, e);
                    if (attempt < 3) {
                        setTimeout(() => fetchBalWithRetry(attempt + 1), 2000);
                    }
                }
            };
            fetchBalWithRetry();
        }
    }, [setUsers]);

    // ── Register re-auth callback so authenticatedFetch can auto-refresh expired JWTs ──
    useEffect(() => {
        if (connected && publicKey && signMessage) {
            setReauthenticateCallback(async () => {
                try {
                    const verified = await verifyWalletOwnership(publicKey);
                    return verified;
                } catch {
                    return false;
                }
            });
        }
        return () => clearReauthenticateCallback();
    }, [connected, publicKey, signMessage, verifyWalletOwnership]);

    // ── Sync wallet adapter state to our local state ──
    useEffect(() => {
        // Guard: if the adapter says connected but publicKey is missing,
        // it's a transient state — wait for the next render cycle.
        if (connected && publicKey) {
            const addr = publicKey.toString();

            // If JWT is valid, just sync state immediately
            if (isAuthTokenValid()) {
                setWalletAddress(addr);
                setWalletConnected(true);
                ensureUserAndBalance(addr, publicKey);
                authAttempted.current = addr;
                return;
            }

            // Avoid re-attempting auth for the same key within one session
            if (authAttempted.current === addr) {
                // Auth was already attempted for this wallet.
                // If we're here and not walletConnected, it means auth failed
                // previously — don't retry automatically.
                return;
            }

            // Need to acquire a JWT
            (async () => {
                authAttempted.current = addr;
                const verified = await verifyWalletOwnership(publicKey);
                if (verified) {
                    setWalletAddress(addr);
                    setWalletConnected(true);
                    ensureUserAndBalance(addr, publicKey);
                } else {
                    // Auth failed — disconnect
                    try { await disconnect(); } catch { }
                    setWalletConnected(false);
                    setWalletAddress(null);
                }
            })();
        } else if (!connected && !connecting) {
            // Wallet disconnected (and not in the middle of connecting)
            if (walletConnected) {
                clearAuthToken();
                setWalletConnected(false);
                setWalletAddress(null);
                authAttempted.current = null;
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [connected, publicKey, connecting]);

    // ── Connect wallet (triggers the wallet adapter modal) ──
    const connectWallet = useCallback(async () => {
        // Reset any previous failed auth attempt so the sync effect will
        // re-run verification after a new wallet is selected.
        authAttempted.current = null;
        // Open the wallet adapter modal — the most reliable path.
        // The modal handles wallet selection, installation prompts, and
        // connecting. autoConnect will then fire on subsequent page loads.
        setVisible(true);
    }, [setVisible]);

    // ── Disconnect wallet ──
    const disconnectWallet = useCallback(async () => {
        try {
            await disconnect();
        } catch { }
        // Clear stored auth token
        clearAuthToken();
        // Clear the wallet adapter's stored wallet name so autoConnect
        // doesn't try to reconnect to a stale wallet on next page load.
        try { localStorage.removeItem("walletName"); } catch { }
        setWalletConnected(false);
        setWalletAddress(null);
        authAttempted.current = null;
    }, [disconnect]);

    return {
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
        signTransaction,
    };
}
