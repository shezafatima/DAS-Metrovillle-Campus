import type { Metadata } from "next";
import { GallerySection } from "@/components/gallery/gallery-section";
import { MobileAppsSection } from "@/components/resources/mobile-apps";
import { PageBanner } from "@/components/site-shell/page-banner";
import { galleryContent } from "@/content/gallery";
import { mobileApps, mobileAppsCopy } from "@/content/resources";
import { pageSections } from "@/content/site-shell";

export const metadata: Metadata = {
  title: galleryContent.resourcesBanner.title,
  description: mobileApps.body.split(". ")[0] + ".",
  alternates: { canonical: "/resources" },
};
export const revalidate = 60;

/**
 * Resources (019): two anchored sections composed from `pageSections.resources`
 * (the menu and search read the same list): Photo Gallery (`#photo-gallery`,
 * 007, hidden when it has no photos) and Mobile Apps (`#mobile-apps`). Their
 * backgrounds are fixed per section, not by position. The old Resources
 * sub-routes redirect here (next.config.ts).
 */
export default function ResourcesPage() {
  const banner = galleryContent.resourcesBanner;
  return (
    <>
      <PageBanner title={banner.title} trail={[...banner.trail]} breadcrumbHome={banner.breadcrumbHome} />
      {pageSections.resources.map((section) => {
        switch (section.id) {
          case "photo-gallery":
            return <GallerySection key={section.id} />;
          case "mobile-apps":
            return <MobileAppsSection key={section.id} value={mobileApps} copy={mobileAppsCopy} />;
          default:
            return null;
        }
      })}
    </>
  );
}
