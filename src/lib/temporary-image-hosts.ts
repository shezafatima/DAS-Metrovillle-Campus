/**
 * Stock-photo hosts allowed in next.config.ts `images.remotePatterns` only
 * while the client has not supplied real photos (017: Our Story). The release
 * check (scripts/check-release-content.ts) blocks a production build while
 * this list is not empty. To clear it: put the real photo in Cloudinary, set
 * it in src/content/about/our-story.ts, and empty this list.
 */
export const TEMPORARY_IMAGE_HOSTS: string[] = [];
