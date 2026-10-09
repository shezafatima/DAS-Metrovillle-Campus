import type { Metadata } from "next";
import Link from "next/link";
import { AnchoredSection } from "@/components/site-shell/anchored-sections";
import { GallerySection } from "@/components/gallery/gallery-section";
import { PageBanner } from "@/components/site-shell/page-banner";
import { galleryContent } from "@/content/gallery";
import { pageSections, portalLinks } from "@/content/site-shell";

export const metadata: Metadata = { title: galleryContent.resourcesBanner.title };
export const revalidate = 60;

/**
 * Resources (minimal until feature 016): the Photo Gallery section
 * (`#photo-gallery`, 007) and a Mobile Apps placeholder (`#mobile-apps`).
 * Feature 016 EXTENDS this page by adding the Downloads (`#downloads`) and
 * Our Books (`#our-books`) sections; it does not replace the page or the
 * gallery section. The old Resources sub-routes redirect here (next.config.ts).
 */
export default function ResourcesPage() {
  const banner = galleryContent.resourcesBanner;
  const lms = portalLinks.find((link) => link.href === "/portal/lms-app")!;
  return (
    <>
      <PageBanner title={banner.title} trail={[...banner.trail]} breadcrumbHome={banner.breadcrumbHome} />
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-section-gap-lg px-(--container-gutter-x) py-section-gap-lg">
        <GallerySection />
        <AnchoredSection section={pageSections.resources[1]}>
          <p className="font-body text-body text-text-muted">Our mobile apps are coming soon.</p>
          <Link href={lms.href} className="w-fit font-body text-body font-bold text-primary underline underline-offset-4">
            {lms.label}
          </Link>
        </AnchoredSection>
      </div>
    </>
  );
}
