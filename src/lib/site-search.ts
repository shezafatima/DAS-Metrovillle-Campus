import { navigationItems, type NavigationItem } from "@/content/site-shell";

export interface SearchResult {
  label: string;
  href: string;
  /** The top-level item's label, shown as a breadcrumb for a sub-page result. */
  parentLabel?: string;
}

function flatten(items: NavigationItem[], parentLabel?: string): SearchResult[] {
  return items.flatMap((item) => [
    { label: item.label, href: item.href, parentLabel },
    ...(item.children ? flatten(item.children, item.label) : []),
  ]);
}

// Real content-driven search: every navigable page in navigationItems
// (top-level items and their dropdown sub-pages, Careers included). Not a
// full-text search over page content — most pages are still shell
// placeholders (spec.md Out of Scope), so there is no real content to index
// yet beyond page titles/labels themselves.
export const searchIndex: SearchResult[] = flatten(navigationItems);

export function searchSite(
  query: string,
  index: SearchResult[] = searchIndex
): SearchResult[] {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];
  return index.filter((result) => result.label.toLowerCase().includes(trimmed));
}
