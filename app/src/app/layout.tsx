import type { Metadata } from "next";
import { Suspense } from "react";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import PageTransition from "@/components/PageTransition";
import LoadingScreen from "@/components/LoadingScreen";
import WalletAdapterProvider from "@/components/WalletAdapterProvider";
import { UserProfileProvider } from "@/lib/userProfiles";
import { NotificationProvider } from "@/lib/notifications";
import { BookmarkProvider } from "@/lib/bookmarks";
import { ReferralGate } from "@/lib/referrals";
import { LanguageProvider } from "@/lib/languageContext";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"], variable: "--font-body" });
const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700"],
});

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
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#0a0a0a" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover" />
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
        <LanguageProvider>
          <WalletAdapterProvider>
            <UserProfileProvider>
              <NotificationProvider>
                <BookmarkProvider>
                  <ReferralGate>
                    <Providers>
                      <LoadingScreen />
                      <Suspense fallback={null}>
                        <Navbar />
                      </Suspense>
                      <div className="navbar-spacer" aria-hidden="true" />
                      <ErrorBoundary>
                        <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6 pb-28 md:pb-8 mobile-content-pad md:!pb-8">
                          <PageTransition>
                            {children}
                          </PageTransition>
                        </main>
                      </ErrorBoundary>
                      <Toaster
                        position="bottom-right"
                        toastOptions={{
                          style: {
                            background: "#161616",
                            color: "#e5e5e5",
                            border: "1px solid #222",
                            fontSize: "14px",
                          },
                        }}
                      />
                    </Providers>
                  </ReferralGate>
                </BookmarkProvider>
              </NotificationProvider>
            </UserProfileProvider>
          </WalletAdapterProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
