# Quickstart: Settings by Page (014, slice 1)

## Release order (FR-022a)

**Step 1 runs against the production database, before the deploy.** It is safe then: no live code reads the Pages permission yet, so nobody's access changes until the new build is live.

1. **Dry run.** With the production connection string set in your shell for this command only:
   ```bash
   npm run grant:pages -- --dry-run
   ```
   It prints the database host and name it is connected to, then one line per account it would change (email, current permissions, "+ pages"), then `Would grant Pages to N accounts`. It writes nothing and logs nothing.
   - Stop if the host or name is not production, or if the list isn't what you expect.
2. **Grant.** Same shell, same connection string:
   ```bash
   npm run grant:pages
   ```
   It prints the same host and name and the same account list, then `Pages granted to N accounts`. Each changed account gets one entry in the Users change record ("system:014-grant-pages").
   - A re-run prints `Pages granted to 0 accounts` and changes nothing.
3. **Deploy** the slice.
4. **Check** with the steps below; also open Users → Change record and confirm one entry per granted account.

If the deploy has to be rolled back, the grant can stay: the old build ignores the Pages permission.

## Local check

Prerequisites as for 005 (`.env.local` with the database and Cloudinary keys; `npm run seed:admin` once). Do not run `npm run build` and Playwright at the same time.

```bash
npm run dev
```

1. Sign in as the main admin and open `/admin/settings` → lands on **Site-wide**. The tab bar reads Site-wide, Home, Admission, Resources.
2. **Home**: panels Hero slides, Why Choose video, Progress dashboard, in that order. "View on site" on each lands on `/#hero`, `/#why-choose`, `/#progress-dashboard`.
3. **Admission**: edit the announcement (Admission messages) and the closing date (Admission window). Save messages only → the window panel keeps its edit and its "Unsaved changes" badge. Save the window → succeeds (no conflict).
4. Click **Home** with an unsaved panel → one warning. Choose Stay → edits kept.
5. Open `/admin/settings/hero` → redirected to `/admin/settings/home#hero`, Hero slides in view. Open an old album URL `/admin/settings/gallery/<id>` → the album under Resources.
6. In Users, make a content manager with **Page content** only. Sign in as them:
   - Tab bar: Home, Admission, Resources. `/admin/settings` → Home.
   - `/admin/settings/site-wide` → `/admin?denied=1`.
   - Admission: window and classes read-only with the "needs Settings" line; messages editable.
7. Give them **Settings** only instead: tab bar Site-wide, Admission. On Admission, messages read-only; window and classes editable. `/admin/settings/home` → denied.
8. Narrow the window to 320 px: the tab bar is one row that scrolls; the page does not scroll sideways.

## Tests

```bash
npx vitest run src/lib/settings src/lib/permissions.test.ts src/lib/users src/test/access-inventory.test.ts "src/app/admin/(dashboard)/settings"
npx playwright test e2e/admin-settings-tabs.spec.ts e2e/admin-settings-tab-access.spec.ts e2e/admin-settings-redirects.spec.ts e2e/admin-settings-panels.spec.ts
npx playwright test e2e/admin-settings-saving.spec.ts e2e/admin-settings-access.spec.ts e2e/admin-gallery-*.spec.ts e2e/admin-roles-access-matrix.spec.ts e2e/admin-home-page.spec.ts
```

Known: roughly 35 admin E2E tests already fail on unchanged code (see project memory); compare failure sets before and after, not totals. Pre-start the dev server; it is slow to compile admin routes.
