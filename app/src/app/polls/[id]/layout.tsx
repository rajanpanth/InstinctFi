import type { Metadata } from "next";
import { supabase, isSupabaseConfigured } from "@/lib/supabase";
import { formatSOL } from "@/lib/program";

type Props = {
  params: Promise<{ id: string }>;
  children: React.ReactNode;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXT_PUBLIC_BASE_URL || "https://instinctfi.com";

  const defaults: Metadata = {
    title: "Poll | InstinctFi",
    description: "View and vote on this prediction poll on InstinctFi — decentralized prediction polls on Solana.",
    openGraph: {
      title: "Poll | InstinctFi",
      description: "Decentralized prediction polls on Solana.",
      type: "website",
      url: `${baseUrl}/polls/${id}`,
      images: [{
        url: `${baseUrl}/api/og?title=${encodeURIComponent("Prediction Poll")}&category=General&status=active`,
        width: 1200,
        height: 630,
        alt: "InstinctFi Prediction Poll",
      }],
    },
    twitter: {
      card: "summary_large_image",
      title: "Poll | InstinctFi",
      description: "Decentralized prediction polls on Solana.",
    },
  };

  if (!isSupabaseConfigured) return defaults;

  try {
    const { data } = await supabase
      .from("polls")
      .select("title, description, image_url, category, options, vote_counts, total_pool_cents, status")
      .eq("id", id)
      .single();

    if (!data) return defaults;

    const totalVotes = (data.vote_counts || []).reduce((a: number, b: number) => a + b, 0);
    const poolSize = formatSOL(data.total_pool_cents || 0);
    const statusLabel = data.status === 1 ? "settled" : "active";

    const description =
      data.description ||
      `${data.options?.length || 0} options · ${totalVotes} votes · ${poolSize} pool · ${data.category || "General"}`;

    // Build dynamic OG image: prefer poll image, fall back to auto-generated /api/og/[id]
    const ogImageUrl = data.image_url
      ? data.image_url
      : `${baseUrl}/api/og/${id}`;

    return {
      title: `${data.title} | InstinctFi`,
      description,
      keywords: [
        data.title,
        data.category || "General",
        ...(data.options || []),
        "prediction market",
        "Solana",
        "InstinctFi",
      ],
      alternates: {
        canonical: `${baseUrl}/polls/${id}`,
      },
      openGraph: {
        title: data.title,
        description,
        type: "website",
        url: `${baseUrl}/polls/${id}`,
        siteName: "InstinctFi",
        images: [{
          url: ogImageUrl,
          width: 1200,
          height: 630,
          alt: data.title,
        }],
      },
      twitter: {
        card: "summary_large_image",
        title: data.title,
        description,
        images: [ogImageUrl],
      },
    };
  } catch {
    return defaults;
  }
}

export default function PollLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
