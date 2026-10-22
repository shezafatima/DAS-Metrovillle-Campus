import type { Metadata } from "next";
import { GallerySection } from "@/components/gallery/gallery-section";
import { SchoolAppSection } from "@/components/resources/school-app-section";
import { PageBanner } from "@/components/site-shell/page-banner";
import { galleryContent } from "@/content/gallery";

export const metadata: Metadata = {
  title: galleryContent.resourcesBanner.title,
  alternates: { canonical: "/resources" },
};
export const revalidate = 60;

/**
 * Resources: the Photo Gallery section (`#photo-gallery`, 007), hidden when no
 * album has photos, then the School App section (`#mobile-apps`, 023). The old Resources sub-routes redirect here (next.config.ts).
 */
export default function ResourcesPage() {
  const banner = galleryContent.resourcesBanner;
  return (
    <>
      <PageBanner title={banner.title} trail={[...banner.trail]} breadcrumbHome={banner.breadcrumbHome} />
      <GallerySection />
      <SchoolAppSection />
    </>
  );
}
