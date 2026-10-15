# Quickstart: 020-admission

How to check the feature by hand and run its tests. Run heavy commands **one at a time**: never `npm run build` and Playwright together.

## 1. See the page

```bash
npm run dev
# open http://localhost:3000/admission
```

Expect: one h1 "Admission"; Admission Procedure (sections 1–4, lists and the fee table) then Uniform (five flip cards; no Hifz girls' card). No banner and no Apply button (no dates saved yet → closed).

Menu: Admission dropdown and mobile menu list exactly "Admission Procedure", "Uniform".

Redirects:

```bash
curl -sI http://localhost:3000/admission/class-levels      | grep -i location   # → /admission
curl -sI http://localhost:3000/admission/uniform           | grep -i location   # → /admission#uniform
curl -sI http://localhost:3000/admission/admission-procedure | grep -i location # → /admission#admission-procedure
```

## 2. Open admissions as an admin

1. Sign in as a user with the Settings permission → **Settings → Admission**.
2. Status reads "Closed".
3. Set Opens on = yesterday, Closes on = a month from now, Announcement = "Admissions are now open for Playgroup, Nursery, Class 1 and Class 2". Save.
4. Status reads "Open now until {date}". `/admission` shows the banner with the announcement and "Applications close on {date}". Still **no** Apply Now (registration form constant is off).
5. Set Closes on earlier than Opens on → save refused, message under Closes on.
6. Set Opens on = next month → status "Opens on {date}"; public page shows the Closed message (if set) or nothing.

Server log shows a `settings_saved` line with your email and `group: "admission"` for each successful save.

## 3. Midnight switch (dev/test only)

With the Playwright dev server (`E2E_FRESH_READS=1`), the `e2e-now` cookie overrides "now" for the window only:

```js
// browser console on http://localhost:<playwright port>/admission
document.cookie = "e2e-now=2027-03-31T18:59:59Z; path=/"; location.reload(); // 23:59:59 PKT → open (Closes on 2027-03-31)
document.cookie = "e2e-now=2027-03-31T19:00:00Z; path=/"; location.reload(); // 00:00:00 PKT → closed
```

The cookie is ignored in production builds.

## 4. Tests

```bash
npx vitest run src/lib/admission src/lib/settings src/content/admission src/content/site-shell.test.ts "src/app/admin/(dashboard)/settings/actions.test.ts"
npx tsc --noEmit
npm run lint
npm run build            # then confirm the route table marks /admission as ƒ (dynamic)
```

Then (after the build has finished):

```bash
npx playwright test e2e/admission.spec.ts e2e/admission-window.spec.ts e2e/admin-settings-admission.spec.ts
npx playwright test e2e/home-cards.spec.ts e2e/home.spec.ts          # coverflow unchanged
npx playwright test e2e/page-sections.spec.ts e2e/desktop-navigation.spec.ts e2e/mobile-navigation.spec.ts
npx playwright test e2e/admin-settings-access.spec.ts e2e/admin-settings-saving.spec.ts
```

Admin E2E specs have a known baseline of failures on unchanged code. Compare the failing set against `master`/the parent branch rather than expecting all green, and start the dev server before running them (it is slow to start).

## 5. Layout check

At 375, 768, 1024, 1440 px: no sideways scroll (`document.documentElement.scrollWidth <= innerWidth`), every uniform card back shows all items unclipped, and the banner wraps cleanly. `e2e/admission.spec.ts` asserts these.
