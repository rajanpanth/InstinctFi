import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Browse Polls",
  description:
    "Explore active prediction polls across crypto, sports, politics and more. Vote with play money and win from the losing pool.",
  openGraph: {
    title: "Browse Polls | InstinctFi",
    description:
      "Explore active prediction polls. Vote with play money and win from the losing pool.",
  },
};

export default function PollsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
