import type { Metadata } from "next";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;

  const defaults: Metadata = {
    title: "Poll | InstinctFi",
    description: "View and vote on this prediction poll on InstinctFi.",
    openGraph: {
      title: "Poll | InstinctFi",
      description: "Decentralized prediction polls on Solana.",
      type: "website",
    },
    twitter: {
      card: "summary",
      title: "Poll | InstinctFi",
      description: "Decentralized prediction polls on Solana.",
    },
  };

  if (!isSupabaseConfigured) return defaults;

  try {
    const { data } = await supabase
      .from("polls")
      .select("title, description, image_url, category, options, vote_counts, total_pool_cents")
      .eq("id", id)
      .single();

    if (!data) return defaults;

    const totalVotes = (data.vote_counts || []).reduce((a: number, b: number) => a + b, 0);
    const description =
      data.description ||
      `${data.options?.length || 0} options · ${totalVotes} votes · ${data.category || "General"}`;

    return {
      title: `${data.title} | InstinctFi`,
      description,
      openGraph: {
        title: data.title,
        description,
        type: "website",
        ...(data.image_url ? { images: [{ url: data.image_url, width: 1200, height: 630 }] } : {}),
      },
      twitter: {
        card: data.image_url ? "summary_large_image" : "summary",
        title: data.title,
        description,
        ...(data.image_url ? { images: [data.image_url] } : {}),
      },
    };
  } catch {
    return defaults;
  }
}

export default function PollLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
