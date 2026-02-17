import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Leaderboard",
  description:
    "See the top predictors on InstinctFi. Weekly, monthly, and all-time rankings by winnings.",
  openGraph: {
    title: "Leaderboard | InstinctFi",
    description: "See the top predictors. Weekly, monthly, and all-time rankings.",
  },
};

export default function LeaderboardLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
