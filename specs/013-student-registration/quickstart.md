# Quickstart: 013 Student Registration

## Local setup

1. `.env.local`: nothing new is required. `REGISTRATION_RETENTION_MONTHS` defaults to 12 outside production (set it to try another value, 1–120).
2. `npm run dev`, then sign in as the main admin (`npm run seed:admin` if needed).
3. Settings → Admission: set Opens on ≤ today ≤ Closes on, add classes (e.g. Playgroup, Nursery, Class 1) and save.
   - With the window open and **no** classes, the screen shows the warning and /admission/register shows the closed message.

## Manual checks

| # | Do | Expect |
|---|---|---|
| 1 | Open /admission | One Apply Now link → /admission/register |
| 2 | Submit an empty form | A message under every required field; nothing saved |
| 3 | Fill a valid form (Urdu student name, mother's mobile only, Other mother tongue) | Confirmation with an 8-character reference; form cleared |
| 4 | Submit the same child again (same name, DOB, father's mobile) | Saved; both rows flagged "Likely duplicate" in /admin/registrations |
| 5 | Submit a sibling (different name, same parents) | Saved; not flagged |
| 6 | Set Closes on to yesterday; reload the register page | Closed message, no form; no Apply Now on /admission |
| 7 | `curl -X POST localhost:3000/api/public/registrations -H 'content-type: application/json' -d '{}'` while closed | 403 `{ "error": "closed", … }` |
| 8 | As main admin: search, filter by class, open a row | Detail with a separate Health information block |
| 9 | Change status, delete, open Deleted, restore | Status history shows each step; restored row is back unchanged |
| 10 | Export CSV with a class filter | Only that class; opens in Excel with Urdu intact |
| 11 | Sign in as a content manager with every permission; visit /admin/registrations | 404; no Registrations nav item, count or bell entry |
| 12 | `npm run sweep:registrations` after backdating a record's `deletedAt` 31 days | Record gone |

## Walkthrough record (2026-10-15)

Checks 1-12 were walked through once with a scripted browser session (a throwaway Playwright script, not kept) against the E2E dev server and test database, with the e2e-now cookie standing in for "now". All 12 passed. Differences from the table: check 7 used the browser context's request client instead of `curl`; check 12 ran `bash scripts/with-test-env.sh npm run sweep:registrations`; the window and classes were seeded directly in Settings rather than typed (the Settings screen has its own E2E).

## Tests

```bash
npm test                                   # Vitest (pure + describeWithDb)
npx playwright test e2e/registration-*.spec.ts e2e/admin-registrations*.spec.ts e2e/admin-settings-admission.spec.ts
```

Never run `npm run build` while Playwright is running (project rule). Start the dev server before Playwright if it's slow to boot. The window boundary specs set `TZ` to a non-Pakistan zone and use the `e2e-now` cookie, as in 020.

## Production / release

1. Client approves the privacy notice → set `registrationCopy.privacy.placeholder = false` in `src/content/registration.ts`.
2. Set `REGISTRATION_RETENTION_MONTHS` in the production environment to the agreed period.
3. `npm run build` with `VERCEL_ENV=production` fails until both are done (`scripts/check-release-content.ts`).
4. Enter the client's first class list in Settings → Admission before opening the window.
