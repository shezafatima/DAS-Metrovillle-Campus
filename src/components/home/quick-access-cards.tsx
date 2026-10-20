"use client";

import Image from "next/image";
import Link from "next/link";
import { FlipCoverflow } from "@/components/ui/flip-coverflow";
import { homeContent, type QuickAccessTone } from "@/content/home";
import { cn } from "cn";
import { SectionHeading } from "./section-heading";

// Front title colour and back colour per card (design-tokens "Flip cards").
const TONES: Record<QuickAccessTone, { title: string; back: string }> = {
  admission: { title: "text-(--color-home-flip-admission)", back: "bg-(--color-home-flip-admission-back)/90" },
  salient: { title: "text-(--color-home-flip-salient)", back: "bg-(--color-home-flip-salient-back)/90" },
  branch: { title: "text-(--color-home-flip-branch)", back: "bg-(--color-home-flip-branch-back)/90" },
  curriculum: { title: "text-(--color-home-flip-curriculum)", back: "bg-(--color-home-flip-curriculum-back)/90" },
};

/**
 * The four quick-access cards (006 FR-008): the shared flip-card coverflow
 * (src/components/ui/flip-coverflow.tsx) with the home fronts and backs. Each
 * back holds a separate "Read More" link to the card's page.
 */
export function QuickAccessCards() {
  const { cards, readMore, label, flip, heading } = homeContent.quickAccess;
  return (
    <FlipCoverflow
      label={label}
      className="w-full overflow-x-clip bg-black/10 py-(--spacing-home-band-y)"
      stageClassName="[--qa-h:22.5rem] [--qa-w:18rem] lg:[--qa-h:21.5rem] lg:[--qa-w:21rem]"
      header={
        <div className="mx-auto max-w-(--container-max-width) px-(--container-gutter-x) pb-8">
          <SectionHeading id="quick-access-heading" heading={heading} stroke />
        </div>
      }
      items={cards.map((card, i) => {
        const tone = TONES[card.tone];
        return {
          id: card.id,
          flipLabel: flip(card.title),
          positionLabel: homeContent.carousel.position(i + 1, cards.length),
          frontClassName:
            "flex flex-col items-center justify-center gap-3 rounded-(--radius-home-flip) bg-surface/70 p-(--spacing-home-flip-padding) text-center",
          front: (
            <>
              <Image src={card.icon.src} alt={card.icon.alt} width={card.icon.width} height={card.icon.height} unoptimized />
              <h3 className={cn("font-bold font-heading text-(length:--text-home-flip-title) leading-(--text-home-flip-title--line-height)", tone.title)}>{card.title}</h3>
              <p className="font-body text-(--color-text-muted) text-body">{card.text}</p>
            </>
          ),
          backClassName: cn("flex flex-col items-center justify-center gap-3 rounded-(--radius-home-flip) p-(--spacing-home-flip-padding) text-center", tone.back),
          back: ({ centre }: { centre: boolean }) => (
            <>
              <p aria-hidden="true" className="font-bold font-heading text-(--color-home-flip-back-text) text-h3 uppercase leading-(--text-h3--line-height)">{card.title}</p>
              <p aria-hidden="true" className="font-body text-body text-white">{card.text}</p>
              <Link
                href={card.href}
                data-testid="quick-access-link"
                aria-label={`${readMore}: ${card.title}`}
                tabIndex={centre ? 0 : -1}
                className="bg-cta px-(--spacing-home-read-more-x) py-(--spacing-home-read-more-y) font-button text-(length:--text-button) font-semibold text-white outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                {readMore}
              </Link>
            </>
          ),
        };
      })}
    />
  );
}
