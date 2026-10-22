import type { NextConfig } from "next";
import { legacyAboutRedirects, legacyAcademicsRedirects, pageSections } from "./src/content/site-shell";
import { TEMPORARY_IMAGE_HOSTS } from "./src/lib/temporary-image-hosts";

// Admission was a sub-route page; it is now one page whose former sub-routes are sections
// (/admission/uniform -> /admission#uniform). About (017) and Academics (018) had their
// sections remapped, so their old routes come from legacyAboutRedirects and
// legacyAcademicsRedirects below. Only these known routes redirect; any other slug is a 404.
const sectionRedirects = (["admission"] as const).flatMap((page) =>
  pageSections[page].map((section) => ({
    source: `/${page}/${section.id}`,
    destination: `/${page}#${section.id}`,
    permanent: true,
  }))
);

const nextConfig: NextConfig = {
  // Lets a second `next dev` (the Playwright one, on the test database) run
  // beside a developer's own dev server: Next allows one dev server per
  // build folder. Unset means the normal `.next`.
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  // Next 16.3 locks the build folder (.next/lock) and removes the lock when the build process exits.
  // Vercel's step after the build then fails with "ENOENT: lstat '/vercel/path0/.next/lock'".
  // Nothing else builds in the same folder here, so the lock is not needed.
  experimental: { lockDistDir: false },
  images: {
    // News cover images (003) live in Cloudinary; only their URLs are
    // stored in the database (docs/architecture.md "Media and content").
    remotePatterns: [
      new URL("https://res.cloudinary.com/**"),
      // TEMPORARY (017): stock photos until the client supplies real ones. The release check blocks a production build while any are listed.
      ...TEMPORARY_IMAGE_HOSTS.map((host) => new URL(`https://${host}/**`)),
    ],
  },
  async redirects() {
    return [
      ...sectionRedirects,
      ...legacyAboutRedirects.map((redirect) => ({ ...redirect, permanent: true })),
      ...legacyAcademicsRedirects.map((redirect) => ({ ...redirect, permanent: true })),
      // Hifz-e-Quran was a top-level page; it is now a section of Academics.
      { source: "/hifz-e-quran", destination: "/academics#hifz-e-quran", permanent: true },
      // 007: the gallery is the #photo-gallery section of /resources, not its
      // own page (documented deviation from the reference's address).
      { source: "/resources/photo-gallery", destination: "/resources#photo-gallery", permanent: true },
      { source: "/resources/scarlet-mobile-apps", destination: "/resources#mobile-apps", permanent: true },
      // News categories are a label on each post now, not pages of their own.
      ...["head-office", "events", "activities", "achievements", "announcements"].map((key) => ({
        source: `/news/${key}`,
        destination: "/news",
        permanent: true,
      })),
      // Resources entries that left the menu land on the Resources page.
      ...["prospectus", "monthly-arqam", "newsletters", "useful-links", "our-books"].map((slug) => ({
        source: `/resources/${slug}`,
        destination: "/resources",
        permanent: true,
      })),
      // The Campuses page is gone; Contact is the nearest page.
      { source: "/campuses", destination: "/contact", permanent: true },
      // 014b: the /portal/<slug> "available soon" placeholders are retired. The footer's portal links are
      // admin-managed external addresses now (Settings → Site-wide), so every old placeholder address lands on the home page.
      { source: "/portal", destination: "/", permanent: true },
      { source: "/portal/:path*", destination: "/", permanent: true },
      // 014: Settings moved into page tabs. Each old group page lands on its tab, at its panel. The
      // destination page checks access itself, so a redirect reveals nothing but this fixed mapping.
      { source: "/admin/settings/contact", destination: "/admin/settings/site-wide#contact", permanent: true },
      { source: "/admin/settings/hero", destination: "/admin/settings/home#hero", permanent: true },
      { source: "/admin/settings/video", destination: "/admin/settings/home#video", permanent: true },
      { source: "/admin/settings/stats", destination: "/admin/settings/home#stats", permanent: true },
      { source: "/admin/settings/gallery", destination: "/admin/settings/resources#photo-gallery", permanent: true },
      { source: "/admin/settings/gallery/:albumId", destination: "/admin/settings/resources/gallery/:albumId", permanent: true },
    ];
  },
};

export default nextConfig;
