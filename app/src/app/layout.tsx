import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/Providers";
import { Navbar } from "@/components/Navbar";
import { Toaster } from "react-hot-toast";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "InstinctFi — Decentralized Prediction Polls",
  description:
    "Vote on prediction polls with play money. Winners take the losing pool. Powered by Solana.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Navbar />
          <main className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {children}
          </main>
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
      </body>
    </html>
  );
}
