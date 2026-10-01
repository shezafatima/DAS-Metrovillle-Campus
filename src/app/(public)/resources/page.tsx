import type { Metadata } from "next";
import { GallerySection } from "@/components/gallery/gallery-section";
import { PageBanner } from "@/components/site-shell/page-banner";
import { galleryContent } from "@/content/gallery";

export const metadata: Metadata = { title: galleryContent.resourcesBanner.title };
export const revalidate = 60;

/**
 * Resources (minimal until feature 016). This feature (007) delivers only the
 * Photo Gallery section, `#photo-gallery`. Feature 016 EXTENDS this page by
 * adding the Downloads (`#downloads`) and Our Books (`#our-books`) sections
 * around the gallery section; it does not replace the page or the section.
 */
export default function ResourcesPage() {
  const banner = galleryContent.resourcesBanner;
  return (
    <>
      <PageBanner title={banner.title} trail={[...banner.trail]} breadcrumbHome={banner.breadcrumbHome} />
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-section-gap-lg px-(--container-gutter-x) py-section-gap-lg">
        <GallerySection />
      </div>
    </>
  );
}
