import Link from "next/link";
import { homeContent } from "@/content/home";

/** The yellow "Find Us Nearby" band (006 FR-007; design-tokens row 0): text beside the red button at ≥1024px, stacked below. */
export function FindUsNearby() {
  const { text, cta } = homeContent.findUsNearby;
  return (
    <section aria-label={cta.label} className="bg-(--color-home-find-us-band) py-(--spacing-home-find-us-y)">
      <div className="mx-auto flex max-w-(--container-max-width) flex-col items-center gap-4 px-(--container-gutter-x) text-center lg:flex-row lg:justify-between lg:text-left">
        <p className="font-bold font-heading text-(--color-home-dark-text) text-h3 leading-(--text-h3--line-height)">{text}</p>
        <Link
          href={cta.href}
          className="shrink-0 rounded-(--radius-home-find-us-button) bg-cta px-(--spacing-home-find-us-button-x) py-(--spacing-home-find-us-button-y) font-button text-(length:--text-button-lg) font-semibold text-white uppercase leading-(--text-button-lg--line-height) transition-colors duration-(--motion-fast) hover:bg-cta-hover"
        >
          {cta.label}
        </Link>
      </div>
    </section>
  );
}
