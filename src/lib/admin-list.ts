/**
 * Shared admin-list building blocks (moved out of
 * src/lib/news/admin-queries.ts — sp.analyze finding D1): both the
 * news admin list and the signup admin list page through these, so
 * neither feature imports the other's query module just to reuse a
 * pagination shape or a search-string escaper (Constitution VI — one
 * shared helper, built once).
 */

export interface Paged<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export const ADMIN_PAGE_SIZE = 20;

/** Escapes regex metacharacters so free-text search can't break or DoS the query. */
export function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
