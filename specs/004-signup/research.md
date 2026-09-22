# Research: Signup (004)

**Branch**: `004-signup` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

Phase 0 output. Every unknown in the plan's Technical Context is
resolved here; each entry records the decision, why, and what else
was considered. Sources: the spec (with clarifications), the
constitution, `docs/architecture.md`, the 002/003 code this feature
builds on, and the reference screenshot.

## 1. Upsert strategy — one record per email, restore on re-signup

**Decision**: One atomic `findOneAndUpdate` on the `signups`
collection, keyed by the normalised email, with `upsert: true`,
`new: true` and the soft-delete plugin's `withDeleted: true` option:

```
filter: { email }
update: {
  $set:         { name, phone, lastSignupAt: now, deletedAt: null },
  $addToSet:    { sources: source },
  $setOnInsert: { firstSignupAt: now },
}
```

backed by a **unique index on `email`** (no partial filter — deleted
records keep their email reserved). If the driver reports a duplicate
key (`E11000`) — the window where two first-time submissions for the
same email race — retry the same call once; the second attempt finds
the document the winner inserted and updates it. This is the same
race-resolution pattern `src/lib/rate-limit.ts` already uses for
throttle counters.

**Rationale**: Constitution IV requires natural-key upserts, never
duplicates; `docs/architecture.md` prescribes `findOneAndUpdate` +
`upsert` + unique index. `$setOnInsert` keeps the first signup date
(FR-013); `$set deletedAt: null` restores a deleted record in the same
write (FR-015); `$addToSet` de-duplicates pages (FR-013). `withDeleted`
is mandatory — without it the plugin appends `deletedAt: null` to the
filter, the deleted record is not matched, the upsert tries to insert a
second document and the unique index rejects it.

**Alternatives considered**: find-then-save (two round trips, racy —
rejected); a transaction (Atlas Flex supports it, but a single atomic
update already gives the guarantee — rejected as unnecessary);
`updateOne` + separate read (no need for the doc back — but the
mutation returns nothing to the visitor anyway; `findOneAndUpdate` is
kept for tests and the restore case).

## 2. Phone validation and canonical form

**Decision**: `src/lib/signup/phone.ts` exports
`normalisePakistaniMobile(input): string | null` and
`formatPhoneLocal(e164): string`. Normalisation strips spaces, hyphens,
dots and parentheses, then accepts exactly
`^(?:\+92|92|0)(3\d{9})$` and returns `+92` + the captured ten digits
(`+923XXXXXXXXX`, E.164). Anything else returns `null` and the Zod
schema reports "Enter a Pakistani mobile number, e.g. 03001234567".
`formatPhoneLocal` renders `0` + the ten digits (`03XXXXXXXXX`) for the
admin table and CSV; the `tel:` link uses the stored E.164 value.

**Rationale**: Settled with the user during planning: storage follows
`docs/architecture.md` (`+923XXXXXXXXX` — unambiguous for the planned
chatbot consumer, WhatsApp links and `tel:`), display follows the spec
clarification (`03XXXXXXXXX`, the form staff recognise). Mobiles only
(spec clarification Q3). The four formats in the brief all collapse to
the same regex after separator stripping.

**Alternatives considered**: `libphonenumber-js` (a new dependency for
one country's mobile pattern — rejected, Constitution II spirit and
bundle size); storing both forms (redundant — rejected; search
normalises the query instead, §5).

## 3. Public endpoint and response shape

**Decision**: `POST /api/public/signups` (JSON body `{ name, email,
phone, source, website_url }`). Order of checks:

1. `protectPublicForm(request, { name: "signup" }, body)` from 002 —
   honeypot first, then per-IP rate limit (5 / 10 min default).
2. Honeypot tripped → return the **same** `200 { ok: true }` as a real
   success, store nothing (FR-025).
3. Rate-limited → `429 { error: "too_many_requests" }` +
   `Retry-After` via `tooManyRequestsResponse()` (FR-024).
4. Zod validation (`signupInputSchema`) → `400 { error: "validation",
   fields: { name?, email?, phone?, source? } }` (FR-007, FR-016).
5. `upsertSignup()` → `200 { ok: true }` whether created, updated or
   restored (FR-008). Any DB failure → `503 { error: "unavailable" }`
   (FR-009); the client keeps the typed values.

All responses carry `Cache-Control: no-store`. The success body
contains no id, no created/updated flag and no timestamps, so nothing
distinguishes new from returning (SC-004).

**Rationale**: Matches the `/api/public/*` namespace in
`docs/architecture.md`, reuses the 002 protection verbatim, mirrors the
error envelope of `/api/admin/news*` (`route-errors.ts`) so the client
code and tests share conventions.

**Alternatives considered**: a Server Action (would bypass
`protectPublicForm`'s `Request`-based IP extraction and give no
`Retry-After` — rejected); `201` on create (leaks new-vs-repeat —
rejected).

## 4. Section component and placement

**Decision**: One visual section, two components:

- `SignupSection` (Server Component, `src/components/signup/signup-section.tsx`):
  the navy band, heading (with highlighted number), supporting line,
  usage note — all from `src/content/signup.ts` — and the form. Prop:
  `source: SignupSource`.
- `SignupForm` (`"use client"`, `src/components/signup/signup-form.tsx`):
  the three inputs, the honeypot input, the button, field messages, the
  submitting / success / error states, `fetch` to the public route.
  Validates with the shared `signupInputSchema` before sending; shows
  server field errors if the server disagrees.

Placement: `src/app/(public)/page.tsx` renders the existing
`PagePlaceholder` followed by `<SignupSection source="home" />`. 006
and 009 will place the same component and pass their own `source`.

Placeholder copy: `src/content/signup.ts` carries the reference wording
for the heading, supporting line and usage note, each marked with a
code comment and a `placeholder: true` flag (the flag is data, not a
visible badge — the existing 001 convention for `contactInfo` is
comment-marked placeholder values with no on-page marker). Components
render `data-placeholder="true"` on the element so tests and a later
copy audit can find it.

**Rationale**: Constitution VI — one component per section, client
code only on the smallest interactive piece, copy in content files.
The `source` prop is the only thing the host page controls, so the
section is reusable without change.

**Alternatives considered**: a single client component for the whole
band (ships the copy and layout as client JS for no reason —
rejected); a visible "placeholder" badge (would appear on the public
site and does not match the 001 convention — rejected).

## 5. Admin list query, search and filter

**Decision**: `listSignups({ q, source, page })` in
`src/lib/signup/admin-queries.ts`, modelled on `listAdminPosts`.

- Sort `{ lastSignupAt: -1, updatedAt: -1 }`, 20 per page. `Paged<T>`,
  `escapeRegExp()` and `ADMIN_PAGE_SIZE` are **moved** out of
  `src/lib/news/admin-queries.ts` into a shared `src/lib/admin-list.ts`
  that both news and signup import (analysis finding D1) — importing
  from the news module would drag the news model and Cloudinary loader
  into the signup module graph, and copying would create a second
  helper (Constitution VI).
- Search: trimmed `q` → escaped case-insensitive regex; filter
  `$or: [{ name }, { email }, { phone }]`. For the phone branch the
  query is first digit-normalised: strip separators; a leading `0` is
  replaced by `92`, a leading `+` dropped; the regex then matches the
  digits inside the stored `+92…` value, so "0300 123", "+92 300",
  "300123" all find the same record (FR-018).
- Source filter: `sources: source` (array contains) when `source` is a
  known key; "all" omits it.
- `countSignups()` for the overview card (FR-023a) — `countDocuments({})`
  (the plugin adds `deletedAt: null`).
- `exportSignups({ q, source })` — same filter, no pagination, cursor
  over `.sort().lean()` → CSV rows (§7).

**Rationale**: Regex substring search works for Urdu names (literal
comparison, no stemming — same reasoning as 003). Indexes:
`{ email: 1 }` unique, `{ lastSignupAt: -1, deletedAt: 1 }`,
`{ sources: 1, lastSignupAt: -1 }`. Volume is small (hundreds to a few
thousand leads), so an unanchored regex on `name`/`phone` is
acceptable; `email` is anchored-prefix-friendly only if the user types
the start, which is the common case.

**Alternatives considered**: a MongoDB text index (tokenises Urdu
poorly, no substring match — rejected); separate search boxes per
field (spec asks for one — rejected).

## 6. Admin table, filters, pagination, delete

**Decision**: Reuse the 002/003 admin patterns directly:

- `SignupsTable` (server) — `Table/*` primitives; columns Name (with
  `dir="auto"` + Urdu fallback font class, since a signup has no
  language field), Email (`mailto:`), Phone (`tel:` E.164, text
  `03…`), Pages (badges), First, Latest, Actions (delete). Empty state
  row like `NewsTable`.
- `SignupsTableFilters` (`"use client"`) — copy of `NewsTableFilters`
  with one search input + one source `Select`; filters live in URL
  search params; debounce 300 ms; any change resets `page`.
- Pagination: promote `src/components/admin/news/news-pagination.tsx`
  to a shared `AdminPagination` at
  `src/components/admin/admin-pagination.tsx` taking a `basePath` prop
  (`/admin/news`, `/admin/signups`) and a `copy` prop for labels;
  `news-pagination.tsx` becomes a thin wrapper that passes
  `basePath="/admin/news"` so 003 code and tests are untouched.
- `DeleteSignupDialog` (`"use client"`) — same shape as
  `DeletePostDialog`: `AlertDialog` → `DELETE /api/admin/signups/[id]`
  → toast → `router.refresh()`. A `404` (already deleted from another
  tab) shows the "no longer available" toast (spec edge case).
- Export button: a plain link `<a href="/api/admin/signups/export?q=…&source=…" download>`
  styled with `buttonVariants` — no client code needed.

**Rationale**: User constraint ("reuse admin table patterns from 002")
and Constitution VI (build shared UI once). The only refactor of 003
code is lifting the pagination component, which is a move plus a
one-line wrapper — the smallest change that avoids a third copy.

**Alternatives considered**: copying `NewsPagination` into
`admin/signups/` (a second identical component — rejected); a generic
data-table abstraction (speculative — rejected).

## 7. CSV export

**Decision**: `GET /api/admin/signups/export?q=&source=` (admin session
required) streams `text/csv; charset=utf-8` with
`Content-Disposition: attachment; filename="signups-YYYY-MM-DD.csv"`.
Body starts with the UTF-8 BOM (`﻿`) so Excel on Windows decodes
Urdu correctly; rows use CRLF; every field is quoted and inner quotes
doubled (RFC 4180); fields beginning with `=`, `+`, `-`, `@`, tab or CR
are prefixed with a single quote to neutralise formula injection.
Columns: `Name, Email, Phone, Pages, First signup, Latest signup`.
Phone is written as `03…`; dates as `YYYY-MM-DD HH:mm` in PKT; pages
joined with `; `. Implemented in `src/lib/signup/csv.ts` (pure,
unit-tested) and the route handler.

**Rationale**: FR-027/FR-028 and SC-010. The BOM is the one thing
Excel needs to show Urdu; quoting everything sidesteps comma/quote/
newline edge cases; formula-prefix escaping is standard hygiene for
user-supplied names.

**Alternatives considered**: a CSV library (`papaparse`, `csv-stringify`
— a dependency for a 30-line function — rejected); XLSX (heavier,
not asked — rejected); client-side generation from the current page
(exports only 20 rows — rejected, spec says all matching).

## 8. Rate limiting in tests

**Decision**: The signup form's E2E specs run in a new Playwright
project `forms` (`testMatch: /signup-.*\.spec\.ts/`, `workers: 1`,
`fullyParallel: false`), excluded from the `chromium` project's
matcher, and call the existing `clearThrottle()` from
`e2e/global-setup.ts` in `beforeEach`. The rate-limit spec then
submits six times deliberately and asserts the sixth is refused.
Vitest route tests mock/clear the `throttle` collection through
`describeWithDb`.

**Rationale**: All Playwright workers share one source IP
(`127.0.0.1`), so parallel public specs would trip the real 5/10-min
limit on each other. Serialising just the signup specs keeps the real
threshold under test instead of loosening it for CI. This mirrors the
`admin` project rationale already in `playwright.config.ts`.

**Alternatives considered**: an env override raising the limit under
test (hides the real behaviour — rejected); a per-form threshold only
for signup (5/10 min is the 002 default and the spec assumption —
kept).

**Boundary (verified 2026-09-22)**: `clearThrottle()` lives only in
`e2e/global-setup.ts`, is imported only by Playwright specs, and `e2e/`
is excluded from the app's `tsconfig.json`, so it is absent from the
production bundle. No route, Server Action or admin page in this
feature may expose a throttle reset; the only app-code deletion on
`throttle` remains `clearKeys()` in `src/lib/login-lockout.ts`, which
clears a single account's own lockout counters after a *successful*
login (002 FR-029).

## 9. Concurrency test for the same-moment duplicate

**Decision**: A Vitest DB test fires `Promise.all` of 10
`upsertSignup()` calls for one new email with different names, then
asserts `countDocuments({ email })` (with `withDeleted`) is 1, and
`firstSignupAt` equals the earliest `lastSignupAt` seen. This exercises
the `E11000` retry path (§1).

**Rationale**: Spec edge case and SC-003 ask for proof, not an
argument.

## 10. Dates and time zone

**Decision**: Store `firstSignupAt`/`lastSignupAt` as `Date` (UTC
instants). Format for the admin table and CSV with `Intl.DateTimeFormat`
`en-GB`-style `dd MMM yyyy, HH:mm` in `Asia/Karachi`
(`src/lib/signup/dates.ts`, `formatSignupDateTime`). Do not reuse
`src/lib/news/dates.ts` — those helpers are calendar-date (midnight)
semantics for publish dates; signups are instants.

**Rationale**: Spec assumption (PKT, unambiguous day-month-year with
time).

## 11. Token extraction for the signup band

**Decision**: Before any public UI is built, run a focused extraction
against `https://das.edu.pk/` for the signup band —
`research/extract-signup-tokens.ts` + `extract-signup-tokens.browser.js`
(same harness as `extract-news-tokens.ts`; Chrome channel), output
`research/tokens/signup-{375,768,1024,1440}.json`. Captured per
element: band background colour and vertical padding; heading
font-size/line-height/weight/colour and the highlight colour of the
number; supporting-line size/weight/colour; input height, padding,
font-size, placeholder colour, border, radius, background; gap between
inputs; button background, hover background, padding, font, radius;
layout (row vs stacked) at each width. Values go into
`research/design-tokens.md` (new "Signup band" section) and
`src/app/globals.css` `@theme` as `--color-signup-*`, `--text-signup-*`,
`--spacing-signup-*` tokens. Form-state colours are added as
**general** tokens — `--color-error` (`#F44336`, the reference CTA red
already used as the admin destructive slot) and `--color-success`
(`#00BCD4`, the reference accent cyan) — so 008-contact and the admin
reuse them; the reference has no error/success state, so this is
recorded as a deviation in the spec (analysis finding U1).

The 375/768 layouts on the live site are recorded as observed, but
the spec's clarified narrow layout (single column at 375; row of
fields + full-width button at 768) is the requirement; if the live
site differs, the difference is recorded in the spec's "Deviations
from the Reference" and the spec's layout wins (the user chose it
knowing no screenshot exists).

**Rationale**: Constitution V (no raw values; extract first) and I
(exact values). `design-tokens.md` has page-level palette entries
(`#223355` secondary navy, `#F44336` CTA red, `#FFFF00` yellow) but no
per-element values for this band.

## 12. Testing map

| Layer | What | Where |
|---|---|---|
| Vitest (jsdom) | `SignupForm` states: field messages, success clears fields, error keeps values, honeypot hidden from a11y tree | `src/components/signup/signup-form.test.tsx` |
| Vitest (pure) | phone normalise/format, Zod schema (trim, collapse spaces, limits, Urdu), CSV escaping/BOM, search-query normalisation, date formatting | `src/lib/signup/*.test.ts`, `src/lib/validation/signup.test.ts` |
| Vitest (DB) | upsert create/update/restore/concurrency; `listSignups` search+filter+paging; `countSignups`; public route: 200 identical for new/repeat, 200 + nothing stored for honeypot, 429 after limit, 400 fields, 503 on DB error; admin routes `DELETE` and `export`: 401 without session, 404 for unknown/deleted id, CSV headers | `src/lib/signup/*.test.ts`, `src/app/api/public/signups/route.test.ts`, `src/app/api/admin/signups/**/route.test.ts` |
| Playwright `forms` | sign up; repeat with different capitals → one updated record (via DB helper); invalid data → messages; rate limit sixth submission; four widths vs tokens/reference | `e2e/signup-public.spec.ts`, `e2e/signup-visual.spec.ts` |
| Playwright `admin` | list shows seeded rows newest first; search by name/email/phone; source filter; pagination keeps filters; mailto/tel links; delete confirm → gone; re-signup restores; export downloads CSV with BOM + Urdu name; overview count; unauthorized redirect | `e2e/admin-signups-list.spec.ts`, `e2e/admin-signups-delete-restore.spec.ts`, `e2e/admin-signups-export.spec.ts` |

DB helper: `e2e/helpers/signups.ts` (`seedSignups`, `findSignupByEmail`
with deleted included, `clearSignups`) following `e2e/helpers/news.ts`.
`global-setup.ts` adds `signups` to the collections it wipes.

## 13. No new dependencies

**Decision**: Nothing is added to `package.json`. Zod, Mongoose,
Base UI/shadcn primitives, lucide icons and the 002 helpers cover
every need above.

**Rationale**: Constitution II. Verified: phone (regex), CSV (30-line
encoder), dates (`Intl`), form (native inputs + shared Zod).
