/**
 * A plain page heading for pages that have no banner (Careers, Student Registration).
 * The top padding keeps it clear of the sticky header.
 */
export function PageTitle({ id, children }: { id?: string; children: React.ReactNode }) {
  return (
    <h1 id={id} className="pt-(--spacing-page-title-top) pb-4 font-bold font-heading text-h2 text-primary">
      {children}
    </h1>
  );
}
