# Research: 013 Student Registration

**Date**: 2026-10-14 · **Spec**: [spec.md](./spec.md) · **Plan**: [plan.md](./plan.md)

Every decision below was checked against the code on `013-student-registration` (020 still uncommitted in the working tree). Each one says what was chosen, why, and what else was considered.

---

## §1 Public submission route: JSON, not multipart

**Decision**: `POST /api/public/registrations`, a JSON body capped at 64 KiB, following the contact route (`src/app/api/public/messages/route.ts`). Order: size guard → parse → honeypot → rate limit → **registration open?** → validation → insert → `after(maybeSweepRegistrations)` → `200 { ok: true, reference }`.

**Rationale**: No file is uploaded (out of scope), so the careers capped-multipart reader isn't needed. The open check comes before validation, so a closed window always gets the same 403 whatever the body contains (FR-017). Honeypot and rate limit come first, as on every public form, so bots learn nothing and closed-window probing still costs them their rate-limit budget.

**Alternatives**: a Server Action. Rejected: every other public form posts to a route handler, the access matrix and route tests are built around route handlers, and a route gives a plain 403 for direct posts.

## §2 "Registration is open" = window open AND at least one class

**Decision**: A pure `registrationOpen(windowState, classes)` in `src/lib/registration/availability.ts`, plus a request-time `getRegistrationAvailability()` that reads `getAdmissionWindow()` (020) and the class list from the same `getPublicSettings("admission")` read. It returns `{ open, classes, closedMessage, today }`. `isAdmissionApplyOpen()` becomes `(await getRegistrationAvailability()).open`. `src/content/admission/registration.ts` (the `registrationFormExists` constant) is deleted.

**Rationale**: FR-020 makes one condition drive the page, the server and the Apply Now link. Keeping the window rule in 020's `window.ts` (ADR-0011) and adding only the class condition here means one window function, as 020 FR-013 requires. `getAdmissionWindow()` already honours the `e2e-now` cookie and calls `connection()`, so the route and page get per-request answers and the E2E boundary tests can fake "now".

**Alternatives**: (a) leave the class condition only on the page → a direct post with an empty list would pass, breaking US5-3. (b) Put the class check inside `admissionWindowState` → mixes a Settings-content rule into the pure date rule that 020 tested in isolation.

## §3 One shared schema, built from the class list and "today"

**Decision**: `buildRegistrationSchema({ classes, today })` in `src/lib/validation/registration.ts`, used by the client form (classes and today passed down from the server page) and by the route (classes from Settings, today from the request time). `today` is the Pakistan calendar day (`karachiToday`, 020).

**Rationale**: Two rules depend on server data: the class must be in the current list (FR-024) and the age is measured on the submission date (FR-002). A factory keeps one definition (Constitution VI) while letting the server be authoritative. The client's copy only gives early messages; the route always rebuilds the schema from fresh Settings, so a class removed mid-fill is refused (US5-5).

**Age rule**: `ageOn(dob, today)` counts whole years by comparing "MM-DD" strings. A 29 February birthday is reached on 1 March in a non-leap year, because "02-28" < "02-29". Valid when 2 ≤ age ≤ 18 and dob ≤ today. Pure; tested with fixed dates.

**Alternatives**: a static schema plus separate server checks → two places with rules that could drift.

## §4 Text clean-up

**Decision**: Single-line fields go through `trim` → the existing `collapseSpaces` → NFC normalisation. Text areas get a new `collapseInlineSpaces`: CRLF → LF, trim, collapse runs of spaces and tabs within each line, collapse 3+ blank lines to one blank line. Email is trimmed and lower-cased (as in careers). Lengths are checked after clean-up. Markup is stored as typed and always rendered as text: React escapes it, there is no `dangerouslySetInnerHTML`, and the CSV encoder neutralises formulas.

**Rationale**: FR-005 says "no HTML stored" and the spec's edge case says markup is "stored as plain text and shown escaped". Stripping tags would silently change medical notes such as "<5 kg". NFC makes Urdu input typed on different keyboards compare equal for the duplicate key.

## §5 Mobiles

**Decision**: Reuse `normalisePakistaniMobile` / `formatPhoneLocal` (`src/lib/phone.ts`) and careers' message for the father, mother and emergency phones. Father's and mother's mobiles are optional strings: an empty one is stored as `null`, and a non-empty one must normalise. A schema-level `superRefine` adds "Enter at least one parent's mobile number." to **both** mobile paths when both are empty.

## §5a Field error text ("serif error-text issue")

**Finding**: The public forms don't use `src/components/ui/form.tsx`. Contact and careers each define their own `INPUT_CLASS` / `ERROR_CLASS` strings. The shared `FormMessage` sets `font-light` and no font family. Nothing in the repo records the serif report, so its cause hasn't been pinned down yet.

**Decision**: Lift the public-form class strings into `src/components/forms/public-form-styles.ts`, used by the contact, careers and registration forms. Its error class sets `font-body` explicitly. The first implementation task checks the computed `font-family` of an error message in the browser on /contact and /careers; if any of them resolves to a serif face, the shared class is the fix. A Vitest render test and an E2E check pin `font-body` on the error element.

**Alternatives**: style the registration form only → leaves the issue on the other forms, against FR-009.

**Finding (implementation)**: on /admission/register the computed error `font-family` is `"softLINKS Regular", Arial, Helvetica, sans-serif`, the body font, so no serif was reproduced. The shared class strings with explicit `font-body` are in place and pinned by a unit test and an E2E check. Separately, the reference error red `#f44336` on white is 3.68:1 (fails WCAG AA), so the registration form uses `--color-error-strong`, and its submit button uses the navy token (`research/design-tokens.md` "Registration form (013)").

**List editor add mode (§15)**: panel kept; adding a class through the panel works (E2E in `admin-settings-admission.spec.ts`).

## §6 Reference number

**Decision**: 8 characters from the 31-character alphabet `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (no 0/O, 1/I/L), drawn with `crypto.randomInt`. Unique index on `reference`. On a duplicate-key error the insert retries with a new number (up to 5 times, then a 503 "try again"). A honeypot hit returns a freshly drawn number that is never stored.

**Rationale**: 31⁸ ≈ 8.5 × 10¹¹ values, so collisions are vanishingly rare and the database still guarantees uniqueness. The number is random, so it reveals neither count nor order (FR-014). It's short enough to read over the phone.

**Alternatives**: the ObjectId suffix → time-ordered and leaks submission order; a counter → sequential, explicitly excluded.

## §7 Likely-duplicate flag

**Decision**: On insert, store `duplicateKey = sha256(NFC(lower(collapse(studentName))) + "|" + dateOfBirth + "|" + fatherMobile)` as hex, or `null` when there's no father's mobile. Index `{ duplicateKey: 1 }`. The list query, after fetching a page, runs one aggregate: `$match { duplicateKey: { $in: pageKeys } }` (the soft-delete plugin adds `deletedAt: null`) → `$group` count. A row is flagged when its key's count is ≥ 2. The detail page shows the same flag.

**Rationale**: Computed on read, so it follows deletes and restores without any write-back (FR-028, US6-5, edge case "restore creates a duplicate pair"). Hashing avoids a second, plain copy of the child's name in an index. One extra indexed query per page of 20.

**Alternatives**: a stored `isDuplicate` boolean updated on insert/delete/restore → three write paths to keep consistent, racy. Blocking duplicates → rejected by the brief (siblings).

## §8 Status and history

**Decision**: `status` ∈ `new | contacted | admitted | not_admitted` (labels in content). Changes, deletions and restores are appended to an embedded `history` array: `{ at, action: "status" | "deleted" | "restored", from?, to?, byUserId, byEmail }`. A status change is one `findOneAndUpdate({ _id, deletedAt: null }, { $set: { status }, $push: { history } })`. A no-op change (same status) is accepted and not logged.

**Rationale**: Embedded history is removed with the registration on permanent removal (spec Key Entities) with no orphan clean-up. It's bounded in practice: a handful of entries per registration.

**Alternatives**: a separate `registrationEvents` collection → needs its own sweep and cascade.

## §9 Soft delete, Deleted view, restore, and the 30-day grace

**Decision**:
- Delete: `findOneAndUpdate({ _id, deletedAt: null }, { $set: { deletedAt: now, deletedBy }, $push: { history } })`.
- `REGISTRATION_DELETE_GRACE_DAYS = 30` (named constant in `src/lib/registration/rules.ts`).
- Deleted view `/admin/registrations/deleted`: `withDeleted` query for `deletedAt > now − 30 days AND createdAt ≥ retentionCutoff`, newest deletion first. Shows reference, student name, class, deleted date and days left (= the earlier of the grace end and the retention end, minus today).
- Restore: `updateOne({ _id, deletedAt: { $gt: graceCutoff }, createdAt: { $gte: retentionCutoff } }, { $set: { deletedAt: null, deletedBy: null }, $push: { history } }, { withDeleted: true })`. `matchedCount 0` → 404 "can no longer be restored".

**Rationale**: Each step is a single conditional write on one document, so a restore racing the sweep's `deleteMany` ends in exactly one outcome (spec edge case). A restore after day 30 but before the sweep is refused by the same condition (spec edge case).

## §10 Retention sweep: triggers and rules

**Decision**: `sweepRegistrations(now, months)` on the raw collection:
1. `deleteMany({ createdAt: { $lt: retentionCutoff(now, months) } })` (live or deleted)
2. `deleteMany({ deletedAt: { $ne: null, $lt: now − 30 days } })`
3. `registrationExports.deleteMany({ at: { $lt: retentionCutoff } })`

`maybeSweepRegistrations()` runs it at most once an hour (`checkRateLimit({ key: "sweep:registrations", max: 1, windowSeconds: 3600 })`) and never throws. It's triggered by `after()` from: the submission route, the /admission/register page, and each registrations admin page. A manual `npm run sweep:registrations` script is added, as for careers. `retentionCutoff` is reused from careers (lifted to `src/lib/retention.ts`).

**Rationale**: Careers only sweeps on submissions. Registrations only arrive while the window is open, so between windows (months) a submit-only trigger would let records outlive their retention. Admin and register-page visits keep it running. The hourly throttle means at most one sweep per hour across processes.

**Risk**: if neither the admin nor any visitor touches these pages, nothing runs. Recorded as a follow-up: a scheduled job once hosting is chosen (002-owned).

## §11 Export record

**Decision**: New collection `registrationExports`: `{ at, byUserId, byEmail, rows, classFilter: string | null, searched: boolean }`, written after the CSV body is built and before it's returned, plus a `logSecurityEvent({ type: "registration_exported", email, outcome: String(rows) })`. The search text is **not** stored (it may be a child's name). Export records are removed after the same retention period (§10).

**Rationale**: FR-038 needs a durable who/when/how-many record. Stdout logs on serverless hosting aren't durable or reviewable. The record holds no registration content.

**CSV**: reuse `src/lib/csv.ts` (BOM, CRLF, formula guard). Columns are listed in contracts/admin-registrations-api.md. Mobiles are written in local format (`formatPhoneLocal`) and dates in Pakistan time.

## §12 Main-admin-only access and not-found for content managers

**Decision**:
- Routes: `await requireAdminAccess("main_admin")` → 401/403 through `accessErrorResponse` (unchanged helper).
- Pages: a new DAL helper `requireAdminPageOr404(access)`. No session redirects to login, as `requireAdminPage` does. A forbidden user is logged (`access_denied`) and gets `notFound()` instead of `/admin?denied=1`, so the section's existence isn't revealed (spec Assumptions).
- `access-inventory.test.ts` gains a page kind `{ kind: "page404", access: "main_admin" }` that requires exactly one `await requireAdminPageOr404("main_admin")`.
- Nav: `{ label: "Registrations", href: "/admin/registrations", access: "main_admin" }`. The sidebar already filters by `canAccess`, which is presentation only.

**Alternatives**: reuse `requireAdminPage("main_admin")` → redirects content managers to `/admin?denied=1`, which tells them the section exists. Acceptable but weaker; the brief allows 403/404, and 404 hides more.

## §13 Notifications (009)

**Decision**:
- `adminNotificationStates` gains `registrationsLastOpenedAt`, filled lazily as careers does.
- `NotificationItem.kind` gains `"registration"`, with `title` set to `Registration ${reference}`, `description` set to the class name, and `href` set to `/admin/registrations/${id}`.
- `NotificationsSummary` gains `registrationsNew`.
- `kindsFor(viewer)` adds `registrations: viewer.role === "main_admin"`.
- `POST /api/admin/registrations/opened` (main_admin) plus a `MarkRegistrationsOpened` client component on the list page.
- Sidebar badge key: `"/admin/registrations": "registrationsNew"`. Overview: a Registrations stat card only when `canAccess(session, "main_admin")`.

**Rationale**: It mirrors the careers wiring exactly, and the viewer gate keeps content managers' summaries free of the kind, its counts and its items (FR-039, US4-3). The previews carry no names (FR-041).

## §14 Logging

**Decision**: New `SecurityEventType` values: `registration_status_changed`, `registration_deleted`, `registration_restored`, `registration_exported`, `registration_save_failed`, `registrations_sweep_failed`. Each carries `target` = registration id only (or nothing for sweep/export), and `email` = the acting admin. The public route never logs the body; on a save failure it logs `registration_save_failed` with no fields from the form. The route's `catch` never includes `error.message` (a Mongo validation error can echo values).

**Verification**: route and mutation tests spy on `console` and assert that none of the seeded values (names, phones, email, address, DOB, medical text, reference fields) appear in any captured line. The E2E suite asserts the same for every public response body and the notification API payload (SC-005).

## §15 Settings: "Classes open for admission"

**Decision**: Add to `admissionDefinition` a `list` field `classes` with `itemFields: [{ type: "text", key: "name", required: true, maxLength: 50 }]`, `maxItems: 30`, `itemLabel: "class"`, `inlineFields: ["name"]`, `layout: "cards"`, `summary: { title: ["name"] }`, default `[]`. Add a new `ListRule` kind `{ kind: "uniqueText"; field; message }` to `listSchema`: it compares values after `collapseSpaces` + lower-case and adds an issue on the later duplicate's path. `PublicAdmission` gains `classes: string[]` (live items, in order, names only).

**Empty-list warning**: `SettingsGroupView` gains an optional `warning` prop, rendered as a `role="alert"` notice under the status line. The admission page passes it when the window state is open and `classes` is empty.

**Field-type ADR**: not needed. The `list` type exists (005, used by hero slides). Only a validation rule and an optional view prop are added.

**Add without a panel**: the list editor reorders with arrows and drag and edits `inlineFields` in place, but adds through the panel (`addMode: "panel"`). If adding one-field items through the panel proves awkward in the token pass, an `addMode: "inline"` (append an empty card and focus its input) is added to the list editor. That is an option on the existing field type, not a new type.

## §16 Release gate and environment

**Decision**: `REGISTRATION_RETENTION_MONTHS` in `src/lib/env.ts`, with the same parsing and messages as `CAREERS_RETENTION_MONTHS` (whole months 1–120, default 12). `checkReleaseContent` gains `registrationPrivacyPlaceholder` and `registrationRetentionMonths` inputs, with one problem line each. Production (`VERCEL_ENV=production`) fails while either is unresolved (FR-031). The privacy notice lives in `src/content/registration.ts` with `privacy.placeholder: true`. The months in its text come from the env value through a server-rendered prop, so the notice always matches the setting (US7-7).

## §17 Public page and form UI

**Decision**: `/admission/register` is a server page. It calls `getRegistrationAvailability()` and renders either `RegistrationClosed` (closed message or default line, no form) or `RegistrationForm` (client), passing `classes`, `today` and `retentionMonths`. It uses the reference Admission banner (`PageBanner`, as /admission does).

The form has six `<fieldset>`s with `<legend>`s. Each section is a grid of `grid-cols-1 md:grid-cols-2`, and text areas span `md:col-span-2`. The "Other" mother-tongue input appears only when Other is chosen and is cleared when another option is picked. The vaccinated control is a radio group. The Reference fields are a three-field group with one group hint. Each error gets `aria-describedby` and `aria-invalid`, and focus moves to the first invalid field in `FIELD_ORDER`, as in careers. Values are kept in state on every failure. On success the state is reset and a confirmation panel shows the reference number (`role="status"`, focus moved to it). Any new visual value (fieldset legend, radio, select, textarea height) is extracted into `research/design-tokens.md` before use (Constitution VII).

**Window closes mid-fill**: the route returns 403 with `{ error: "closed", message }`. The form shows the message as a banner and keeps the values (US2-4).

## §18 Testing approach

- **Vitest (pure)**: `ageOn`, the schema factory (every FR-002 rule, both-mobiles-empty, Other, reference all-or-none, clean-up), `registrationOpen`, reference generator alphabet/length, duplicate key, `uniqueText` list rule, release gate, CSV row shape.
- **Vitest (`describeWithDb`)**: route (closed 403, unknown class 400, honeypot fake reference, rate limit, success, collision retry, no PII in logs), mutations (status, delete, restore conditions, restore/sweep race), sweep (retention, 30-day grace, exports), admin queries (search, class filter, duplicate counts, Deleted view window), notifications (main admin only), access matrix rows.
- **Playwright**: `registration-public.spec.ts` (happy path, every validation rule, values kept, layout at 375/768/1024/1440, axe open and closed); `registration-window.spec.ts` (closed/open/empty list/boundaries via the `e2e-now` cookie, TZ ≠ Asia/Karachi, direct POST 403, Apply Now); `registration-protection.spec.ts` (rate limit, honeypot); `admin-registrations.spec.ts` (list, search, filter, detail Health block, status, delete, Deleted view, restore, CSV, duplicate flag, notifications); `admin-registrations-access.spec.ts` (no session / content manager with every permission / main admin on every page and route); `admin-settings-admission.spec.ts` extended (classes list, empty-list warning).
- Never run `npm run build` and Playwright at the same time (project rule).
