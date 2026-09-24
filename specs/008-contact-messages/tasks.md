---

description: "Task list for Contact & Messages (008) implementation"
---

# Tasks: Contact & Messages

**Input**: Design documents from `/specs/008-contact-messages/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/public-contact-api.md, contracts/admin-messages-api.md, contracts/contact-page.md, quickstart.md

**Tests**: Included. The spec's Acceptance section and Constitution VIII require:
- E2E tests covering: send a message; see it as new; open it and it becomes read; mark it responded; search and filter; delete it and it disappears; two messages from the same email are both kept;
- tests proving every admin message route rejects unauthorised requests;
- tests proving HTML in message text is displayed safely;
- the Contact page checked at 375, 768, 1024 and 1440px.

research.md §17 maps each test to a file. DB-backed Vitest files (marked `[DB]`) use `describeWithDb()` (`src/test/db.ts`) against `dar_e_arqam_test`, and skip with a notice when `MONGODB_URI` is unset.

The four public contact specs (`e2e/contact-{public,details,protection,visual}.spec.ts`) run in the serial `forms` project. Any spec that submits through the public form sets its own `X-Forwarded-For` (TEST-NET-3 `203.0.113.<n>`), so rate-limit budgets never collide across specs or projects. Specs never wipe the shared `throttles` collection (research §16).

**Organization**: Tasks are grouped by the spec's user stories (US1–US7).
- **Every message is its own record.** There is no upsert, no unique index and no `withDeleted` anywhere under `src/lib/messages/` (research §1; ADR-0001 is explicitly not applied).
- **Helpers are lifted, not copied.** Signup-only helpers that messages also need move to shared modules in Foundational. Their old paths re-export, so every 004 import and test stays unchanged (research §2).
- **Protection from the start.** `protectPublicForm` and the 64 KiB size guard are in the public route from its first version (Constitution III). US6 adds the honeypot input and the protection tests.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, and no dependency on an unfinished task)
- **[Story]**: Maps the task to a user story in spec.md (US1–US7). Setup, Foundational and Polish tasks have no story label.
- File paths are exact and relative to the repository root.

## Path Conventions

This is a single existing Next.js app (see the Structure Decision in plan.md). `src/`, `e2e/`, `research/`, `docs/` and `public/` sit at the repository root.

| What | Where |
|---|---|
| Domain logic | `src/lib/messages/` |
| Shared helpers | `src/lib/` |
| Shared validation | `src/lib/validation/` |
| Public route | `src/app/api/public/messages/` |
| Admin routes | `src/app/api/admin/messages/` |
| Admin pages | `src/app/admin/(dashboard)/messages/` |
| Public sections | `src/components/contact/` |
| Admin components | `src/components/admin/messages/` (shared ones in `src/components/admin/`) |
| Copy | `src/content/` |

---

## Phase 1: Setup

**Purpose**: Test infrastructure for the new collection and for contact specs in the serial public-form project. No dependency or env change (research §18).

- [ ] T001 [P] In `e2e/global-setup.ts`, add `"messages"` to the list of collections wiped before each run. The list becomes `["user", "session", "account", "throttles", "news", "signups", "messages"]`.
- [ ] T002 [P] In `playwright.config.ts`:
  - change the `forms` project's `testMatch` to `/(signup-.*|contact-(public|details|protection|visual))\.spec\.ts/`;
  - change `chromium`'s `testIgnore` to `/(admin-.*|signup-.*|contact-(public|details|protection|visual))\.spec\.ts/`, so the four new contact specs run only in `forms`. The names are listed explicitly because the existing 001 spec `e2e/contact-and-social.spec.ts` also starts with `contact-` and must stay in `chromium` (sp.analyze I1). Check this with `npx playwright test --list`;
  - extend the `forms` comment: contact specs isolate their rate-limit budget with a per-spec `X-Forwarded-For` (research §16).
- [ ] T003 [P] Create `e2e/helpers/messages.ts` using `e2e/helpers/signups.ts`'s `withConnection` pattern. Export:
  - a `MessageSeed` interface: `name`, `email`, `phone` (E.164 or `null`), `subject`, `body`, `status`, `createdAt`, `statusChangedAt`, `deletedAt`;
  - `seedMessages(seeds: Partial<MessageSeed>[]): Promise<string[]>`. It inserts directly into the `messages` collection with defaults (`status: "new"`, `phone: null`, `createdAt`/`updatedAt` = now minus the index in minutes, so the order is predictable, `statusChangedAt: null`, `deletedAt: null`) and returns the ids;
  - `findMessages({ email?, withDeleted? })`, which returns the raw documents;
  - `clearMessages()`;
  - `forwardedFor(n: number): Record<string, string>`, which returns `{ "X-Forwarded-For": \`203.0.113.${n}\` }`;
  - a re-export of `loginAsAdmin` from `./news`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The shared-helper lifts (with a 004 regression gate), then the status list, pure helpers, shared schema, model and admin copy that every story builds on. Nothing user-visible yet.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Shared lifts (research §2 — no behaviour change)

- [ ] T004 [P] Create `src/lib/phone.ts` by **moving** all of `src/lib/signup/phone.ts` into it: `normalisePakistaniMobile`, `formatPhoneLocal`, `phoneSearchDigits` and the header comment, reworded as "shared by signup (004) and contact (008)". Replace the whole body of `src/lib/signup/phone.ts` with `export * from "@/lib/phone";`. Leave `src/lib/signup/phone.test.ts` unchanged; it now runs through the shim.
- [ ] T005 [P] Create `src/lib/admin-datetime.ts` by **moving** `MONTH_ABBR`, `DATE_TIME_FORMATTER` and the formatter body out of `src/lib/signup/dates.ts`. Name it `formatAdminDateTime(date: Date): string`, keeping the ICU "Sept" comment.
  - In `src/lib/signup/dates.ts`, keep `csvDateStamp` and add `export { formatAdminDateTime as formatSignupDateTime } from "@/lib/admin-datetime";`.
  - Add `src/lib/admin-datetime.test.ts`: `new Date("2026-09-24T09:05:00Z")` → `"24 Sep 2026, 14:05"`.
- [ ] T006 [P] Create `src/lib/route-errors.ts` by **moving** `NO_STORE`, `validationResponse`, `unavailableResponse`, `notFoundResponse` and `unauthorizedResponse` out of `src/lib/signup/route-errors.ts`. Add `payloadTooLargeResponse()`, which returns `413 { error: "too_large" }` with `NO_STORE`. Replace `src/lib/signup/route-errors.ts` with `export * from "@/lib/route-errors";`.
- [ ] T007 [P] Create `src/lib/validation/field-errors.ts` by **moving** `fieldErrors(error: z.ZodError)` and `collapseSpaces(value: string)` out of `src/lib/validation/signup.ts`. Export both.
  - `src/lib/validation/signup.ts` imports `collapseSpaces` from the new module and re-exports `fieldErrors`, so `import { signupInputSchema, fieldErrors } from "@/lib/validation/signup"` keeps working.
  - Add `src/lib/validation/field-errors.test.ts`: one message per failing top-level field, first message wins, nested paths joined with `.`.
- [ ] T008 [P] Create `src/components/admin/admin-list-filters.tsx` (`"use client"`) by lifting `SignupsTableFilters`' logic into a generic `AdminListFilters`.
  - Props: `{ searchPlaceholder: string; select: { param: string; label: string; allLabel: string; options: ReadonlyArray<{ value: string; label: string }> } }`.
  - Keep **both** fixes and their comment: the `latest` ref updated in an effect, and the same-value `q` guard. Also keep the 300 ms debounce and `params.delete("page")` on any change.
  - Rewrite `src/components/admin/signups/signups-table-filters.tsx` as a thin wrapper. It renders `<AdminListFilters>` with `searchPlaceholder={signupsCopy.filters.searchPlaceholder}` and `select={{ param: "source", label: "Page", allLabel: signupsCopy.filters.sourceAll, options: SIGNUP_SOURCES.map(s => ({ value: s.key, label: s.label })) }}`.
- [ ] T009 [P] Create `src/components/admin/admin-delete-dialog.tsx` (`"use client"`) by lifting `DeleteSignupDialog`'s logic into a generic `AdminDeleteDialog`.
  - Props: `{ endpoint: string; itemName: string; copy: { trigger: string; title: string; body: string; cancel: string; confirm: string; toasts: { deleted: string; gone: string; unavailable: string } }; redirectTo?: string; triggerLabel?: string }`.
  - Trigger: by default the existing ghost icon button with `aria-label={\`${copy.trigger}: ${itemName}\`}`. When `triggerLabel` is set, it renders a `variant="outline"` text button instead.
  - Behaviour on `200`: toast `deleted`, then `router.push(redirectTo)` if set, else `router.refresh()`.
  - Behaviour on `404`: toast `gone`, then the same navigation.
  - Anything else, or a network error: toast `unavailable`.
  - Rewrite `src/components/admin/signups/delete-signup-dialog.tsx` as a wrapper: `endpoint={\`/api/admin/signups/${id}\`}`, with `copy` built from `signupsCopy.table.delete`, `signupsCopy.deleteDialog.*` and `signupsCopy.toasts.*`.
- [ ] T010 Run the 004 regression gate (depends on T004–T009). It must be green before continuing:
  - `npx tsc --noEmit`
  - `npm run lint`
  - `npm test -- src/lib/signup src/lib/validation src/app/api/public/signups src/app/api/admin/signups src/components/signup`
  - `npx playwright test --project=forms -g signup`
  - `npx playwright test --project=admin admin-signups`

  Any failure means a lift changed behaviour: fix the lift, not the test.

### Messages foundation

- [ ] T011 [P] Create `src/lib/messages/statuses.ts` per data-model.md "Message status". Export:
  - `MESSAGE_STATUSES = [{ key: "new", label: "New" }, { key: "read", label: "Read" }, { key: "responded", label: "Responded" }] as const`;
  - `type MessageStatus`;
  - `MESSAGE_STATUS_KEYS`, typed as a non-empty tuple for `z.enum`;
  - `isMessageStatus(value: unknown): value is MessageStatus`;
  - `statusLabel(status)`.
- [ ] T012 [P] Create `src/lib/messages/preview.ts` exporting `toPreview(body: string, max = 100): string`:
  1. Collapse every whitespace run, including `\n`, to one space, then trim.
  2. If the result is at most `max` **code points** (`Array.from`), return it unchanged.
  3. Otherwise return the first `max` code points, right-trimmed, plus `"…"`.

  Add `src/lib/messages/preview.test.ts` covering:
  - short text unchanged;
  - `"a\n\nb"` → `"a b"`;
  - 150 × `"x"` → 100 × `"x"` + `"…"`;
  - an emoji at position 100 is never split;
  - a 120-character Urdu string is cut to 100 code points + `"…"`.
- [ ] T013 [P] Create `src/lib/messages/inbox-href.ts` exporting `inboxHref(from?: string | null): string` (research §8):
  - Parse `from` with `new URLSearchParams(from ?? "")`.
  - Keep `q` only if it is non-empty after trimming.
  - Keep `status` only if `isMessageStatus` is true.
  - Keep `page` only if it is an integer ≥ 2.
  - Return `/admin/messages`, plus `?` and the rebuilt query if any key survived.

  Add `src/lib/messages/inbox-href.test.ts` covering:
  - `undefined` → `/admin/messages`;
  - `"q=ali&status=read&page=2"` round-trips;
  - `"status=bogus&page=0&evil=1"` → `/admin/messages`;
  - `"https://evil.example"` and `"javascript:alert(1)"` → `/admin/messages`;
  - the result always starts with `/admin/messages`.
- [ ] T014 Create `src/lib/validation/message.ts` (depends on T004, T007, T011) per data-model.md "Validation schemas".
  - `messageInputSchema`:
    - `name`: trim, `collapseSpaces`, `min(1, "Name is required.")`, `max(100, "Name must be 100 characters or fewer.")`.
    - `email`: trim, lower-case, `z.email("Enter a valid email address.")`, `max(254, "Enter a valid email address.")`.
    - `phone`: `z.string().optional()`, then a `transform`. `undefined`, or an empty string after trimming, becomes `null`. Otherwise run `normalisePakistaniMobile`, and add the issue `"Enter a Pakistani mobile number, e.g. 03001234567."` when it returns `null`.
    - `subject`: trim, `collapseSpaces`, `min(1, "Subject is required.")`, `max(150, "Subject must be 150 characters or fewer.")`.
    - `message`: `z.string().transform(v => v.replace(/\r\n?/g, "\n"))`, then pipe to `z.string().trim().min(1, "Message is required.").max(MESSAGE_MAX_LENGTH, "Message must be 5,000 characters or fewer.")`.
  - `MESSAGE_MAX_LENGTH = 5000`.
  - `type MessageInput` (the output type).
  - `messageStatusUpdateSchema = z.object({ status: z.enum(MESSAGE_STATUS_KEYS, { error: "Choose New, Read or Responded." }) })`.
  - A header comment: shared by `ContactForm` and the public route (Constitution IV).
- [ ] T015 Create `src/lib/validation/message.test.ts` (depends on T014). Cases:
  - Each required field whitespace-only → its "required" message.
  - `"  Ali   Khan "` → `"Ali Khan"`.
  - 101-character name, 151-character subject, 5,001-character message → the matching limit messages.
  - Exactly 5,000 characters → accepted.
  - `" Ali@Example.COM "` → `"ali@example.com"`.
  - Phone:
    - omitted, `""` or `"   "` → `null`;
    - each of `03001234567`, `0300-1234567`, `+92 300 1234567`, `92 300 1234567` → `+923001234567`;
    - landline `042-35761234` → the phone message.
  - Message:
    - `"a\r\nb\rc"` → `"a\nb\nc"`;
    - inner blank lines kept.
  - Urdu name, subject and message (`"علی خان"`, `"داخلہ"`, a paragraph with line breaks) come through unchanged.
  - Status schema: `"responded"` → OK; `"archived"` → the status message.
- [ ] T016 Create `src/models/message.ts` (depends on T011) per data-model.md.
  - Schema:
    - `name`: String, required, `maxlength: 100`.
    - `email`: String, required, `maxlength: 254` — **not unique**.
    - `phone`: String, `default: null`.
    - `subject`: String, required, `maxlength: 150`.
    - `body`: String, required, `maxlength: 5000`.
    - `status`: String, `enum: MESSAGE_STATUS_KEYS`, `default: "new"`, required.
    - `statusChangedAt`: Date, `default: null`.
  - Options `{ timestamps: true, collection: "messages" }`, plus `softDeletePlugin`.
  - Indexes `{ createdAt: -1 }` and `{ status: 1, createdAt: -1 }`.
  - Header comment: append-only, no unique index on purpose, see research §1 and ADR-0001's "Boundary".
  - Export `MessageDoc` and a `Message` model with `SoftDeleteStatics`, using the same `mongoose.models` guard as `src/models/signup.ts`.
- [ ] T017 [P] Add `messagesCopy` to `src/content/admin.ts`, per contracts/admin-messages-api.md. Keys:
  - `pageTitle: "Messages"`.
  - `table.headers`: `{ name: "Name", subject: "Subject", preview: "Message", status: "Status", received: "Received", actions: "Actions" }`.
  - `table.empty: "No messages yet."`, `table.emptyFiltered: "No messages match your search or filter."`, `table.delete: "Delete message"`.
  - `filters`: `{ searchPlaceholder: "Search name, email or subject", statusLabel: "Status", statusAll: "All statuses" }`.
  - `pagination`: same shape as `signupsCopy.pagination`.
  - `detail`:
    - `back: "Back to inbox"`, `from: "From"`, `email: "Email"`, `phone: "Phone"`, `phoneNone: "Not provided"`;
    - `whatsapp: "WhatsApp"`, `received: "Received"`, `status: "Status"`;
    - `markResponded: "Mark as responded"`, `gone: "This message is no longer available."`;
    - `replyPrefix: "Re: "`.
  - `deleteDialog`: `{ title: "Delete this message?", body: "It will be removed from the inbox.", cancel: "Cancel", confirm: "Delete" }`.
  - `toasts`:
    - `deleted: "Message deleted"`, `gone: "This message is no longer available"`;
    - `unavailable: "Service temporarily unavailable"`;
    - `statusSaved: (label: string) => \`Status updated to ${label}\``;
    - `statusFailed: "Couldn't update the status. Please try again."`.

**Checkpoint**: `npm test` is green for the lifted modules, `preview`, `inbox-href`, `validation/message` and every unchanged 004 suite, and T010's E2E gate is green.

---

## Phase 3: User Story 1 — Visitor sends an enquiry (Priority: P1) 🎯 MVP

**Goal**: `/contact` shows the banner and the reference's yellow form band. A visitor can send name, email, optional phone, subject and message; sees per-field messages, a thank-you and cleared fields; and each send is stored as a new `messages` record with status `new`.

**Independent Test**: Open `/contact` and send a valid message without a phone: the thank-you appears, the fields are empty, and one `new` document exists with `phone: null`. Submit each required field blank or malformed: the matching message appears and nothing is stored. Send two messages from `ali@example.com` / `ALI@example.com`: two documents exist (quickstart §4 steps 2–4).

### Write path and public API for User Story 1

- [ ] T018 [US1] Create `src/lib/messages/mutations.ts` (depends on T014, T016).
  - Header comment: this is the append-only write path. It must never upsert, look up by email, or pass `withDeleted` (ADR-0001 "Boundary").
  - `createMessage(input: MessageInput): Promise<{ id: string }>`: call `connectDb()`, then `Message.create({ name, email, phone, subject, body: input.message, status: "new", statusChangedAt: null })`.
- [ ] T019 [US1] Create `src/lib/messages/mutations.test.ts` `[DB]` (depends on T018), using `describeWithDb("messages mutations", ["messages"], …)`. Cases:
  - `createMessage` stores `status: "new"`, `statusChangedAt: null`, `phone: null` when the input phone is `null`, and `body` equal to `input.message`.
  - Two calls with the same email and different subjects → `countDocuments({ email })` is 2.
  - Two calls with an identical payload → 2 documents.
- [ ] T020 [US1] Create `src/app/api/public/messages/route.ts` (depends on T006, T014, T018) per contracts/public-contact-api.md. `POST` runs these steps in order:
  1. If `Number(request.headers.get("content-length") ?? 0) > 65536`, return `payloadTooLargeResponse()`.
  2. Parse JSON. A parse failure or a non-object body returns `validationResponse({})`.
  3. `const check = await protectPublicForm(request, { name: "contact" }, body)`:
     - `"honeypot"` → `Response.json({ ok: true }, { headers: NO_STORE })` without touching the database;
     - `"limited"` → `tooManyRequestsResponse(check.retryAfterSeconds)`.
  4. `messageInputSchema.safeParse(body)`. A failure returns `validationResponse(fieldErrors(...))`.
  5. `await createMessage(data)`, then return `Response.json({ ok: true }, { headers: NO_STORE })`.

  Any thrown error returns `unavailableResponse()`. The header comment states the order and that the success body is identical to the honeypot body.
- [ ] T021 [US1] Create `src/app/api/public/messages/route.test.ts` `[DB]` (depends on T020), using `describeWithDb("POST /api/public/messages", ["messages", "throttles"], …)` (the Throttle model's collection is `throttles`). Give each case a distinct `x-forwarded-for`. Cases:
  - A valid body without a phone → `200 { ok: true }` with `cache-control: no-store`, and one document with the normalised email and `phone: null`.
  - The same with `phone: "0300-1234567"` → stored `+923001234567`.
  - A missing name, subject or message, a bad email, or a landline phone → `400` with exactly those `fields` keys.
  - A non-JSON body → `400`.
  - `vi.mock` of `createMessage` throwing → `503 { error: "unavailable" }`.
  - Two valid posts from the same email → 2 documents.

  The honeypot, 429, 413 and length-limit cases are added in US6 (T063).

### Tokens and assets for the Contact page (Constitution V gate — blocks T025–T030 and US5 UI)

- [ ] T022 [US1] Create `research/extract-contact-tokens.ts` and `research/extract-contact-tokens.browser.js`, modelled on `research/extract-signup-tokens.ts` / `.browser.js` (Chrome channel; read the browser script as raw text). Visit `https://das.edu.pk/contact/` at 375, 768, 1024 and 1440 and capture:
  - **Banner**: height, `background-image` URL, `background-position/size`, and the title and breadcrumb `font-size/weight/color`.
  - **Detail columns**: the illustration's rendered width and height, and each image `src`. For the heading: `font-family/size/weight/line-height/color/text-transform`. For the letter-spaced subtitle: `font-family/size/weight/line-height/letter-spacing/color`. For the body text: `font-size/line-height/color`. Also the column gap, the gap between blocks, and the layout (`columns` count from bounding boxes).
  - **Map heading**: `font-family/size/weight/color`, the map area height and the spacing around it.
  - **Form band**: `background-color` and vertical padding. For inputs and the textarea: `height`, `padding`, `font-size`, `border`, `border-radius`, `background-color`, placeholder colour (read via `getComputedStyle(el, "::placeholder")`), and the gaps between fields and rows. For the Send button: `background`, `:hover` background, `height/padding`, `font`, `border-radius`, `color`.

  Write `research/tokens/contact-page-<viewport>.json`. Do **not** overwrite the existing `contact-*.json` page aggregates. The script also downloads the banner image and the four illustration images into `public/images/contact/` as `banner.<ext>`, `by-phone.<ext>`, `by-email.<ext>`, `visit-us.<ext>` and `write-us.<ext>`, keeping the source file's extension.
- [ ] T023 [US1] Run `npx tsx research/extract-contact-tokens.ts` (depends on T022).
  - Add a "Contact page (008 — extracted per-element)" section to `research/design-tokens.md`. It holds per-viewport tables of the captured values, the image source URLs, and the final token names (contracts/contact-page.md "Tokens").
  - Mark every value that equals an existing token (for example `color-cta`, `--color-cta-hover`, `text-button`, `color-primary`, the News banner tokens) as **reused**, not new.
  - If the live page's copy, colours, layout or images differ from `screenshots/das.edu.pk_contact_*.png`, **stop and flag the difference to the user** instead of choosing (Constitution I).
- [ ] T024 [US1] Add the new values to the `@theme` block in `src/app/globals.css` (depends on T023), as the `--color-contact-*`, `--text-contact-*`, `--spacing-contact-*` and `--radius-contact-*` tokens named in T023, with a comment pointing to the design-tokens section. Reuse `.signup-honeypot` for the contact honeypot instead of adding a second identical utility, and generalise its comment to "public-form honeypot (004, 008)". Components must contain no raw values.
- [ ] T025 [US1] Build the banner (depends on T023, T024).
  - **If** T023 recorded the contact banner's height, title and breadcrumb values as equal to the `--*-news-banner-*` tokens:
    - Create `src/components/site-shell/page-banner.tsx` by lifting `NewsBanner`'s markup into `PageBanner`, with props `{ title; trail; dir?; breadcrumbHome; backgroundImage?: string }`. When `backgroundImage` is set, render it with `next/image` `fill`, `priority`, `alt=""`, `className="object-cover"` behind the content, and use `bg-primary` otherwise.
    - Rewrite `src/components/news/news-banner.tsx` as a wrapper that passes `breadcrumbHome={newsPublicCopy.banner.breadcrumbHome}`.
  - **Otherwise**, create `src/components/contact/contact-banner.tsx` with its own `--*-contact-banner-*` tokens.
  - Either way, `src/components/contact/contact-banner.tsx` exports `ContactBanner()`. It renders an `h1` "Contact" and the breadcrumb Home » Contact from `contactCopy.banner`, with the `/images/contact/banner.*` background.
  - Run the news Vitest and `e2e/news-*.spec.ts` if `NewsBanner` changed.

### Public UI for User Story 1

- [ ] T026 [P] [US1] Create `src/content/contact.ts` with `contactCopy.banner` and `contactCopy.form`, exactly as in contracts/contact-page.md "Content":
  - the visually hidden heading;
  - placeholders `Name` / `Email` / `Phone (optional)` / `Subject` / `Your Message`;
  - `submit: "Send"`, `sending: "Sending…"`;
  - `counter(n, max)`;
  - `success` (title, body, again), marked `placeholder: true` with the 001 placeholder comment;
  - `errors.rateLimited` and `errors.unavailable`.
- [ ] T027 [US1] Create `src/components/contact/contact-form.tsx` (`"use client"`; depends on T014, T024, T026), modelled on `SignupForm`.
  - **State**: `values` `{ name, email, phone, subject, message }`, `fieldErrors`, and `status` `idle | submitting | success | error(banner)`.
  - **Fields**:
    - five controls with ids `contact-name`, `contact-email`, `contact-phone`, `contact-subject`, `contact-message` — four `<input>` (`type` text / email / tel / text) and one `<textarea rows>` sized by the textarea height token;
    - `autoComplete` `name` / `email` / `tel` / `off` / `off`;
    - `maxLength` 100 / 254 / 32 / 150 on the inputs. The textarea gets **no** `maxLength`, so an over-long paste is kept and reported rather than silently cut;
    - `required` on every field except phone;
    - each has an `sr-only` `<label>` plus the reference placeholder;
    - `aria-invalid` and `aria-describedby` point to `<p id="contact-<field>-error">`.
  - **Editing**: editing a field removes that field's message.
  - **Counter**: under the message field, show `contactCopy.form.counter(values.message.length, MESSAGE_MAX_LENGTH)`. It turns `text-error` when over the limit, and has `aria-live="polite"` only when length ≥ 4,500.
  - **Submit**:
    1. `messageInputSchema.safeParse(values)`. On failure, set `fieldErrors` and stop.
    2. Otherwise `fetch("/api/public/messages", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...values }) })`. The honeypot field is added in US6 (T062).
    3. Map the response:
       - `200` → success: clear the values and show the thank-you in `role="status"` with an "again" button back to `idle`;
       - `400` → set `fieldErrors` from `body.fields`;
       - `429` → banner `errors.rateLimited`;
       - `413`, `503` or a network error → banner `errors.unavailable`.

       Values are **kept** on every error. The banner uses `role="alert"`.
  - **Layout**: one column by default. From `md:`, two-column grid rows (Name | Email, Phone | Subject), then Message full width, then Send full width (`bg-cta hover:bg-cta-hover text-white`, token sizes). Only `--*-contact-*` and existing tokens.
  - The Name input accepts a `ref` so US5's `WriteUsLink` can focus it through `id="contact-name"`.
- [ ] T028 [US1] Create `src/components/contact/contact-form.test.tsx` (jsdom; depends on T027), mocking `fetch`. Cases:
  - Submitting empty shows four messages and none for phone, and `fetch` is not called.
  - Typing into Name clears only its message.
  - `200` shows the thank-you and "Send another message" returns empty fields.
  - `400 { fields: { email } }` shows the email message and keeps the values.
  - `429` shows the rate-limited banner and keeps the values.
  - `503` and a rejected fetch show the unavailable banner and keep the values.
  - A 5,001-character message shows the counter in the error colour and blocks the send with the limit message.
  - The typed text comes back with its line breaks intact.
  - Accessibility (FR-009): every field is found with `getByRole(..., { name })` through its `sr-only` label; after a failed submit, each invalid field has `aria-invalid="true"` and an `aria-describedby` that points to the element holding its message; the thank-you is inside `role="status"` and the error banner inside `role="alert"`.
- [ ] T029 [US1] Create `src/components/contact/contact-form-section.tsx` (Server Component; depends on T026, T027):
  - `<section id="contact-form" aria-labelledby="contact-form-heading" className="bg-contact-form-band py-(--spacing-contact-form-band-y)">`;
  - a container (`max-w-(--container-max-width) px-(--container-gutter-x)`);
  - `<h2 id="contact-form-heading" className="sr-only">`;
  - `<ContactForm />`.
- [ ] T030 [US1] Replace `src/app/(public)/contact/page.tsx` (depends on T025, T029). It is now an async Server Component with `export const metadata = { title: "Contact" }` that renders `<ContactBanner />` and `<ContactFormSection />`. US5 inserts the details and map between them. The existing `e2e/shell-and-placeholders.spec.ts` check for the level-1 "Contact" heading must still pass.
- [ ] T031 [US1] Create `e2e/contact-public.spec.ts` (`forms` project; depends on T001–T003 and T030). Wrap each test in its own `test.describe` block containing `test.use({ extraHTTPHeaders: forwardedFor(<unique n>) })`, because Playwright only allows `test.use` at file or describe level. Run `clearMessages()` in `beforeEach`. Tests:
  1. A valid send with no phone shows the thank-you, all fields are empty, and `findMessages({ email })` returns 1 document with `status: "new"` and `phone: null`.
  2. Sending empty shows the four required messages, no phone message, and 0 documents.
  3. `ali@example` and phone `12345` show the email and phone format messages and 0 documents.
  4. Each of the four phone formats is accepted and stored as `+923001234567`. Use one `describe` per format, each with its own `n`.
  5. Two different messages from `ali@example.com` and `ALI@example.com` produce 2 documents.
  6. `page.route("**/api/public/messages", r => r.fulfill({ status: 503, body: '{"error":"unavailable"}' }))` shows the friendly banner, and the typed name, subject and multi-line message are still in the fields.
  7. "Send another message" shows an empty form.

**Checkpoint**: The MVP works. The public form stores separate records. Admins can't see them yet.

---

## Phase 4: User Story 2 — Admin reads messages (Priority: P1)

**Goal**: `/admin/messages` lists messages newest first, with name, subject, a one-line preview, status and date received. New messages stand out. The admin can search by name, email or subject, filter by status, and page through 20 at a time. `/admin/messages/[id]` shows the full message, plain text only, with mailto, tel and WhatsApp reply links and a back link that keeps the inbox state.

**Independent Test**: Seed about 45 messages across all statuses, including Urdu, a long body, no phone, and an HTML payload. Find one by part of the name, email or subject; filter to New; page to page 3 with the filters kept; open a message and check the full text, the reply link `href`s and the back link (quickstart §4 steps 5, 8).

- [ ] T032 [US2] Create `src/lib/messages/admin-queries.ts` (depends on T011, T012, T016), per data-model.md "Read paths". It imports `Paged`, `ADMIN_PAGE_SIZE` and `escapeRegExp` from `@/lib/admin-list` and `formatPhoneLocal` from `@/lib/phone`.
  - `MessageRow` and `MessageDetail` DTOs.
  - `buildFilter({ q, status })`. A trimmed `q` becomes `$or: [{ name: rx }, { email: rx }, { subject: rx }]` with a case-insensitive `rx` built through `escapeRegExp`. A `status` for which `isMessageStatus` is true becomes `filter.status`; any other value is ignored.
  - `listMessages({ q, status, page })`:
    - page = `max(1, floor(page))`;
    - `countDocuments`;
    - `totalPages = max(1, ceil(total / 20))`;
    - `find(filter).sort({ createdAt: -1, _id: -1 }).skip().limit(20).lean()`;
    - map to `MessageRow`, where `preview` is `toPreview(doc.body)` and `receivedAt` is `createdAt.toISOString()`.
  - `getMessage(id)`: returns `null` when `!mongoose.isValidObjectId(id)`. Otherwise `findById(id).lean()` (the plugin excludes deleted documents), mapped to `MessageDetail`, where `phoneDisplay` is `formatPhoneLocal(phone)` or `null`.
  - No `withDeleted` anywhere.
- [ ] T033 [US2] Create `src/lib/messages/admin-queries.test.ts` `[DB]` (depends on T032). Cases:
  - Order is newest first.
  - 45 seeded messages give pages of 20, 20 and 5, and `totalPages` 3.
  - `q` matches part of a name, part of an email (case-insensitive) and part of a subject; an Urdu `q` matches an Urdu subject; `q = "a.b"` matches literally (escaped).
  - `status: "read"` returns only read messages; `status: "bogus"` returns all.
  - `q` and `status` combine.
  - A soft-deleted message is excluded from the list and from `getMessage`.
  - The preview is at most 101 code points and never contains `\n`.
  - `getMessage("not-an-id")` → `null`.
  - The detail keeps the body's line breaks and returns `phone`/`phoneDisplay` as `null` when there is no phone.
  - SC-007 performance: seed 200 messages, then time `listMessages({ q: <part of one subject> })` with `performance.now()`. It must finish in under 1,000 ms and return that message. Log the time.
- [ ] T034 [P] [US2] Create `src/components/admin/messages/messages-table.tsx` (Server Component; depends on T005, T017, T032), modelled on `SignupsTable`. Props `{ rows: MessageRow[]; filtered: boolean; from: string }`.
  - Headers come from `messagesCopy.table.headers`.
  - Each row:
    - name and subject are `next/link`s to `\`/admin/messages/${row.id}${from ? \`?from=${encodeURIComponent(from)}\` : ""}\``, with `dir="auto"`, plus `font-body-urdu` when `isRtlScript`, and `font-bold` when `status === "new"`;
    - the preview cell is `min-w-0 w-full`, and the preview is a `block truncate` span in `text-muted-foreground` with `dir="auto"`. The table's own column sizing sets the width, so no fixed width or arbitrary value is used (Constitution V);
    - the status is a `Badge`: `highlight` "New", `secondary` "Read" or `outline` "Responded";
    - the received date is `formatAdminDateTime`;
    - an actions cell (the delete button is added in US4, T052).
  - The empty state matches `SignupsTable`, with the `empty` or `emptyFiltered` copy.
  - Only text children — **no** `dangerouslySetInnerHTML`.
- [ ] T035 [P] [US2] Create `src/components/admin/messages/message-detail.tsx` (Server Component; depends on T005, T017, T032). Props `{ message: MessageDetail; backHref: string; actions?: React.ReactNode }`.
  - A back `Link` with `messagesCopy.detail.back`.
  - An `h1` for the subject (`dir="auto"`, Urdu font when RTL).
  - A `<dl>` of sender details:
    - name;
    - email as `<a href={\`mailto:${email}?subject=${encodeURIComponent(replyPrefix + subject)}\`}>`;
    - phone: when present, `<a href={\`tel:${phone}\`}>{phoneDisplay}</a>` plus `<a href={\`https://wa.me/${phone.slice(1)}\`} target="_blank" rel="noopener noreferrer">WhatsApp</a>`; otherwise `phoneNone` with no links;
    - received date;
    - status: the badge, plus the `actions` slot for US3 and US4.
  - The body in a `<div dir="auto" className="whitespace-pre-wrap [overflow-wrap:anywhere] …">{message.body}</div>`.
  - Only text children.
- [ ] T036 [US2] Create `src/components/admin/messages/messages-table.test.tsx` and `src/components/admin/messages/message-detail.test.tsx` (jsdom; depend on T034, T035). Use the payload `<script>alert(1)</script><img src=x onerror="window.__xss=1">` as the name, subject and body. Assert:
  - the literal payload text is present;
  - `container.querySelector("script, img")` is `null`.

  Also:
  - no phone → "Not provided", and no `tel:` or `wa.me` link;
  - with a phone, the `href`s are exactly `tel:+923001234567`, `https://wa.me/923001234567` and `mailto:ali@example.com?subject=Re%3A%20Fees`;
  - a new row is bold with a "New" badge; a read row is not bold;
  - an Urdu subject gets `dir="auto"` and `font-body-urdu`;
  - a body with `\n\n` renders inside the `whitespace-pre-wrap` element.
- [ ] T037 [US2] Replace `src/app/admin/(dashboard)/messages/page.tsx` (depends on T008, T034), modelled on `/admin/signups/page.tsx`.
  - `await requireAdminSession()`.
  - Read `q`, `status` and `page` from `searchParams`, and call `listMessages`.
  - Build `from` from the current `q`, `status` and `page`.
  - Render the `h1` `messagesCopy.pageTitle`, then `<AdminListFilters searchPlaceholder={messagesCopy.filters.searchPlaceholder} select={{ param: "status", label: messagesCopy.filters.statusLabel, allLabel: messagesCopy.filters.statusAll, options: MESSAGE_STATUSES.map(s => ({ value: s.key, label: s.label })) }} />`, then `<MessagesTable rows filtered from />`, then `<AdminPagination basePath="/admin/messages" searchParams={{ q, status }} copy={messagesCopy.pagination} />`.
  - `export const dynamic = "force-dynamic"`.
- [ ] T038 [US2] Create `src/app/admin/(dashboard)/messages/[id]/page.tsx` (depends on T013, T035). It uses `PageProps<"/admin/messages/[id]">`.
  - `await requireAdminSession()`.
  - `const { id } = await params`; `from` comes from `searchParams.from` (a string only).
  - `backHref = inboxHref(from)`.
  - `const message = await getMessage(id)`:
    - if `null`, render a panel with `messagesCopy.detail.gone` and a back link, inside the layout — **not** `notFound()`;
    - otherwise render `<MessageDetail message backHref />`.
  - `metadata` title "Message"; `dynamic = "force-dynamic"`.
- [ ] T039 [US2] Create `e2e/admin-messages-list.spec.ts` (`admin` project; depends on T003, T037, T038). Log in with `loginAsAdmin`, and in `beforeEach` run `clearMessages()` then `seedMessages`. Tests:
  1. Rows are newest first, with name, subject, a one-line preview ending in "…" for a long body, a status badge and a date.
  2. New rows are bold with a "New" badge; read rows are not.
  3. Search by part of a name, an email and a subject; each shows only the matches.
  4. The New filter, then Responded, show only those statuses.
  5. With 45 seeded messages, Next moves to page 2 and keeps `q` and `status` in the URL.
  6. Seeding nothing shows the empty state; a search that matches nothing shows the filtered empty state.
  7. Opening a message shows the full body with its line breaks. For a 5,000-character Urdu body, `document.documentElement.scrollWidth <= innerWidth` at 1440 and at 375, so there is no horizontal scroll.
  8. No phone → "Not provided" and no call or WhatsApp link. With a phone, the `href`s match those asserted in T036.
  9. The back link returns to the same `q`/`status`/`page`.
  10. For the XSS payload, attach `page.on("dialog")`, open the inbox and the detail page, and assert no dialog fired, `await page.evaluate(() => (window as any).__xss)` is `undefined`, and the literal text is visible.
  11. `/admin/messages/507f1f77bcf86cd799439011` shows "This message is no longer available." with a back link.
- [ ] T040 [US2] Create `e2e/admin-messages-protected.spec.ts` (`admin` project; depends on T037, T038). Without logging in:
  - `/admin/messages` redirects to `/admin/login?next=%2Fadmin%2Fmessages`;
  - `/admin/messages/<seeded id>` redirects to login with the encoded `next`.

  The API cases are added in T048 and T053.

**Checkpoint**: The inbox and detail pages are readable end to end. The status stays whatever was seeded.

---

## Phase 5: User Story 3 — Admin tracks status (Priority: P1)

**Goal**: Opening a new message changes it to read. From the detail page the admin can set new, read or responded; each change is saved immediately and confirmed, and a failure keeps the previous status on screen.

**Independent Test**: Open a new message: it shows Read, and the inbox shows it as read. Click "Mark as responded": a confirmation toast appears and the status is Responded. Set it to New: it appears as New in the inbox. Make PATCH fail: an error toast appears and the previous status stays (quickstart §4 steps 6–7).

- [ ] T041 [US3] Add to `src/lib/messages/mutations.ts` (depends on T018):
  - `markMessageRead(id)`:
    1. Return `null` for an invalid id.
    2. `Message.findOneAndUpdate({ _id: id, status: "new" }, { $set: { status: "read", statusChangedAt: new Date() } }, { new: true })`. If that returns a document, return `{ id, status: "read", changed: true }`.
    3. Otherwise `Message.findById(id)`. Return `{ id, status: doc.status, changed: false }` if found, else `null`.
  - `setMessageStatus(id, status)`: `findOneAndUpdate({ _id: id }, { $set: { status, statusChangedAt: now } }, { new: true })`. Return `{ id, status, statusChangedAt: ISO }` or `null`.

  The plugin makes deleted documents unmatchable by both.
- [ ] T042 [US3] Extend `src/lib/messages/mutations.test.ts` `[DB]` (depends on T041). Cases:
  - `markMessageRead` on new → `changed: true`, `status: "read"`, `statusChangedAt` set.
  - The same call again → `changed: false`.
  - On responded → unchanged, `changed: false`.
  - On a deleted or unknown id → `null`.
  - Ten concurrent `markMessageRead` calls → exactly one `changed: true`.
  - `setMessageStatus` read → responded → new → read, with `statusChangedAt` increasing each time.
  - `setMessageStatus` on a deleted id → `null`.
  - Last write wins (spec edge case): two `setMessageStatus` calls in a row on the same id, `"responded"` and then `"new"`, leave the document at `"new"`, with the later `statusChangedAt`.
- [ ] T043 [US3] Create `src/app/api/admin/messages/[id]/read/route.ts` (depends on T006, T041). `POST(_request, context: RouteContext<"/api/admin/messages/[id]/read">)`:
  1. `requireAdminSession({ mode: "api" })`. No session → `unauthorizedResponse()`.
  2. `markMessageRead(id)`. `null` → `notFoundResponse()`; otherwise `Response.json(result, { headers: NO_STORE })`.

  A thrown error → `unavailableResponse()`.
- [ ] T044 [US3] Create `src/app/api/admin/messages/[id]/route.ts` with a `PATCH` handler (depends on T006, T014, T041):
  1. Session check → `401`.
  2. Parse JSON. A failure → `validationResponse({ status: "Choose New, Read or Responded." })`.
  3. `messageStatusUpdateSchema.safeParse`. A failure → `validationResponse(fieldErrors(...))`.
  4. `setMessageStatus`. `null` → `404`; otherwise `200` with the result.

  A thrown error → `503`. `DELETE` is added in US4 (T050).
- [ ] T045 [US3] Create `src/app/api/admin/messages/[id]/read/route.test.ts` and `src/app/api/admin/messages/[id]/route.test.ts` `[DB]` (depend on T043, T044), following `src/app/api/admin/signups/[id]/route.test.ts` (`vi.doMock("next/headers")`, `seedTestAdmin`, `getTestSessionCookie`).
  - **read**: no session → `401 { error: "unauthorized" }` with `no-store`; new → `200 { changed: true, status: "read" }`; read → `200 { changed: false }`; malformed, unknown or deleted id → `404`.
  - **PATCH**: no session → `401`; `{ status: "responded" }` → `200` and the document is updated; `{ status: "archived" }` or a non-JSON body → `400` with `fields.status`; unknown or deleted id → `404`.
- [ ] T046 [P] [US3] Create `src/components/admin/messages/mark-read-on-open.tsx` (`"use client"`). Props `{ id: string; status: MessageStatus }`.
  - Capture the status **when the component mounts** with `const statusAtOpen = useRef(status)`. Later prop changes are deliberately ignored.
  - A `useRef(false)` "fired" guard, so it fires at most once per mount, even under StrictMode.
  - In `useEffect`, run only if `statusAtOpen.current === "new"` and the guard is not set: `fetch(\`/api/admin/messages/${id}/read\`, { method: "POST" })`. If the response is `ok` and `body.changed`, call `router.refresh()`. Errors are silent (contract).
  - It renders `null`. Header comment:
    - research §5: no GET side effects, and the layout re-renders only via `refresh`;
    - the parent renders this component **unconditionally** with `key={id}` (T048). `router.refresh()` keeps it mounted, so it acts once per visit to the page. A message set back to New while the page is open is not marked read again until the next visit (spec US3 scenario 4; sp.analyze H1).

  Add `src/components/admin/messages/mark-read-on-open.test.tsx` (jsdom, mocking `fetch` and `useRouter`):
  - mounted with `status="new"` → exactly one POST, and `refresh` is called when `changed: true`;
  - mounted with `status="read"` or `"responded"` → no POST;
  - mounted with `"new"`, then re-rendered with `"read"` and then `"new"` (same key) → still exactly one POST in total;
  - under `<StrictMode>` → one POST.
- [ ] T047 [P] [US3] Create `src/components/admin/messages/message-status-control.tsx` (`"use client"`). Props `{ id: string; status: MessageStatus }`.
  - Local `saved` state, initialised from the `status` prop, plus `pending`. The parent **must** render it with `key={status}` (T048), so a server-side status change (the `router.refresh()` from `MarkReadOnOpen`, or a change made in another tab) remounts it with the new value. Otherwise the initial state would keep showing "New" after an auto-read (sp.analyze U1).
  - A labelled `Select` (`aria-label={messagesCopy.detail.status}`) with the options from `MESSAGE_STATUSES`, controlled by `saved`.
  - A primary `Button` "Mark as responded", shown only when `saved !== "responded"`.
  - Both call `save(next)`, which disables the controls, then sends `PATCH` with `{ status: next }`:
    - `200` → `setSaved(body.status)`, toast `statusSaved(statusLabel(body.status))` (success), `router.refresh()`;
    - `404` → toast `gone`, refresh;
    - anything else → toast `statusFailed` (error), and `saved` is unchanged, so the select snaps back.

  Add `src/components/admin/messages/message-status-control.test.tsx` (jsdom): a `200` updates the displayed status and the toast; a `503` keeps the previous value selected and shows the failure toast; the button is hidden when the status is responded; and re-rendering with `key` changed from `"new"` to `"read"` (simulating the refresh) shows Read.
- [ ] T048 [US3] Wire both into `src/app/admin/(dashboard)/messages/[id]/page.tsx` (depends on T038, T046, T047). Pass `actions={<MessageStatusControl key={message.status} id={message.id} status={message.status} />}` to `MessageDetail` (the key is required — see T047), and **always** render `<MarkReadOnOpen key={message.id} id={message.id} status={message.status} />`. Never render it conditionally on the status: conditional rendering would remount it when a message is set back to New, and it would immediately mark the message read again (sp.analyze H1).

  Extend `e2e/admin-messages-protected.spec.ts`: `request.post("/api/admin/messages/<id>/read")` and `request.patch("/api/admin/messages/<id>", { data: { status: "read" } })` without a session → `401`.
- [ ] T049 [US3] Create `e2e/admin-messages-status.spec.ts` (`admin` project; depends on T048). Tests:
  1. Seed a new message and open it. The status control shows Read without a manual reload, and after going back the row is not bold and has a "Read" badge. `findMessages` shows `status: "read"`.
  2. Seed a responded message and open it. It stays Responded.
  3. Click "Mark as responded". The toast "Status updated to Responded" appears and the document is `responded`.
  4. Select New. A toast appears; back in the inbox the row is bold "New"; the document is `new`.
  5. `page.route("**/api/admin/messages/*", r => r.request().method() === "PATCH" ? r.fulfill({ status: 503, body: '{"error":"unavailable"}' }) : r.continue())`. Selecting Responded shows the failure toast and the select still shows the previous value.

**Checkpoint**: US1–US3 (all the P1 stories) are complete. Status can be tracked end to end.

---

## Phase 6: User Story 4 — Admin deletes a message (Priority: P2)

**Goal**: The admin can delete a message from the inbox row or the detail page. Delete asks for confirmation and is a soft delete. The message disappears from the inbox, search, filters and counts; its old URL shows "no longer available".

**Independent Test**: Delete a seeded message from a row: after confirming it is gone and the document has `deletedAt`. Cancelling changes nothing. Delete from the detail page: you're back in the inbox with the same filters. The old URL shows "no longer available" (quickstart §4 step 9).

- [ ] T050 [US4] Add `deleteMessage(id)` to `src/lib/messages/mutations.ts` (depends on T018, T044). Invalid id → `null`. Otherwise `Message.softDeleteById(id)`, returning `{ id }` or `null`.

  Add a `DELETE` handler to `src/app/api/admin/messages/[id]/route.ts`, following `src/app/api/admin/signups/[id]/route.ts` exactly: `401` / `200 { id, deleted: true }` / `404` / `503`.
- [ ] T051 [US4] Extend `src/lib/messages/mutations.test.ts` `[DB]` and `src/app/api/admin/messages/[id]/route.test.ts` `[DB]` (depend on T050).
  - `deleteMessage` sets `deletedAt`; a second call → `null`; a malformed id → `null`.
  - After a delete, `markMessageRead` and `setMessageStatus` on that id → `null`.
  - DELETE route: no session → `401`; live → `200` and `Message.findById` is `null`; twice → `404`; malformed → `404`.
- [ ] T052 [P] [US4] Create `src/components/admin/messages/delete-message-dialog.tsx` (`"use client"`; depends on T009, T017). A wrapper `DeleteMessageDialog({ id, subject, redirectTo, triggerLabel })` rendering `<AdminDeleteDialog endpoint={\`/api/admin/messages/${id}\`} itemName={subject} copy={…messagesCopy…} redirectTo triggerLabel />`.
- [ ] T053 [US4] Wire the delete into the pages (depends on T048, T052):
  - In `MessagesTable`'s actions cell, add `<DeleteMessageDialog id subject />` (icon trigger; refreshes in place).
  - In the detail page's `actions`, add `<DeleteMessageDialog id subject redirectTo={backHref} triggerLabel={messagesCopy.deleteDialog.confirm} />`.
  - Extend `e2e/admin-messages-protected.spec.ts`: `request.delete("/api/admin/messages/<id>")` without a session → `401`.
- [ ] T054 [US4] Create `e2e/admin-messages-delete.spec.ts` (`admin` project; depends on T053). Tests:
  1. Row delete, then Cancel: nothing changes.
  2. Row delete, then confirm: the "Message deleted" toast appears, the row is gone, the total shrinks, and `findMessages({ withDeleted: true })` shows `deletedAt` set.
  3. The deleted message is not found by search or by any status filter.
  4. Seed 25 new messages, so inbox page 2 still has 4 rows after the delete. Open one from inbox page 2 with the New filter, so its URL carries the encoded `?from=status%3Dnew%26page%3D2`. Delete it from the detail page and confirm: the URL is `/admin/messages?status=new&page=2` and the row is gone.
  5. Opening the deleted message's URL shows "This message is no longer available."
  6. With two tabs, delete in one, then act in the other: the "no longer available" toast appears.

**Checkpoint**: Housekeeping is available. Deleted messages are hidden everywhere they are read.

---

## Phase 7: User Story 5 — Contact page details (Priority: P2)

**Goal**: The Contact page shows four detail columns (By Phone with office hours, By Email, Visit Us, Write Us), the "Locate Us on Google Maps" heading, a map built from the address (requested only when scrolled into view, in space reserved from the first render), and an "Open in Google Maps" link that is always present. All values come from `getContactDetails()`, so 005 only changes that function's source.

**Independent Test**: Open `/contact`. The four columns show the `contactInfo` values, the tel and mailto links work, "Click this link to view inquiry form" moves to the form and focuses Name, no map request is made until the map is scrolled into view, then the map iframe's `src` contains the encoded address with the "Open in Google Maps" link beside it. Changing `contactInfo.phone` in the content file changes the page and the footer (quickstart §4 step 1).

- [ ] T055 [US5] In `src/content/site-shell.ts`, add `mapUrl: string` and `officeHours: string` to `ContactInfo`. In `contactInfo`:
  - `mapUrl: "https://maps.google.com/?q=Dar-e-Arqam+School+Metroville"`;
  - `officeHours: "Monday to Saturday, 9am to 6pm PST"`.

  Extend the existing placeholder comment: the address, map link and hours are placeholders until the client supplies them. Settings (005) replaces this source through `getContactDetails()`; the header and footer switch in 005.

  Add to `src/content/site-shell.test.ts`: `mapUrl` starts with `https://`, and `officeHours` is non-empty.
- [ ] T056 [US5] Create `src/lib/contact-details.ts` (depends on T055). Export:
  - `async function getContactDetails(): Promise<ContactInfo>`, which returns `contactInfo`, with a comment that 005 replaces only this body with a Settings read;
  - `mapEmbedSrc(address: string): string`, which returns `\`https://maps.google.com/maps?q=${encodeURIComponent(address)}&output=embed\``;
  - `CONTACT_PLACEHOLDER_FIELDS = ["address", "mapUrl", "officeHours"] as const`, so components can set `data-placeholder`.

  Add `src/lib/contact-details.test.ts`: the getter resolves to the content object; `mapEmbedSrc("313 West Canal, Lahore")` has the encoded query and `output=embed`; an address containing `&` and `#` is encoded.
- [ ] T057 [P] [US5] Add `contactCopy.columns` and `contactCopy.map` to `src/content/contact.ts`, per contracts/contact-page.md.
  - The four headings `BY PHONE`, `BY EMAIL`, `VISIT US`, `WRITE US`.
  - The subtitles: `By Phone` uses `officeHours` at render time, so its subtitle key is `null`. The other three use the reference wording.
  - `writeLink: "Click this link to view inquiry form"`.
  - Icon `src` values `/images/contact/<name>.<ext>`, matching the files T022 saved, each with alt text.
  - `map.heading`, `map.openInMaps`, `map.iframeTitle(address)`.
- [ ] T058 [P] [US5] Create `src/components/contact/contact-detail-column.tsx` and `src/components/contact/contact-details.tsx` (Server Components; depend on T024, T057).
  - **Column**: `next/image` at the icon token size, an uppercase `h3` heading, the subtitle with the letter-spacing token, a body slot, and centred text.
  - **Details**: `<section aria-label="Contact details">`, a grid that is one column below `lg:` and four from `lg:` (the reference stacks at 768 and 375).
    - By Phone: subtitle `details.officeHours` with `data-placeholder`, body `<a href={\`tel:${details.phone}\`}>{details.phone}</a>`. This is the value as stored, the same `href` the 001 footer builds (`e2e/contact-and-social.spec.ts` asserts that format), so the page and the footer never disagree.
    - By Email: `mailto:` link.
    - Visit Us: `details.address` with `data-placeholder`.
    - Write Us: `<WriteUsLink />`.
  - Only tokens.
- [ ] T059 [P] [US5] Create two components (depend on T024, T056, T057):
  - `src/components/contact/write-us-link.tsx` (`"use client"`): an `<a href="#contact-form">` whose `onClick` does not prevent the default. After the hash navigation it runs `requestAnimationFrame(() => document.getElementById("contact-name")?.focus())`.
  - `src/components/contact/lazy-map-frame.tsx` (`"use client"`), with props `{ src: string; title: string }` (FR-024a, research §13):
    - Render an `absolute inset-0` wrapper `div` with a ref. Hold `visible` state, which starts `false`.
    - In `useEffect`, create an `IntersectionObserver` (`rootMargin: "0px"`, `threshold: 0`). On the first intersecting entry, `setVisible(true)` and `disconnect()`. Disconnect on unmount.
    - Only when `visible`, render `<iframe src title loading="lazy" referrerPolicy="no-referrer-when-downgrade" className="absolute inset-0 size-full border-0" />`. Before that, no `src` exists anywhere, so no request to the map provider is made.
    - Header comment: native `loading="lazy"` alone loads the map early, because its distance threshold covers the map's position at 1440px.
  - `src/components/contact/contact-map.tsx` (Server Component), with props `{ address; mapUrl }`:
    - an `h2` `contactCopy.map.heading`, styled with the map-heading tokens and centred;
    - a map area reserved at its final size from the first render: `<div className="relative w-full h-(--spacing-contact-map-height) bg-surface">`. `bg-surface` is the existing `color-surface` `#FFFFFF`, the page background; the reference's map area appears as that blank white area in every capture. The box contains `<LazyMapFrame src={mapEmbedSrc(address)} title={contactCopy.map.iframeTitle(address)} />`. Loading the iframe changes nothing outside this box;
    - under it, always rendered, `<p>{address} · <a href={mapUrl} target="_blank" rel="noopener noreferrer">{contactCopy.map.openInMaps}</a></p>` (FR-024).
- [ ] T060 [US5] Update `src/app/(public)/contact/page.tsx` (depends on T030, T058, T059): `const details = await getContactDetails()`, then render `<ContactBanner />`, `<ContactDetails details />`, `<ContactMap address={details.address} mapUrl={details.mapUrl} />` and `<ContactFormSection />`, in the reference order.
- [ ] T061 [US5] Create `e2e/contact-details.spec.ts` (`forms` project; depends on T060; no submissions). Tests:
  1. The four headings are visible in order.
  2. In the contact details section, the phone link's `href` is exactly `` `tel:${contactInfo.phone}` `` and the email link's is exactly `` `mailto:${contactInfo.email}` ``.
  3. The office hours and address text match `contactInfo`, and those elements carry `data-placeholder`.
  4. The "Locate Us on Google Maps" heading is visible. After scrolling the map area into view, the iframe `src` contains `encodeURIComponent(contactInfo.address)` and `output=embed`.
  5. The "Open in Google Maps" link has `href = contactInfo.mapUrl` and `target="_blank"`, and is visible even when `page.route("https://maps.google.com/**", r => r.abort())` blocks the iframe.
  6. Clicking "Click this link to view inquiry form" gives a URL hash of `#contact-form`, and `#contact-name` is focused.
  7. Lazy load (SC-012), at 1440×900:
     - record every request whose URL starts with `https://maps.google.com` (`page.on("request")`), and load the page at the top;
     - precondition: the map area's `boundingBox().y` is greater than the viewport height (900). If not, fail with the message "map area is visible on first load at 1440×900 — lazy-load test needs a taller page or a shorter viewport" rather than passing vacuously;
     - no map request has been made and no `iframe` exists inside the map area;
     - `scrollIntoViewIfNeeded()` on the map area; then within 5 s the iframe exists and at least one map request was made.
  8. No layout shift (SC-012), at 1440×900:
     - through `page.addInitScript`, install a `PerformanceObserver({ type: "layout-shift" })` **without** `buffered`. It adds an entry's `value` to `window.__cls` only while `window.__measureCls === true`, and ignores entries with `hadRecentInput`;
     - load the page and wait for `document.fonts.ready` plus `networkidle`, so font and image shifts from the initial load have settled;
     - record the map area's and the form band's `boundingBox()` plus `window.scrollY`;
     - set `window.__cls = 0` and `window.__measureCls = true`;
     - scroll the map into view with `scrollIntoViewIfNeeded()` and wait for the iframe's `load` event;
     - set `window.__measureCls = false`;
     - the map area's height is unchanged, the form band's document position (`box.y + scrollY`) is unchanged, and `window.__cls` is `0`. Only shifts that happen while the map loads are counted.

**Checkpoint**: The Contact page matches the reference's structure. The form (US1) and the details work independently.

---

## Phase 8: User Story 6 — Spam and abuse protection (Priority: P2)

**Goal**: The hidden spam trap discards bot submissions while showing the normal thank-you. Rate limiting refuses the sixth send in 10 minutes, keeps the typed text, and uses a budget separate from signup. Over-long messages are rejected with a clear message.

**Independent Test**: Send valid messages six times from one address: the sixth shows "Too many messages — please try again shortly." with the text kept. Fill the hidden field: the thank-you appears but no document is stored. A 5,001-character message is rejected with the limit message (quickstart §4 steps 3, 11).

- [ ] T062 [US6] Add the honeypot to `src/components/contact/contact-form.tsx` (depends on T027). Wrap it in `<div aria-hidden="true" className="signup-honeypot">`, with a `<label htmlFor="contact-website">Website</label>` and `<input id="contact-website" name={HONEYPOT_FIELD} type="text" tabIndex={-1} autoComplete="off" value={website} onChange>`. Include `website_url: website` in the request body.

  Extend `src/components/contact/contact-form.test.tsx`: the honeypot input has `tabIndex -1` and sits inside an `aria-hidden` wrapper; it has no accessible role/name within the form's accessibility tree; and a normal submit sends `website_url: ""`.
- [ ] T063 [US6] Extend `src/app/api/public/messages/route.test.ts` `[DB]` (depends on T020):
  - `website_url: "x"` → `200 { ok: true }`, 0 documents, and no `throttles` entry for that IP.
  - Five valid posts from `203.0.113.50` → `200`; the sixth → `429` with a numeric `Retry-After`, and 5 documents.
  - Five signup posts (`POST /api/public/signups`) from `203.0.113.51`, then one contact post from the same IP → `200` (separate budgets).
  - `content-length: 70000` → `413 { error: "too_large" }`.
  - A 5,001-character `message` → `400` with `fields.message` "Message must be 5,000 characters or fewer."; exactly 5,000 → `200`.
- [ ] T064 [US6] Create `e2e/contact-protection.spec.ts` (`forms` project; depends on T062). Put each test in its own `test.describe` with `test.use({ extraHTTPHeaders: forwardedFor(n) })`, using the `n` shown. Tests:
  1. With `forwardedFor(60)`, five sends succeed, pressing "Send another message" each time. The sixth shows the rate-limited banner, and the name, subject and message are still in the fields.
  2. With `forwardedFor(61)`, `page.locator('[name="website_url"]').evaluate(el => { el.value = "bot"; el.dispatchEvent(new Event("input", { bubbles: true })) })` followed by a valid send shows the thank-you, and `findMessages({ email })` returns 0.
  3. With `forwardedFor(62)`, filling 5,001 characters shows the error-coloured counter and the limit message on Send, keeps the text, and stores 0 documents.
  4. The honeypot is not reachable with Tab: tabbing through the form never focuses `#contact-website`.

**Checkpoint**: The public form is protected. Every Constitution III control is proven by tests.

---

## Phase 9: User Story 7 — New message indicator (Priority: P3)

**Goal**: The admin sidebar's Messages item shows the number of new, non-deleted messages, and the overview Messages card shows the total with the new count highlighted. Both update after opening a message, changing a status or deleting.

**Independent Test**: With 3 new messages, the sidebar shows 3. Open one and it shows 2. Set a read message back to New and it shows 3. Delete a new message and it shows 2. With 5 non-deleted messages of which 2 are new, the overview card shows 5 with "2 new" (quickstart §4 steps 5–7, 9).

- [ ] T065 [US7] Add to `src/lib/messages/admin-queries.ts` (depends on T032):
  - `countNewMessages(): Promise<number>` — `Message.countDocuments({ status: "new" })`;
  - `countMessages(): Promise<{ total: number; new: number }>` — `Promise.all` of `countDocuments({})` and `countDocuments({ status: "new" })`.

  Extend `src/lib/messages/admin-queries.test.ts` `[DB]`: seed 2 new, 1 read, 1 responded and 1 deleted new → `countNewMessages()` is 2 and `countMessages()` is `{ total: 4, new: 2 }`.
- [ ] T066 [US7] Wire the sidebar badge (depends on T065):
  - `src/components/admin/admin-shell.tsx`: add a `newMessagesCount: number` prop and pass it to `<AppSidebar newMessagesCount={newMessagesCount} />`.
  - `src/app/admin/(dashboard)/layout.tsx`: `const newMessagesCount = await countNewMessages().catch(() => 0)`, with a comment that a count failure must never break every admin page, and pass it to `AdminShell`.
  - `src/components/admin/app-sidebar.tsx`: update the prop's doc comment from "Wired to real data in a later feature — 0 for now" to "Non-deleted messages with status new (008); refreshed by router.refresh() after every message mutation".
  - `src/components/admin/app-sidebar.test.tsx`: if needed, add a case where `newMessagesCount={3}` renders a "3" badge on Messages and `0` renders none.
- [ ] T067 [US7] Wire the overview card in `src/app/admin/(dashboard)/page.tsx` (depends on T065). Remove `MESSAGES_COUNT`, `NEW_MESSAGES_COUNT` and the `TODO(007-contact)` comment. Add `countMessages()` to the existing `Promise.all`, then pass `value={messages.total}` and `highlightCount={messages.new}` to the Messages `StatCard`. Update the header comment: News, Messages and Signups are all wired; 011 owns any remaining overview work.
- [ ] T068 [US7] Create `e2e/admin-messages-indicator.spec.ts` (`admin` project; depends on T049, T054, T066, T067). The sidebar link is found with `getByRole("link", { name: /Messages/ })`.
  1. Seed 3 new, 1 read and 1 responded, then open `/admin`. The Messages card shows 5 and "3 new", and the sidebar badge shows 3.
  2. Open a new message. After the status shows Read, the badge shows 2 **without a full reload**.
  3. Set that message back to New. The badge shows 3.
  4. Delete a new message from the detail page. Back in the inbox the badge shows 2.
  5. Mark every remaining new message read. The badge is not rendered at all.

**Checkpoint**: All seven stories are complete.

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: The brief's end-to-end acceptance sequence, the four-width visual check, docs and the final sweep.

- [ ] T069 [P] Create `e2e/contact-visual.spec.ts` (`forms` project). At 375×900, 768×1024, 1024×900 and 1440×900, for `/contact`:
  - `scrollWidth <= innerWidth`, so there is no horizontal scroll.
  - The details columns: 4 side by side at 1024 and 1440 (equal `top` values), and stacked at 768 and 375.
  - The form: Name and Email share a row, as do Phone and Subject, at ≥ 768. At 375 every field is stacked.
  - Send is full width at every size.
  - Computed styles match the `research/tokens/contact-page-<w>.json` values for the band background, the input height and border, the button background, and the column heading and subtitle font size and letter-spacing.
  - Save full-page screenshots under `test-results/contact-<w>.png` for manual comparison with `screenshots/das.edu.pk_contact_*.png`.
  - Constitution VIII "reference breakpoints": also run the details-columns check at 1023px and 1025px, around the reference's ~1024px collapse. It shows the stacked layout at 1023 and four columns at 1025.
  - Map space: at every width, the map area's height equals `--spacing-contact-map-height` before it is scrolled into view (reserved space, FR-024a).
- [ ] T070 [P] Create `e2e/admin-messages-journey.spec.ts` (`admin` project; a file-level `test.use({ extraHTTPHeaders: forwardedFor(70) })`, which is valid because the file holds one test). This is the spec's acceptance sequence in one test:
  1. Send a message through `/contact`.
  2. Send a second, different message from the same email, but capitalised differently.
  3. Log in. Both appear as New in the inbox, and the sidebar shows 2.
  4. Open the first. It becomes Read and the sidebar shows 1.
  5. Mark it responded; the toast appears.
  6. Filter to Responded, which shows only it. Search by its subject, which shows only it.
  7. Delete it from the detail page. It is gone from the inbox, and the overview card total drops by 1.
  8. `findMessages({ email, withDeleted: true })` returns 2 documents, one with `deletedAt` set.
- [ ] T071 [P] Update `docs/architecture.md`:
  - Module map: add `src/lib/messages/*`, `src/lib/contact-details.ts`, and the lifted shared helpers (`src/lib/phone.ts`, `admin-datetime.ts`, `route-errors.ts`, `validation/field-errors.ts`, `AdminListFilters`, `AdminDeleteDialog`).
  - Public routes: add `/api/public/messages`, with the size guard, the `"contact"` rate-limit budget and the identical honeypot response.
  - Add a "Contact messages (008) data rules" section: append-only, no unique index, no `withDeleted`, conditional mark-read POST, and `router.refresh()` updating the layout badge.
  - Testing section: the `forms` project now includes `contact-*`, and specs isolate rate-limit budgets with `X-Forwarded-For` (the TEST-NET-3 range).
  - Record the pre-existing `X-Forwarded-For`-trust hosting follow-up.
- [ ] T072 Run the guard checks and fix every hit:
  - `rg "dangerouslySetInnerHTML" src/components/admin/messages src/components/contact src/app/admin/\(dashboard\)/messages` → no matches;
  - `rg "withDeleted|upsert" src/lib/messages src/app/api/public/messages src/app/api/admin/messages` → no matches;
  - `rg "#[0-9a-fA-F]{3,8}|\[[0-9.]+px\]" src/components/contact src/components/admin/messages` → no raw design values (Constitution V);
  - every admin handler under `src/app/api/admin/messages/` calls `requireAdminSession({ mode: "api" })` before anything else;
  - `rg "<iframe" src/components/contact` → only `lazy-map-frame.tsx`, where it is rendered behind the `visible` check (FR-024a).
- [ ] T073 Run the full sweep: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npm run build`, and `npx playwright test` (all projects). The known stale failures in the 001–003 specs (footer shape, route-announcer alert, news debounce — recorded in project memory) are pre-existing and are not regressions. Any other failure blocks completion. Record the counts in the implementation PHR.
- [ ] T074 Walk through `specs/008-contact-messages/quickstart.md` §4 by hand at 375, 768, 1024 and 1440, comparing against `screenshots/das.edu.pk_contact_*.png` (Constitution VIII). Log any visual difference that is not in the spec's "Deviations from the Reference" as a follow-up, or fix it via tokens.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001–T003 are all [P].
- **Foundational (Phase 2)**: needs Setup for T010's E2E gate. The lifts T004–T009 run in parallel, then T010 gates. T011–T013 and T017 are [P]. T014 needs T004, T007 and T011. T016 needs T011.
- **US1 (Phase 3)**: needs Foundational. The token/asset gate T022 → T023 → T024 blocks T025 and T027–T030, and also US5's UI.
- **US2 (Phase 4)**: needs Foundational. It needs *data*, not US1 code: specs seed through `e2e/helpers/messages.ts`, so US2 can start in parallel with US1.
- **US3 (Phase 5)**: needs US2's detail page (T038).
- **US4 (Phase 6)**: needs US2's table and detail page. T053 also edits the detail page's `actions`, after T048.
- **US5 (Phase 7)**: needs the token gate (T024) and the US1 page (T030). It is independent of US2–US4.
- **US6 (Phase 8)**: needs the US1 form and route.
- **US7 (Phase 9)**: needs US3 and US4 for the refresh-driven updates it tests. T065–T067 alone only need US2.
- **Polish (Phase 10)**: needs every story. T070 needs US1–US4 and US7.

### Within each story

Query or mutation → its DB test → route → route test → components → component tests → page → E2E. Shared files are edited in order: `mutations.ts` (T018 → T041 → T050), `admin-queries.ts` (T032 → T065), `[id]/route.ts` (T044 → T050), the detail page (T038 → T048 → T053), `contact-form.tsx` (T027 → T062), `contact/page.tsx` (T030 → T060) and `admin-messages-protected.spec.ts` (T040 → T048 → T053).

### Story dependency graph

```
Setup ─▶ Foundational ─┬─▶ US1 ─┬─▶ US5
                       │        └─▶ US6
                       └─▶ US2 ─┬─▶ US3 ─┐
                                └─▶ US4 ─┴─▶ US7 ─▶ Polish
```

---

## Parallel Example: US1 + US2 (two developers after Phase 2)

```text
Developer A (public):  T018 → T019, T020 → T021, T022 → T023 → T024 → T025, [T026] → T027 → T028, T029 → T030 → T031
Developer B (admin):   T032 → T033, [T034 ∥ T035] → T036, T037, T038 → T039, T040
```

Within US3: T046 ∥ T047. Within US5: T057 ∥ T058 ∥ T059. In Polish: T069 ∥ T070 ∥ T071.

---

## Implementation Strategy

### MVP first (US1 only)

1. Phases 1–2. The T010 gate proves the lifts didn't break 004.
2. Phase 3: visitors can send messages, and records accumulate. **Stop and validate** with T031 and quickstart §4 steps 2–4.

### Incremental delivery

1. + US2: staff can read the inbox. This is the first useful admin release.
2. + US3: status tracking. All P1 stories are done here.
3. + US4 and US5 (independent of each other): housekeeping, and the full reference page.
4. + US6: protection is proven by tests. The controls themselves have been live since US1.
5. + US7: the sidebar and overview counts.
6. Polish: the acceptance journey, the visual check, docs, and the sweep.

### Notes

- **Protection is present from US1.** The route runs `protectPublicForm` and the size guard from its first version. US6 adds only the honeypot *input* and the tests.
- **No messages code may upsert, dedupe or restore by email.** T072 checks this mechanically.
- **Stop and ask when data conflicts.** If the token or asset extraction (T023) finds the live site differs from the screenshots, stop and ask the user. Don't pick one (Constitution I).
