"use client";

import { useMemo, type ReactNode } from "react";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { WalletModalProvider } from "@solana/wallet-adapter-react-ui";
import { clusterApiUrl } from "@solana/web3.js";

// Import wallet adapter CSS
import "@solana/wallet-adapter-react-ui/styles.css";

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
  const endpoint = useMemo(() => clusterApiUrl("devnet"), []);

  // Phantom registers as a Standard Wallet automatically — no manual adapter needed.
  // Adding PhantomWalletAdapter here causes a "was registered as a Standard Wallet" warning.
  const wallets = useMemo(() => [], []);

  return (
    <ConnectionProvider endpoint={endpoint}>
      <WalletProvider wallets={wallets} autoConnect>
        <WalletModalProvider>
          {children}
        </WalletModalProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
