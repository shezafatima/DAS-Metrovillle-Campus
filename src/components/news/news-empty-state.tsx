import { newsPublicCopy } from "@/content/news";

/** Shown when nothing qualifies for the current list/category page (FR-020). */
export function NewsEmptyState() {
  return (
    <div className="flex flex-col items-center gap-2 py-section-gap-lg text-center">
      <h2 className="font-heading text-h3 text-text">{newsPublicCopy.emptyState.title}</h2>
      <p className="font-body text-body text-text-muted">{newsPublicCopy.emptyState.body}</p>
    </div>
  );
}
