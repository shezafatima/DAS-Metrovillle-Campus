import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
const baseURL = `http://localhost:${PORT}`;

export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  // Chromium's own binary can't be downloaded in this sandbox (no network
  // access to the Playwright CDN); drive the system-installed Google Chrome
  // via the "chrome" channel instead, same workaround used by the
  // research/extract-tokens.ts script.
  projects: [
    {
      name: "chromium",
      testIgnore: [
        /(admin-.*|contact-(public|details|protection|visual))\.spec\.ts/,
        // 012 careers public specs run in the serial `forms` project. Anchored on the
        // file name so admin-careers-*.spec.ts is not caught here or in `forms`.
        /(^|[\\/])careers-[^\\/]*\.spec\.ts$/,
      ],
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      // Admin specs share one persisted MongoDB `throttle` collection
      // (login lockout / rate-limit state) and one seeded admin account,
      // so they cannot safely run in parallel with each other — a
      // concurrent spec's failed logins would trip another spec's
      // lockout assertions (specs/002-foundation/tasks.md Phase 2 note;
      // sp.analyze finding I1).
      name: "admin",
      testMatch: /admin-.*\.spec\.ts/,
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
    {
      // Every Playwright worker shares one source IP (127.0.0.1), so
      // parallel public-form specs would trip each other's 5-per-10-min
      // rate limit (src/lib/rate-limit.ts PUBLIC_FORM_POLICY) — the
      // careers-protection.spec.ts rate-limit case deliberately submits
      // past that threshold and needs the real limit intact, not loosened
      // for CI (same rationale as "admin" above). Contact (008) and
      // careers (012) specs isolate their own rate-limit budget with a
      // per-spec X-Forwarded-For header, so they can share this serial
      // project without colliding.
      name: "forms",
      testMatch: [
        /contact-(public|details|protection|visual)\.spec\.ts/,
        /(^|[\\/])careers-[^\\/]*\.spec\.ts$/,
      ],
      fullyParallel: false,
      workers: 1,
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
  webServer: {
    command: `npm run dev -- --port ${PORT}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      MONGODB_DB_NAME: "dar_e_arqam_test",
      // e2e specs stub the Cloudinary upload itself (page.route), so the
      // server can't verify a real resource afterward — skip it here
      // only; verifyNewsCover ignores this flag outside test/dev anyway.
      NEWS_COVER_VERIFY: "skip",
      // 005/006/007: specs seed Settings, News and the gallery directly, so
      // the public readers must skip their 60 s caches (and the gallery's
      // once-per-process migration flag). Ignored in production
      // (src/lib/e2e-fresh-reads.ts).
      E2E_FRESH_READS: "1",
      // Shortens NotificationsProvider's poll interval (009) so
      // admin-notifications-live.spec.ts doesn't wait a real 60s;
      // harmless everywhere else — nothing else depends on the exact
      // interval length (research §3; plan.md's testability seam).
      NEXT_PUBLIC_NOTIFICATIONS_POLL_MS: "3000",
      // 012 careers: CVs go to a local directory outside public/ instead of
      // Vercel Blob (getEnv() refuses this driver in production). Specs
      // write and inspect the same directory (e2e/helpers/careers.ts).
      DOCUMENT_STORE_DRIVER: "local",
      DOCUMENT_STORE_LOCAL_DIR: ".data/e2e-documents",
    },
  },
});
