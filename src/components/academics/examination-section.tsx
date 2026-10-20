import { AboutSection } from "@/components/about/about-section";
import type { AboutBackground } from "@/lib/about/view";
import type { ExaminationCopy } from "@/content/academics/dynamic-sections";
import type { PublicExaminationBlock } from "@/lib/settings/public";

/**
 * Examination (014b, spec FR-022): each block as a card (heading and paragraphs)
 * in a grid, one column on phones and two from tablet width. The reference page
 * stacks the same blocks full width; the cards are a deviation the owner approved
 * (spec, "Deviations from the reference"). All text is plain: React escapes it.
 *
 * Rendered only while there is at least one block (the page filters it through
 * `visibleSections`).
 */
export function ExaminationSection({
  heading,
  blocks,
  copy,
  background,
}: {
  heading: string;
  blocks: PublicExaminationBlock[];
  copy: ExaminationCopy;
  background: AboutBackground;
}) {
  return (
    <AboutSection id="examination" background={background} heading={heading}>
      <ul aria-label={copy.listLabel} className="grid gap-6 md:grid-cols-2" data-testid="examination-grid">
        {blocks.map((block) => (
          <li key={block.id} className="min-w-0">
            <article className="flex h-full flex-col gap-3 rounded-xl border border-neutral-100 bg-surface p-6" data-testid="examination-card">
              <h3 className="break-words font-bold font-heading text-h3 text-primary">{block.heading}</h3>
              {block.paragraphs.map((paragraph, index) => (
                <p key={index} className="font-body text-body text-text">
                  {paragraph}
                </p>
              ))}
            </article>
          </li>
        ))}
      </ul>
    </AboutSection>
  );
}
