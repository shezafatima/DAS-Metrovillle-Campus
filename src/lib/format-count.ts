/**
 * Shared by every admin notification indicator (009) — bell total,
 * sidebar badges, Overview highlights — so the "99+" rule lives in
 * exactly one place (research.md §7).
 */
export function formatCount(n: number): string {
  return n > 99 ? "99+" : String(n);
}
