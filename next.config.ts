import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // News cover images (003) live in Cloudinary; only their URLs are
    // stored in the database (docs/architecture.md "Media and content").
    remotePatterns: [new URL("https://res.cloudinary.com/**")],
  },
};

export default nextConfig;
