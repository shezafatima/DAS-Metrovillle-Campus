/**
 * Public Photo Gallery copy (007). Page copy lives in content files, not in
 * components (Constitution VI/IX).
 */

export const galleryContent = {
  resourcesBanner: {
    title: "Resources",
    trail: ["Resources"],
    breadcrumbHome: "Home",
  },
  // Matches the reference Photo Gallery page frame
  // (screenshots/das.edu.pk_resources_photo-gallery_*.png).
  albumBanner: {
    title: "Photo Gallery",
    trail: ["Resources", "Photo Gallery"],
    breadcrumbHome: "Home",
  },
  sectionHeading: "Photo Gallery",
  photoCount: (n: number) => (n === 1 ? "1 photo" : `${n} photos`),
  backToGallery: "Back to Photo Gallery",
  viewer: {
    previous: "Previous photo",
    next: "Next photo",
    close: "Close",
    position: (n: number, total: number) => `${n} of ${total}`,
  },
  photoAlt: (title: string, n: number) => `${title} — photo ${n}`,
  openPhoto: (alt: string) => `Open ${alt}`,
} as const;

/**
 * PLACEHOLDER CONTENT: the reference banner photograph (a camera) for the
 * album page. Null until the client supplies it; PageBanner then falls back
 * to its solid background. When supplied, save it as
 * public/images/banners/photo-gallery.jpg and set this to that path.
 */
export const photoGalleryBanner: string | null = null;

const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });

/** "2026-03-12" → "12 March 2026". */
export function formatAlbumDate(iso: string): string {
  return DATE_FORMAT.format(new Date(`${iso}T00:00:00Z`));
}
