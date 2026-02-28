import type { MetadataRoute } from "next";
import { createClient } from "@supabase/supabase-js";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "https://instinctfi.com";

    // Static pages
    const staticPages: MetadataRoute.Sitemap = [
        { url: baseUrl, lastModified: new Date(), changeFrequency: "daily", priority: 1 },
        { url: `${baseUrl}/polls`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.9 },
        { url: `${baseUrl}/leaderboard`, lastModified: new Date(), changeFrequency: "daily", priority: 0.7 },
        { url: `${baseUrl}/create`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.6 },
        { url: `${baseUrl}/activity`, lastModified: new Date(), changeFrequency: "hourly", priority: 0.5 },
        { url: `${baseUrl}/docs`, lastModified: new Date(), changeFrequency: "monthly", priority: 0.4 },
    ];

    // Dynamic poll pages
    let pollPages: MetadataRoute.Sitemap = [];
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

        if (supabaseUrl && supabaseKey) {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data } = await supabase
                .from("polls")
                .select("id, created_at")
                .order("created_at", { ascending: false })
                .limit(500);

            if (data) {
                pollPages = data.map((poll) => ({
                    url: `${baseUrl}/polls/${poll.id}`,
                    lastModified: poll.created_at ? new Date(poll.created_at) : new Date(),
                    changeFrequency: "daily" as const,
                    priority: 0.8,
                }));
            }
        }
    } catch (e) {
        console.warn("[Sitemap] Could not fetch polls:", e);
    }

    return [...staticPages, ...pollPages];
}
