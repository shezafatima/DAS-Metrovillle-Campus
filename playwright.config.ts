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
      testIgnore: /admin-.*\.spec\.ts/,
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
    },
  },
});
