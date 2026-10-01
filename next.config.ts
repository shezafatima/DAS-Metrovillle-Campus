import type { NextConfig } from "next";

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
      // 007: the gallery is the #photo-gallery section of /resources, not its
      // own page (documented deviation from the reference's address).
      { source: "/resources/photo-gallery", destination: "/resources#photo-gallery", permanent: true },
    ];
  },
};

export default nextConfig;
