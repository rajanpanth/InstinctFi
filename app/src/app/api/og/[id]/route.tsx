import { ImageResponse } from "next/og";
import { NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";

/**
 * Dynamic OG image for a specific poll.
 * Fetches poll data from Supabase and renders a branded 1200×630 card.
 * Usage: /api/og/[id]  — no query params needed.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

    let title = "Prediction Poll";
    let options = ["Yes", "No"];
    let votes: number[] = [];
    let pool = "0 SOL";
    let category = "General";
    let status = "active";

    if (supabaseUrl && supabaseKey) {
        try {
            const supabase = createClient(supabaseUrl, supabaseKey);
            const { data } = await supabase
                .from("polls")
                .select("title, options, vote_counts, total_pool_cents, category, status")
                .eq("id", id)
                .single();

            if (data) {
                title = data.title || title;
                options = data.options || options;
                votes = (data.vote_counts || []).map(Number);
                const lamports = Number(data.total_pool_cents || 0);
                pool = `${(lamports / 1_000_000_000).toFixed(2)} SOL`;
                category = data.category || category;
                status = data.status === 1 ? "settled" : data.status === 2 ? "cancelled" : "active";
            }
        } catch (e) {
            console.error("OG image: failed to fetch poll", id, e);
        }
    }

    const totalVotes = votes.reduce((a, b) => a + b, 0);
    const percentages = options.map((_, i) => {
        const v = votes[i] || 0;
        return totalVotes > 0 ? Math.round((v / totalVotes) * 100) : Math.round(100 / options.length);
    });

    const barColors = ["#5c7cfa", "#f03e3e", "#ae3ec9", "#fd7e14", "#40c057", "#e64980"];
    const statusColors: Record<string, { bg: string; text: string; label: string }> = {
        active: { bg: "#fcc419", text: "#000", label: "LIVE" },
        ended: { bg: "#f03e3e", text: "#fff", label: "ENDED" },
        settled: { bg: "#40c057", text: "#fff", label: "SETTLED" },
        cancelled: { bg: "#868e96", text: "#fff", label: "CANCELLED" },
    };
    const st = statusColors[status] || statusColors.active;

    return new ImageResponse(
        (
            <div
                style={{
                    display: "flex",
                    flexDirection: "column",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #0d0e24 0%, #1a1b2e 50%, #13142b 100%)",
                    padding: "60px",
                    fontFamily: "Inter, sans-serif",
                }}
            >
                {/* Header */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "30px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div
                            style={{
                                width: "48px",
                                height: "48px",
                                borderRadius: "12px",
                                background: "linear-gradient(135deg, #5c7cfa, #fcc419)",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "center",
                                fontSize: "24px",
                                fontWeight: 800,
                                color: "#fff",
                            }}
                        >
                            IF
                        </div>
                        <span style={{ fontSize: "28px", fontWeight: 800, color: "#fff" }}>InstinctFi</span>
                    </div>
                    <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                        <div
                            style={{
                                padding: "6px 16px",
                                borderRadius: "8px",
                                background: "rgba(92, 124, 250, 0.2)",
                                color: "#748ffc",
                                fontSize: "16px",
                                fontWeight: 600,
                            }}
                        >
                            {category}
                        </div>
                        <div
                            style={{
                                padding: "6px 16px",
                                borderRadius: "8px",
                                background: st.bg,
                                color: st.text,
                                fontSize: "16px",
                                fontWeight: 700,
                            }}
                        >
                            {st.label}
                        </div>
                    </div>
                </div>

                {/* Title */}
                <div
                    style={{
                        fontSize: "48px",
                        fontWeight: 800,
                        color: "#fff",
                        lineHeight: 1.2,
                        marginBottom: "40px",
                        maxHeight: "120px",
                        overflow: "hidden",
                    }}
                >
                    {title}
                </div>

                {/* Options with bars */}
                <div style={{ display: "flex", flexDirection: "column", gap: "16px", flex: 1 }}>
                    {options.slice(0, 4).map((opt, i) => (
                        <div key={i} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                <span style={{ fontSize: "22px", fontWeight: 600, color: "#e0e0e0" }}>
                                    {opt}
                                </span>
                                <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
                                    <span style={{ fontSize: "20px", fontWeight: 700, color: barColors[i % barColors.length] }}>
                                        {percentages[i]}%
                                    </span>
                                    <span style={{ fontSize: "16px", color: "#666" }}>
                                        {votes[i] || 0} votes
                                    </span>
                                </div>
                            </div>
                            <div
                                style={{
                                    width: "100%",
                                    height: "12px",
                                    borderRadius: "6px",
                                    background: "rgba(255,255,255,0.08)",
                                    overflow: "hidden",
                                    display: "flex",
                                }}
                            >
                                <div
                                    style={{
                                        width: `${Math.max(percentages[i], 2)}%`,
                                        height: "100%",
                                        borderRadius: "6px",
                                        background: barColors[i % barColors.length],
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginTop: "30px",
                        paddingTop: "20px",
                        borderTop: "1px solid rgba(255,255,255,0.1)",
                    }}
                >
                    <div style={{ display: "flex", gap: "30px" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "14px", color: "#666" }}>Total Pool</span>
                            <span style={{ fontSize: "22px", fontWeight: 700, color: "#fcc419" }}>{pool}</span>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                            <span style={{ fontSize: "14px", color: "#666" }}>Total Votes</span>
                            <span style={{ fontSize: "22px", fontWeight: 700, color: "#fff" }}>{totalVotes}</span>
                        </div>
                    </div>
                    <span style={{ fontSize: "16px", color: "#666" }}>Predict. Vote. Win.</span>
                </div>
            </div>
        ),
        {
            width: 1200,
            height: 630,
        }
    );
}
