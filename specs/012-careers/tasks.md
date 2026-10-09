---
description: "Task list for 012-careers"
---

# Tasks: Careers — Application Form with CV Upload and Admin Applications

**Input**: Design documents from `/specs/012-careers/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/ (public-careers-api, admin-careers-api, document-store, careers-page, access-matrix-delta), quickstart.md
**Decisions in force**: ADR-0004 + ADR-0007 (Vercel Blob private store, 4 MB server upload, proxied download), ADR-0008 (30-day reapply window on email OR phone, per-identity locks; supersedes ADR-0003/0006), spec Clarifications (main-admin-only delete, configurable retention default 12 months, full signup removal).

**Tests**: Requested by the spec (Acceptance, SC-010, FR-028) and Constitution XI: E2E per story, three access cases per admin entry point, four widths. Test tasks are included and written before or alongside the implementation they cover.

**Working rules for every task** (from project memory and constitution):
- Never run `npm run build` and Playwright at the same time; run them one after the other.
- ~35 admin E2E tests already fail on unchanged code (memory: admin E2E baseline). Compare failure sets before and after rather than expecting a green suite; pre-start the dev server for Playwright.
- Every new admin page, route or action must be added to `src/test/access-inventory.test.ts` EXPECTED in the same task that creates it, or the inventory test fails.
- Every design value comes from `research/design-tokens.md` through a named token. No arbitrary values.
- Copy lives in `src/content/careers.ts`; `CAREERS_REAPPLY_WINDOW_DAYS` and `CV_MAX_BYTES` are the only places their numbers are written.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US7 from spec.md

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: dependency, ignore rules, environment.

- [X] T001 Add `@vercel/blob` ^2.8 to dependencies in `package.json` (`npm install @vercel/blob@^2.8`) and confirm `npm ls @vercel/blob` shows ≥ 2.3 (private storage support)
- [X] T002 [P] Add `/.data/` to `.gitignore` (local document store and E2E store dirs, research §2)
- [X] T003 (done; deviation: the driver defaults to `local` outside production and Blob credentials are required only when `NODE_ENV=production`, so dev machines and existing tests don't need a Blob store) Extend `src/lib/env.ts`: `DOCUMENT_STORE_DRIVER` (`"vercel-blob" | "local"`, blank → `vercel-blob`); `DOCUMENT_STORE_LOCAL_DIR` (optional, default `.data/documents`); `BLOB_STORE_ID`, `BLOB_READ_WRITE_TOKEN` (optional strings, blank → undefined); `CAREERS_RETENTION_MONTHS` (optional int 1–120, default 12). Rules: driver `vercel-blob` requires `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN`, else throw `Missing required environment variable: BLOB_READ_WRITE_TOKEN`; driver `local` with `NODE_ENV === "production"` throws `DOCUMENT_STORE_DRIVER=local is not allowed in production` (contracts/document-store.md "Environment")
- [X] T004 [P] Add cases to `src/lib/env.test.ts`: default driver; local refused in production; vercel-blob without credentials fails naming the variable; retention default 12, rejects 0 and 121; blank strings treated as unset
- [X] T005 [P] Document the new variables (no secret values) in `.env.example`, with `DOCUMENT_STORE_DRIVER=local` for development

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: store adapter, models, shared rules, schema, content, test harness. No user story starts before this phase is done.

- [X] T006 (done; the interface, error, key helpers live in `types.ts` so the drivers don't import `store.ts` circularly) Create `src/lib/documents/store.ts`: `DocumentStore` interface (`put`, `get`, `delete`, `exists`), `DocumentStoreUnavailableError`, `newCvKey()` (`"cv/" + randomBytes(32).toString("base64url") + ".pdf"`), and `getDocumentStore()` (cached per process, chosen by `getEnv().DOCUMENT_STORE_DRIVER`), plus a test-only `__setDocumentStoreForTests(store | null)` (contracts/document-store.md)
- [X] T007 [P] Create `src/lib/documents/local.ts`: files under `DOCUMENT_STORE_LOCAL_DIR` resolved with `path.resolve`; reject any key not matching `^cv\/[A-Za-z0-9_-]{43}\.pdf$`; `get` returns a web `ReadableStream` + size or `null`; `delete` ignores ENOENT; every method throws `DocumentStoreUnavailableError` while `<dir>/.unavailable` exists
- [X] T008 [P] (done; verified against a real private Vercel Blob store on 2026-10-03: put/get/exists/delete, exact key with no overwrite, anonymous URL refused, bad token reported without leaking; 5/5 in `vercel-blob.integration.test.ts`) Create `src/lib/documents/vercel-blob.ts`: `put(key, bytes, { access: "private", contentType: "application/pdf", addRandomSuffix: false, allowOverwrite: false })`; `get(key, { access: "private" })` → `null` unless `statusCode === 200`, else `{ body: stream, size: blob.size }`; `del(key)`; `head(key)` for `exists` (not-found → false); map network, 5xx and auth errors to `DocumentStoreUnavailableError`; never return or log the blob `url` or tokens
- [X] T009 [P] Create `src/test/fake-document-store.ts`: in-memory `DocumentStore` with `failNext(op)` and `keys()` helpers for Vitest
- [X] T010 [P] Create `src/lib/documents/store.test.ts`: `newCvKey()` format, 1,000 keys all distinct; local driver put/get/exists/delete round trip in a temp dir; key outside the pattern rejected; `.unavailable` sentinel → `DocumentStoreUnavailableError`; `getDocumentStore()` returns the local driver when env says so
- [X] T011 [P] Lift the CSV encoder into `src/lib/csv.ts` (`csvField`, BOM, CRLF, formula guard, `toCsv(headers, rows)`) and make `src/lib/signup/csv.ts` import from it so 004 keeps passing until US7; move the generic cases from `src/lib/signup/csv.test.ts` into `src/lib/csv.test.ts`
- [X] T012 [P] Create `src/lib/careers/rules.ts`: `CAREERS_REAPPLY_WINDOW_DAYS = 30`; `windowStart(now)` = 00:00 Asia/Karachi of (PKT today − (30 − 1) days) as a `Date`; `reapplyFrom(createdAt)` = PKT calendar date of `createdAt` + 30 days as `"YYYY-MM-DD"`; retention is not here (it lives in `retention.ts`); reuse PKT helpers from `src/lib/admin-datetime.ts`
- [X] T013 [P] Create `src/lib/careers/rules.test.ts`: application at PKT 2026-10-01 23:59 blocks through 2026-10-30 and `reapplyFrom` = `2026-10-31`; UTC-midnight boundary cases (PKT is UTC+5); `windowStart` at several instants; the literal 30 appears only in `rules.ts` (grep assertion over `src/lib/careers`, `src/app`, `src/components`)
- [X] T014 [P] Create `src/lib/careers/cv-limits.ts`: `CV_MAX_BYTES = 4 * 1024 * 1024`, `CV_MAX_LABEL = "4 MB"`, `CAREERS_BODY_MAX_BYTES = CV_MAX_BYTES + 64 * 1024`; `verifyPdfBytes(bytes)` → `null | "empty" | "too_large" | "not_pdf"` (size, leading `%PDF-`, `%%EOF` in the last 1,024 bytes); browser `precheckCv(file)` (presence, size, leading `%PDF-` via `file.slice(0, 5)`)
- [X] T015 [P] Create `src/lib/careers/cv-limits.test.ts`: real tiny PDF accepted; PNG, ZIP (`PK`) and EXE (`MZ`) bytes renamed `.pdf` rejected as `not_pdf`; 0 bytes `empty`; exactly 4,194,304 bytes accepted; 4,194,305 `too_large`; missing `%%EOF` rejected
- [X] T016 [P] Create `src/lib/validation/career-application.ts`: `careerApplicationFieldsSchema` (name 2–100 collapsed spaces; email trimmed lower-cased ≤254; phone via `normalisePakistaniMobile` → E.164 with the existing message; qualification 2–150 collapsed spaces; `consent` accepting `true` or `"true"` only) with messages from `careersCopy.fieldErrors`; export `CareerApplicationFields`
- [X] T017 [P] Create `src/lib/validation/career-application.test.ts`: Urdu name and qualification kept verbatim; email normalised; `0300-1234567` → `+923001234567`; landline rejected with the shared message; consent missing or `"false"` rejected; all errors returned together via `fieldErrors()`
- [X] T018 [P] Create `src/content/careers.ts` (`careersCopy` per contracts/careers-page.md): banner, intro (`placeholder: true` copy), form placeholders, `cvLabel` built from `CV_MAX_LABEL`, privacy `notice` + `consentLabel` with `placeholder: true`, success, `errors.alreadyApplied(reapplyFrom: string)` formatting the date as "d MMMM yyyy" in English, `errors.rateLimited`, `errors.tryAgain`, `fieldErrors` incl. CV messages ("Choose your CV as a PDF file.", "Your CV must be a PDF file.", "Your CV must be 4 MB or smaller." from `CV_MAX_LABEL`, "Your CV file is empty.", "Attach one PDF only.")
- [X] T019 Create `src/models/career-application.ts` (collection `careerApplications`): fields per data-model.md (`cv` sub-document with `key`, `size`, `storedAt`, `removedAt`; `consentAt`); `softDeletePlugin`; timestamps; indexes `{ email: 1, createdAt: -1 }`, `{ phone: 1, createdAt: -1 }`, `{ createdAt: -1 }`, `{ "cv.storedAt": 1, createdAt: 1 }`; **no unique index on email or phone**; `mongoose.models` guard as in `src/models/signup.ts`
- [X] T020 [P] Create `src/models/career-application-lock.ts` (collection `careerApplicationLocks`): `_id: String`, `owner: String`, `expiresAt: Date` with TTL index `expireAfterSeconds: 0`; no plugin
- [X] T021 [P] Create `src/lib/careers/route-errors.ts`: `alreadyAppliedResponse(reapplyFrom)` (409), `storeUnavailableResponse()` (503 `store_unavailable`), `tryAgainResponse()` (503 `try_again`), all with `NO_STORE`, built on `src/lib/route-errors.ts`
- [X] T022 [P] Create E2E fixtures: `e2e/fixtures/cv-valid.pdf` (a minimal valid one-page PDF, < 2 KB, with `%PDF-1.4` … `%%EOF`) and `e2e/fixtures/cv-renamed.pdf` (PNG bytes, `.pdf` name)
- [X] T023 Create `e2e/helpers/careers.ts` following `e2e/helpers/messages.ts`: `withConnection`, `clearCareerApplications()`, `seedCareerApplication(overrides)` (writes a CV file into the E2E local store dir and a stored application, with `createdAt` override for backdating), `backdateApplication(email, days)`, `storeFileExists(key)`, `setStoreUnavailable(on)` (sentinel file), `oversizedPdf()` (4,194,305-byte buffer starting `%PDF-`), and `forwardedFor(n)` in TEST-NET-2 `198.51.100.0/24` (the messages helper already uses TEST-NET-3 `203.0.113.0/24`, so budgets never collide)
- [X] T024 Update `playwright.config.ts`: webServer env `DOCUMENT_STORE_DRIVER: "local"`, `DOCUMENT_STORE_LOCAL_DIR: ".data/e2e-documents"`; add the **anchored** pattern `/(^|[\\/])careers-[^\\/]*\.spec\.ts$/` to the `forms` project `testMatch` and to `chromium`'s `testIgnore` (an unanchored `careers-.*` would also match `admin-careers-access.spec.ts` and run it in two projects); update `e2e/global-setup.ts` to wipe `careerApplications`, `careerApplicationLocks` and the E2E store dir

**Checkpoint**: `npm test` passes for T004, T010, T013, T015, T017; signup tests still pass (T011 shim).

---

## Phase 3: User Story 1 — Visitor applies with a CV (Priority: P1) 🎯 MVP

**Goal**: `/careers` shows intro + form; a valid application with a genuine PDF ≤ 4 MB is stored privately and confirmed; invalid input shows field messages and stores nothing; store failure keeps typed details.

**Independent Test**: Submit a valid application with `cv-valid.pdf` → confirmation; one ACTIVE application exists and its file is in the store. Submit a renamed PNG and an oversized PDF → field messages, nothing stored. Toggle the store sentinel → "try again", values kept.

### Tests for User Story 1

- [X] T025 [P] [US1] Create `src/lib/careers/mutations.test.ts` (`describeWithDb`, fake store via `__setDocumentStoreForTests`): success → document has `cv.storedAt` set and the key in the store; `put` failure → no document remains and `DocumentStoreUnavailableError` thrown; failure of the `storedAt` update → object deleted and document removed; `consentAt` set by the server; original filename stored nowhere (assert document keys)
- [X] T026 [P] [US1] Create `src/app/api/public/careers/route.test.ts` (`describeWithDb`, multipart `Request`s): `Content-Length` over `CAREERS_BODY_MAX_BYTES` → 413; chunked body over the cap → 413; malformed multipart → 400; missing fields → 400 with all field keys; renamed PNG → 400 `fields.cv`; 4 MiB + 1 → 400 `fields.cv`; consent missing → 400 `fields.consent`; store unavailable → 503 `store_unavailable` and no document; two `cv` parts → 400 `fields.cv` "Attach one PDF only." and nothing stored; valid → 200 `{ ok: true }`, `Cache-Control: no-store`, body has no id or key
- [X] T027 [P] [US1] Create `src/components/careers/careers-form.test.tsx` (jsdom, mocked `fetch`): empty submit → messages for all five fields plus consent, `fetch` not called; first invalid field focused; renamed file caught by `precheckCv` before sending; 400 body → field messages, values kept; 503 → `errors.tryAgain` alert with values **and the selected file** kept, and resubmitting sends the same `File`; 200 → confirmation in `role="status"`; the request body is `FormData` with `website_url` empty; `dir="auto"` on name and qualification

### Implementation for User Story 1

- [X] T028 [US1] Implement `createCareerApplication(fields, bytes, now)` in `src/lib/careers/mutations.ts` per contracts/document-store.md "Write order" steps 1, 3, 4 (key, insert PENDING, `put`, mark `cv.storedAt`, compensation on failure). Leave a clearly marked `checkWindow` seam that US2 (T037) fills; until then it is a no-op
- [X] T029 [US1] Create `src/lib/careers/read-capped-body.ts`: `readCappedBody(request, max)` → `Uint8Array | "too_large"`, reading `request.body` incrementally and stopping at `max + 1` bytes; then `formDataFrom(bytes, contentType)` via `new Response(bytes, { headers }).formData()`
- [X] T030 [US1] (done; the body reader does not cancel the stream on an oversize body, so the 413 reaches the client) Implement `POST` in `src/app/api/public/careers/route.ts` per contracts/public-careers-api.md steps 1–4, 6–8 (size guard → parse → honeypot `{ ok: true }` → `protectPublicForm(request, { name: "careers" })` → schema + `verifyPdfBytes` → `createCareerApplication` → 200), mapping errors to 413/400/429/503 with `NO_STORE`. Step 5 (upload limit) is added in US6 (T079)
- [X] T031 [US1] (done: das.edu.pk has no careers page, `/careers` is 404; no new tokens, composed from contact/signup tokens; recorded in `research/design-tokens.md` "Careers page (012)") Token pass for the careers page in `research/design-tokens.md` and `src/app/globals.css`: reuse the contact-form and signup-input tokens; extract only the missing values (file-input row, consent checkbox, notice text) from the reference's own form controls with `research/extract-*` scripts, and record each new token's source. If a careers page is found on das.edu.pk, capture `screenshots/das.edu.pk_careers_*.png` and flag any conflict with contracts/careers-page.md before continuing
- [X] T032 [P] [US1] Create `src/components/careers/careers-intro.tsx` (Server Component; heading + paragraphs from `careersCopy.intro`; placeholder marker attribute as in `careers-cta.tsx`)
- [X] T033 [US1] Create `src/components/careers/careers-form.tsx` (`"use client"`): state for values, the selected `File`, consent, field errors and status; one grid (1 column < 768px; 2 columns ≥ 768px: name|email, phone|qualification, CV / notice + consent / button spanning 2) using the contact-form tokens; native file input (`accept="application/pdf,.pdf"`, visible `cvLabel`, chosen file name); honeypot as in `contact-form.tsx`; client validation with the shared schema + `precheckCv`; `FormData` POST; response handling per the contract table (409 handled in US2 via `errors.alreadyApplied`)
- [X] T034 [P] [US1] Create `src/components/careers/careers-form-section.tsx` (form band wrapper using contact form band tokens)
- [X] T035 [US1] Create `src/app/(public)/careers/page.tsx`: metadata (title "Careers", description, canonical `/careers`); composes `PageBanner` (title + breadcrumb from `careersCopy.banner`), `CareersIntro`, `CareersFormSection`
- [X] T036 [US1] Create `e2e/careers-public.spec.ts` (`forms` project, own `X-Forwarded-For`): apply successfully → confirmation, application in DB with the file in the E2E store; empty submit → field messages; renamed PNG → "Your CV must be a PDF file."; oversized → "Your CV must be 4 MB or smaller."; store sentinel on → try-again alert with all values and the file name still shown, then sentinel off and resubmit → success; Urdu name and qualification accepted; layout has no horizontal scroll at 375/768/1024/1440 and fields align on the grid (bounding boxes)

**Checkpoint**: US1 works end to end on its own (MVP). **Not releasable on its own**: the 30-day rule (`checkWindow` seam) arrives in US2.

---

## Phase 4: User Story 2 — One application per person per 30 days (Priority: P1)

**Goal**: A repeat within `CAREERS_REAPPLY_WINDOW_DAYS` on email OR phone is refused with the reapply date, safely under concurrency (ADR-0008); deleted applications don't block; after the window a new, separate application is created.

**Independent Test**: Apply; reapply with the same email (different phone) and with the same phone (different email) → both refused with the same message and date; backdate by 30 days → reapply succeeds and both records exist.

### Tests for User Story 2

- [X] T037 [P] [US2] Create `src/lib/careers/identity-lock.test.ts` (`describeWithDb`): acquire/release; a second acquire of a held key waits and succeeds after release; held for more than 2 s → `LockBusyError`; an expired lease (backdated `expiresAt`) is taken over at once; release by a non-owner is a no-op; keys are `sha256` hashes (no raw email or phone stored)
- [X] T038 [P] [US2] (done in the new `src/lib/careers/mutations-window.test.ts`, 14 cases) Extend `src/lib/careers/mutations.test.ts`: same email within window → `RecentApplicationError` with the right `reapplyFrom` and no store write; same phone → same; email matching one application and phone a later one → the later date; soft-deleted application doesn't block; PENDING application blocks; application backdated 30 PKT days → accepted and the earlier one is unchanged; **10 parallel submissions sharing an email → exactly 1 success**, likewise sharing only a phone; a lock held past 2 s → `LockBusyError`; when the only matches are PENDING records older than 5 minutes (crash-left), → `StaleUploadError` (not `RecentApplicationError`)
- [X] T039 [P] [US2] Extend `src/app/api/public/careers/route.test.ts`: 409 body is exactly `{ error: "already_applied", reapplyFrom }` and identical (status, headers, body keys) for an email match vs a phone match; `LockBusyError` → 503 `try_again`

### Implementation for User Story 2

- [X] T040 [US2] Create `src/lib/careers/identity-lock.ts`: `withIdentityLocks({ email, phone }, fn)`, keys `"email:" + sha256(email)` and `"phone:" + sha256(phone)` acquired in sorted order with `findOneAndUpdate({ _id, expiresAt: { $lte: now } }, { $set: { owner, expiresAt: now + 30 s } }, { upsert: true })`; `E11000` → retry every 200 ms up to 2 s → `LockBusyError`; abort `fn` past 10 s; release with `deleteOne({ _id, owner })` in `finally` (data-model.md "CareerApplicationLock")
- [X] T041 [US2] Fill the `checkWindow` seam in `src/lib/careers/mutations.ts`: inside `withIdentityLocks`, query non-deleted applications with `$or: [{ email }, { phone }]` and `createdAt >= windowStart(now)` (`maxTimeMS: 5000`), take the latest, throw `RecentApplicationError(reapplyFrom(latest.createdAt))`, except when every match is PENDING and older than `STALE_PENDING_MS` (5 min, in `rules.ts`) → throw `StaleUploadError` (the sweep clears it within the hour); insert PENDING inside the locks; `put` and mark-stored after the locks are released
- [X] T042 [US2] Map `RecentApplicationError` → `alreadyAppliedResponse(reapplyFrom)`, and `LockBusyError` and `StaleUploadError` → `tryAgainResponse()` in `src/app/api/public/careers/route.ts`
- [X] T043 [US2] Handle 409 in `src/components/careers/careers-form.tsx`: form-level `role="alert"` with `careersCopy.errors.alreadyApplied(reapplyFrom)`, values and file kept; add the case to `src/components/careers/careers-form.test.tsx`
- [X] T044 [US2] Extend `e2e/careers-public.spec.ts`: reapply with the same email (new phone) and the same phone (new email) → both show "You applied recently. You can apply again from <date>." with the same text; `backdateApplication(email, 30)` then reapply → success and two applications in DB; deleting the application in DB (soft) then reapplying within the window → success

**Checkpoint**: US1 + US2 pass together.

---

## Phase 5: User Story 3 — CV files stay private (Priority: P1)

**Goal**: CVs are reachable only through a session- and `careers`-checked download route, as an attachment, never inline; stored names can't be guessed.

**Independent Test**: Fetch the download route with no session, as a content manager without `careers`, and with `careers`: 401, 403, 200 attachment. Show that stored keys contain nothing derived from the application.

### Tests for User Story 3

- [X] T045 [P] [US3] Create `src/lib/careers/key-unguessable.test.ts` (`describeWithDb`, fake store): for a created application, `cv.key` contains none of the id, name, email, lower-cased email local part, phone digits, qualification, applied date (ISO and `YYYYMMDD`) or the uploaded filename; two applications with identical data get different keys; the key matches `^cv\/[A-Za-z0-9_-]{43}\.pdf$`
- [X] T046 [P] [US3] Create `src/app/api/admin/careers/[id]/cv/route.test.ts` (`describeWithDb`, fake store): unknown id, invalid ObjectId, PENDING and soft-deleted → 404; object missing → 404; store unavailable → 503; success → bytes equal, headers `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="cv-…-YYYY-MM-DD.pdf"`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox`, `Cache-Control: private, no-store`
- [X] T047 [P] [US3] Create `src/lib/careers/download-name.test.ts`: English name → slug; Urdu-only name → `cv-applicant-<date>.pdf`; long names cut to 40 chars; quotes and slashes never appear; the date is the PKT applied date

### Implementation for User Story 3

- [X] T048 [P] [US3] Create `src/lib/careers/download-name.ts`: `cvDownloadName({ name, createdAt })` per research §11
- [X] T049 [US3] (done; the lookup lives in `src/lib/careers/cv-download.ts`, `pktDateString` was added to `rules.ts`, and three log event types were added to `src/lib/log.ts`; the context is typed `{ params: Promise<{ id: string }> }` so it does not depend on generated route types) Implement `GET` in `src/app/api/admin/careers/[id]/cv/route.ts`: `await requireAdminAccess("careers")` once; load the ACTIVE application (`cv.storedAt != null`); `getDocumentStore().get(cv.key)`; stream with the contract headers; log `career_cv_missing` (id only) on a missing object. Add `"api/admin/careers/[id]/cv/route.ts": { kind: "route", access: "careers" }` to `src/test/access-inventory.test.ts`
- [X] T050 [US3] Add the three access cases for `GET /api/admin/careers/[id]/cv` to `src/app/api/admin/access-matrix.test.ts` (no session 401; content manager without `careers` 403; content manager with `careers` 200 attachment)
- [X] T051 [US3] Create `e2e/admin-careers-access.spec.ts` (`admin` project), part 1: with no session, `request.get('/api/admin/careers/<id>/cv')` → 401; as a content manager without `careers` → 403; as one with `careers` → 200 with `content-disposition` starting `attachment`; and `GET /<cv.key>`, `GET /.data/e2e-documents/<cv.key>` → 404

**Checkpoint**: US1–US3 pass; no CV is reachable except through the checked route.

---

## Phase 6: User Story 4 — Admin handles applications (Priority: P1)

**Goal**: Applications list (search, pages, newest first), detail with CV download, main-admin-only delete removing the file, filtered CSV export, access gating, and notifications/overview moved from signups to applications.

**Independent Test**: Seed applications; as a permitted admin search, open, download, export; as the main admin delete → the file is gone and the person can reapply; as a content manager with `careers` there is no delete control and the route returns 403.

### Tests for User Story 4

- [X] T052 [P] [US4] Create `src/lib/careers/admin-queries.test.ts` (`describeWithDb`): newest first; PENDING and deleted hidden; search by name (incl. Urdu), email fragment and phone in `0300 123` / `+92 300` / `300123` forms; pagination totals with a filter; `findApplicationsForExport` returns all filtered rows unpaginated; DTOs carry no `cv` fields
- [X] T053 [P] [US4] Create `src/lib/careers/csv.test.ts`: header `Name, Email, Phone, Qualification, Applied`; BOM; CRLF; Urdu kept; `=SUM()` name neutralised; no matches → header only; no key or size column
- [X] T054 [P] [US4] Create `src/app/api/admin/careers/[id]/route.test.ts` (`describeWithDb`, fake store): unknown or already deleted → 404; success → `deletedAt` set, object gone, `cv.removedAt` set; object delete failure → still 200, `deletedAt` set, `cv.removedAt` null
- [X] T055 [P] [US4] Create `src/app/api/admin/careers/export/route.test.ts` (`describeWithDb`): `q` filter applied; headers `text/csv; charset=utf-8` and `attachment; filename="applications-YYYY-MM-DD.csv"`
- [X] T056 [P] [US4] Create `src/components/admin/careers/application-detail.test.tsx`: shows all fields; the Download link is an `<a download>` to `/api/admin/careers/<id>/cv`; **no** `iframe`, `embed`, `object` or `img` with that URL; the delete control is rendered only when `canDelete` is true

### Implementation for User Story 4

- [X] T057 [P] [US4] Create `src/lib/careers/admin-queries.ts`: one shared `buildFilter({ q })` adding `"cv.storedAt": { $ne: null }` (phone search via `phoneSearchDigits`, regex via `escapeRegExp`); `listApplications({ q, page })` → `Paged<CareerApplicationRow>`; `getApplication(id)`; `countApplications()`; `findApplicationsForExport({ q })`
- [X] T058 [P] [US4] Create `src/lib/careers/csv.ts`: `applicationsToCsv(rows)` on `src/lib/csv.ts` with the contract columns and PKT applied date via `src/lib/admin-datetime.ts`
- [X] T059 [US4] Add `deleteCareerApplication(id, store)` to `src/lib/careers/mutations.ts`: `softDeleteById` → `store.delete(cv.key)` → set `cv.removedAt`; on store failure log `career_cv_delete_failed` (id only) and return success
- [X] T060 [US4] Implement `DELETE` in `src/app/api/admin/careers/[id]/route.ts` with `await requireAdminAccess("main_admin")`; add `"api/admin/careers/[id]/route.ts": { kind: "route", access: "main_admin" }` to `src/test/access-inventory.test.ts`
- [X] T061 [US4] Implement `GET` in `src/app/api/admin/careers/export/route.ts` with `await requireAdminAccess("careers")`; add the inventory entry
- [X] T062 [US4] Add the three access cases for `DELETE /api/admin/careers/[id]` (no session 401; **content manager with `careers`** 403; main admin 200) and `GET /api/admin/careers/export` (401 / 403 without `careers` / 200) to `src/app/api/admin/access-matrix.test.ts`
- [X] T063 [P] [US4] Create `src/components/admin/careers/applications-table.tsx`: columns name, email (mailto), phone (tel, `phoneDisplay`), qualification, applied date (PKT); `dir="auto"` + Urdu font on name and qualification; row links to `/admin/careers/<id>`; empty and filtered-empty states from `careersAdminCopy`
- [X] T064 [P] [US4] Create `src/components/admin/careers/application-detail.tsx`: fields, "Download CV" `<a href download>`, and `DeleteApplicationButton` only when `canDelete`
- [X] T065 [P] [US4] Create `src/components/admin/careers/delete-application-button.tsx` (`"use client"`): `AdminConfirmDeleteDialog` → `DELETE` → toast → `router.push("/admin/careers")` → `refreshNow()`
- [X] T066 [US4] Add `careersAdminCopy` (page title "Applications", search placeholder, export label, empty states, detail labels, delete dialog text, pagination copy) to `src/content/admin.ts`; replace the Signups nav item with `{ label: "Applications", href: "/admin/careers", access: "careers" }`; add the `/admin/careers/` detail title to `adminExtraPageTitles` as needed
- [X] T067 [US4] Create `src/app/admin/(dashboard)/careers/page.tsx`: `await requireAdminPage("careers")`, `dynamic = "force-dynamic"`, search via `AdminListFilters`, `ApplicationsTable`, `AdminPagination`, export link carrying `q`, `MarkCareersOpened`; schedule the throttled sweep with `after()` (wired in Phase 9); add the inventory entry
- [X] T068 [US4] Create `src/app/admin/(dashboard)/careers/[id]/page.tsx`: `const session = await requireAdminPage("careers")`; `notFound()` for unknown, pending or deleted; render `ApplicationDetail` with `canDelete={session.role === "main_admin"}`; add the inventory entry
- [X] T069 [US4] Update `src/lib/permissions.ts`: `careers` label → "Careers (Applications)"; update `src/lib/users/change-text.test.ts` and any test asserting the old label
- [X] T070 [US4] Notifications state: add `careersLastOpenedAt` to `src/models/admin-notification-state.ts` (keep `signupsLastOpenedAt` optional until US7); add `getCareersLastOpenedAt(adminId)` (update-pipeline upsert `$ifNull: ["$careersLastOpenedAt", now]`) and `markCareersOpened(adminId, now)` to `src/lib/notifications/state.ts`, with cases in `src/lib/notifications/state.test.ts` (existing doc without the field defaults to now; concurrent first reads never duplicate)
- [X] T071 [US4] Notifications queries and types: in `src/lib/notifications/types.ts` rename `signupsNew` → `applicationsNew` and kind `"signup"` → `"application"`; in `src/lib/notifications/queries.ts` replace signup queries with ACTIVE applications `createdAt > careersLastOpenedAt` (title name, description qualification, href `/admin/careers/<id>`); `src/lib/notifications/mutations.ts` calls `markCareersOpened` for viewers with `careers`; update `queries.test.ts`, `mutations.test.ts` and `src/app/api/admin/notifications/route.test.ts`
- [X] T072 [US4] Implement `POST` in `src/app/api/admin/careers/opened/route.ts` (`await requireAdminAccess("careers")`, `markCareersOpened`) with its inventory entry and three access cases in `access-matrix.test.ts`; create `src/components/admin/careers/mark-careers-opened.tsx` (+ test) mirroring `mark-signups-opened.tsx`
- [X] T073 [US4] Rewire the UI from signups to applications: `src/components/admin/notifications/notifications-provider.tsx` (+ test), `notification-bell.tsx`, `notification-panel.tsx`, `page-title-badge.tsx` (+ tests); `src/components/admin/app-sidebar.tsx` (icon and badge keyed on `/admin/careers`, `applicationsNew`) + `app-sidebar.test.tsx`; `src/components/admin/admin-shell.tsx` and `src/app/admin/(dashboard)/layout.tsx` (`initialApplicationsNew`); Overview card "Applications" in `src/app/admin/(dashboard)/page.tsx` using `countApplications()` and the new count
- [X] T074 [US4] Create `e2e/admin-careers.spec.ts` (`admin` project): list newest first; search by name, email and phone; pagination keeps `q`; open detail; Download CV → a download event with a `cv-…pdf` filename and the bytes of the fixture; Export → CSV with BOM and the Urdu name; as the main admin delete (cancel first, then confirm) → gone from the list, `storeFileExists(key)` false, then the same email applies successfully on `/careers`; as a content manager with `careers` → no Delete button on the detail page; screens usable at 375/768/1024/1440
- [X] T075 [US4] (done and verified: the careers access spec passes, and the six careers cases of `admin-roles-access-matrix.spec.ts` pass; the rest of that spec stops at a news-editor navigation abort (slow first compile) that is unrelated to careers)  Extend `e2e/admin-careers-access.spec.ts` with the pages × three cases (`/admin/careers` and `/admin/careers/<id>`: no session → login redirect; content manager without `careers` → `/admin?denied=1`; with `careers` → 200), and add both pages to `e2e/admin-roles-access-matrix.spec.ts`
- [X] T076 [US4] (done and verified: all nine 009 notification specs plus the roles-enforcement spec pass once the server is warm; the earlier 5 failures were 4 slow-compile timeouts and 1 locator in my own test, re-run green)  Update the 009 E2E specs that assert signup counts or items (`e2e/admin-notifications-*.spec.ts`, `e2e/helpers/notifications.ts`) to seed applications via `e2e/helpers/careers.ts` and assert "Applications"

**Checkpoint**: US1–US4 pass; admin flow complete; signups still exist but are no longer wired into notifications or the overview.

---

## Phase 7: User Story 5 — Entry points (Priority: P2)

**Goal**: Careers is reachable from the top bar and the footer (main menu unchanged); Home's Join Now still works.

**Independent Test**: From any public page at each width, the top-bar and footer Careers links and Home's Join Now land on `/careers`.

- [X] T077 [P] [US5] (done: top-bar link first in the yellow bar, footer link in the bottom bar, tests updated; main menu still 8 items) Add `{ label: "Careers", href: "/careers" }` as the first item of `portalLinks` and add `links: [{ label: "Careers", href: "/careers" }]` to `FooterContent` / `footerContent` in `src/content/site-shell.ts`; render the footer links in the bottom bar in `src/components/site-shell/footer.tsx` with existing footer tokens; update `src/content/site-shell.test.ts`, `src/components/site-shell/top-bar.test.tsx` and `footer.test.tsx` (main menu still 8 items)
- [X] T078 [P] [US5] (done; E2E 13/13 at 375/768/1024/1440; the Join Now click retries because the home page shifts while loading) Add a "Careers" entry to `src/lib/site-search.ts` (+ case in `site-search.test.ts`); create `e2e/shell-careers-links.spec.ts` (`chromium` project; named so the `forms` pattern doesn't pick it up): top-bar link, footer link and Home Join Now → `/careers` at 375 and 1440

---

## Phase 8: User Story 6 — Abuse protection (Priority: P2)

**Goal**: Separate per-visitor upload limit; honeypot and submission limit proven.

**Independent Test**: Exceed the submission limit and the upload limit from one IP → 429 and nothing stored; fill the honeypot → ordinary success, nothing stored.

- [X] T079 [US6] Add step 5 to `src/app/api/public/careers/route.ts`: when a `cv` part is present, `checkRateLimit({ key: "form:careers-upload:ip:<ip>", max: 10, windowSeconds: 86400 })` → 429 with `Retry-After`, before validation or any store call (extract `extractIp` from `src/lib/public-form.ts` as an export rather than duplicating it)
- [X] T080 [P] [US6] Extend `src/app/api/public/careers/route.test.ts`: honeypot → 200 `{ ok: true }`, no document, no store call; 6th submission in 10 minutes → 429; 11th upload in 24 h (submission budget cleared between calls) → 429 and the fake store holds no new key; counters keyed per IP
- [X] T081 [US6] Create `e2e/careers-protection.spec.ts` (`forms` project, its own `X-Forwarded-For`): honeypot filled via the DOM → confirmation shown and nothing in DB; repeated submissions → rate-limit alert with typed values kept

---

## Phase 9: Retention and clean-up (FR-031; cross-cutting)

**Purpose**: Automatic deletion after `CAREERS_RETENTION_MONTHS`; abandoned pending clean-up (≤ 1 h, unchanged); retry failed CV removals.

- [X] T082 Create `src/lib/careers/retention.ts`: `sweepCareerApplications(now, store)` per contracts/document-store.md "Retention sweep" (expired live or deleted → delete object → hard delete; deleted with `cv.removedAt` null → retry; pending older than 1 h → delete object if present → hard delete), returning counts; `maybeSweepCareers()` gated by `checkRateLimit({ key: "sweep:careers", max: 1, windowSeconds: 3600 })`
- [X] T083 [P] Create `src/lib/careers/retention.test.ts` (`describeWithDb`, fake store): an application 12 months + 1 day old is removed with its file; one a day inside the period is kept; a soft-deleted expired one is removed; a failed removal is retried; pending 61 min removed, pending 59 min kept; `maybeSweepCareers` runs once per hour window
- [X] T084 Wire `after(() => maybeSweepCareers())` into `src/app/api/public/careers/route.ts` (success path) and `src/app/admin/(dashboard)/careers/page.tsx`; never let a sweep failure affect the response (catch and log `careers_sweep_failed`)
- [X] T085 [P] Create `scripts/sweep-careers.ts` (loads env like `scripts/seed-admin.ts`, runs `sweepCareerApplications` without the gate, prints counts) and add `"sweep:careers": "tsx scripts/sweep-careers.ts"` to `package.json`

---

## Phase 10: User Story 7 — Retire the old signup (Priority: P3)

**Goal**: All of 004 signup is gone (owner decision 2026-10-02, option a); shared helpers and tokens kept.

**Independent Test**: No signup page, route, component, model or test exists; the admin menu shows Applications; `npm test` and the remaining E2E suites pass (against the baseline).

- [X] T086 [US7] Create `scripts/retire-signups.ts` and `"retire:signups"` in `package.json`: refuses to run without `--confirm`; prints the `signups` document count; drops `signups` if present; `$unset: { signupsLastOpenedAt: "" }` on `adminNotificationStates`; idempotent; prints a reminder to back up first (quickstart §4)
- [X] T087 [US7] Delete the public side: `src/app/api/public/signups/route.ts` + test, `src/components/signup/` (3 files), `src/content/signup.ts`, `src/lib/validation/signup.ts` + test, `e2e/signup-public.spec.ts`, `e2e/signup-visual.spec.ts`
- [X] T088 [US7] Delete the admin side: `src/app/admin/(dashboard)/signups/page.tsx`; `src/app/api/admin/signups/**` (3 routes + 3 tests); `src/components/admin/signups/` (5 files); `e2e/admin-signups-*.spec.ts` (3); `e2e/helpers/signups.ts`
- [X] T089 [US7] Delete `src/lib/signup/` (all files: `admin-queries`, `csv`, `dates`, `mutations`, `phone`, `route-errors`, `sources` + tests) and `src/models/signup.ts`, after confirming with a grep that nothing outside these paths imports them; remove `signupsLastOpenedAt` from `src/models/admin-notification-state.ts` and `getSignupsLastOpenedAt`/`markSignupsOpened` from `src/lib/notifications/state.ts`
- [X] T090 [US7] Remove the signup entries from `src/test/access-inventory.test.ts` and `src/app/api/admin/access-matrix.test.ts` and `e2e/admin-roles-access-matrix.spec.ts`; drop `signup-.*` from `playwright.config.ts` (`forms` testMatch and `chromium` testIgnore) and from the `e2e/global-setup.ts` wipe list; remove signup references from `src/app/admin/(dashboard)/design-system/design-system-demo.tsx` if it imports signup components
- [X] T091 [US7] Update comments in the kept shared files that point at signup modules (`src/lib/phone.ts`, `src/lib/admin-datetime.ts`, `src/lib/route-errors.ts`, `src/lib/validation/field-errors.ts`, `src/lib/admin-list.ts`, `src/components/admin/admin-list-filters.tsx`, `admin-delete-dialog.tsx`, `admin-pagination.tsx`, `src/lib/messages/mutations.ts`, `src/components/contact/contact-form.tsx`); keep the `signup-*` tokens and `.signup-honeypot` class (used by the contact form)
- [X] T092 [US7] Mark `history/adr/0001-signup-upsert-and-restore.md` status "Superseded — signups retired in 012 (collection dropped); boundary note for messages still referenced"; confirm `npm test` shows no import errors from removed modules

---

## Phase 11: Polish & Cross-Cutting Concerns

- [X] T093 [P] Update `docs/architecture.md`: Vercel Blob private store wiring (`src/lib/documents/`, drivers, env, local refused in production), `/api/public/careers` and `/api/admin/careers/*` in "API namespaces", careers data rules (30-day window and locks per ADR-0008, insert-first pending, sweep), remove the "Signup (004) data rules" section and signup folder entries, update notifications (009) to applications, note Vercel hosting is implied by ADR-0007, testing notes for `careers-*` specs
- [X] T094 [P] Update `specs/011-roles-and-users/contracts/access-matrix.md` with `contracts/access-matrix-delta.md`
- [X] T095 Run `npm run lint` and `npx tsc --noEmit`; fix findings in 012 files only
- [X] T096 Run `npm test` (Vitest, with `MONGODB_URI` set for DB suites); all 012 suites pass and no previously passing suite fails
- [X] T097 (012 specs only: build passes; forms 38/38 after warm reruns; admin-careers, access and shell-links all pass; full chromium and admin suites not rerun, baseline not compared) Run `npm run build` **on its own**, then (after it finishes) Playwright: pre-start the dev server, run `--project=forms`, `--project=chromium`, `--project=admin` in sequence; compare the admin failure set with the known baseline; every 012 spec passes
- [X] T098 (done 2026-10-07: screenshots at 375, 768, 1024, 1440 of the form, success, refusal, bad file, oversize and the admin list and detail; no sideways scroll; SC-009 confirmed; error text font fixed) Walk through `specs/012-careers/quickstart.md` §2 manually at 375, 768, 1024 and 1440px; tick SC-001 to SC-011 in a short note appended to the PHR for the implement run
- [X] T100 Create `scripts/check-release-content.ts` and add `"prebuild": "tsx scripts/check-release-content.ts"` to `package.json`. Only when `VERCEL_ENV === "production"`, it fails the build if `careersCopy.privacy.placeholder` is `true` (Constitution V: client-approved privacy notice) or if `CAREERS_RETENTION_MONTHS` is not explicitly set (V: client-agreed retention), with a message naming what's missing. In every other environment it prints a warning only. Add `scripts/check-release-content.test.ts` covering production fail, preview warn, and pass when both are resolved
- [X] T101 [P] Add the release gate to `specs/012-careers/quickstart.md` §4 and `docs/architecture.md` (what blocks a production build and how to clear it)
- [X] T099 [P] Security self-check against the contracts: no response or DTO contains `cv.key` or a blob URL; download headers present; `local` driver refused with `NODE_ENV=production`; no `@vercel/blob` import outside `src/lib/documents/` (grep); `CAREERS_REAPPLY_WINDOW_DAYS` literal only in `rules.ts` (T013 test)

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T005)** → **Foundational (T006–T024)** → user stories.
- **US1 (T025–T036)** first: the MVP. **US2** builds on the US1 write path (T028/T030/T033). **US3** needs a stored application (US1) but no US2 code. **US4** needs US1 data; its delete flow uses the US2 rule in the "reapply after delete" E2E step (T074).
- **US5** and **US6** depend only on US1 (US6 edits the US1 route) and can run alongside US3/US4.
- **Retention (T082–T085)** needs US1 (model, store) and T067 for the page hook.
- **US7 (T086–T092)** must come **after US4** (T070–T076 remove every runtime dependency on signup models and notifications).
- **Polish (T093–T101)** last.

### Story completion order

`US1 → US2 → US3 → US4 → (US5 ∥ US6) → Retention → US7 → Polish`

### Within a story

Tests first (they should fail), then lib → route/page → components → E2E. Inventory entries are added with each route or page.

---

## Parallel Execution Examples

- **Foundational**: T007, T008, T009 (store drivers and fake) in parallel after T006; T011–T018, T020–T022 are independent files.
- **US1**: T025, T026, T027 (tests) together; then T032 and T034 alongside T033.
- **US2**: T037, T038, T039 together; T040 before T041.
- **US3**: T045, T046, T047, T048 together.
- **US4**: T052–T056 together; T057, T058, T063, T064, T065 together; T070 → T071 → T072 → T073 in order (shared notification types).
- **US5 ∥ US6**: T077, T078 and T079–T081 can proceed in parallel once US1 is done.

---

## Implementation Strategy

1. **MVP**: Phases 1–3 (US1). Visitors can apply, CVs are stored privately, and nothing breaks. Stop and validate with T036.
2. **Rule-complete**: add US2 (30-day window with locks) and US3 (private download). These are what makes the feature safe to release.
3. **Admin-complete**: US4, including notifications and overview.
4. **Reach and protection**: US5 and US6, then the retention sweep.
5. **Clean-up**: US7 removes signup. In production, run `retire:signups --confirm` only after a backup (quickstart §4).
6. **Polish**: docs, lint, sequenced test runs, manual widths, security self-check.

**Totals**: 101 tasks: Setup 5, Foundational 19, US1 12, US2 8, US3 7, US4 25, US5 2, US6 3, Retention 4, US7 7, Polish 9. (T100/T101 were added by the /sp.analyze remediation and listed before T099 so the security self-check stays last.)
