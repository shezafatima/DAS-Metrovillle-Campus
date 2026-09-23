---

description: "Task list for Signup (004) implementation"
---

# Tasks: Signup

**Input**: Design documents from `/specs/004-signup/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-signup-api.md, contracts/admin-signups-api.md, contracts/signup-section.md, quickstart.md, history/adr/0001-signup-upsert-and-restore.md

**Tests**: Included — spec.md's Acceptance section and Constitution VIII require E2E tests for every story (sign up; repeat with different capitals → one updated record; invalid data → errors; admin list, search, filter; delete and restore by re-signup; CSV export), tests proving every admin signup route rejects unauthorized requests, tests proving the response is identical for new and repeat emails, and the form at 375/768/1024/1440px. research.md §12 maps each to a file; those files are tasks here. DB-backed Vitest files (`[DB]`) use `describeWithDb()` (`src/test/db.ts`) against `dar_e_arqam_test` and skip with a notice when `MONGODB_URI` is unset. Public signup Playwright specs run in the new serial `forms` project and clear the throttle collection between cases (research §8).

**Organization**: Tasks are grouped by spec.md user story (US1–US6). The upsert (`upsertSignup`) is one atomic write that serves US1, US2 and US4 at once (ADR-0001), so it is built in Foundational; US2 and US4 then prove its update/restore/concurrency semantics with tests and wire the UI that depends on them. `protectPublicForm` is called from the public route from the first version (Constitution III); US5 adds the honeypot input, the rate-limited UI state and the tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to a spec.md user story (US1–US6); Setup/Foundational/Polish tasks carry no story label
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js app (plan.md Structure Decision): `src/`, `e2e/`, `research/`, `docs/` at repository root. Domain logic under `src/lib/signup/`, shared validation under `src/lib/validation/`, public route under `src/app/api/public/signups/`, admin routes under `src/app/api/admin/signups/`, admin page under `src/app/admin/(dashboard)/signups/`, public section under `src/components/signup/`, admin components under `src/components/admin/signups/`, copy in `src/content/`.

---

## Phase 1: Setup

**Purpose**: Test infrastructure for the new collection and the serial public-form Playwright project. No dependency or env change (research §13).

- [X] T001 [P] Add `"signups"` to the collections wiped in `e2e/global-setup.ts` (`["user", "session", "account", "throttle", "news", "signups"]`) so every Playwright run starts with no leads
- [X] T002 [P] Add a `forms` project to `playwright.config.ts` — `testMatch: /signup-.*\.spec\.ts/`, `fullyParallel: false`, `workers: 1`, `use: { ...devices["Desktop Chrome"], channel: "chrome" }` — with a comment explaining all workers share `127.0.0.1` so parallel public-form specs would trip the real 5/10-min rate limit on each other (research §8); change the `chromium` project's `testIgnore` to `/(admin|signup)-.*\.spec\.ts/` so signup specs run only in `forms`
- [X] T003 [P] Create `e2e/helpers/signups.ts` following `e2e/helpers/news.ts`'s `withConnection` pattern: `seedSignups(seeds: Partial<SignupSeed>[])` inserting directly into the `signups` collection with defaults (`sources: ["home"]`, `firstSignupAt`/`lastSignupAt` = now, `deletedAt: null`, `createdAt`/`updatedAt`), `findSignupByEmail(email, { withDeleted?: boolean })` returning the raw document or `null`, `clearSignups()`, and re-export `loginAsAdmin` from `./news`; export a `SignupSeed` interface (`name`, `email`, `phone` E.164, `sources`, `firstSignupAt`, `lastSignupAt`, `deletedAt`)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The pure helpers, shared schema, model and atomic upsert every story reads or writes through. Nothing user-visible yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T004 [P] Create `src/lib/signup/sources.ts` exporting `SIGNUP_SOURCES = [{ key: "home", label: "Home" }, { key: "resources", label: "Resources" }] as const`, `type SignupSource`, `SIGNUP_SOURCE_KEYS`, `isSignupSource(value: unknown): value is SignupSource`, `sourceLabel(key)` (data-model.md "Signup source")
- [X] T005 [P] Create `src/lib/signup/phone.ts` exporting `normalisePakistaniMobile(input: string): string | null` (strip spaces/hyphens/dots/parentheses; match `^(?:\+92|92|0)(3\d{9})$`; return `+92` + captured digits, else `null`), `formatPhoneLocal(e164: string): string` (`0` + last ten digits), and `phoneSearchDigits(query: string): string | null` (digits only; leading `0` → `92`; leading `+` dropped; `null` when fewer than 3 digits) — research §2, §5
- [X] T006 [P] Create `src/lib/signup/phone.test.ts` (Vitest): the four brief formats `03001234567`, `0300-1234567`, `+92 300 1234567`, `92 300 1234567` all → `+923001234567`; landline `021-12345678`, `0300123456` (10 digits), `+44 7700 900123`, letters → `null`; `formatPhoneLocal("+923001234567")` → `03001234567`; `phoneSearchDigits("0300 123")` → `92300123`, `("+92300")` → `92300`, `("300123")` → `300123`, `("12")` → `null`
- [X] T007 [P] Create `src/lib/signup/dates.ts` exporting `formatSignupDateTime(date: Date): string` using `Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Karachi", day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false })` → `"22 Sep 2026, 14:05"`, and `csvDateStamp(date: Date): string` → `YYYY-MM-DD` in PKT; add `src/lib/signup/dates.test.ts` asserting a fixed UTC instant renders in PKT (+05:00) — research §10
- [X] T008 Create `src/lib/validation/signup.ts` (depends on T004, T005): `signupInputSchema` per data-model.md — `name` trimmed, internal whitespace collapsed, `min(1, "Name is required.")`, `max(100, "Name must be 100 characters or fewer.")`; `email` trimmed + lower-cased, `z.email("Enter a valid email address.")`, `max(254)`; `phone` trimmed then `transform` via `normalisePakistaniMobile`, issue `"Enter a Pakistani mobile number, e.g. 03001234567."` when `null`; `source: z.enum(SIGNUP_SOURCE_KEYS, { error: "Unknown page." })`; export `SignupInput` (output type) and `fieldErrors(error: z.ZodError): Record<string, string>` with the same shape as `src/lib/validation/news.ts`'s helper (first message per top-level field)
- [X] T009 Create `src/lib/validation/signup.test.ts` (depends on T008): whitespace-only name → "Name is required."; `"  Ali   Khan "` → `"Ali Khan"`; 101-char name → limit message; Urdu name `"علی خان"` accepted unchanged; `" Ali@Example.COM "` → `"ali@example.com"`; `"ali@example"` → email message; 255-char email rejected; each brief phone format → `+923001234567`; landline → phone message; `source: "admission"` → "Unknown page."; `fieldErrors` returns one message per failing field and nothing for passing ones
- [X] T010 Create `src/models/signup.ts` (depends on T004): schema `{ name: String required trim maxlength 100, email: String required unique, phone: String required, sources: [{ type: String, enum: SIGNUP_SOURCE_KEYS }] required, firstSignupAt: Date required, lastSignupAt: Date required }`, `{ timestamps: true, collection: "signups" }`, `softDeletePlugin`, indexes `{ email: 1 }` unique (no partial filter — comment: deleted records keep their email reserved, ADR-0001), `{ lastSignupAt: -1, deletedAt: 1 }`, `{ sources: 1, lastSignupAt: -1 }`; export `SignupDoc`, `Signup` model with `SoftDeleteStatics` using the same `mongoose.models` guard as `src/models/news-post.ts`
- [X] T011 Create `src/lib/signup/mutations.ts` (depends on T008, T010): `upsertSignup(input: SignupInput, now = new Date()): Promise<SignupDoc>` — `connectDb()`, then `Signup.findOneAndUpdate({ email: input.email }, { $set: { name, phone, lastSignupAt: now, deletedAt: null }, $addToSet: { sources: input.source }, $setOnInsert: { firstSignupAt: now } }, { upsert: true, new: true, withDeleted: true, runValidators: true })`; on a duplicate-key error (`code === 11000`, reuse the `isDuplicateKeyError` shape from `src/lib/rate-limit.ts`) retry the identical call once; `deleteSignup(id: string): Promise<{ id: string } | null>` — `null` for an invalid ObjectId or when `softDeleteById` matches nothing (already deleted / unknown); file header comment linking ADR-0001 and stating `withDeleted: true` is permitted only here
- [X] T012 Create `src/lib/signup/mutations.test.ts` `[DB]` (depends on T011; `describeWithDb("upsertSignup", ["signups"], …)`): first submission creates a doc with `firstSignupAt === lastSignupAt === now`, `sources: ["home"]`, stored email lower-cased; `deleteSignup` on a live id returns `{ id }` and sets `deletedAt`; `deleteSignup` on the same id again returns `null`; `deleteSignup("not-an-id")` returns `null` without throwing (update/restore/concurrency cases are added in US2 — T025)
- [X] T013 [P] Create `src/lib/signup/route-errors.ts` exporting `NO_STORE = { "Cache-Control": "no-store" }`, `validationResponse(fields: Record<string, string>)` → `400 { error: "validation", fields }`, `unavailableResponse()` → `503 { error: "unavailable" }`, `notFoundResponse()` → `404 { error: "not_found" }`, `unauthorizedResponse()` → `401 { error: "unauthorized" }` — all with `NO_STORE` (mirrors `src/lib/news/route-errors.ts`; contracts "Common error envelope")
- [X] T014 [P] Create `src/lib/admin-list.ts` by **moving** (not copying) the existing `Paged<T>` interface and `escapeRegExp()` helper out of `src/lib/news/admin-queries.ts`, plus a shared `ADMIN_PAGE_SIZE = 20`; export all three; update `src/lib/news/admin-queries.ts` to import `Paged`, `escapeRegExp`, `ADMIN_PAGE_SIZE` from `@/lib/admin-list` (delete its local definitions) and `src/lib/news/public-queries.ts` to import `Paged` from `@/lib/admin-list`; add `src/lib/admin-list.test.ts` covering `escapeRegExp` (metacharacters `.*+?^${}()|[]\` are escaped; Urdu text passes through); run `npm test` for `src/lib/news/**` to confirm no regression (analysis finding D1 — one shared helper, Constitution VI)

**Checkpoint**: `npm test` green for `phone`, `dates`, `validation/signup`, `mutations` (DB), `admin-list`, and the unchanged news suites. No UI or routes yet.

---

## Phase 3: User Story 1 — Visitor signs up (Priority: P1) 🎯 MVP

**Goal**: The signup band on the Home placeholder page accepts name, email and phone, shows per-field messages, posts to the public route, and shows a thank-you with cleared fields; layout matches the desktop reference via extracted tokens and the clarified narrow layouts.

**Independent Test**: Open `/`, submit with valid details → thank-you and one document in `signups`; submit each field blank or malformed → the matching message next to the field and nothing stored; band renders correctly at 375/768/1024/1440px (quickstart §4 steps 1–2, 8).

### Public API for User Story 1

- [X] T015 [US1] Create `src/app/api/public/signups/route.ts` (depends on T011, T013): `POST` — parse JSON (non-object → `validationResponse({})`); `const check = await protectPublicForm(request, { name: "signup" }, body)`; `check.kind === "honeypot"` → return `Response.json({ ok: true }, { headers: NO_STORE })` **without** touching the DB; `"limited"` → `tooManyRequestsResponse(check.retryAfterSeconds)`; then `signupInputSchema.safeParse(body)` → `validationResponse(fieldErrors(...))` on failure; `await upsertSignup(data)` → `Response.json({ ok: true }, { headers: NO_STORE })`; any thrown error → `unavailableResponse()`; the success body must contain nothing but `ok: true` (contracts/public-signup-api.md; SC-004)
- [X] T016 [US1] Create `src/app/api/public/signups/route.test.ts` `[DB]` (depends on T015; `describeWithDb("POST /api/public/signups", ["signups", "throttle"], …)`): valid body → `200 { ok: true }` + `cache-control: no-store` + one document with normalised email/phone and `sources: ["home"]`; missing name / bad email / landline phone / unknown source → `400` with exactly those `fields` keys; non-JSON body → `400`; mock `upsertSignup` to throw → `503 { error: "unavailable" }` (identical-response, honeypot and 429 cases are added in US2/US5 — T026, T043)

### Tokens for User Story 1 (Constitution V gate — blocks T020–T022)

- [X] T017 [US1] Create `research/extract-signup-tokens.ts` and `research/extract-signup-tokens.browser.js` modelled on `research/extract-news-tokens.ts` / `.browser.js` (Chrome channel; read the browser script as raw text): visit `https://das.edu.pk/` at 375/768/1024/1440, locate the form whose inputs have placeholders `Name`/`Email`/`Phone`, and capture: band `background-color`, `padding-top/bottom`; heading `font-family/size/line-height/weight/color` and the highlighted number's `color`; supporting line `font-size/line-height/weight/color`; input `height`, `padding`, `font-size`, `border`, `border-radius`, `background-color`, `::placeholder` color; horizontal gap between inputs; button `background-color`, `:hover` background, `padding`, `font-size/weight`, `border-radius`, `color`; layout (`row` | `stacked`, computed from bounding boxes); write `research/tokens/signup-<viewport>.json`
- [X] T018 [US1] Run `npx tsx research/extract-signup-tokens.ts` (depends on T017) and add a "Signup band (004 signup)" section to `research/design-tokens.md` with a table of the extracted values per viewport and the token names from contracts/signup-section.md; if the live band's copy, colours or layout differ from `screenshots/das.edu.pk_.png`, **stop and flag the difference to the user** instead of choosing (Constitution I); record the 375/768 live layouts as observed and note that the spec's clarified layouts are the requirement
- [X] T019 [US1] Add the extracted values to `src/app/globals.css` `@theme` (depends on T018) as `--color-signup-band`, `--color-signup-heading`, `--color-signup-highlight`, `--color-signup-supporting`, `--color-signup-input-bg`, `--color-signup-input-placeholder`, `--color-signup-note`, `--text-signup-heading` (+ `--line-height`, `--font-weight`), `--text-signup-heading-sm` (375 value), `--text-signup-supporting`, `--text-signup-input`, `--text-signup-button`, `--spacing-signup-band-y`, `--spacing-signup-input-height`, `--spacing-signup-gap`, `--radius-signup-input`, `--radius-signup-button`, and a `.signup-honeypot` utility (absolute, `left: -10000px`, `width/height: 1px`, `overflow: hidden`) — button colours reuse the existing `color-cta` red / navy hover tokens; also add two **general** semantic tokens for form states, reusable by the contact form (008) and the admin: `--color-error: #f44336` (the reference's `color-cta` red, already used as the admin `--destructive` slot per design-tokens.md "Admin redesign") and `--color-success: #00bcd4` (the reference's `color-accent` cyan) — the reference has no error/success state, so record both in `research/design-tokens.md` under a new "Semantic colours" table and in spec.md "Deviations from the Reference" (analysis finding U1); no raw values in components

### Public UI for User Story 1

- [X] T020 [P] [US1] Create `src/content/signup.ts` per contracts/signup-section.md `SignupCopy`: heading `{ before: "Join Over ", highlight: "300,000", after: " Students Enjoying Dar-e-Arqam School Now", placeholder: true }`, supporting `{ text: "Become Part of Dar-e-Arqam Schools to Further Your Career.", placeholder: true }`, note `{ text: "We will only use these details to contact you about admissions and school updates.", placeholder: true }`, `fields: { name: "Name", email: "Email", phone: "Phone" }`, `submit: "Signup"`, `submitting: "Sending…"`, `success: { title: "Thank you!", body: "We have received your details and will be in touch soon.", again: "Sign up someone else" }`, `errors: { rateLimited: "Please try again shortly.", unavailable: "Something went wrong — please try again." }`; comment each placeholder as client-supplied copy pending (001 convention)
- [X] T021 [US1] Create `src/components/signup/signup-form.tsx` (`"use client"`; depends on T008, T019, T020): props `{ source: SignupSource }`; state `idle | submitting | success` plus `values`, `fieldErrors`, `bannerError`; three inputs (`type` `text`/`email`/`tel`, `name`/`email`/`phone`, `autoComplete` `name`/`email`/`tel`, `required`, `maxLength` 100/254, an `sr-only` `<label>` at **every** width — the placeholder carries the visual label exactly as on the reference — `aria-invalid` + `aria-describedby` → `<p id="signup-<field>-error">` when a message exists); editing a field (`onChange`) deletes that field's entry from `fieldErrors` so its message disappears as soon as the visitor starts correcting it (FR-007); field messages and the banner use `text-error` (from `--color-error`) in bold on a `bg-signup-input-bg` chip beneath the input so the red stays legible against the navy band, and the success title uses `text-success`; on submit run `signupInputSchema.safeParse({ ...values, source })` — on failure set `fieldErrors` from `fieldErrors()` and stop; else `fetch("/api/public/signups", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values, source, website_url: "" }) })`; `200` → `success` state (clear values), `400` → `fieldErrors` from body, `429` → banner `errors.rateLimited`, else/network → banner `errors.unavailable` — values are **kept** on every error; success block replaces the inputs with `success.title`/`body` inside `role="status"` and an `again` button returning to `idle`; submit button shows `submitting` text and is disabled while pending; layout classes: grid one column by default, three-column fields row + full-width button at `md`, single row with the button as a fourth column at `lg` (clarification Q2) using only `--*-signup-*` tokens (honeypot input is added in US5 — T041)
- [X] T022 [US1] Create `src/components/signup/signup-section.tsx` (Server Component; depends on T020, T021): props `{ source: SignupSource; id?: string }` (default `id="signup"`); `<section id aria-labelledby="signup-heading" className="bg-signup-band py-signup-band-y">` → container (`max-w-(--container-max-width) px-(--container-gutter-x)`) → `<h2 id="signup-heading" data-placeholder={heading.placeholder || undefined}>` with `before`, `<span className="text-signup-highlight">highlight</span>`, `after` → `<p data-placeholder>` supporting → `<SignupForm source={source} />` → `<p data-placeholder>` note; text-align centre; colours/sizes via tokens only
- [X] T023 [US1] Place the section on the Home placeholder: `src/app/(public)/page.tsx` renders `<PagePlaceholder title="Home" />` followed by `<SignupSection source="home" />`; update `src/app/(public)/page.test.tsx` to also assert `screen.getByRole("heading", { name: /Join Over/ })` and the three textboxes (`Name`, `Email`, `Phone`) are present

### Tests for User Story 1

- [X] T024 [P] [US1] Create `src/components/signup/signup-form.test.tsx` (jsdom, `@testing-library/react`, mock `global.fetch`): empty submit → three "required" messages, `fetch` not called; bad email + landline → the two messages next to those fields; after those errors, typing one character into the email field removes the email message while the phone message stays (FR-007); every input has an accessible name (`getByRole("textbox", { name: "Name" })` etc.) even though the label is `sr-only`; valid submit with `fetch` resolving `200 { ok: true }` → thank-you visible, inputs gone, `role="status"` contains `success.title`; "Sign up someone else" → empty inputs back; `fetch` resolving `400 { fields: { email: "x" } }` → message shown and typed values still in the inputs; `fetch` rejecting → `errors.unavailable` banner and values kept; sent body has `source: "home"` and normalised-by-server fields untouched (client sends raw values)
- [X] T025 [P] [US1] Create `e2e/signup-public.spec.ts` (`forms` project; `beforeEach`: `clearThrottle()` + `clearSignups()`): on `/` the band shows the heading, supporting line, three fields, "Signup" button and the note; submit empty → three required messages, `findSignupByEmail` → `null`; submit `Ali Khan` / `Ali@Example.COM` / `0300-1234567` → thank-you visible, fields absent, `findSignupByEmail("ali@example.com")` has `phone: "+923001234567"`, `sources: ["home"]`, `firstSignupAt` equals `lastSignupAt` (repeat, rate-limit and honeypot cases are added in US2/US5 — T028, T044)
- [X] T026 [P] [US1] Create `e2e/signup-visual.spec.ts` (`forms` project): for each of 375/768/1024/1440 `setViewportSize`, open `/`, scroll the band into view, assert `document.documentElement.scrollWidth <= clientWidth` (pattern from `e2e/news-public.spec.ts`), assert the computed band background equals the `--color-signup-band` value from `research/tokens/signup-<width>.json`, and assert layout: at 375 the three inputs' bounding boxes stack (each `x` equal, increasing `y`); at 768 the three inputs share one `y` and the button's `y` is below them with width ≈ the row width; at 1024/1440 all four share one `y`; take `page.screenshot` of the band to `test-results/signup-<width>.png` for manual comparison with `screenshots/das.edu.pk_.png`

**Checkpoint**: A visitor can sign up from `/` end to end; `npm run test:e2e -- --project=forms` passes for T025/T026. This is the MVP.

---

## Phase 4: User Story 2 — One record per person (Priority: P1)

**Goal**: Prove and expose the upsert semantics: same email in any casing/spacing updates one record, keeps the first date, advances the latest date, accumulates pages, survives concurrent submissions, and the visible response is identical for new and returning emails.

**Independent Test**: Sign up as `Ali@Example.com` from Home, then ` ali@example.com ` with a new name/phone from Resources; one document with the new name/phone, original `firstSignupAt`, updated `lastSignupAt`, `sources: ["home", "resources"]`; both responses byte-identical (quickstart §4 step 3).

- [X] T027 [US2] Extend `src/lib/signup/mutations.test.ts` `[DB]` (depends on T012): second `upsertSignup` with `" ALI@example.com "`-normalised input (schema-parsed), new name + phone, `source: "resources"`, later `now` → still one document (`countDocuments({ email }).setOptions({ withDeleted: true })` = 1), name/phone updated, `firstSignupAt` unchanged, `lastSignupAt` = second `now`, `sources` = `["home", "resources"]`; third submission from `"home"` → `sources` unchanged (no duplicate); **concurrency**: `Promise.all` of 10 `upsertSignup` calls for one new email with distinct names → exactly one document, `firstSignupAt` ≤ every `lastSignupAt`, no rejected promise (research §9, ADR-0001)
- [X] T028 [US2] Extend `src/app/api/public/signups/route.test.ts` `[DB]` (depends on T016): POST `Ali@Example.COM` then ` ali@example.com ` with different name/phone → both responses have status `200`, identical `await response.text()`, identical header names/values (excluding `date`), and one document exists afterwards (SC-004, spec US2 scenario 4)
- [X] T029 [US2] Extend `e2e/signup-public.spec.ts` (depends on T025): after the first signup click "Sign up someone else", submit ` ALI@example.com ` / `Ali Ahmed Khan` / `+92 300 1234567` → the same thank-you text; `findSignupByEmail("ali@example.com")` shows the new name, `lastSignupAt > firstSignupAt`, `sources: ["home"]`; seed a document with `sources: ["resources"]` via `seedSignups`, sign up with that email from `/` → `sources` contains both `resources` and `home`
- [X] T030 [P] [US2] Add a unit test to `src/lib/validation/signup.test.ts` (depends on T009) asserting that `"Ali@Example.COM"`, `" ali@example.com "` and `"ALI@EXAMPLE.COM"` all parse to the same `email` value, since the natural key relies on schema normalisation (ADR-0001 "Identity")

**Checkpoint**: US1 + US2 tests green; the identity rule is proven under casing, spacing, page mixing and concurrency.

---

## Phase 5: User Story 3 — Admin views signups (Priority: P1)

**Goal**: `/admin/signups` lists leads newest first with name, email (`mailto:`), phone (`tel:`, shown as `03…`), pages, first and latest dates; one search box (name/email/phone), a page filter, 20 per page; empty state; overview card shows the real count; every admin surface rejects unauthenticated requests.

**Independent Test**: Seed 45 signups across both pages (some Urdu names); as admin, find one by name, by email fragment and by `0300 123`; filter to Resources; page 1→2→3 keeps `q` and `source`; click an email/phone link and check `href`; log out and request `/admin/signups` → redirect to login (quickstart §4 step 4).

### Queries and copy for User Story 3

- [X] T031 [US3] Create `src/lib/signup/admin-queries.ts` (depends on T005, T007, T010): `SignupRow` DTO and `ListSignupsOptions { q?: string; source?: string; page?: number }` per data-model.md; import `Paged<T>`, `escapeRegExp` and `ADMIN_PAGE_SIZE` from `@/lib/admin-list` (T014 — never from the news module); `listSignups(options)` — `connectDb()`, page ≥ 1, `filter.$or = [{ name: rx }, { email: rx }, { phone: rxDigits }]` where `rx` is the escaped case-insensitive regex of the trimmed `q` and the phone branch is included only when `phoneSearchDigits(q)` is non-null (regex of those digits); `filter.sources = source` when `isSignupSource(source)`; `countDocuments` + `find().sort({ lastSignupAt: -1, updatedAt: -1 }).skip().limit(20)`; map docs to `SignupRow` (`phoneDisplay: formatPhoneLocal`, ISO dates); `countSignups(): Promise<number>` → `Signup.countDocuments({})`; `findSignupsForExport(options)` — same filter, `sort`, `.lean()`, returns `SignupRow[]` with no paging (used by US6)
- [X] T032 [US3] Create `src/lib/signup/admin-queries.test.ts` `[DB]` (depends on T031; seed via the model with `withDeleted`-free inserts): default order is `lastSignupAt` desc; `q: "khan"` matches by name case-insensitively; `q: "علی"` matches an Urdu name; `q: "ali@ex"` matches by email; `q: "0300 123"` and `q: "+92 300 123"` both match `+923001234567`; `q: "zz"` (no phone digits) does not throw; `source: "resources"` returns only docs whose `sources` contain it; `source: "bogus"` behaves like `all`; 45 docs → `totalPages: 3`, page 3 has 5 items; a soft-deleted doc is excluded from `listSignups`, `countSignups` and `findSignupsForExport`; `countSignups` = live docs only; **performance (SC-006)**: insert 120 docs with varied names/emails/phones, then time `listSignups({ q: "khan" })`, `listSignups({ q: "ali@" })` and `listSignups({ q: "0300 12" })` with `performance.now()` and assert each resolves in under 1000 ms (warm connection; run once before timing)
- [X] T033 [P] [US3] Add `signupsCopy` to `src/content/admin.ts`: `pageTitle: "Signups"`, `table.headers { name, email, phone, pages, first: "First signup", latest: "Latest signup", actions }`, `table.empty: "No signups yet."`, `table.emptyFiltered: "No signups match your search."`, `table.delete: "Delete"`, `filters { searchPlaceholder: "Search by name, email or phone…", sourceAll: "All pages" }`, `pagination { pageOf(page, total), previous, next }` (same strings as `newsCopy.pagination`), `deleteDialog { title: "Delete this signup?", body: "The signup will be removed from the list. If this person signs up again, their record will be restored.", cancel, confirm }`, `toasts { deleted: "Signup deleted", gone: "This signup is no longer available", unavailable }`, `export: "Export CSV"`

### Shared pagination lift (Constitution VI) for User Story 3

- [X] T034 [US3] Create `src/components/admin/admin-pagination.tsx` by moving the body of `src/components/admin/news/news-pagination.tsx`: export `AdminPagination({ page, totalPages, basePath, searchParams, copy })` where `copy = { pageOf, previous, next }` and `hrefFor` builds `${basePath}?${params}`; then rewrite `src/components/admin/news/news-pagination.tsx` as `export function NewsPagination(props) { return <AdminPagination {...props} basePath="/admin/news" copy={newsCopy.pagination} />; }` keeping its exported `AdminNewsPaginationProps` so `src/app/admin/(dashboard)/news/page.tsx` and its tests are untouched; run `npm test` and `e2e/admin-news-list.spec.ts` to confirm no regression

### Admin UI for User Story 3

- [X] T035 [P] [US3] Create `src/components/admin/signups/signups-table-filters.tsx` (`"use client"`; depends on T033): copy of `src/components/admin/news/news-table-filters.tsx` with one debounced `Input` (`aria-label` = `signupsCopy.filters.searchPlaceholder`) and one `Select` (`aria-label="Page"`, options `all` + `SIGNUP_SOURCES`), writing `q`/`source` to the URL and deleting `page` on any change
- [X] T036 [US3] Create `src/components/admin/signups/signups-table.tsx` (Server Component; depends on T031, T033): `Table` with headers from `signupsCopy.table.headers`; per row — Name in `<span dir="auto" className="font-bold text-foreground">` plus the `font-body-urdu` class when `/[؀-ۿ]/.test(name)`, Email `<a href={`mailto:${email}`}>`, Phone `<a href={`tel:${phone}`}>{phoneDisplay}</a>`, Pages as one `Badge variant="secondary"` per `sourceLabel(s)`, First/Latest via `formatSignupDateTime(new Date(iso))`, Actions cell left as an empty `<div />` with a `// TODO(T042): DeleteSignupDialog` comment (filled in US4); empty-state row spanning 7 columns showing `table.emptyFiltered` when `q`/`source` are set, else `table.empty` (props `{ rows, filtered: boolean }`)
- [X] T037 [US3] Replace `src/app/admin/(dashboard)/signups/page.tsx` (depends on T031, T034, T035, T036): `await requireAdminSession()`; read `q`, `source`, `page` from `searchParams` like the news page; `listSignups(...)`; render title row (`h1` = `signupsCopy.pageTitle`, right side reserved for the Export link added in US6 — T048), `<SignupsTableFilters />`, `<SignupsTable rows filtered />`, `<AdminPagination page totalPages basePath="/admin/signups" searchParams={{ q, source }} copy={signupsCopy.pagination} />`; `export const dynamic = "force-dynamic"`; remove the `AdminPlaceholder` import
- [X] T038 [US3] Wire the overview count in `src/app/admin/(dashboard)/page.tsx` (depends on T031): `const signupsCount = await countSignups()` alongside `countPublishedPosts()`, pass it to `<StatCard title="Signups" …/>`, delete the `SIGNUPS_COUNT` constant and reword the TODO to `TODO(007-contact)` for messages only (FR-023a)

### Tests for User Story 3

- [X] T039 [P] [US3] Create `e2e/admin-signups-list.spec.ts` (`admin` project; `beforeEach`: `clearSignups()`; seed via `seedSignups`): unauthenticated `page.goto("/admin/signups")` → URL matches `/admin/login?next=%2Fadmin%2Fsignups`; after `loginAsAdmin`: 25 seeded rows → first row is the most recent `lastSignupAt`, 20 rows on page 1, "Next" → page 2 with 5 rows; seed an Urdu name `علی خان` → row text visible and `dir="auto"` present; search `"khan"` → only matching rows; search `"0300 123"` → the `+923001234567` row; filter "Resources" → only rows with that badge; with `q=ali&source=home` click "Next" → URL keeps both params; email cell `href` starts with `mailto:`, phone cell `href` equals `tel:+923001234567` and text is `03001234567`; no rows → `table.empty` text; overview `/admin` "Signups" card shows the seeded live count

**Checkpoint**: Admin can find and page through leads; overview count is live; unauthenticated page access redirects. US1–US3 (all P1) complete.

---

## Phase 6: User Story 4 — Admin deletes a signup (Priority: P2)

**Goal**: Delete from the table with a confirmation dialog (soft delete); deleted leads vanish from list/search/export; a re-signup restores the same record.

**Independent Test**: Delete a seeded lead after confirming → row gone, toast; cancel → nothing changes; sign up again with that email from `/` → the single record is back with its original `firstSignupAt` (quickstart §4 step 5).

- [X] T040 [US4] Create `src/app/api/admin/signups/[id]/route.ts` (depends on T011, T013): `DELETE` — `requireAdminSession({ mode: "api" })` → `unauthorizedResponse()` when null; `const result = await deleteSignup(id)` → `notFoundResponse()` when null, else `Response.json({ id, deleted: true }, { headers: NO_STORE })`; thrown → `unavailableResponse()` (contracts/admin-signups-api.md)
- [X] T041 [US4] Create `src/app/api/admin/signups/[id]/route.test.ts` `[DB]` (depends on T040; `describeWithDb(..., ["signups", "user", "account", "session"], …)`, session via `seedTestAdmin`/`getTestSessionCookie` and the `next/headers` mock pattern from `src/app/api/admin/news/route.test.ts`): no session → `401 { error: "unauthorized" }` + `no-store`; with session, live id → `200 { id, deleted: true }` and the doc has `deletedAt`; same id again → `404`; malformed id → `404`
- [X] T042 [US4] Create `src/components/admin/signups/delete-signup-dialog.tsx` (`"use client"`; depends on T033): copy of `src/components/admin/news/delete-post-dialog.tsx` — trigger `Button variant="ghost" size="icon-sm" aria-label={`${signupsCopy.table.delete}: ${name}`}`, `AlertDialog` with `signupsCopy.deleteDialog`, on confirm `fetch(`/api/admin/signups/${id}`, { method: "DELETE" })` → `200` toast `toasts.deleted` + `router.refresh()`; `404` toast `toasts.gone` + `router.refresh()`; else/throw toast `toasts.unavailable`; then replace the `<div />` placeholder in `src/components/admin/signups/signups-table.tsx` Actions cell with `<DeleteSignupDialog id={row.id} name={row.name} />` and remove the `TODO(T042)` comment
- [X] T043 [US4] Extend `src/lib/signup/mutations.test.ts` `[DB]` (depends on T027): after `deleteSignup`, `upsertSignup` with the same email → the **same** `_id`, `deletedAt: null`, `firstSignupAt` unchanged, `lastSignupAt` updated, previous `sources` retained plus the new one; `listSignups` (import from admin-queries) shows it again; without `withDeleted: true` in the upsert options the call would throw `E11000` — assert the production path does **not** throw (regression guard for ADR-0001's `withDeleted` rule)
- [X] T044 [P] [US4] Create `e2e/admin-signups-delete-restore.spec.ts` (`admin` project): seed one lead with `firstSignupAt` two days ago; login; click its Delete → dialog → Cancel → row still present; Delete → Confirm → row gone, toast `toasts.deleted`, `findSignupByEmail(email, { withDeleted: true })` has `deletedAt`; then open `/` in the same context and sign up with that email and a new name → thank-you; reload `/admin/signups` → one row with the new name and the two-days-ago first date; delete it in a second tab, then confirm in the first tab's already-open dialog → toast `toasts.gone` and the row disappears after refresh

**Checkpoint**: Delete/restore round-trips through the admin and the public form; every admin route so far has a 401 test.

---

## Phase 7: User Story 5 — Spam and abuse protection (Priority: P2)

**Goal**: The sixth submission from one source within ten minutes is refused with a friendly message and kept values; a filled hidden spam-trap field is discarded while showing the normal thank-you; the trap is invisible to real visitors and assistive tech.

**Independent Test**: Submit valid details six times quickly → sixth shows "Please try again shortly." with values kept and no sixth write; POST with `website_url: "x"` → `200 { ok: true }` and no document (quickstart §4 step 6).

- [ ] T045 [US5] Add the honeypot to `src/components/signup/signup-form.tsx` (depends on T021): inside `<div aria-hidden="true" className="signup-honeypot">` render `<label htmlFor="signup-website">Website</label><input id="signup-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" value={website} onChange=… />` (import `HONEYPOT_FIELD` from `@/lib/honeypot`); send its current value as `website_url` in the POST body instead of the hard-coded `""`; keep the `429` → `errors.rateLimited` banner (already in T021) and add a `role="alert"` on the banner so it is announced
- [ ] T046 [US5] Extend `src/components/signup/signup-form.test.tsx` (depends on T024, T045): the honeypot input is not in the accessibility tree (`queryByRole("textbox", { name: "Website" })` is `null`) and has `tabIndex -1`; a `429` response → `errors.rateLimited` alert visible and all three values still in the inputs; filling the honeypot programmatically sends `website_url: "x"` in the body
- [ ] T047 [US5] Extend `src/app/api/public/signups/route.test.ts` `[DB]` (depends on T028): body with `website_url: "http://spam"` → `200 { ok: true }` (byte-identical to a real success) and `countDocuments` (with `withDeleted`) is `0`; six valid POSTs with the same `x-forwarded-for` → first five `200`, sixth `429 { error: "too_many_requests" }` with a numeric `Retry-After` header and only the expected documents stored; a different `x-forwarded-for` on the sixth → `200` (per-source limit)
- [ ] T048 [P] [US5] Extend `e2e/signup-public.spec.ts` (depends on T029): `clearThrottle()` then submit five distinct valid emails via the UI (using "Sign up someone else" between them), the sixth → `role="alert"` with `errors.rateLimited`, inputs still hold the typed values, `findSignupByEmail(sixthEmail)` → `null`; separately, `page.request.post("/api/public/signups", { data: { …valid, website_url: "bot" } })` → status `200`, body `{ ok: true }`, no document; assert the honeypot via `page.locator('input[name="website_url"]')` — it exists, has `tabindex="-1"`, is `not.toBeInViewport()`, and `page.getByRole("textbox", { name: "Website" })` resolves to zero elements (its `aria-hidden` wrapper keeps it out of the accessibility tree)

**Checkpoint**: Both 002 protections are proven on this form at the route and the UI.

---

## Phase 8: User Story 6 — Export (Priority: P3)

**Goal**: "Export CSV" downloads every lead matching the current search and page filter as a UTF-8-BOM CSV that opens correctly in Excel, including Urdu names.

**Independent Test**: With `q=khan&source=home` applied, click Export → `signups-YYYY-MM-DD.csv` downloads; file starts with `﻿`, header row, one row per matching lead in list order, Urdu name intact, a name containing `"` and `,` stays in one cell (quickstart §4 step 7).

- [ ] T049 [P] [US6] Create `src/lib/signup/csv.ts` exporting `CSV_HEADERS = ["Name", "Email", "Phone", "Pages", "First signup", "Latest signup"]`, `csvField(value: string): string` (prefix `'` when the value starts with `=`, `+`, `-`, `@`, `\t` or `\r`; wrap in `"`; double inner `"`), `signupsToCsv(rows: SignupRow[]): string` → `"﻿"` + header + rows joined with `\r\n` (trailing `\r\n`), Pages as `sourceLabel` joined by `"; "`, Phone as `phoneDisplay`, dates via `formatSignupDateTime` — research §7
- [ ] T050 [P] [US6] Create `src/lib/signup/csv.test.ts`: output starts with `﻿`; header line exact; `Ali "AK" Khan, Jr.` → `"Ali ""AK"" Khan, Jr."`; `=SUM(1)` → `"'=SUM(1)"`; `+92…` name-like value gets the `'` prefix but a phone column value `03001234567` does not; Urdu name round-trips unchanged; two sources → `"Home; Resources"`; zero rows → BOM + header only; lines end with `\r\n`
- [ ] T051 [US6] Create `src/app/api/admin/signups/export/route.ts` (depends on T031, T049): `GET` — `requireAdminSession({ mode: "api" })` → `401`; read `q`/`source` from `new URL(request.url).searchParams`; `findSignupsForExport({ q, source })` → `new Response(signupsToCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="signups-${csvDateStamp(new Date())}.csv"`, ...NO_STORE } })`; thrown → `unavailableResponse()`
- [ ] T052 [US6] Create `src/app/api/admin/signups/export/route.test.ts` `[DB]` (depends on T051): no session → `401` + `no-store`; with session and three seeded leads (one Urdu, one deleted) → `200`, `content-type` `text/csv; charset=utf-8`, `content-disposition` matches `attachment; filename="signups-\d{4}-\d{2}-\d{2}\.csv"`, body starts with `﻿`, contains 2 data rows (deleted excluded) in `lastSignupAt` desc order, includes the Urdu name; `?source=resources` narrows rows; `?q=nomatch` → header only
- [ ] T053 [US6] Add the Export link to `src/app/admin/(dashboard)/signups/page.tsx` (depends on T037, T051): in the title row's right slot render `<a href={`/api/admin/signups/export?${new URLSearchParams({ ...(q && { q }), ...(source && source !== "all" && { source }) })}`} download className={buttonVariants({ variant: "outline" })}>{signupsCopy.export}</a>`
- [ ] T054 [P] [US6] Create `e2e/admin-signups-export.spec.ts` (`admin` project): seed leads including `علی خان` and `Ali "AK" Khan, Jr.` across both pages; login; apply `q=khan&source=home`; `const [download] = await Promise.all([page.waitForEvent("download"), page.getByRole("link", { name: signupsCopy.export }).click()])`; `download.suggestedFilename()` matches `signups-….csv`; read the file → starts with `﻿`, header row, only the filtered rows, the Urdu name and the quoted punctuated name each in one cell; unauthenticated `page.request.get("/api/admin/signups/export")` → `401`

**Checkpoint**: All six user stories independently testable; every admin route (`DELETE`, `export`) and the admin page have unauthorized tests.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, final verification, and the definition-of-done sweep (Constitution VIII).

- [ ] T055 [P] Update `docs/architecture.md`: add `src/lib/signup/*` and `src/models/signup.ts` (collection `signups`) to the directory map; `src/components/signup/` (SignupSection, SignupForm) and `src/components/admin/signups/` + `admin-pagination.tsx`; `/api/public/signups` under API namespaces; a "Signup (004) data rules" note pointing to ADR-0001 (one-per-person upsert with restore; contact messages append-only); the `forms` Playwright project rationale; `e2e/helpers/signups.ts` and `research/extract-signup-tokens.ts`
- [ ] T056 [P] Add the `signups` collection and `#signup` anchor to `specs/004-signup/spec.md`'s "Deviations from the Reference" if T018 recorded any live-site difference; otherwise no edit — record the outcome in the T018 PHR note
- [ ] T057 Run `npm run lint`, `npx tsc --noEmit`, `npm test`, `npm run test:e2e -- --project=forms`, `npm run test:e2e -- --project=admin`, and `npm run test:e2e -- --project=chromium` (regression for 001/003 public specs after the `testIgnore` change); fix anything that fails
- [ ] T058 Walk `specs/004-signup/quickstart.md` §4 by hand in a browser (steps 1–8), including opening the exported CSV in Excel on Windows to confirm the Urdu name renders; compare `test-results/signup-1440.png` against `screenshots/das.edu.pk_.png` and note any pixel-level deviation in the spec's Deviations section
- [ ] T059 Grep the diff for raw colour/size values in `src/components/signup/**` and `src/components/admin/signups/**` (`rg "#[0-9a-fA-F]{3,6}|\[\d+px\]" src/components/signup src/components/admin/signups`) and replace any hit with a token (Constitution V); confirm `withDeleted` appears only in `src/lib/signup/mutations.ts` and test files (`rg withDeleted src/lib/signup src/app`)

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001–T003 all `[P]`, no dependencies.
- **Foundational (Phase 2)**: T004–T007 `[P]` → T008 → T009; T010 (after T004) → T011 (after T008, T010) → T012; T013 `[P]`; T014 `[P]` (touches only `src/lib/admin-list.ts` and the two news query files; must land before T031). **Blocks every story.**
- **US1 (Phase 3)**: T015 → T016; T017 → T018 → T019 (token gate) → T021 → T022 → T023; T020 `[P]` any time after Phase 2; T024–T026 after T023.
- **US2 (Phase 4)**: T027 after T012; T028 after T016; T029 after T025; T030 after T009. Independent of US3–US6.
- **US3 (Phase 5)**: T031 → T032; T033 `[P]`; T034 (independent of T031); T035 after T033; T036 after T031+T033; T037 after T031, T034, T035, T036; T038 after T031; T039 after T037, T038.
- **US4 (Phase 6)**: T040 → T041; T042 after T033 and T036; T043 after T027; T044 after T042 and US1 (public form for the restore step).
- **US5 (Phase 7)**: T045 after T021; T046 after T024+T045; T047 after T028; T048 after T029+T045.
- **US6 (Phase 8)**: T049 `[P]` → T050; T051 after T031+T049 → T052; T053 after T037+T051; T054 after T053.
- **Polish (Phase 9)**: after all desired stories.

### User Story Dependencies

- **US1 (P1)**: needs only Foundational. MVP.
- **US2 (P1)**: needs Foundational; its E2E extension (T029) needs US1's spec file. Otherwise independent.
- **US3 (P1)**: needs Foundational only; can be built in parallel with US1 by a second developer (different files).
- **US4 (P2)**: needs US3 (table Actions cell) and, for the E2E restore step, US1.
- **US5 (P2)**: needs US1 (form) — route-level tests need only Foundational + T015.
- **US6 (P3)**: needs US3 (query module and page).

### Within Each User Story

- Pure helpers → schema/model → mutation/query → route → component → page → tests.
- Token extraction (T017–T019) must finish before any public styling (T021, T022).
- Each story's DB tests are added to the same test file as earlier phases where noted; run the file after each extension.

### Parallel Opportunities

- Phase 1: T001, T002, T003 together.
- Phase 2: T004, T005, T006, T007, T013, T014 together; then T008/T010; then T009/T011; then T012.
- After Phase 2: **US1 and US3 in parallel** (disjoint files); T020 and T017 can start immediately.
- US1: T024, T025, T026 together after T023.
- US3: T033, T034 together; T035 with T036; T039 alone at the end.
- US6: T049/T050 while T051 waits on T031.
- Polish: T055, T056 together.

---

## Parallel Example: User Story 1 + User Story 3 (two developers after Phase 2)

```bash
# Developer A — US1
Task: "T017 research/extract-signup-tokens.ts + .browser.js"
Task: "T020 src/content/signup.ts"
# then T018 → T019 → T021 → T022 → T023 → T024/T025/T026

# Developer B — US3
Task: "T031 src/lib/signup/admin-queries.ts"
Task: "T033 signupsCopy in src/content/admin.ts"
Task: "T034 src/components/admin/admin-pagination.tsx (+ news-pagination wrapper)"
# then T032, T035/T036 → T037 → T038 → T039
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 (T001–T003) and Phase 2 (T004–T013).
2. Phase 3 (T015–T026): the public form on `/` writing to `signups`.
3. **STOP and VALIDATE**: `npm test`, `npm run test:e2e -- --project=forms`; hand-check quickstart §4 steps 1–2 and 8.

### Incremental Delivery

1. + US2 (T027–T030) → identity rule proven → demo the "same person twice" case.
2. + US3 (T031–T039) → admin can see leads → demo.
3. + US4 (T040–T044) → delete/restore.
4. + US5 (T045–T048) → protection proven.
5. + US6 (T049–T054) → CSV.
6. Polish (T055–T059).

### Notes

- `[DB]` Vitest files need `MONGODB_URI` in `.env.local`; they skip with a warning otherwise — do not treat a skip as a pass when closing a checkpoint.
- Never add a route, Server Action or page that clears throttle state (research §8 boundary); tests use `clearThrottle()` from the test process only.
- `withDeleted: true` is allowed in `src/lib/signup/mutations.ts` only (ADR-0001); T059 enforces it.
- Commit after each phase checkpoint; the 003 work still uncommitted on this branch should be committed or stashed before T001.
