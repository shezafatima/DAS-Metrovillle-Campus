import Image from "next/image";
import { Shirt } from "lucide-react";
import { AboutSection } from "@/components/about/about-section";
import { FlipCoverflow } from "@/components/ui/flip-coverflow";
import type { UniformGroup } from "@/lib/admission/schema";

/** Category as a small label above Boys/Girls; the dash is for screen readers only, so the heading reads "Kids Uniform – Boys". */
function CardHeading({ group, id, tone }: { group: UniformGroup; id?: string; tone: "front" | "back" }) {
  const Tag = id ? "h3" : "p";
  return (
    <Tag id={id} aria-hidden={id ? undefined : true} className="flex flex-col items-center gap-1 text-center">
      <span className={tone === "front" ? "font-body font-semibold text-sm text-text-muted" : "font-body font-semibold text-sm text-white/80"}>
        {group.category}
      </span>
      <span className="sr-only"> – </span>
      <span className={tone === "front" ? "font-bold font-heading text-h3 text-primary" : "font-bold font-heading text-h3 text-white"}>{group.gender}</span>
    </Tag>
  );
}

/**
 * Uniform (020 US4): one flip card per group on the shared coverflow. Front:
 * the photo, or a uniform icon where there is none, and the heading. Back: the
 * items as a list, named by the front heading. No links: the card's flip
 * control stays a button (spec FR-025–FR-028, deviation V7).
 */
export function UniformSection({
  heading,
  groups,
  label,
  flipLabels,
  positionLabels,
}: {
  heading: string;
  groups: UniformGroup[];
  label: string;
  /** Per group, in order: the flip button's name ("Kids Uniform – Boys: show the uniform list"). */
  flipLabels: string[];
  /** Per group, in order: "1 of 6" … */
  positionLabels: string[];
}) {
  return (
    <AboutSection id="uniform" background="muted" heading={heading}>
      <FlipCoverflow
        as="div"
        label={label}
        testIdPrefix="uniform"
        className="w-full overflow-x-clip py-4"
        stageClassName="[--qa-h:var(--spacing-uniform-card-h)] [--qa-w:var(--spacing-uniform-card-w)] lg:[--qa-h:var(--spacing-uniform-card-h-lg)] lg:[--qa-w:var(--spacing-uniform-card-w-lg)]"
        items={groups.map((group, i) => {
          const titleId = `uniform-${group.id}-title`;
          return {
            id: group.id,
            flipLabel: flipLabels[i],
            positionLabel: positionLabels[i],
            frontClassName: "flex flex-col items-stretch gap-3 rounded-(--radius-home-flip) bg-surface p-(--spacing-home-flip-padding)",
            front: (
              <>
                {/* A light grey panel behind every photo: the photos are cut out on transparency, and white clothes (e.g. the Hifz shalwar qamiz) would vanish on the white card. */}
                <div className="relative min-h-0 flex-1 rounded-(--radius-home-flip) bg-(--color-home-flip-front)" data-testid="uniform-photo">
                  {group.image ? (
                    <Image src={group.image.src} alt={group.image.alt} fill sizes="(min-width: 1024px) 21rem, 18rem" className="object-contain p-2" />
                  ) : (
                    <div className="flex h-full items-center justify-center">
                      <Shirt aria-hidden="true" className="size-24 text-primary" strokeWidth={1.25} />
                    </div>
                  )}
                </div>
                <CardHeading group={group} id={titleId} tone="front" />
              </>
            ),
            backClassName: "flex flex-col items-center justify-center gap-4 overflow-y-auto rounded-(--radius-home-flip) bg-primary p-(--spacing-home-flip-padding)",
            back: (
              <>
                <CardHeading group={group} tone="back" />
                <ul aria-labelledby={titleId} data-testid="uniform-items" className="flex list-disc flex-col gap-2 ps-6 font-body text-body text-white">
                  {group.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </>
            ),
          };
        })}
      />
    </AboutSection>
  );
}
