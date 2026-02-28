import type { Metadata } from "next";
import { createClient } from "@supabase/supabase-js";
import PollDetailClient from "./PollDetailClient";

// ── Server-side metadata for SEO / OG tags ──────────────────────────────────
// Fetches poll data at request time so shared links show rich previews
// (title, description, image) in social media, search engines, and embeds.

type Props = {
  params: Promise<{ id: string }>;
};

async function fetchPollData(id: string) {
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) return null;

    const supabase = createClient(url, key);
    const { data } = await supabase
      .from("polls")
      .select("title, description, category, image_url, options, vote_counts, total_pool_cents, total_voters, status")
      .eq("id", id)
      .single();

    return data;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const poll = await fetchPollData(id);
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://instinctfi.com";

  if (!poll) {
    return {
      title: "Poll Not Found",
      description: "This poll doesn't exist or has been removed.",
    };
  }

  const totalVotes = (poll.vote_counts || []).reduce((a: number, b: number) => a + b, 0);
  const description = poll.description
    ? `${poll.description} • ${totalVotes} votes • ${poll.total_voters || 0} voters`
    : `${(poll.options || []).join(" vs ")} • ${totalVotes} votes • ${poll.total_voters || 0} voters`;

  return {
    title: poll.title,
    description,
    openGraph: {
      title: poll.title,
      description,
      type: "article",
      url: `${baseUrl}/polls/${id}`,
      images: poll.image_url
        ? [{ url: poll.image_url, width: 1200, height: 630, alt: poll.title }]
        : [`${baseUrl}/api/og`],
    },
    twitter: {
      card: "summary_large_image",
      title: poll.title,
      description,
      images: poll.image_url ? [poll.image_url] : [`${baseUrl}/api/og`],
    },
    alternates: {
      canonical: `${baseUrl}/polls/${id}`,
    },
  };
}

// ── Page Component (renders the client-side interactive page) ────────────────
export default function PollDetailPage() {
  return <PollDetailClient />;
}
