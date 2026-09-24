---
id: 0009
title: Implement signup feature
stage: green
date: 2026-09-23
surface: agent
model: claude-opus-5-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.implement
labels: ["signup", "implementation", "upsert", "soft-delete", "csv-export", "rate-limit"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - src/models/signup.ts
 - src/lib/signup/ (sources, phone, dates, mutations, admin-queries, csv, route-errors + tests)
 - src/lib/validation/signup.ts
 - src/lib/admin-list.ts (Paged, ADMIN_PAGE_SIZE, escapeRegExp moved from news)
 - src/content/signup.ts
 - src/components/signup/signup-form.tsx
 - src/components/signup/signup-section.tsx
 - src/components/admin/admin-pagination.tsx
 - src/components/admin/signups/ (table, filters, delete dialog)
 - src/app/api/public/signups/route.ts
 - src/app/api/admin/signups/[id]/route.ts
 - src/app/api/admin/signups/export/route.ts
 - src/app/globals.css
 - research/design-tokens.md
 - playwright.config.ts
 - e2e/global-setup.ts
 - e2e/helpers/signups.ts
 - e2e/signup-public.spec.ts, signup-visual.spec.ts, admin-signups-*.spec.ts
 - scripts/with-test-env.sh
 - docs/architecture.md
 - specs/004-signup/spec.md
 - specs/004-signup/tasks.md
tests:
 - npm test — 50 files, 338/338 pass
 - npx tsc --noEmit — clean
 - npm run lint — 0 errors (11 pre-existing warnings in research/*.browser.js)
 - playwright --project=forms — 12/12, twice consecutively
 - playwright --project=admin — 52 passed / 12 failed; all 14 admin-signups tests pass, all 12 failures are 002/003 specs untouched by 004
 - playwright --project=chromium — 54 passed / 17 failed; all failures are pre-existing (stale 001 footer/contact specs after c4fd327, 003 news races, /news/some-slug now 404)
---

## Prompt

/sp.implement

(followed by: "continue" (several times), "ip added", "The email or password is incorrect. i am giving correct", "Continue from where you left off.")

## Response snapshot

Implemented all phases, one commit per phase:
- Setup + Foundational (065f916)
- US1 (825be18)
- US2 (38dfc9a)
- US3 (cb49755)
- US4 (fc769a3)
- US5 (3553aa8)
- US6 (c3b65c7)
- Polish (f2d2514)

Key points:
- Atomic upsert per ADR-0001, with restore on re-signup.
- Phone is stored as +923… and shown as 03….
- The honeypot, the rate limit and the validation all return an identical success shape.
- The CSV export includes a UTF-8 BOM.
- The admin list has search, filter and pagination.
- The overview Signups count is wired in.

Root cause of the rate-limit E2E flakiness: e2e/global-setup.ts cleared the collection "throttle", but Mongoose pluralises the model to "throttles". That made clearThrottle() a no-op. Fixed in global-setup and route.test.ts.

T056 deviation: the live site keeps a row layout at 768px. This is recorded in the spec Deviations section.

## Outcome

- ✅ Impact:
  - Signup capture on Home/Resources, plus admin list, delete/restore and CSV export, are complete.
  - T055, T056 and T059 are done.
  - T057 is done. After Atlas was opened to 0.0.0.0/0 for the test cluster, the delete-restore spec was hardened to wait for the DELETE response, because the dialog closes before the request finishes.
  - T058 is manual: the browser walkthrough and the Excel check.
- 🧪 Tests: unit and integration tests are all green. The forms project is green. All admin and chromium failures are pre-existing 001-003 issues (see below).
- 📁 Files: see list above.
- 🔁 Next prompts:
  - Fix the stale 001/002/003 specs in a separate feature.
  - Do the manual quickstart §4 walkthrough.
- 🧠 Reflection: a pluralisation mismatch in the test setup looked like a flaky UI bug for a long time. Check real collection names first.

## Evaluation notes (flywheel)

- Failure modes observed:
  - Pre-existing and out of scope for 004:
    - The admin-lockout and admin-login-logout specs use a bare getByRole("alert"), which collides with Next's __next-route-announcer__.
    - The NewsTableFilters debounce bugs break news-list "filters by status".
    - The news-public spec races under fullyParallel.
  - The 001 footer/contact/nav specs are stale since the 003 footer content change (footerContent.columns).
  - The 003 news editor/Urdu/images specs fail independently of 004.
  - Environmental: the Atlas IP whitelist broke when the dynamic IP rotated mid-run (resolved with 0.0.0.0/0 on the test cluster).
- Graders run and results (PASS/FAIL): vitest PASS; tsc PASS; lint PASS; e2e forms PASS; e2e admin-signups PASS in isolation.
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): use a 0.0.0.0/0 access rule on the dev/test Atlas cluster only, or a local MongoDB for E2E, to remove IP-rotation flakiness.
