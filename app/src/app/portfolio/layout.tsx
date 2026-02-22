import type { Metadata } from "next";

export const metadata: Metadata = {
    title: "Portfolio | InstinctFi",
    description: "Track your active positions, P&L, voting history, and claimable rewards on InstinctFi.",
};

export default function PortfolioLayout({ children }: { children: React.ReactNode }) {
    return <>{children}</>;
}
