import Link from "next/link";
import { homeContent } from "@/content/home";
import { SalientRing } from "./salient-ring";

/**
 * "Salient Features of Dar-e-Arqam Schools" (006 FR-012): two columns. The heading, a paragraph and a
 * "Read more" button on one side (left-aligned, and first in the markup, so it comes first when the columns
 * stack below 1024px); the four features in a turning circle on the other (a small one on phones), to the left of the text from 1024px.
 * The space above the section is tighter from 768px up; on phones it is the usual section spacing.
 */
export function SalientFeatures() {
  const { heading, paragraph, readMore, items, logo } = homeContent.salientFeatures;
  return (
    <section aria-labelledby="salient-heading" className="overflow-x-clip bg-(--color-home-salient-band) pt-(--spacing-home-salient-top) pb-(--spacing-home-band-y) md:pt-[calc(var(--spacing-home-salient-top)/4)]">
      <div className="mx-auto grid max-w-(--container-max-width) items-center gap-10 px-(--container-gutter-x) lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col items-start gap-5 text-left lg:col-start-2 lg:row-start-1">
          <h2
            id="salient-heading"
            className="font-bold font-heading text-(--color-home-heading) text-(length:--text-home-heading-sm) leading-(--text-home-heading--line-height) md:text-(length:--text-home-heading-md) lg:text-(length:--text-home-heading)"
          >
            {heading}
          </h2>
          <p className="max-w-[60ch] font-body text-sm text-text md:text-body">{paragraph}</p>
          <Link
            href={readMore.href}
            className="bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white uppercase outline-none transition-colors duration-(--motion-fast) hover:bg-cta-hover focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {readMore.label}
          </Link>
        </div>
        <SalientRing labelledBy="salient-heading" items={items} logo={logo} className="lg:col-start-1 lg:row-start-1" />
      </div>
    </section>
  );
}
