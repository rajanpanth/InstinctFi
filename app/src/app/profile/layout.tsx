import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Profile",
  description:
    "Your InstinctFi profile — balances, vote history, bookmarks, daily rewards, and referrals.",
  openGraph: {
    title: "Profile | InstinctFi",
    description: "Your prediction stats, balances, and referral dashboard.",
  },
};

export default function ProfileLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
