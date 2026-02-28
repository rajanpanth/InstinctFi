"use client";

import { useMemo, useCallback, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { type WalletError } from "@solana/wallet-adapter-base";
import { RPC_URL } from "@/lib/program.base";

// Wallet adapter CSS is imported in globals.css to avoid
// client-side module evaluation crashes in Next.js dev mode.

/**
 * Multi-wallet adapter layer.
 * Wraps the app with Solana wallet adapter providers so users can
 * connect Phantom, Solflare, Backpack, etc. through a standard modal.
 *
 * The existing Providers.tsx still manages its own wallet state (window.solana),
 * but this layer makes the adapter's `useWallet()` hook available for future
 * migration. It also enables the <WalletMultiButton /> component.
 */
export default function WalletAdapterProvider({ children }: { children: ReactNode }) {
  const endpoint = useMemo(() => RPC_URL, []);

  // #60: Empty wallets array is intentional — NOT a bug.
  // All major wallets (Phantom, Solflare, Backpack, etc.) register through
  // the Wallet Standard protocol and are auto-discovered by @solana/wallet-adapter.
  // Manually adding adapters (e.g. PhantomWalletAdapter) causes duplicate
  // "was registered as a Standard Wallet" console warnings.
  // Non-standard/legacy wallets (Glow, Slope) are deprecated and no longer maintained.
  const wallets = useMemo(() => [], []);

  // Handle wallet errors gracefully.
  // WalletNotSelectedError is a known race condition:
  //   autoConnect fires because localStorage remembers a wallet name from a
  //   previous session, but the Standard Wallet adapter hasn't registered yet.
  //   We clear the stale localStorage entry so it doesn't retry on next render.
  const onError = useCallback((error: WalletError) => {
    if (error.name === "WalletNotSelectedError") {
      try { localStorage.removeItem("walletName"); } catch { }
      return; // Don't surface this to the user
    }
    console.error("[WalletAdapter]", error);
  }, []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect onError={onError}>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
