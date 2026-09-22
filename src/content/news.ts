/**
 * Public news page copy (Constitution VI — page copy lives in content
 * files, not hardcoded inside components).
 */

export const newsPublicCopy = {
  banner: {
    title: "News",
    breadcrumbHome: "Home",
  },
  readMore: "Read More",
  emptyState: {
    title: "No news yet",
    body: "Check back soon — posts will appear here once they're published.",
  },
  allCategories: "All",
  metaDescription: "Latest news and announcements from Dar-e-Arqam Schools.",
  notFoundTitle: "Page not found",
} as const;

/** "News" (page 1) or "News — Page N" (page > 1) — FR-032. */
export function pageTitle(page: number): string {
  return page > 1 ? `News — Page ${page}` : "News";
}

/** "<Category Label>" (page 1) or "<Category Label> — Page N" — FR-038. */
export function categoryPageTitle(label: string, page: number): string {
  return page > 1 ? `${label} — News — Page ${page}` : `${label} — News`;
}
