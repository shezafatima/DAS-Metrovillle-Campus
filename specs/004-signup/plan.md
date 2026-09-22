# Implementation Plan: Signup

**Branch**: `004-signup` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/004-signup/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Add one reusable `SignupSection` (Server Component band + a small
client `SignupForm`) that posts name, email and phone to
`POST /api/public/signups`, protected by the 002 honeypot + per-IP rate
limit and validated by one shared Zod schema; store leads in a new
`signups` collection through a single atomic natural-key upsert
(unique email, `$setOnInsert` first date, `$addToSet` pages, `$set
deletedAt: null` so a re-signup restores a soft-deleted record) with an
identical `200` for every outcome. Give the admin `/admin/signups`
built from the 002/003 table, filters, pagination and confirm-dialog
patterns (search name/email/phone, filter by page, 20 per page,
`mailto:`/`tel:` links, soft delete), a filtered CSV export with a
UTF-8 BOM for Urdu in Excel, and wire the overview "Signups" card to
the real count. Public styling follows the desktop reference after a
token-extraction pass for the signup band; the 375/768 layouts follow
the spec clarification. User constraints honoured: reuse 002 form
protection, soft delete and admin table patterns; one reusable section
component.

## Technical Context

**Language/Version**: TypeScript strict on Next.js 16.3.x (App Router), React 19, Node 24 — unchanged.
**Primary Dependencies**: **None new** (research §13). Reused from 002: `protectPublicForm`/`tooManyRequestsResponse` (`src/lib/public-form.ts`), `HONEYPOT_FIELD`, `softDeletePlugin`, `requireAdminSession`, `connectDb`, `Table/*`, `Select`, `AlertDialog/*`, `Badge`, `Button`/`buttonVariants`, `Input`, `toast`, `StatCard`; from 003: `Paged<T>`, `escapeRegExp` and the 20-row page size (moved out of `news/admin-queries.ts` into a shared `src/lib/admin-list.ts` used by both features), `NewsTableFilters`/`DeletePostDialog` shapes, `NewsPagination` (lifted to `AdminPagination`); from 001: `PublicShell`, container/gutter tokens, `font-body-urdu`.
**Storage**: MongoDB Atlas Flex via the cached Mongoose connection — one new collection `signups` (data-model.md): unique `email`, `sources[]`, `firstSignupAt`, `lastSignupAt`, `deletedAt`. Rate-limit state in the existing `throttle` collection.
**Testing**: Vitest (pure: phone, schema, CSV, dates, search normalisation; jsdom: `SignupForm` states; `describeWithDb`: upsert incl. 10-way concurrency, list query, public route matrix, every admin route's 401) and Playwright (new serial `forms` project for the public form + four-width visual check; `admin` project for list/search/filter/paging/delete-restore/export/overview). Research §8, §12.
**Target Platform**: Web, server-rendered; Node runtime for route handlers (Mongoose).
**Project Type**: Single existing Next.js app; adds `src/models/signup.ts`, `src/lib/signup/*`, `src/lib/validation/signup.ts`, `src/app/api/public/signups/route.ts`, `src/app/api/admin/signups/**`, `src/app/admin/(dashboard)/signups/page.tsx` (replaces placeholder), `src/components/signup/*`, `src/components/admin/signups/*`, `src/components/admin/admin-pagination.tsx`, `src/content/signup.ts`, copy in `src/content/admin.ts`, tokens in `research/design-tokens.md` + `globals.css`.
**Performance Goals**: SC-001 thank-you appears immediately after submit — one indexed upsert per submission, client-side validation avoids a round trip for bad input. SC-006 admin search over 100 rows < 1 s — regex over three fields on a few-thousand-row collection with `lastSignupAt` index; 20-row pages. Public band is a Server Component; only `SignupForm` ships JS.
**Constraints**: Constitution I (desktop reference exact via extracted tokens; narrow layouts per clarification recorded as deviations), II (no new deps), III (public route rate-limited + honeypot; every admin route/page calls `requireAdminSession`), IV (one shared Zod schema; soft delete; natural-key upsert with unique index; no email sent), V (band values extracted before the public UI is styled), VI (section = one component; `"use client"` only on `SignupForm`, filters and delete dialog; copy in `src/content/signup.ts`), VII (query/mutation modules return plain DTOs; route handlers thin), VIII (E2E per story + 401 test per admin route + 4 widths). User constraints: reuse 002 protection/soft delete/admin table; one reusable section component.
**Scale/Scope**: 1 model, 1 Zod schema, ~7 `src/lib/signup` modules, 3 route handlers, 1 admin page, 4 admin components + 1 shared pagination, 2 public components, 1 content file, ~10 Vitest files, 5 Playwright specs, 1 token-extraction pass, 1 Playwright project, 0 env vars.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | Desktop band reproduces `screenshots/das.edu.pk_.png` after per-element token extraction (research §11). Phone/tablet captures are cut off; the clarified narrow layouts are the requirement and are recorded in the spec's "Deviations from the Reference" together with the added usage note and validation/thank-you states. One source conflict (phone storage form: architecture.md vs spec) was **flagged and decided by the user** during planning, not guessed. Scope = PRD §5.1/§5.6/§6.5/§7 + clarified CSV export + overview count. |
| II. Fixed Stack | PASS | No dependency, provider or version change (research §13). |
| III. Security | PASS | `POST /api/public/signups` runs `protectPublicForm` (honeypot + 5/10-min per-IP) before touching the DB; `DELETE /api/admin/signups/[id]`, `GET /api/admin/signups/export` and `/admin/signups` each call `requireAdminSession` themselves; CSV formula-injection guard; error bodies never leak DB details. |
| IV. Data Integrity | PASS | One `signupInputSchema` on client and server; `softDeletePlugin` on the model; natural-key (`email`) upsert with a unique index and `E11000` retry; no notifications. |
| V. Design System | PASS (gated) | Admin UI uses 002 tokens/primitives only. Public band is blocked behind the extraction task that adds `--*-signup-*` tokens to `design-tokens.md` and `@theme`; no arbitrary values. |
| VI. Components | PASS | `SignupSection` (server) + `SignupForm` (client); `SignupsTable`, `SignupsTableFilters` (client), `DeleteSignupDialog` (client), `AdminPagination` (server, shared). Pages compose only. Copy in `src/content/signup.ts` / `admin.ts`; sources in one constant. |
| VII. Extensibility | PASS | `src/lib/signup/{mutations,admin-queries,csv,phone}.ts` are plain functions returning DTOs; phone stored E.164 so a chatbot/WhatsApp consumer needs no reformatting; no speculative JSON list endpoint (contracts/admin-signups-api.md "Not provided"). |
| VIII. Testing & DoD | PASS (planned) | One Playwright spec per story group, 401 test for every admin route + redirect test for the page, four-width visual spec, concurrency + identical-response tests (research §12). |

No violations — Complexity Tracking table not needed.

**ADRs**: [ADR-0001 One Record Per Person — Natural-Key Upsert with
Restore-on-Resubmit](../../history/adr/0001-signup-upsert-and-restore.md)
(applies to signups; explicitly not to contact messages, which are
append-only).

**Post-design re-check (after Phase 1)**: unchanged. Two points
touched principle boundaries and were resolved toward the principle:
(a) phone storage — user chose architecture.md's `+92…` with `03…`
display, so `docs/architecture.md` needs no edit and the spec
assumption was updated; (b) lifting `NewsPagination` into a shared
`AdminPagination` is the minimal change that avoids a third copy
(Constitution VI "built once and reused") while leaving 003's import
path and tests intact via a wrapper.

## Project Structure

### Documentation (this feature)

```text
specs/004-signup/
├── plan.md                        # This file (/sp.plan command output)
├── research.md                    # Phase 0 — 13 resolved decisions
├── data-model.md                  # Phase 1 — `signups` collection, sources constant, schema, upsert, transitions, DTOs
├── quickstart.md                  # Phase 1 — tokens pass, run, verify by hand, test commands
├── contracts/
│   ├── public-signup-api.md       # POST /api/public/signups — body, statuses, invariants, client behaviour
│   ├── admin-signups-api.md       # /admin/signups page, DELETE, export CSV, overview card, 401 rule
│   └── signup-section.md          # SignupSection/SignupForm API, content shape, token names, #signup anchor
├── checklists/
│   └── requirements.md            # produced by /sp.specify
└── tasks.md                       # Phase 2 output (/sp.tasks command - NOT created by /sp.plan)
```

### Source Code (repository root)

```text
research/extract-signup-tokens.ts, extract-signup-tokens.browser.js   # band extraction (research §11)
research/tokens/signup-{375,768,1024,1440}.json                       # extraction output
research/design-tokens.md, src/app/globals.css                        # + "Signup band" tokens (--color/--text/--spacing/--radius-signup-*)
playwright.config.ts                                                  # + `forms` project (serial, /signup-.*\.spec\.ts/); chromium ignores it
e2e/global-setup.ts                                                   # + "signups" in the wipe list
docs/architecture.md                                                  # + signup module map, /api/public/signups, `forms` project note

src/
├── models/
│   └── signup.ts                                  # schema + softDeletePlugin + indexes (data-model.md)
├── lib/
│   ├── admin-list.ts                              # shared: Paged<T>, escapeRegExp(), ADMIN_PAGE_SIZE (moved from news/admin-queries.ts; news imports it too)
│   ├── validation/
│   │   └── signup.ts                              # signupInputSchema, SignupInput, fieldErrors()
│   └── signup/
│       ├── sources.ts                             # SIGNUP_SOURCES, SignupSource, isSignupSource(), sourceLabel()
│       ├── phone.ts                               # normalisePakistaniMobile(), formatPhoneLocal(), phoneSearchDigits()
│       ├── dates.ts                               # formatSignupDateTime() — PKT, "dd MMM yyyy, HH:mm"
│       ├── mutations.ts                           # upsertSignup() (atomic, E11000 retry), deleteSignup()
│       ├── admin-queries.ts                       # listSignups({q,source,page}), countSignups(), findSignupsForExport()
│       ├── csv.ts                                 # toCsv(rows): BOM, quoting, formula guard, CRLF
│       └── route-errors.ts                        # validation/unavailable envelopes (mirrors news/route-errors.ts)
├── app/
│   ├── api/public/signups/route.ts                # POST: protectPublicForm → validate → upsert → 200 {ok:true}
│   ├── api/admin/signups/
│   │   ├── [id]/route.ts                          # DELETE (soft)
│   │   └── export/route.ts                        # GET CSV
│   ├── admin/(dashboard)/
│   │   ├── page.tsx                               # overview: countSignups() replaces SIGNUPS_COUNT
│   │   └── signups/page.tsx                       # replaces AdminPlaceholder: filters + table + pagination + export link
│   └── (public)/page.tsx                          # PagePlaceholder + <SignupSection source="home" />  (page.test.tsx updated)
├── components/
│   ├── signup/
│   │   ├── signup-section.tsx                     # server: band, heading (highlight), supporting, <SignupForm/>, note
│   │   └── signup-form.tsx                        # "use client": inputs, honeypot, states, fetch, live region
│   └── admin/
│       ├── admin-pagination.tsx                   # server: lifted from news/news-pagination.tsx (basePath, copy props)
│       ├── news/news-pagination.tsx               # becomes a wrapper: <AdminPagination basePath="/admin/news" …/>
│       └── signups/
│           ├── signups-table.tsx                  # server: rows (name dir=auto, mailto, tel, source badges, dates, delete)
│           ├── signups-table-filters.tsx          # "use client": search + source select → URL params
│           └── delete-signup-dialog.tsx           # "use client": AlertDialog → DELETE → toast → refresh
└── content/
    ├── signup.ts                                  # public copy (placeholder-marked heading/supporting/note), labels, states
    └── admin.ts                                   # + signupsCopy (page title, headers, filters, empty, dialog, toasts, export)

e2e/
├── helpers/signups.ts                             # seedSignups(), findSignupByEmail({withDeleted}), clearSignups()
├── signup-public.spec.ts                          # sign up; repeat different capitals → one record; invalid → messages; rate limit; honeypot
├── signup-visual.spec.ts                          # band at 375/768/1024/1440 vs tokens/reference; no horizontal scroll
├── admin-signups-list.spec.ts                     # order, search name/email/phone, source filter, paging keeps filters, mailto/tel, empty state, redirect when logged out
├── admin-signups-delete-restore.spec.ts           # delete confirm/cancel → gone; re-signup restores with first date kept
└── admin-signups-export.spec.ts                   # download, BOM, header, filtered rows, Urdu name; overview count

src/**/*.test.ts(x)                                # Vitest: lib/signup/*, validation/signup, models/signup (DB), api/public/signups (DB), api/admin/signups/** (DB, 401), components/signup/signup-form (jsdom)
```

**Structure Decision**: Extends the single Next.js app exactly along
`docs/architecture.md`: model in `src/models`, domain logic in
`src/lib/signup`, shared validation in `src/lib/validation`, public
route under `/api/public`, admin routes under `/api/admin`, admin page
under `admin/(dashboard)`, the public section under
`src/components/signup` (mirroring `components/news`), copy in
`src/content`. All signup logic lives in `src/lib/signup/*` so the
route handlers, the admin page and a future consumer call the same
functions.

## Implementation phases (for /sp.tasks)

1. **Foundation** — `sources.ts`, `phone.ts`, `dates.ts`, `csv.ts`
   with unit tests; `validation/signup.ts` with tests; `models/signup.ts`;
   `mutations.ts` + DB tests (create / update / restore / 10-way
   concurrency); `admin-queries.ts` + DB tests (order, search incl.
   phone-digit and Urdu, source filter, paging, count).
2. **Public API** — `route-errors.ts`; `POST /api/public/signups` + DB
   tests (identical 200 for new/repeat, honeypot 200 + nothing stored,
   429 on sixth, 400 fields, 503 on DB error).
3. **Token extraction** — script + JSON + `design-tokens.md` +
   `@theme` (blocks phase 4).
4. **Public UI** — `content/signup.ts`; `SignupForm` (+ jsdom tests);
   `SignupSection`; place on Home placeholder; update `page.test.tsx`.
5. **Admin** — `signupsCopy`; lift `AdminPagination`; `SignupsTable`,
   `SignupsTableFilters`, `DeleteSignupDialog`; `/admin/signups` page;
   `DELETE` + `export` routes with 401/404/CSV tests; overview count.
6. **E2E + docs** — `forms` Playwright project; `helpers/signups.ts`;
   global-setup wipe list; five specs; `docs/architecture.md` update.

## Follow-ups and risks

- **Live-site drift**: if the extraction finds the live band differs
  from the 2026 screenshot (copy, colours, layout), the task flags it
  for the client instead of choosing (Constitution I); phase 4 waits.
- **Rate limit vs. real visitors behind one NAT** (a school computer
  lab): 5 per 10 minutes per IP may block legitimate back-to-back
  signups. The threshold is a one-line `protectPublicForm` option;
  revisit with the client if reported.
- **Search on `email` and `phone` is unanchored regex** — fine at
  lead-list scale; if the collection ever grows past tens of thousands,
  add a prefix-anchored fast path or a normalised `phoneDigits` field.

## Complexity Tracking

Not needed — no constitution violations.
