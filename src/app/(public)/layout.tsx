import { PublicShell } from "@/components/site-shell/public-shell";

// Settings (005) feed the header and footer. Static public pages are rebuilt at
// most once a minute, so a change saved in the admin reaches them within a
// minute even if the settings read was unavailable when a page was built
// (FR-030, FR-032). A save also revalidates the cache tags at once. News pages
// stay force-dynamic. Not affected: `next dev` renders on request anyway.
export const revalidate = 60;

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return <PublicShell>{children}</PublicShell>;
}
