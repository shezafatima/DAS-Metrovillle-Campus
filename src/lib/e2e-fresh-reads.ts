/**
 * Test-only switch, never honoured in production. With `E2E_FRESH_READS=1`
 * (set by playwright.config.ts for its dev server) the public readers that
 * normally cache for 60 s — Settings (005), the gallery (007) and Latest News
 * (006) — read the database on every request, because the Playwright specs
 * seed the database directly instead of saving through the admin (which
 * revalidates the caches itself).
 */
export function freshReadsForTests(): boolean {
  return process.env.NODE_ENV !== "production" && process.env.E2E_FRESH_READS === "1";
}
