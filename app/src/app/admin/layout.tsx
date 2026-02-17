import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  description: "InstinctFi admin panel — settle polls, manage platform operations.",
  robots: { index: false, follow: false },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
