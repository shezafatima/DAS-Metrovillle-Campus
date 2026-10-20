import type { ReactNode } from "react";
import { AboutSection } from "@/components/about/about-section";
import { Paragraphs } from "@/components/about/paragraphs";
import { IconPoints } from "./icon-points";
import type { HifzEQuran } from "@/lib/academics/schema";

/**
 * Hifz-e-Quran: the heading exactly as stored (no case change, T4) in a yellow band, the intro
 * across the full width, then the sub-sections with the video on the other side
 * from `md` when there is one.
 */
export function HifzEQuranSection({ value, video }: { value: HifzEQuran; video?: ReactNode }) {
  const subsections = (
    <div className="flex max-w-prose flex-col gap-4">
      {value.subsections.map((subsection) => (
        <div key={subsection.id} className="flex flex-col gap-4">
          <h3 className="font-bold font-heading text-(--color-home-dark-text) text-lg">{subsection.heading}</h3>
          <IconPoints items={subsection.points} />
        </div>
      ))}
    </div>
  );
  return (
    <AboutSection headingBand id="hifz-e-quran" background="surface" heading={value.heading} line={value.subheading}>
      {/* The intro runs the full width, above the sub-sections and the video. */}
      <Paragraphs text={value.intro} />
      {video ? (
        <div className="grid gap-6 md:grid-cols-12 md:items-center md:gap-10">
          <div className="md:col-span-7">{subsections}</div>
          <div className="md:col-span-5" data-testid="hifz-video">
            {video}
          </div>
        </div>
      ) : (
        subsections
      )}
    </AboutSection>
  );
}
