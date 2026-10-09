import type { NextConfig } from "next";
import { pageSections } from "./src/content/site-shell";

// About, Academics and Admission were sub-route pages; each is now one page whose
// former sub-routes are sections (/about/overview -> /about#overview). Only these
// known routes redirect; any other slug is a 404.
const sectionRedirects = (["about", "academics", "admission"] as const).flatMap((page) =>
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
  images: {
    // News cover images (003) live in Cloudinary; only their URLs are
    // stored in the database (docs/architecture.md "Media and content").
    remotePatterns: [new URL("https://res.cloudinary.com/**")],
  },
  async redirects() {
    return [
      ...sectionRedirects,
      // Hifz-e-Quran was a top-level page; it is now a section of Academics.
      { source: "/hifz-e-quran", destination: "/academics#hifz-e-quran", permanent: true },
      // 007: the gallery is the #photo-gallery section of /resources, not its
      // own page (documented deviation from the reference's address).
      { source: "/resources/photo-gallery", destination: "/resources#photo-gallery", permanent: true },
      { source: "/resources/scarlet-mobile-apps", destination: "/resources#mobile-apps", permanent: true },
      // Resources entries that left the menu land on the Resources page.
      ...["prospectus", "monthly-arqam", "newsletters", "useful-links", "our-books"].map((slug) => ({
        source: `/resources/${slug}`,
        destination: "/resources",
        permanent: true,
      })),
      // The Campuses page is gone; Contact is the nearest page.
      { source: "/campuses", destination: "/contact", permanent: true },
    ];
  },
};

export default nextConfig;
