import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import WalletAdapterProvider from "@/components/WalletAdapterProvider";
import { UserProfileProvider } from "@/lib/userProfiles";
import { NotificationProvider } from "@/lib/notifications";
import { BookmarkProvider } from "@/lib/bookmarks";
import { ReferralGate } from "@/lib/referrals";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: {
    default: "InstinctFi — Decentralized Prediction Polls",
    template: "%s | InstinctFi",
  },
  description:
    "Vote on prediction polls with play money. Winners take the losing pool. Powered by Solana.",
  keywords: ["prediction market", "Solana", "voting", "DeFi", "polls", "crypto", "InstinctFi"],
  authors: [{ name: "InstinctFi" }],
  creator: "InstinctFi",
  metadataBase: new URL(process.env.NEXT_PUBLIC_BASE_URL || "https://instinctfi.com"),
  openGraph: {
    type: "website",
    siteName: "InstinctFi",
    title: "InstinctFi — Decentralized Prediction Polls",
    description: "Vote on prediction polls with play money. Winners take the losing pool. Powered by Solana.",
    images: ["/api/og"],
  },
  twitter: {
    card: "summary_large_image",
    title: "InstinctFi — Decentralized Prediction Polls",
    description: "Vote on prediction polls with play money. Winners take the losing pool.",
    images: ["/api/og"],
  },
  robots: {
    index: true,
    follow: true,
  },
  icons: {
    icon: "/logo.svg",
    apple: "/icon-192.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#6366f1" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "InstinctFi",
              description: "Decentralized prediction polls on Solana. Predict, vote, and win.",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            }),
          }}
        />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              if ('serviceWorker' in navigator) {
                window.addEventListener('load', () => {
                  navigator.serviceWorker.register('/sw.js').catch(() => {});
                });
              }
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        <WalletAdapterProvider>
        <UserProfileProvider>
        <NotificationProvider>
        <BookmarkProvider>
        <ReferralGate>
        <Providers>
          <Suspense fallback={null}>
            <Navbar />
          </Suspense>
          <ErrorBoundary>
            <main className="max-w-[1400px] mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 pb-20 md:pb-8">
              <PageTransition>
                {children}
              </PageTransition>
            </main>
          </ErrorBoundary>
          <Toaster
            position="bottom-right"
            toastOptions={{
              style: {
                background: "#1a1b2e",
                color: "#fff",
                border: "1px solid #2d2e4a",
              },
            }}
          />
        </Providers>
        </ReferralGate>
        </BookmarkProvider>
        </NotificationProvider>
        </UserProfileProvider>
        </WalletAdapterProvider>
      </body>
    </html>
  );
}
