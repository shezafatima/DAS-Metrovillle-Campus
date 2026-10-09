import Image from "next/image";
import Link from "next/link";
import { homeContent } from "@/content/home";

/**
 * Careers call-to-action (006 US4, FR-018, FR-019): the 004 signup band's
 * headings, wording and styling, with a "Join Now" button to /careers in
 * place of the form (PRD §5.1). It keeps the `#signup` anchor so links to the
 * old signup band still land here. Wording is static content, not editable.
 * The client's career banner picture fills the section behind the text; the
 * navy band colour stays underneath it while the picture loads.
 */
export function CareersCta() {
  const { heading, supporting, button, background } = homeContent.careersCta;
  return (
    <section id="signup" aria-labelledby="careers-cta-heading" className="anchor-section relative overflow-hidden bg-signup-band py-(--spacing-home-section-y)" data-testid="careers-cta">
      <Image src={background.src} alt={background.alt} fill sizes="100vw" className="object-cover" />
      <div className="relative mx-auto flex max-w-(--container-max-width) flex-col items-center gap-4 px-(--container-gutter-x) text-center">
        <h2 id="careers-cta-heading" data-placeholder={heading.placeholder || undefined} className="font-bold font-heading text-h3 text-white">
          {heading.before}
          <span className="text-signup-highlight">{heading.highlight}</span>
          {heading.after}
        </h2>
        <p
          data-placeholder={supporting.placeholder || undefined}
          className="font-bold font-heading text-(length:--text-signup-supporting) text-signup-supporting leading-(--text-signup-supporting--line-height)"
        >
          {supporting.text}
        </p>
        <Link
          href={button.href}
          className="rounded-(--radius-home-careers-button) bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white transition-colors duration-(--motion-fast) hover:bg-(--color-home-careers-button-hover) hover:text-(--color-home-dark-text)"
        >
          {button.label}
        </Link>
      </div>
    </section>
  );
}
