import Image from "next/image";
import Link from "next/link";
import { homeContent, type QuickAccessTone } from "@/content/home";
import { cn } from "cn";

// Front title colour and back colour per card (design-tokens "Flip cards").
const TONES: Record<QuickAccessTone, { title: string; back: string }> = {
  admission: { title: "text-(--color-home-flip-admission)", back: "bg-(--color-home-flip-admission-back)" },
  salient: { title: "text-(--color-home-flip-salient)", back: "bg-(--color-home-flip-salient-back)" },
  branch: { title: "text-(--color-home-flip-branch)", back: "bg-(--color-home-flip-branch-back)" },
  curriculum: { title: "text-(--color-home-flip-curriculum)", back: "bg-(--color-home-flip-curriculum-back)" },
};

/**
 * The four quick-access flip cards (006 FR-008): grey front with icon, coloured
 * title and text; on hover or keyboard focus the coloured back shows the
 * title, text and "Read More". Each card is one link. The reference's fifth
 * card (Franchise Offer) is left out, so four fill the row. The back fades
 * in only when motion is allowed (motion-safe); otherwise it simply appears.
 */
export function QuickAccessCards() {
  const { cards, readMore, label } = homeContent.quickAccess;
  return (
    <section aria-label={label} className="mx-auto w-full max-w-(--container-max-width) px-(--container-gutter-x) py-(--spacing-home-band-y)">
      <ul className="grid grid-cols-1 gap-(--spacing-home-carousel-gap) sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((card) => {
          const tone = TONES[card.tone];
          return (
            <li key={card.id}>
              <Link
                href={card.href}
                className="group relative block h-(--spacing-home-flip-height-sm) overflow-hidden rounded-(--radius-home-flip) outline-none focus-visible:ring-2 focus-visible:ring-ring lg:h-(--spacing-home-flip-height)"
                data-testid="quick-access-card"
              >
                <div className="flex h-full flex-col items-center justify-center gap-3 bg-(--color-home-flip-front) p-(--spacing-home-flip-padding) text-center">
                  <Image src={card.icon.src} alt={card.icon.alt} width={card.icon.width} height={card.icon.height} unoptimized />
                  <h3 className={cn("font-bold font-heading text-(length:--text-home-flip-title) leading-(--text-home-flip-title--line-height)", tone.title)}>{card.title}</h3>
                  <p className="font-body text-(--color-text-muted) text-body">{card.text}</p>
                </div>
                <div
                  className={cn(
                    "absolute inset-0 flex flex-col items-center justify-center gap-3 p-(--spacing-home-flip-padding) text-center opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 motion-safe:transition-opacity motion-safe:duration-(--motion-medium)",
                    tone.back,
                  )}
                  aria-hidden="true"
                >
                  <p className="font-bold font-heading text-(--color-home-flip-back-text) text-h3 uppercase leading-(--text-h3--line-height)">{card.title}</p>
                  <p className="font-body text-body text-white">{card.text}</p>
                  <span className="bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white">{readMore}</span>
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
