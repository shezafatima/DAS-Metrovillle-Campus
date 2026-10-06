import Image from "next/image";
import Link from "next/link";
import { homeContent } from "@/content/home";
import { BAND_CAROUSEL_PER_VIEW, Carousel } from "./carousel";

/**
 * Partners (006 US7, FR-024, FR-025): the reference's partner logos on the
 * grey band, 1 at a time below 1024px, 5 from 1024px, 4 from 1200px. It
 * autoplays and pauses on hover or focus; one logo (or any set that fits)
 * stays still with no arrows; nothing moves for reduced motion.
 */
export function PartnersCarousel() {
  const { label, items } = homeContent.partners;
  if (items.length === 0) return null;
  return (
    <section aria-label={label} className="bg-(--color-home-partners-band) py-(--spacing-home-partners-y)" data-testid="partners">
      <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x)">
        <Carousel label={label} perViewClass={BAND_CAROUSEL_PER_VIEW} autoplayMs={5000}>
          {items.map((partner) => {
            const logo = (
              <Image
                src={partner.logo.src}
                alt={partner.logo.alt}
                width={partner.logo.width}
                height={partner.logo.height}
                className="mx-auto h-auto w-full max-w-(--spacing-home-partner-logo) object-contain"
              />
            );
            return partner.href ? (
              <Link key={partner.id} href={partner.href} className="block">
                {logo}
              </Link>
            ) : (
              <div key={partner.id}>{logo}</div>
            );
          })}
        </Carousel>
      </div>
    </section>
  );
}
