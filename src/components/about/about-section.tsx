import type { ReactNode } from "react";
import { cn } from "cn";
import { SectionHeading } from "@/components/home/section-heading";
import type { AboutBackground } from "@/lib/about/view";

const backgroundClass: Record<AboutBackground, string> = {
  surface: "bg-surface",
  muted: "bg-(--color-home-muted-band)",
  navy: "bg-primary",
};

/** One anchored About section: the id is the URL fragment, the h2 is its label. */
export function AboutSection({
  id,
  background,
  heading,
  line,
  stroke = false,
  compact = false,
  headingBand = false,
  boldLine = false,
  children,
}: {
  id: string;
  background: AboutBackground;
  heading: string;
  line?: string;
  /** The yellow pencil stroke under the heading (used by Academics). */
  stroke?: boolean;
  /** Tighter vertical padding and gaps (used by Academics). */
  compact?: boolean;
  /** The heading sits in a full-width yellow band, in navy (used by Hifz-e-Quran). */
  headingBand?: boolean;
  /** Sets the supporting line under the heading in bold. */
  boldLine?: boolean;
  children: ReactNode;
}) {
  const navy = background === "navy";
  const gap = compact ? "gap-6" : "gap-10";
  const container = `mx-auto flex max-w-(--container-max-width) flex-col px-(--container-gutter-x) ${gap}`;
  if (headingBand) {
    return (
      <section
        id={id}
        aria-labelledby={`${id}-heading`}
        data-background={background}
        className={cn("anchor-section pb-(--spacing-academics-section-y)", backgroundClass[background])}
      >
        <div className="bg-topbar px-(--container-gutter-x) py-6 md:py-8" data-testid="heading-band">
          <div className="mx-auto max-w-(--container-max-width)">
            <SectionHeading id={`${id}-heading`} heading={heading} line={line} tone="navy" boldLine={boldLine} />
          </div>
        </div>
        <div className={cn(container, "pt-(--spacing-academics-band-content-top)")}>{children}</div>
      </section>
    );
  }
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-background={background}
      className={cn("anchor-section", compact ? "py-(--spacing-academics-section-y)" : "py-(--spacing-home-section-y)", backgroundClass[background])}
    >
      <div className={container}>
        <SectionHeading
          id={`${id}-heading`}
          heading={heading}
          line={line}
          stroke={stroke}
          boldLine={boldLine}
          tone={navy ? "light" : "dark"}
          divider={!navy}
        />
        {children}
      </div>
    </section>
  );
}
