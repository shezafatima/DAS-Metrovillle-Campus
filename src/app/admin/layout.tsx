import type { Metadata } from "next";

// Every admin page is excluded from search engines and not linked from
// the public site (FR-026, spec edge case). No visual chrome here — the
// login page and the dashboard shell each render their own.
export const metadata: Metadata = {
  title: {
    template: "%s — Admin",
    default: "Admin",
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
