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
  children,
}: {
  id: string;
  background: AboutBackground;
  heading: string;
  line?: string;
  children: ReactNode;
}) {
  const navy = background === "navy";
  return (
    <section
      id={id}
      aria-labelledby={`${id}-heading`}
      data-background={background}
      className={cn("anchor-section py-(--spacing-home-section-y)", backgroundClass[background])}
    >
      <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-10 px-(--container-gutter-x)">
        <SectionHeading
          id={`${id}-heading`}
          heading={heading}
          line={line}
          tone={navy ? "light" : "dark"}
          divider={!navy}
        />
        {children}
      </div>
    </section>
  );
}
