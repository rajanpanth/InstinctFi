"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { PublicKey } from "@solana/web3.js";
import {
    getWalletBalance,
    PROGRAM_DEPLOYED,
} from "@/lib/program";
import { createPlaceholderUser } from "@/lib/dataConverters";
import { type UserAccount } from "@/lib/types";
import { setAuthToken, clearAuthToken, isAuthTokenValid } from "@/lib/supabase";
import toast from "react-hot-toast";
import nacl from "tweetnacl";
import bs58 from "bs58";

/**
 * Manages wallet connection, disconnection, auto-reconnect, and signature verification.
 */
export function useWalletManager(
    users: UserAccount[],
    setUsers: React.Dispatch<React.SetStateAction<UserAccount[]>>,
) {
    const [walletConnected, setWalletConnected] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);

    // ── Wallet signature verification + JWT acquisition ──
    const verifyWalletOwnership = async (publicKey: any): Promise<boolean> => {
        try {
            const solana = (window as any).solana;
            if (!solana?.signMessage) return true;

            const nonce = crypto.getRandomValues(new Uint8Array(32));
            const timestamp = Date.now();
            const message = `InstinctFi auth\nWallet: ${publicKey.toString()}\nNonce: ${Array.from(nonce).map(b => b.toString(16).padStart(2, '0')).join('')}\nTimestamp: ${timestamp}`;
            const encodedMessage = new TextEncoder().encode(message);
            const signed = await solana.signMessage(encodedMessage, 'utf8');

            const verified = nacl.sign.detached.verify(
                encodedMessage,
                signed.signature,
                bs58.decode(publicKey.toString())
            );

            if (!verified) {
                toast.error('Wallet verification failed');
                return false;
            }

            // ── Request a server-signed JWT ──
            try {
                const signatureBase64 = Buffer.from(signed.signature).toString("base64");
                const res = await fetch("/api/auth/verify", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        walletAddress: publicKey.toString(),
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
    };

    // ── Helper: add placeholder user and optionally fetch balance ──
    const ensureUserAndBalance = useCallback((
        addr: string,
        publicKey: any,
        skipBalanceFetch: boolean = false,
    ) => {
        const isNewUser = !users.find(u => u.wallet === addr);
        setUsers(prev => {
            if (prev.find(u => u.wallet === addr)) return prev;
            return [...prev, createPlaceholderUser(addr)];
        });

        if (!skipBalanceFetch && (PROGRAM_DEPLOYED || isNewUser)) {
            const fetchBalWithRetry = async (attempt = 1): Promise<void> => {
                try {
                    const bal = await getWalletBalance(publicKey);
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
    }, [users, setUsers]);

    // ── Auto-reconnect Phantom ──
    useEffect(() => {
        const tryReconnect = async () => {
            try {
                const solana = (window as any).solana;
                if (solana?.isPhantom) {
                    const resp = await solana.connect({ onlyIfTrusted: true });
                    const addr = resp.publicKey.toString();

                    // If the stored JWT is missing or expired, re-authenticate
                    if (!isAuthTokenValid()) {
                        const verified = await verifyWalletOwnership(resp.publicKey);
                        if (!verified) {
                            await solana.disconnect();
                            return;
                        }
                    }

                    setWalletAddress(addr);
                    setWalletConnected(true);
                    ensureUserAndBalance(addr, resp.publicKey);
                }
            } catch { }
        };
        tryReconnect();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // ── Connect wallet ──
    const connectWallet = useCallback(async () => {
        try {
            const solana = (window as any).solana;
            if (solana?.isPhantom) {
                const resp = await solana.connect();
                const verified = await verifyWalletOwnership(resp.publicKey);
                if (!verified) {
                    await solana.disconnect();
                    return;
                }
                const addr = resp.publicKey.toString();
                setWalletAddress(addr);
                setWalletConnected(true);
                ensureUserAndBalance(addr, resp.publicKey);
            } else {
                window.open("https://phantom.app/", "_blank");
            }
        } catch {
            console.error("Wallet connection failed");
        }
    }, [ensureUserAndBalance]);

    // ── Disconnect wallet ──
    const disconnectWallet = useCallback(async () => {
        try {
            const solana = (window as any).solana;
            if (solana) await solana.disconnect();
        } catch { }
        clearAuthToken();
        setWalletConnected(false);
        setWalletAddress(null);
    }, []);

    return {
        walletConnected,
        walletAddress,
        connectWallet,
        disconnectWallet,
    };
}
