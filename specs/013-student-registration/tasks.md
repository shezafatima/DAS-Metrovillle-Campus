---
description: "Task list for 013-student-registration"
---

# Tasks: Student Registration — Admission Form, Window Enforcement and Main-Admin Registrations

**Input**: Design documents from `/specs/013-student-registration/`
**Prerequisites**: plan.md, spec.md, research.md (§1–§18), data-model.md, contracts/ (public-registration-api, admin-registrations-api, registration-page, settings-admission-classes, access-matrix-delta), quickstart.md
**Decisions in force**:
- ADR-0012 (Accepted 2026-10-15): append-only, read-time duplicate flag, at-rest encryption only, main admin only with a 404 for content managers, 30-day deletion grace with restore, visit-triggered sweep.
- ADR-0011: admission window. Its Apply Now condition is amended to "window AND class list not empty".
- Spec Clarification Q1: purge 30 days after deletion; restorable until then.

**Tests**: Requested by the spec (SC-005, SC-006, SC-012, acceptance list) and Constitution XI:
- E2E for every story
- three access cases for every admin entry point
- window boundaries with a non-Pakistan TZ
- four widths and axe

Test tasks come before or alongside the code they cover.

**Working rules for every task** (project memory and constitution):
- **Heavy processes:**
  - Never run `npm run build` and Playwright at the same time.
  - Never run DB-backed Vitest and Playwright at the same time (they share the test database).
- **DB-backed Vitest:**
  - Run with `bash scripts/with-test-env.sh npx vitest run <files>`, or they silently skip.
  - Add `vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 })` to each such file.
  - For files with no DOM, use `--environment=node`.
- **Playwright:**
  - About 35 admin E2E tests already fail on unchanged code. Record a baseline failure set before Phase 3 and compare sets; don't expect a green suite.
  - Pre-start a dev server with `MONGODB_DB_NAME=dar_e_arqam_test NEWS_COVER_VERIFY=skip NEXT_PUBLIC_NOTIFICATIONS_POLL_MS=3000 E2E_FRESH_READS=1`. Use `NEXT_DIST_DIR=.next-e2e npm run dev -- --port 3100`.
  - Warm pages with curl first; give login waits 90 s.
  - Use `locator('p[role="alert"]')`, not `getByRole("alert")`.
- **Access inventory:** every new admin page, route or public route goes into `src/test/access-inventory.test.ts` EXPECTED **in the same task that creates it**.
- **Privacy:**
  - No registration field value may appear in any `logSecurityEvent`, `console.*`, error body, notification or public response. Log the registration `_id` only.
  - Never put `error.message` in a log or a response.
- **Design and copy:**
  - Every design value comes from a named token in `research/design-tokens.md`; extract new ones first.
  - Copy lives in `src/content/registration.ts` (public) and `src/content/admin.ts` (admin).
- **Constants:** `REGISTRATION_DELETE_GRACE_DAYS`, `MIN_AGE`, `MAX_AGE`, `REFERENCE_LENGTH` and `REFERENCE_ALPHABET` are written only in `src/lib/registration/rules.ts`.
- **Editing files:**
  - `docs/*.md` and `specs/**` use CRLF.
  - Multi-line edit scripts go in a scratchpad `.cjs` file run with `node`, never inline `node -e`.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US8 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: environment, logging vocabulary, shared helpers lifted out of careers, baseline.

- [ ] T001 Record the Playwright baseline: with the E2E dev server pre-started (working rules), run `npx playwright test --project=admin --project=forms` and save the failing set (`file:line › title`) to the scratchpad as `baseline-013.txt`. Do not fix anything.
- [X] T002 Extend `src/lib/env.ts` with `REGISTRATION_RETENTION_MONTHS`, copying the `CAREERS_RETENTION_MONTHS` parsing exactly: optional, blank → default 12, whole number 1–120, messages naming `REGISTRATION_RETENTION_MONTHS` (research §16).
- [X] T003 [P] Add cases to `src/lib/env.test.ts` for `REGISTRATION_RETENTION_MONTHS`: default 12; accepts 1 and 120; rejects 0, 121 and "6.5" with a message naming the variable; blank → default.
- [X] T004 [P] Document `REGISTRATION_RETENTION_MONTHS=12` (no secret) in `.env.example`, with a comment that production must set it explicitly (release gate).
- [X] T005 [P] Add to `SecurityEventType` in `src/lib/log.ts`: `registration_status_changed`, `registration_deleted`, `registration_restored`, `registration_exported`, `registration_save_failed` and `registrations_sweep_failed`. Add a comment that `target` carries the registration id only.
- [X] T006 [P] Lift `retentionCutoff(now, months)` from `src/lib/careers/retention.ts` into a new `src/lib/retention.ts`. Re-export or import it in careers so `src/lib/careers/retention.test.ts` still passes unchanged.
- [X] T007 [P] Add `collapseInlineSpaces(value)` to `src/lib/validation/field-errors.ts`: CRLF/CR → LF, trim the whole value, collapse runs of spaces and tabs within each line to one space, trim each line's ends, collapse 3+ consecutive newlines to 2 (research §4). Add cases to its test file (`src/lib/validation/field-errors.test.ts`, created if missing).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: data model, rules, the shared schema, the Settings class list and the single "registration open" answer. Every story needs these.

**⚠️ CRITICAL**: No user story work begins until this phase is complete.

### Rules and pure helpers

- [X] T008 Create `src/lib/registration/rules.ts`, which exports:
  - `REGISTRATION_DELETE_GRACE_DAYS = 30`, `MIN_AGE = 2`, `MAX_AGE = 18`, `REFERENCE_LENGTH = 8`, `REFERENCE_ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ"`
  - `REGISTRATION_STATUSES = ["new", "contacted", "admitted", "not_admitted"] as const` and type `RegistrationStatus`
  - `MOTHER_TONGUES = ["urdu", "english", "sindhi", "punjabi", "pashto", "balochi", "saraiki", "other"] as const` and type `MotherTongue`
- [X] T009 [P] Create `src/lib/registration/age.ts` with `ageOn(dob: string, today: string): number`. It counts whole years by comparing `"MM-DD"` substrings, so a 29 Feb birthday is reached on 1 Mar in non-leap years (research §3). Add `isValidCalendarDate` reuse from `src/lib/settings/schema` (`isCalendarDate`). Create `src/lib/registration/age.test.ts`:
  - turns 2 today → 2
  - turns 2 tomorrow → 1
  - 18 years 364 days → 18
  - turns 19 today → 19
  - 29 Feb born, 28 Feb non-leap → not yet; 1 Mar → reached
  - leap-year 29 Feb → reached
- [X] T010 [P] Create `src/lib/registration/reference.ts` with `newReference(): string`, using `crypto.randomInt` over `REFERENCE_ALPHABET`, length `REFERENCE_LENGTH`. Create `reference.test.ts`: length 8; only alphabet chars (no 0, O, 1, I, L); 1,000 draws have no sequential pattern and ≥ 990 distinct values.
- [X] T011 [P] Create `src/lib/registration/duplicate-key.ts` with `duplicateKey({ studentName, dateOfBirth, fatherMobile }): string | null`. It returns sha256 hex of `NFC(lower(collapseSpaces(studentName))) + "|" + dateOfBirth + "|" + fatherMobile`, or `null` when `fatherMobile` is null (research §7). Create `duplicate-key.test.ts`: case/space-insensitive equality; Urdu NFC/NFD equality; null without a father's mobile; different DOB → different key.

### Models

- [X] T012 Create `src/models/student-registration.ts` per data-model.md:
  - every field, with `emergencyContact` and `referenceStudent` as nested objects (the latter nullable)
  - `status` enum default `"new"`
  - an embedded `history` array of `{ at, action, from, to, byUserId, byEmail }`
  - `duplicateKey`, `deletedBy`, `softDeletePlugin`, `timestamps: true`, `collection: "studentRegistrations"`
  - indexes: `{ reference: 1 }` unique, `{ createdAt: -1, _id: -1 }`, `{ className: 1, createdAt: -1 }`, `{ duplicateKey: 1 }` sparse
  - a header comment stating the write rule (append-only, ADR-0012) and what is not stored (IP, user agent, raw body)
- [X] T013 [P] Create `src/models/registration-export.ts`: `{ at (indexed), byUserId, byEmail, rows, classFilter: string|null, searched: boolean }`, collection `registrationExports`, no soft delete.
- [X] T014 [P] Extend `src/models/admin-notification-state.ts` with `registrationsLastOpenedAt: { type: Date }`, then add `getRegistrationsLastOpenedAt(adminId)` and `markRegistrationsOpened(adminId, now)` to `src/lib/notifications/state.ts`, mirroring the careers pair (lazy `$ifNull` fill). Add cases to `src/lib/notifications/state.test.ts`.

### Settings: classes list (contract settings-admission-classes.md)

- [X] T015 Add `{ kind: "uniqueText"; field: string; message: string }` to `ListRule` in `src/lib/settings/types.ts`. Implement it in `listSchema` in `src/lib/settings/schema.ts`: compare `collapseSpaces(value).toLowerCase()`, skip empty values, add an issue at `[index, field]` on every later duplicate.
- [X] T016 [P] Add `uniqueText` cases to `src/lib/settings/schema.test.ts`: "Class 1" and " class  1 " refused on the second; distinct names accepted; empty names left to `required`.
- [X] T017 Add the `classes` list field to `src/lib/settings/groups/admission.ts` exactly as in contracts/settings-admission-classes.md (itemFields `name` text required maxLength 50, `inlineFields: ["name"]`, `layout: "cards"`, `summary.title: ["name"]`, `maxItems: 30`, `uniqueText` rule, `default: []`). Add its label, hint, item label and the duplicate message to `settingsCopy` in `src/content/admin.ts`. Update `src/lib/settings/defaults.ts` and `defaults.test.ts` if the group default needs it.
- [X] T018 Extend `PublicAdmission` and the `"admission"` case of `toPublicShape` in `src/lib/settings/public.ts` with `classes: string[]` (the live items' trimmed `name`, in saved order, empty names dropped). Add cases to `src/lib/settings/admission.test.ts`: default `[]`; order kept; deleted items left out.

### Availability (research §2)

- [X] T019 Create `src/lib/registration/availability.ts`:
  - a pure `registrationOpen(state: AdmissionWindowState, classes: readonly string[]): boolean` (open window AND at least one class)
  - a server-only `getRegistrationAvailability(): Promise<{ open: boolean; classes: string[]; closedMessage: string; today: string; now: Date }>`, which calls `getAdmissionWindow()` and reads `classes` from `getPublicSettings("admission")` (same cached reader)
  
  To get "now" (including the `e2e-now` cookie), export `currentTime()` from `src/lib/admission/server.ts` rather than duplicating it. Compute `today` with `karachiToday(now)`.
- [X] T020 [P] Create `src/lib/registration/availability.test.ts` for `registrationOpen`: open + classes → true; open + [] → false; upcoming/closed + classes → false; plus a case like 020's `window.test.ts`: set `process.env.TZ = "America/New_York"`, then `"Asia/Karachi"`, and assert `registrationOpen` and `karachiToday` give the same answers at the boundary instants.

### Shared schema (research §3–§5)

- [X] T021 Add every public string for the form to a new `src/content/registration.ts`:
  - page title, intro line, the six section legends, field labels, hints (medical history helper text exactly "Allergies, conditions or medication the school should know about"; reference group hint), mother-tongue option labels, Yes/No
  - per-field messages including "Enter at least one parent's mobile number." and "Fill in all three reference fields, or leave them all empty."; the class message "Please choose a class from the list."; the age message stating 2 to 18 years
  - banners: closed, rate-limited, unavailable; closed default line "Admissions are currently closed."
  - confirmation text
  - `privacy: { placeholder: true, notice: (months: number) => string, consent: string }`, using the draft wording in spec.md "Draft Privacy Notice" (with the 30-day sentence)
  - `statusLabels` for the four statuses

  Shape the file for a later move to 014 (Constitution VIII).
- [X] T022 Create `src/lib/validation/registration.ts` exporting `buildRegistrationSchema({ classes, today })` and the inferred input/output types, per contracts/public-registration-api.md request keys:
  - single-line text: trim → `collapseSpaces` → NFC → length (2–100; `motherTongueOther` 2–50)
  - text areas: `collapseInlineSpaces` (address 10–300; medicalHistory, remarks ≤ 1000, empty → null)
  - email: trim → lower → `z.email` ≤ 254
  - `dateOfBirth`: `isCalendarDate`, ≤ today, `ageOn` within `MIN_AGE..MAX_AGE`
  - mobiles: empty → null, else `normalisePakistaniMobile` or the shared careers phone message; emergency phone required
  - `className`: must be in `classes`
  - `motherTongue` enum; `motherTongueOther` required only for `other`, else output null
  - `vaccinated` `"yes" | "no"` → boolean
  - reference trio all-or-none (empty trio → `referenceStudent: null`, otherwise each required 2–100)
  - consent `true | "true"`
  - `superRefine` for both mobiles empty, with the issue on both `fatherMobile` and `motherMobile`

  Unknown keys are stripped. Output is shaped for the model (nested `emergencyContact`, `referenceStudent`).
- [X] T023 [P] Create `src/lib/validation/registration.test.ts` covering every FR-002 rule and edge case in spec.md: each required field missing; each length boundary; Urdu names accepted; email lower-cased; age boundaries via a fixed `today`; future DOB; each mobile format normalising to `+923…`; a landline refused; both mobiles empty → two issues; mother's mobile only accepted; Other without text refused; Other text discarded when not Other; reference 1-of-3 and 2-of-3 refused, 0 and 3 accepted, spaces-only counts as empty; class not in list refused; `<b>x</b>` stored as typed; submitted date/status keys ignored.

### Access helper (research §12)

- [X] T024 Add `requireAdminPageOr404(access: Access): Promise<AdminSession>` to `src/lib/dal.ts`. No session gives the same redirect as `requireAdminPage`. On a forbidden denial it calls the existing `logDenied`, then `notFound()` from `next/navigation`. Add unit cases to `src/lib/dal.test.ts` (or the existing DAL test file) with mocked session and headers.
- [X] T025 Extend `src/test/access-inventory.test.ts` with an `Expected` kind `{ kind: "page404"; access: string }`. It asserts exactly one `await requireAdminPageOr404("<access>")` and no `requireAdminPage(`. Don't add any rows yet.

**Checkpoint**: run the Phase 1–2 pure tests (`npx vitest run src/lib/registration src/lib/validation src/lib/settings/schema.test.ts src/lib/env.test.ts --environment=node`) and then the DB ones in the background. All green before Phase 3.

---

## Phase 3: User Story 1 - Parent registers a child while admissions are open (Priority: P1) 🎯 MVP

**Goal**: a valid submission inside the window is saved with a random reference, and the parent sees it. No email or SMS is sent.

**Independent Test**: with the window open and classes listed, submit a valid form → a confirmation with an 8-character reference, an empty form, and exactly one `studentRegistrations` document.

### Tests for User Story 1

- [X] T026 [P] [US1] Create `src/lib/registration/mutations.test.ts` (`describeWithDb`) for `createRegistration`: stores normalised fields, `status: "new"`, `consentAt` and `createdAt` from the server, and `duplicateKey`; retries on a forced duplicate `reference` (stub `newReference` to return a taken value once); gives up after 5 tries with `ReferenceExhaustedError`.
- [X] T027 [P] [US1] Create `src/app/api/public/registrations/route.test.ts` (`describeWithDb`), with Settings seeded open plus classes and `e2e-now` not used (pass a fixed now via a module mock of `getRegistrationAvailability`). Cases: 200 `{ ok, reference }` with one stored record; 400 with field errors and nothing stored; 413 over 64 KiB; 400 for non-object JSON; 403 when closed even with an invalid body; 503 on an insert failure; `checkRateLimit` mocked to throw → 503 `{ error: "unavailable" }`, nothing stored, no seeded value in logs. Spy on `console.log`/`console.error` and assert that none of the seeded names, phones, email, address, DOB, medical text or reference values appear in any captured line or response body.

### Implementation for User Story 1

- [X] T028 [US1] Create `src/lib/registration/mutations.ts` with `createRegistration(input: RegistrationOutput, now = new Date())`. It inserts with `newReference()`, sets `consentAt: now`, computes `duplicateKey(...)`, and retries up to 5 times on Mongo error code 11000 whose key pattern is `reference`. It returns `{ id, reference }`. It never logs field values.
- [X] T029 [US1] Create `src/app/api/public/registrations/route.ts` following contracts/public-registration-api.md order exactly:
  1. size guard 64 KiB → JSON parse

  Wrap steps 2–4 in one `try`: if `protectPublicForm` or `getRegistrationAvailability` throws, log `registration_save_failed` (no fields) and return `unavailableResponse()` (503). Never let an unhandled error become a 500.

  2. `protectPublicForm(request, { name: "registration" }, body)`; honeypot → 200 with `newReference()` (not stored)
  3. limited → `tooManyRequestsResponse`
  4. `getRegistrationAvailability()`; not open → 403 `{ error: "closed", message }` from content
  5. `buildRegistrationSchema({ classes, today })` → `validationResponse(fieldErrors)`
  6. `createRegistration`; on catch → `logSecurityEvent({ type: "registration_save_failed" })` (no other fields) → `unavailableResponse()`
  7. 200 `{ ok: true, reference }` with `NO_STORE`

  Add `"api/public/registrations/route.ts": { kind: "public" }` to EXPECTED in `src/test/access-inventory.test.ts`. (The sweep `after()` is added in T080.)
- [X] T030 [P] [US1] Create `src/components/forms/public-form-styles.ts` exporting the input, textarea, select, label, error and banner class strings now duplicated in `src/components/careers/careers-form.tsx` and `src/components/contact/contact-form.tsx`. The error class must include `font-body`. Switch both forms to import them, with no visual change except the error font if it was wrong.
- [X] T031 [US1] Investigate the serif error-text report (research §5a). Start the dev server, trigger a field error on /contact and /careers, and read `getComputedStyle(errorEl).fontFamily` (Playwright `evaluate` or browser devtools). Record the finding in research.md §5a. If any resolves to a serif face, fix it in `public-form-styles.ts` and note the cause.
- [X] T032 [US1] Token pass: extract any value the registration form needs that isn't yet a token, and add it to `research/design-tokens.md` and the `@theme` in `src/app/globals.css` before use. Candidates: fieldset gap and legend style, select chevron and height, textarea min-height, radio size and gap, the two-column gap at `md`, confirmation panel. Reuse the `signup-*`/`contact-form-*` tokens wherever they fit.
- [X] T033 [US1] Create `src/components/registration/registration-form.tsx` (client) per contracts/registration-page.md:
  - props `{ classes, today, retentionMonths }`
  - six `fieldset`/`legend` sections in the contract's order; a `grid grid-cols-1 md:grid-cols-2` per section, with text areas at `md:col-span-2`
  - a `select` for class (first option "Choose a class", value ""); a `select` for mother tongue, showing the Other input only for `other` and clearing it on change; Yes/No radios for vaccinated
  - the privacy notice from `registrationCopy.privacy.notice(retentionMonths)`, the consent checkbox, the hidden honeypot (`HONEYPOT_FIELD`, `.signup-honeypot`)
  - client validation with the same `buildRegistrationSchema`; per-field errors with `aria-invalid` and `aria-describedby`; focus on the first invalid field in `FIELD_ORDER`
  - POST JSON to `/api/public/registrations`; map 400/403/429, any 5xx and network errors to field errors or a `p[role="alert"]` banner, keeping every value
  - on 200: reset values and show the confirmation
  - shared styles from `public-form-styles.ts` only
- [X] T034 [P] [US1] Create `src/components/registration/registration-confirmation.tsx`: `role="status"`, focused on mount, showing the reference prominently and the "keep it" text from content, plus a link back to /admission.
- [X] T035 [US1] Create `src/app/(public)/admission/register/page.tsx` (server): metadata title "Student Registration"; `PageBanner` as on /admission; `const a = await getRegistrationAvailability()`; when `a.open`, render `RegistrationForm` with `classes`, `today` and `retentionMonths = getEnv().REGISTRATION_RETENTION_MONTHS`. Closed rendering comes in T042; until then render nothing below the banner when closed.
- [X] T036 [P] [US1] Create `src/components/registration/registration-form.test.tsx` (jsdom): renders six legends; the Other input appears and disappears; an empty submit shows a message on each required field and keeps typed values; both-mobiles-empty marks both fields; a mocked 200 resets the form and shows the reference; a mocked 403 shows the closed banner and keeps values; the error element has `font-body` in its class.
- [X] T037 [US1] Create `e2e/helpers/registrations.ts`: `openAdmission({ classes, opensOn, closesOn })` seeds the Settings `admission` group directly (as 020's helpers do); `setNow(page, iso)` sets the `e2e-now` cookie; `fillValidRegistration(page, overrides)`; `seedRegistration(overrides)` inserts directly for admin specs; `clearRegistrations()`.
- [X] T038 [US1] Create `e2e/registration-public.spec.ts` (forms project):
  - happy path with an Urdu student name and mother's mobile only → confirmation reference matching `/^[2-9A-HJKMNP-Z]{8}$/`, form empty, one record in the DB
  - **every validation rule** from FR-002, one test per rule, each asserting the message next to the right field and all other typed values kept
  - the medical-history helper text visible
  - submitted DOB/status injected via `page.route` ignored

**Checkpoint**: US1 works end to end with the window open.

---

## Phase 4: User Story 2 - Form and server respect the admission window (Priority: P1)

**Goal**: closed page message, server 403 for direct posts, mid-fill close handling, Apply Now exactly when open, and Pakistan-time boundaries.

**Independent Test**: past, future and today windows checked on the page, by direct POST and by the Apply Now button, with `TZ` ≠ Asia/Karachi.

### Tests for User Story 2

- [X] T039 [P] [US2] Rewrite the parts of `src/lib/admission/server.test.ts` and `src/components/admission/apply-button.test.tsx` that toggled `registrationFormExists`, so they now drive Settings (window + classes): open + classes → button; open + no classes → none; closed → none.
- [X] T040 [P] [US2] Create `e2e/registration-window.spec.ts`. Use the `e2e-now` cookie with UTC instants that fall on Pakistan boundaries (e.g. `2027-01-01T19:00:00Z` = 00:00 PKT on 2 Jan; `2027-01-01T18:59:59Z` = 23:59:59 PKT on 1 Jan), and `test.use({ timezoneId: "America/New_York" })` so the browser is in another zone.
  - Closed with a closed message → message, no `form` and no inputs in the DOM; closed with none → "Admissions are currently closed."
  - Direct `request.post('/api/public/registrations', {})` while closed → 403 `{ error: "closed" }`.
  - Opens on = today: `e2e-now` at 00:00:00 PKT accepted, 23:59:59 the day before refused. Closes on = today: 23:59:59 PKT accepted, 00:00:00 next day refused.
  - Form opened while open, cookie moved past Closes on, then submit → the closed banner and all values kept.
  - /admission shows exactly one Apply Now link to /admission/register when open, and none when closed.

### Implementation for User Story 2

- [X] T041 [US2] Change `isAdmissionApplyOpen()` in `src/lib/admission/server.ts` to `return (await getRegistrationAvailability()).open;` and update its doc comment. Delete `src/content/admission/registration.ts` and every import of `registrationFormExists`. Update `src/content/admission/index.ts` if it re-exports it. `grep -r registrationFormExists src e2e` must be empty.
- [X] T042 [US2] Create `src/components/registration/registration-closed.tsx` (closed message or `registrationCopy.closedDefault`, plus a link to /admission) and render it from `src/app/(public)/admission/register/page.tsx` when `!a.open`.
- [X] T043 [US2] Update `e2e/admission-window.spec.ts`, `e2e/admission.spec.ts` and any 020 spec that relied on the constant or expected no Apply Now while open. With classes seeded they now expect the button while open.
- [X] T044 [P] [US2] Add a note under 020's FR-018 in `specs/020-admission/spec.md` (CRLF): "Superseded by 013: the constant is removed; Apply Now depends on the window and a non-empty class list (ADR-0012, ADR-0011 amendment)."

**Checkpoint**: US1 + US2 give a complete, window-gated public flow.

---

## Phase 5: User Story 3 - Main admin handles registrations (Priority: P1)

**Goal**: list, search, class filter, duplicate flag, detail with a Health block, status with history, soft delete, Deleted view and restore, CSV with an export record, and notifications. Main admin only.

**Independent Test**: seed registrations; as the main admin search, filter, open, change status, export, delete, restore; each result is correct.

### Tests for User Story 3

- [X] T045 [P] [US3] Create `src/lib/registration/admin-queries.test.ts` (`describeWithDb`):
  - list newest first, 20 per page, deleted excluded
  - search on student, father and mother name (Urdu substring, Latin case-insensitive)
  - class filter, combined with search
  - `classOptions()` distinct over live records
  - duplicate flag: two with the same key both flagged; a sibling not flagged; deleting one clears the other's flag; no father's mobile never flagged
  - `getRegistration` returns null for malformed, unknown or deleted ids
  - `listDeleted` returns only records deleted < 30 days ago and within retention, with the right `daysLeft`
- [X] T046 [P] [US3] Create `src/lib/registration/admin-mutations.test.ts` (`describeWithDb`):
  - `setStatus` changes status and appends history with from/to/by; a same-status call adds no history; it refuses a deleted record
  - `softDelete` sets `deletedAt`/`deletedBy` and history; a second call returns not-found
  - `restore` works at 29 days; refused at 30 days, beyond retention, or when not deleted; a restored record is unchanged except the history entry
  - restore racing a `deleteMany` of the same record ends with it either restored or gone, never both
- [X] T047 [P] [US3] Create `src/lib/registration/csv.test.ts`: header order exactly as contracts/admin-registrations-api.md; Yes/No columns; Pakistan-time submitted date; local-format mobiles; null fields → ""; `=cmd` neutralised (via `toCsv`); zero rows → BOM + header.
- [X] T048 [P] [US3] Create route tests (`describeWithDb`, main-admin session from `src/test/admin-session.ts`). Each also asserts that no seeded field value appears in logs.
  - `src/app/api/admin/registrations/[id]/route.test.ts`: PATCH 200/400/404; DELETE 200/404
  - `src/app/api/admin/registrations/[id]/restore/route.test.ts`: 200 and 404 `not_restorable`
  - `src/app/api/admin/registrations/export/route.test.ts`: CSV headers, filtered rows, one `registrationExports` record with the right `rows`, `searched: true` and no `q` text stored
  - `src/app/api/admin/registrations/opened/route.test.ts`: 200 and the state updated

### Implementation for User Story 3

- [X] T049 [US3] Create `src/lib/registration/admin-queries.ts`, modelled on `src/lib/careers/admin-queries.ts`:
  - `RegistrationRow` (list DTO: id, reference, studentName, className, fatherName, mobile E.164 + display, submittedAt ISO, likelyDuplicate) and `RegistrationDetail` (every field, status, history with labels, likelyDuplicate)
  - `buildRegistrationsFilter({ q, className })`, where `q` is an escaped, case-insensitive regex over `studentName`/`fatherName`/`motherName`
  - `listRegistrations({ q, className, page })`, which adds the duplicate counts with one aggregate over the page's keys
  - `getRegistration(id)`, `classOptions()`, `countRegistrations()`, `findRegistrationsForExport({ q, className })` (unpaginated, flagged)
  - `listDeleted(now)`, using `withDeleted`, the grace and retention cutoffs and `daysLeft`
  
  No field outside the DTOs leaves this module.
- [X] T050 [US3] Create `src/lib/registration/admin-mutations.ts` with `setStatus(id, status, actor)`, `softDelete(id, actor)` and `restore(id, actor, now)`. Each is one conditional `findOneAndUpdate`/`updateOne` per research §8–§9. `restore` uses `{ withDeleted: true }` and the grace + retention conditions. Each returns a boolean or the result for not-found. `actor = { userId, email }`. Each logs its event type with `target: id` and `email: actor.email` only.
- [X] T051 [US3] Create `src/lib/registration/csv.ts` with `REGISTRATION_CSV_HEADERS` (contract order) and `registrationsToCsv(rows)` using `toCsv` from `src/lib/csv.ts`, `formatPhoneLocal`, and Pakistan date formatting (reuse the admin datetime helper used by careers).
- [X] T052 [US3] Add `registrationsAdminCopy` to `src/content/admin.ts`:
  - titles, column headers, search placeholder, class filter label, "Likely duplicate" text, Health block heading "Health information", status labels (import from `src/content/registration.ts`)
  - delete/restore confirm texts, "Deleted" link text, days-left text, empty states
  - the Overview card label
  
  Add the nav item `{ label: "Registrations", href: "/admin/registrations", access: "main_admin" }` after Applications.
- [X] T053 [US3] Create `src/app/api/admin/registrations/[id]/route.ts`, with `PATCH` (zod body `{ status }`) and `DELETE`, each starting `const access = await requireAdminAccess("main_admin")` → `accessErrorResponse`. Validate the id format → 404. Add it to EXPECTED as a route with access `main_admin`.
- [X] T054 [P] [US3] Create `src/app/api/admin/registrations/[id]/restore/route.ts` (POST → `restore`, 404 `{ error: "not_restorable" }` when refused). Add it to EXPECTED.
- [X] T055 [P] [US3] Create `src/app/api/admin/registrations/export/route.ts` (GET `q`, `class`). It builds the CSV, inserts one `RegistrationExport` `{ at, byUserId, byEmail, rows, classFilter, searched: Boolean(q?.trim()) }`, logs `registration_exported` with `outcome: String(rows)`, and returns `text/csv` as an attachment `registrations-YYYY-MM-DD.csv` with `no-store`. Add it to EXPECTED.
- [X] T056 [P] [US3] Create `src/app/api/admin/registrations/opened/route.ts` (POST → `markRegistrationsOpened`). Add it to EXPECTED.
- [X] T057 [US3] Create `src/components/admin/registrations/registrations-table.tsx` (rows at ≥ md, cards below, as the careers table does, with the "Likely duplicate" badge and links to detail) and `mark-registrations-opened.tsx` (client, POSTs once on mount, like `mark-careers-opened.tsx`).
- [X] T058 [US3] Create `src/app/admin/(dashboard)/registrations/page.tsx`:
  - `await requireAdminPageOr404("main_admin")`; read `q`, `class` and `page` from `searchParams`
  - `AdminListFilters` with search plus a class `select` from `classOptions()`; `RegistrationsTable`; `AdminPagination`
  - an Export CSV link carrying `q` and `class`; a link to `/admin/registrations/deleted`; `MarkRegistrationsOpened`
  
  Add `"admin/(dashboard)/registrations/page.tsx": { kind: "page404", access: "main_admin" }` to EXPECTED.
- [X] T059 [US3] Create `src/components/admin/registrations/registration-detail.tsx`: sections Student, Parents, Contact & address, **Health information** (a separate `section` with its own heading, distinct background token and `aria-labelledby`), Reference, Remarks, Record (reference, submitted at PKT, consent at, duplicate flag), and History (status, deleted and restored entries with who and when).
- [X] T060 [P] [US3] Create `src/components/admin/registrations/status-control.tsx` (client select + Save → PATCH; success and error toast or inline message) and `delete-registration-button.tsx` (uses `AdminConfirmDeleteDialog` → DELETE → router push to the list).
- [X] T061 [US3] Create `src/app/admin/(dashboard)/registrations/[id]/page.tsx` (`await requireAdminPageOr404("main_admin")`; `getRegistration` or `notFound()`; detail + status control + delete button). Add it to EXPECTED as `page404`.
- [X] T062 [US3] Create `src/components/admin/registrations/deleted-table.tsx` and `restore-registration-button.tsx` (confirm dialog → POST restore → refresh; shows a not-restorable message on 404), and `src/app/admin/(dashboard)/registrations/deleted/page.tsx` (`await requireAdminPageOr404("main_admin")`, `listDeleted(new Date())`). Add the page to EXPECTED as `page404`.
- [X] T063 [US3] Notifications, per research §13:
  - in `src/lib/notifications/types.ts`, add `"registration"` to `NotificationItem.kind` and `registrationsNew` to `NotificationsSummary`, and update the comment
  - in `src/lib/notifications/queries.ts`: add `countNewRegistrations(adminId)`; a `registrationToItem` with title `` `Registration ${reference}` ``, description `className`, and href `/admin/registrations/${id}`, selecting **only** `reference`, `className` and `createdAt`; `kindsFor` adds `registrations: viewer.role === "main_admin"`; `listNotificationItems` and `getNotificationsSummary` include the kind only when allowed
  - extend `src/lib/notifications/queries.test.ts`: the main admin sees count and items; a content manager with every permission gets 0 and no items, and no query on `studentRegistrations` runs (spy on the model)
- [X] T064 [US3] Wire the UI for notifications:
  - `src/components/admin/app-sidebar.tsx`: icon for `/admin/registrations` and badge key `registrationsNew`
  - `src/components/admin/notifications/*`: render the `registration` kind and the bell label
  - `src/app/admin/(dashboard)/layout.tsx`: seed `registrationsNew`
  - `src/app/admin/(dashboard)/page.tsx`: a Registrations `StatCard` (`countRegistrations()`) only when `canAccess(session, "main_admin")`
- [X] T065 [US3] Create `e2e/admin-registrations.spec.ts` (admin project, main admin):
  - list order and columns
  - search by student, father and mother name (one Urdu)
  - class filter, including a class no longer in Settings
  - the duplicate flag on a same-child pair but not a sibling pair
  - detail shows every field and a Health block with its heading
  - a status change shows in history
  - delete → gone from list and export; Deleted view shows it with days left; restore → back unchanged
  - a record backdated 31 days after deletion is not restorable
  - CSV download: headers, filtered rows, Urdu bytes intact (decode as UTF-8 with BOM), one export record in the DB
  - a new registration raises the sidebar badge, bell item ("Registration <ref>", class only, no student name in the panel text) and Overview count; visiting the list clears the badge

**Checkpoint**: US1–US3: the school can receive and process registrations.

---

## Phase 6: User Story 4 - Content managers never see registrations (Priority: P1)

**Goal**: server-enforced main-admin-only access on every page, route, count and notification.

**Independent Test**: every page and route with no session, as a content manager with every permission, and as the main admin; only the last succeeds. The content manager's sidebar, bell and Overview are free of registrations.

- [X] T066 [P] [US4] Add the five rows from contracts/access-matrix-delta.md to `routes` in `src/app/api/admin/access-matrix.test.ts` (PATCH and DELETE `[id]`, POST restore, GET export, POST opened; access `main_admin`, `body: { status: "new" }` for PATCH). Make sure case 2 uses a content manager holding **every** permission (extend the seeding helper call if it seeds fewer). Assert that nothing changed for case 2 (status unchanged, still deleted, no export record).
- [X] T067 [P] [US4] Add the three registration pages to `e2e/admin-roles-access-matrix.spec.ts`: no session → login redirect; content manager (every permission) → the not-found page (Next 404 text), never `/admin?denied=1`; main admin → 200.
- [X] T068 [US4] Create `e2e/admin-registrations-access.spec.ts`. As a content manager with every permission, with registrations seeded:
  - the sidebar has no Registrations item
  - the bell panel and `GET /api/admin/notifications` have `registrationsNew: 0` and no `registration` items
  - the Overview has no Registrations card
  - direct calls to each registration route return 403 and change nothing
  - guessing a real id on the detail page still gives 404

  As the main admin, the same checks show the item, count and card.
- [X] T069 [US4] Update `specs/011-roles-and-users/contracts/access-matrix.md` (CRLF) with the page404 rows and route rows, and note the new `requireAdminPageOr404` behaviour.

**Checkpoint**: all P1 stories are done; data is confined to the main admin.

---

## Phase 7: User Story 5 - Settings: classes open for admission (Priority: P2)

**Goal**: edit the ordered class list; the dropdown follows; an empty list with an open window warns in Settings and hides the form.

**Independent Test**: add, reorder and remove classes, save, check the dropdown; empty the list with the window open → warning plus the closed page.

- [X] T070 [US5] Add `warning?: string` to `SettingsGroupView` in `src/components/admin/settings/settings-group-view.tsx`, rendered under the status line as `<p role="alert" data-testid="settings-warning">` in the warning token style (extract a token if none fits). Update its test if one exists.
- [X] T071 [US5] In `src/app/admin/(dashboard)/settings/admission/page.tsx`, compute the live class count from `initial.data.classes` (items without `deletedAt` and with a non-empty name) and pass `warning={settingsCopy.admissionWarnings.noClasses}` when the state is `open` and the count is 0. Add the warning text from contracts/settings-admission-classes.md to `src/content/admin.ts`.
- [X] T072 [US5] Verify adding a class in the list editor: open Settings → Admission and add a class. If it goes only through the right-hand panel and that's awkward for a one-field item, add `addMode?: "panel" | "inline"` to `ListField` in `src/lib/settings/types.ts` and handle `"inline"` in `src/components/admin/settings/list-editor.tsx` (append an empty item, focus its first inline input), then set `addMode: "inline"` on `classes`. Otherwise leave the editor unchanged and record "panel kept" in research.md §15.
- [X] T073 [US5] Extend `e2e/admin-settings-admission.spec.ts` (copy and seed helpers from 020):
  - add Playgroup, Nursery and Class 1, save → /admission/register's class select lists them in order
  - reorder and remove one, save → the select follows
  - a stored registration keeps its old class name in admin
  - a duplicate ("class 1") and a blank name are refused on that entry
  - window open + empty list → `[data-testid=settings-warning]` visible, the public page shows the closed message, and a direct POST gets 403
- [X] T074 [P] [US5] Add to `e2e/registration-public.spec.ts`: class removed after page load (update Settings in the DB), then submit → the message on the class field and other values kept.

---

## Phase 8: User Story 6 - Abuse protection and likely-duplicate flag (Priority: P2)

**Goal**: 5 per 10 minutes per IP, honeypot, siblings never blocked, same child flagged.

**Independent Test**: six submissions from one visitor; trap field filled; siblings; same child twice.

- [X] T075 [P] [US6] Add to `src/app/api/public/registrations/route.test.ts`: six valid posts from one `x-forwarded-for` → the 6th is 429 with `Retry-After` and nothing stored; honeypot → 200 with an 8-character reference and no record stored; two siblings with the same parents/email/phones → both 200 and stored.
- [X] T076 [US6] Create `e2e/registration-protection.spec.ts` (forms project, unique `x-forwarded-for` per test via `extraHTTPHeaders`):
  - the 6th submit shows the rate-limit banner and keeps values
  - filling the hidden `website` input via `evaluate` → a normal-looking confirmation and no DB record
  - siblings both saved and not flagged in admin
  - the same child twice → both flagged in admin; deleting one clears the other's flag

---

## Phase 9: User Story 7 - Retention, manual deletion and release gate (Priority: P2)

**Goal**: automatic hard deletion at retention or 30 days after deletion; the release gate blocks production until the notice is approved and retention is set.

**Independent Test**: backdated records swept correctly; a production build fails while the notice is a placeholder or the period is unset.

- [X] T077 [P] [US7] Create `src/lib/registration/retention.test.ts` (`describeWithDb`):
  - a record older than retention is removed whether live or deleted; one a day inside is kept
  - deleted 30 days ago → removed; 29 days → kept
  - export records older than retention are removed
  - `maybeSweepRegistrations` runs at most once per hour (second call → null) and never throws (force a failure and assert it logs `registrations_sweep_failed` with no field values)
- [X] T078 [US7] Create `src/lib/registration/retention.ts` with:
  - `sweepRegistrations(now = new Date(), months = getEnv().REGISTRATION_RETENTION_MONTHS)`: on the raw collection, `deleteMany({ createdAt: { $lt: retentionCutoff } })`, then `deleteMany({ deletedAt: { $ne: null, $lt: now − REGISTRATION_DELETE_GRACE_DAYS days } })`, then `RegistrationExport.deleteMany({ at: { $lt: retentionCutoff } })`; returns counts
  - `maybeSweepRegistrations()`: rate key `sweep:registrations`, 1 per 3600 s, catch → log `registrations_sweep_failed` → null
- [X] T079 [P] [US7] Create `scripts/sweep-registrations.ts` (same shape as `scripts/sweep-careers.ts`: load env, connect, run `sweepRegistrations`, print counts, exit) and add `"sweep:registrations": "tsx scripts/sweep-registrations.ts"` to `package.json`.
- [X] T080 [US7] Trigger the sweep with `after(() => maybeSweepRegistrations())` in `src/app/api/public/registrations/route.ts` (after a successful insert, as careers does), `src/app/(public)/admission/register/page.tsx`, and the three registration admin pages. Import `after` from `next/server`. Check `node_modules/next/dist/docs/` for `after` in Server Components before relying on it (CLAUDE.md: this Next version differs).
- [X] T081 [US7] Extend `scripts/check-release-content.ts`:
  - `ReleaseContentInput` gains `registrationPrivacyPlaceholder: boolean` and `registrationRetentionMonths: string | undefined`
  - add two problem lines (the registration privacy notice still placeholder, naming `registrationCopy.privacy.placeholder` in `src/content/registration.ts`; `REGISTRATION_RETENTION_MONTHS` not set)
  - `main()` reads both
  - update the header comment
- [X] T082 [P] [US7] Add cases to the release-gate test (`scripts/check-release-content.test.ts`, or wherever the existing cases live): production + registration placeholder → blocking with that line; production + retention unset → blocking; preview → warning only; all resolved → ok.
- [X] T083 [P] [US7] Add a jsdom case to `src/components/registration/registration-form.test.tsx`: the notice text includes the `retentionMonths` prop and the 30-day sentence.
- [X] T084 [US7] Create `e2e/registration-retention.spec.ts` (admin project, main admin; Constitution XI: every story has an E2E). Add `clearSweepThrottle()` to `e2e/helpers/registrations.ts` (deletes the `sweep:registrations` document from the `Throttle` collection, the same store `clearKeys` in `src/lib/rate-limit.ts` uses). Seed with `seedRegistration`: A created 13 months ago (live); B deleted 31 days ago; C deleted 29 days ago; D created 11 months ago (live). Call `clearSweepThrottle()`, open `/admin/registrations`, then poll the database (up to 30 s) until A and B are gone; assert C and D remain. Open `/admin/registrations/deleted`: C is listed with 1 day left and restores successfully. Delete D from its detail page: it appears in the Deleted view with 30 days left. Open `/admission/register` with the window open: the privacy notice shows the configured retention (12 months, the dev default) and the sentence "Deleted records are permanently removed within 30 days."

---

## Phase 10: User Story 8 - Accessible, responsive form (Priority: P3)

**Goal**: one column on phones and two from 768px, matching the contact and careers forms, with zero axe violations.

**Independent Test**: four widths; axe with the page open and closed.

- [X] T085 [US8] Add to `e2e/registration-public.spec.ts`, for 375, 640, 768, 1024 and 1440 (640px is the reference theme's own mobile-menu breakpoint, recorded in `research/design-tokens.md`):
  - no horizontal scroll (`scrollWidth <= clientWidth`)
  - at 375 each section's inputs stack (same `x`); at ≥ 768 the first two inputs in Student sit side by side; text areas span the full section width
  - the error element's computed `font-family` matches the body font, not serif
- [X] T086 [US8] Add axe scans (`@axe-core/playwright`, as in the existing specs) to `e2e/registration-public.spec.ts` for the open form, the form showing errors, the confirmation, and the closed page. Zero violations.
- [X] T087 [P] [US8] Run axe and the four widths on `/admin/registrations`, the detail page and the Deleted view in `e2e/admin-registrations.spec.ts` (no horizontal scroll; zero axe violations).

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T088 [P] Update `docs/architecture.md` (CRLF): the registration flow (availability → route order), the main-admin-only rule and `requireAdminPageOr404`, the data handling (ADR-0012), the retention sweep triggers, and the `REGISTRATION_RETENTION_MONTHS` + release gate. Remove any mention of `registrationFormExists`.
- [X] T089 [P] Privacy sweep: `grep -rn "logSecurityEvent\|console\." src/lib/registration src/app/api/public/registrations src/app/api/admin/registrations "src/app/admin/(dashboard)/registrations"` and confirm every call passes only `type`, `target` (id), `email` (admin) or `outcome` (count). Confirm no `error.message` is logged or returned.
- [X] T090 Run the whole Vitest suite (pure, then DB-backed in the background with the env wrapper). Fix registration failures; don't touch unrelated failures.
- [X] T091 Run `npm run lint` and `npx tsc --noEmit`; fix new issues only.
- [X] T092 Stop Playwright, then run `npm run build` (not concurrently) and confirm `/admission`, `/admission/register` and the registration admin routes are dynamic (ƒ). Confirm the release gate prints its warning (not blocking) outside production.
- [ ] T093 Run the Playwright `forms` and `admin` projects against the E2E dev server and compare the failing set with `baseline-013.txt` (T001). Every new failure must be a registration test fixed here, or explained.
- [ ] T094 Walk through quickstart.md's manual checks 1–12 and note any deviation in quickstart.md.
- [X] T095 [P] Update the spec's checklist notes and the plan's Risks with anything learned (serif finding, list editor add mode, `after()` in pages).

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)** has no dependencies. T001 (baseline) must run before any code change.
- **Foundational (Phase 2)** depends on Setup and **blocks every story**. Inside it: T008 comes before T009–T011, T022 and T049; T015 comes before T017 and T018, which come before T019; T021 comes before T022.
- **US1 (Phase 3)** depends on Phase 2.
- **US2 (Phase 4)** depends on US1's page (T035) and route (T029).
- **US3 (Phase 5)** depends on Phase 2 (model, access helper). It can start in parallel with US1 using seeded data (`seedRegistration`), but its E2E (T065) needs US1's helpers (T037).
- **US4 (Phase 6)** depends on US3's pages and routes existing.
- **US5 (Phase 7)** depends on Phase 2 (field) and US2 (closed page) for its E2E.
- **US6 (Phase 8)** depends on US1 (route) and US3 (flag display).
- **US7 (Phase 9)** depends on US1 and US3 (pages to add the sweep trigger to; the restore conditions share the cutoffs).
- **US8 (Phase 10)** depends on US1, US2 and US3 UI.
- **Polish (Phase 11)** depends on everything.

### Story order (by priority, with dependencies)

US1 → US2 → US3 → US4 → US5 → US6 → US7 → US8

### Within each story

Tests first (they fail), then lib → routes → components → pages → E2E. Add each EXPECTED inventory row in the same task as its file.

### Parallel Opportunities

- Phase 1: T003–T007 together after T002.
- Phase 2: T009, T010, T011, T013, T014, T016, T020 and T023 are separate files once T008, T012 and T015 land.
- US1: T026, T027, T030, T034 and T036 in parallel; T033 after T030 and T032.
- US3: T045–T048 in parallel; then T054, T055 and T056 in parallel after T053; T060 is parallel to T059.
- US4: T066 and T067 in parallel.
- US7: T077, T079, T082 and T083 in parallel; T084 (E2E) after T078–T080.
- Never run a DB-backed Vitest batch at the same time as Playwright.

---

## Parallel Example: User Story 3

```text
# Tests together (different files):
T045 admin-queries.test.ts
T046 admin-mutations.test.ts
T047 csv.test.ts
T048 route tests ([id], restore, export, opened)

# After T053 ([id] route) lands, the other routes together:
T054 restore/route.ts
T055 export/route.ts
T056 opened/route.ts
```

## Parallel Example: User Story 1

```text
T026 mutations.test.ts   T027 route.test.ts   T030 public-form-styles.ts
T034 registration-confirmation.tsx            T036 registration-form.test.tsx
```

---

## Implementation Strategy

### MVP First (User Stories 1 + 2)

1. Phase 1 → Phase 2 → US1 → US2.
2. **Stop and validate**: the window-gated public form saves registrations, and direct posts are refused when closed.
3. Don't ship to production at this point. Registrations are useless (and stored without an admin view or retention) until US3, US4 and US7 land. The release gate also blocks production until the notice is approved.

### Incremental Delivery

1. MVP (US1 + US2)
2. US3 + US4: the main admin can work with the data; content managers are confined.
3. US5: the class list is editable, with the warning.
4. US6: abuse and duplicates verified.
5. US7: retention and gate. **Minimum for production: US1–US4 and US7.**
6. US8 and polish.

### Single-developer note

Work in priority order. Commit at each checkpoint on `013-student-registration` (020's uncommitted work is still in the tree: commit 020 on its own branch first if the owner wants a clean history; ask before committing).

---

## Notes

- [P] = different files, no dependency on an incomplete task.
- Each story's E2E proves its Independent Test.
- Verify tests fail before implementing.
- Seeded test values must be distinctive (e.g. student "Zartasha Testchild", medical "PeanutAllergyMarker") so the "no PII in logs/responses" assertions can search for them.

## Implementation notes (2026-10-15)

- T019: `getRegistrationAvailability()` reads Settings once and uses `admissionWindowState` directly (instead of calling `getAdmissionWindow()` plus a second read) so the window, `today` and class list share one read and one "now". It is still 020's single window function.
- T029: the public route is not listed in the access inventory (the inventory only walks admin pages and `api/admin` routes); it is covered by `route.test.ts`.
- T067: the three registration pages' no-session, content-manager and main-admin cases are in `e2e/admin-registrations-access.spec.ts` rather than in `admin-roles-access-matrix.spec.ts`.
- T043: the existing 020 specs seed no classes, so they still (correctly) expect no Apply Now; the open-with-classes cases live in `e2e/registration-window.spec.ts`.
- Accessibility deviations (flagged in `research/design-tokens.md`): submit button navy and error text `--color-error-strong`, because the reference red fails WCAG AA contrast.
