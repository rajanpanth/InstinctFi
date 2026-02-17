import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create Poll",
  description:
    "Create a new prediction poll on InstinctFi. Set options, investment, and let the community vote.",
  openGraph: {
    title: "Create a Prediction Poll | InstinctFi",
    description:
      "Create a new prediction poll. Set options, investment, and let the community vote.",
  },
};

export default function CreateLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
