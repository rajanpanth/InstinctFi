"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Web Vitals tracker — reports Core Web Vitals to the console in dev,
 * and can be extended to send to an analytics endpoint in production.
 */
export default function WebVitals() {
    const pathname = usePathname();

    useEffect(() => {
        if (typeof window === "undefined") return;

        // Dynamic import to avoid bundling web-vitals for users who don't need it
        import("web-vitals")
            .then(({ onCLS, onLCP, onFCP, onTTFB, onINP }) => {
                const report = (metric: { name: string; value: number; id: string }) => {
                    if (process.env.NODE_ENV === "development") {
                        console.log(
                            `[WebVital] ${metric.name}: ${metric.value.toFixed(2)} (${metric.id})`
                        );
                    }

                    // Send to analytics in production
                    if (process.env.NODE_ENV === "production") {
                        // Extend: send to your analytics endpoint
                        // fetch("/api/analytics/vitals", {
                        //   method: "POST",
                        //   body: JSON.stringify({ ...metric, path: pathname }),
                        // });
                    }
                };

                onCLS(report);
                onLCP(report);
                onFCP(report);
                onTTFB(report);
                onINP(report);
            })
            .catch(() => {
                // web-vitals not installed — that's fine
            });
    }, [pathname]);

    return null;
}
