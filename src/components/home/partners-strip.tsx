import { homeContent } from "@/content/home";
import { RollingStrip } from "./rolling-strip";
import { SectionHeading } from "./section-heading";

/**
 * Partners (006 US7, FR-024, FR-025): a heading, then the partners' logos on the grey band as a slow, continuous ticker that runs
 * the opposite way to the Books strip (the same `RollingStrip` component). It does not pause when the pointer is over
 * it (some logos may be links, and must stay clickable), but does pause for keyboard focus and a hidden tab. Each
 * logo is as wide as its own shape (up to a cap), at a fixed height. With fewer than three logos the row is still and
 * centred; with none the section is not drawn. Reduced motion gives a plain swipeable row.
 */
export function PartnersStrip() {
  const { heading, items } = homeContent.partners;
  if (items.length === 0) return null;
  return (
    <section aria-labelledby="partners-heading" className="bg-(--color-home-partners-band) py-(--spacing-home-partners-y)" data-testid="partners">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-12 px-(--container-gutter-x)">
        <SectionHeading id="partners-heading" heading={heading} stroke />
        <RollingStrip
          label={heading}
          kind="logo"
          direction="reverse"
          pauseOnHover={false}
          fadeColor="var(--color-home-partners-band)"
          items={items.map((partner) => ({
            id: partner.id,
            src: partner.logo.src,
            alt: partner.logo.alt,
            name: partner.name,
            href: partner.href,
            aspect: partner.logo.width / partner.logo.height,
          }))}
        />
      </div>
    </section>
  );
}
