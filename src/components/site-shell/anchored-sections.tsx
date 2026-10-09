import type { ReactNode } from "react";
import type { PageSection } from "@/content/site-shell";

/**
 * One section of a single page with anchored sections (about, academics,
 * admission, resources). The id is the URL fragment; the heading is the
 * section's h2. `anchor-section` keeps it clear of the fixed header.
 */
export function AnchoredSection({ section, children }: { section: PageSection; children?: ReactNode }) {
  const headingId = `${section.id}-heading`;
  return (
    <section id={section.id} aria-labelledby={headingId} className="anchor-section flex flex-col gap-4">
      <h2 id={headingId} className="font-bold font-heading text-2xl text-primary">
        {section.label}
      </h2>
      {children ?? (
        <p className="font-body text-body text-text-muted">
          This section hasn&apos;t been built yet — its content is coming in a later feature.
        </p>
      )}
    </section>
  );
}

/** A page of placeholder sections: one h1, then one h2 section per entry. */
export function AnchoredPage({ title, sections }: { title: string; sections: readonly PageSection[] }) {
  return (
    <div className="mx-auto flex max-w-(--container-max-width) flex-col gap-section-gap-lg px-(--container-gutter-x) py-section-gap-lg">
      <h1 className="font-heading text-h3 text-text">{title}</h1>
      {sections.map((section) => (
        <AnchoredSection key={section.id} section={section} />
      ))}
    </div>
  );
}
