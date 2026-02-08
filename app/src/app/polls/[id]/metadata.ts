import type { Metadata } from "next";

type Props = {
  params: Promise<{ id: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Poll ${id} — InstinctFi`,
    description: "Vote on this prediction poll on InstinctFi. Buy option-coins, pick a side, and win the losing pool!",
    openGraph: {
      title: `Poll on InstinctFi`,
      description: "Vote on this prediction poll. Buy option-coins, pick a side, and win the losing pool!",
      type: "website",
      siteName: "InstinctFi",
      url: `https://instinctfi.com/polls/${id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: `Poll on InstinctFi`,
      description: "Vote on this prediction poll. Buy option-coins, pick a side, and win!",
    },
  };
}
