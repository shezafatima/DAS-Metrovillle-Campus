# Research: Contact & Messages

**Feature**: 008-contact-messages | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)

Every item in the plan's Technical Context is resolved below. There
are no remaining NEEDS CLARIFICATION items. The user's planning
constraints are:

- reuse the 002/004 public-form protection, the shared form and table
  patterns, and the `Paged`/search helpers;
- store every message as its own record, and do not apply the signup
  upsert rule (ADR-0001).

---

## 1. Write model: append-only insert (ADR-0001 explicitly not applied)

**Decision**: A valid public submission runs exactly one
`Message.create(...)`. There is no unique index, no lookup by email,
no upsert and no `withDeleted`. Each submission produces one new
document with `status: "new"`.

**Rationale**: Spec FR-010 and the brief say each message is a
separate record, even from the same person. ADR-0001's "Boundary"
section and the comment in `src/lib/signup/mutations.ts` say the same
thing: the upsert/restore rule is for signups only. Constitution IV
("records keyed by a natural identifier MUST be upserted") does not
apply, because a message has no natural key. Its identity is the
submission itself, not the sender's email.

**Alternatives considered**:

- Dedupe identical messages sent within N seconds. Rejected: the spec
  edge case keeps both, and the rate limit already stops floods.
- A unique index on (email, subject, body hash). Rejected for the same
  reason, and it would reject a genuine resend.

## 2. Shared helpers: lift, don't duplicate

**Decision**: The signup-only helpers below, which messages also need, are
moved to shared modules. Each old path becomes a one-line re-export,
so no 004 caller or test changes. This follows the 004 precedent
(sp.analyze D1: `Paged`/`escapeRegExp`/`ADMIN_PAGE_SIZE` →
`src/lib/admin-list.ts`; `NewsPagination` → `AdminPagination`).

| Helper | From | To | Old path keeps |
|---|---|---|---|
| Pakistani mobile normalise / local format | `src/lib/signup/phone.ts` | `src/lib/phone.ts` | `export * from "@/lib/phone"` |
| Admin date-time (PKT, `dd MMM yyyy, HH:mm`) | `src/lib/signup/dates.ts` `formatSignupDateTime` | `src/lib/admin-datetime.ts` `formatAdminDateTime` | `formatSignupDateTime = formatAdminDateTime`; `csvDateStamp` stays |
| JSON error envelopes (`NO_STORE`, 400/401/404/503) | `src/lib/signup/route-errors.ts` | `src/lib/route-errors.ts` | `export * from "@/lib/route-errors"` |
| Admin search + select filter bar | `src/components/admin/signups/signups-table-filters.tsx` | `src/components/admin/admin-list-filters.tsx` (`AdminListFilters`) | `SignupsTableFilters` renders `<AdminListFilters …signup props/>` |
| Admin delete confirm dialog | `src/components/admin/signups/delete-signup-dialog.tsx` | `src/components/admin/admin-delete-dialog.tsx` (`AdminDeleteDialog`) | `DeleteSignupDialog` renders `<AdminDeleteDialog …/>` |
| Zod error flattening + whitespace collapse | `src/lib/validation/signup.ts` `fieldErrors`, `collapseSpaces` | `src/lib/validation/field-errors.ts` | `validation/signup.ts` re-exports `fieldErrors` |

These are reused as they are: `protectPublicForm`,
`tooManyRequestsResponse`, `HONEYPOT_FIELD`, `softDeletePlugin`,
`requireAdminSession`, `connectDb`, `Paged<T>`, `ADMIN_PAGE_SIZE`,
`escapeRegExp`, `AdminPagination`, `StatCard`, `Badge` (including the
`highlight` variant), `Table/*`, `Select`, `Input`, `AlertDialog/*`,
`toast`, `isRtlScript`, `font-body-urdu`, and the `--color-error` /
`--color-success` tokens.

**Rationale**: Constitution VI says shared helpers are built once and
reused. Each lift has the same behaviour as the code it replaces:
`AdminListFilters` keeps both of the fixes documented in
`SignupsTableFilters` (the stale-closure ref and the same-value `q`
guard). Using re-exports keeps the diff small and leaves the 004 tests
untouched as a regression net.

**Alternatives considered**:

- Import `@/lib/signup/*` from `src/lib/messages/*`. Rejected: the
  messages feature would then depend on another feature's internals,
  which D1 already ruled out once.
- Copy the files. Rejected: a third copy of the filter bar or delete
  dialog would breach Constitution VI.
- News's `NewsTableFilters` and `DeletePostDialog` are **not** touched
  here (out of scope). They are listed as follow-ups.

## 3. Validation schema (shared client + server)

**Decision**: `src/lib/validation/message.ts` exports
`messageInputSchema`:

- `name`: trim, collapse inner whitespace, 1–100 characters.
- `email`: trim, lower-case, `z.email()`, at most 254 characters.
- `phone`: optional. Empty or whitespace becomes `null`. Anything else
  goes through `normalisePakistaniMobile`, with the same message as
  signup.
- `subject`: trim, collapse inner whitespace, 1–150 characters.
- `message`: CRLF/CR become LF, then trim; 1–5,000 characters. Inner
  line breaks and spaces are kept.

`fieldErrors()` and `collapseSpaces()` come from
`src/lib/validation/field-errors.ts` (the sixth lift in §2).

**Rationale**: Constitution IV requires one schema on both the client
and the server. The limits come from the spec's Assumptions. Zod's
`max` counts UTF-16 code units. Urdu is entirely in the Basic
Multilingual Plane, so 5,000 Urdu letters count as 5,000. An emoji
counts as 2, which is acceptable at this limit.

**Alternatives considered**: counting grapheme clusters
(`Intl.Segmenter`). Rejected: it adds complexity for an edge case that
doesn't matter at 5,000.

## 4. Public endpoint and protection

**Decision**: `POST /api/public/messages` runs these steps in order:

1. Size guard: `Content-Length` above 64 KiB returns
   `413 { error: "too_large" }`.
2. Parse the JSON body.
3. `protectPublicForm(request, { name: "contact" }, body)`. A tripped
   honeypot returns `200 { ok: true }` and stores nothing. A rate limit
   returns `429`.
4. Validate with `messageInputSchema`. Failures return `400` with the
   field messages.
5. `createMessage()`.
6. Return `200 { ok: true }`.

Every response carries `Cache-Control: no-store`. A database failure
returns `503`.

**Rationale**: This is the same order and envelope as
`/api/public/signups`, so the client state machine is the same (spec
US6 says "as on the signup form"). The form name `"contact"` gives the
throttle key `form:contact:ip:<ip>`, which is separate from
`form:signup:…` (US6 scenario 6). The size guard stops a bot from
making the server parse a multi-megabyte JSON body before validation
rejects it. 64 KiB is well above 5,000 Urdu characters (about 10 KB
in UTF-8) plus the other fields.

**Alternatives considered**:

- Return `201` with an id. Rejected: the honeypot response must look
  like a real success (FR-028), and an id would give that away.
- A Server Action instead of a route handler. Rejected: 004 uses a
  route under `/api/public`, and Constitution VII keeps the API usable
  by other consumers.

## 5. "Opening marks it read" without a GET side effect

**Decision**: The detail page (`/admin/messages/[id]`, a Server
Component) only reads. It renders a small client component,
`MarkReadOnOpen`, **always** (with `key={id}`), passing the current
status. It records the status it saw at mount. Only if that was
`"new"` does it call `POST /api/admin/messages/[id]/read`, once per
mount. Because `router.refresh()` keeps it mounted, setting a message
back to New while the page is open does not trigger a second
auto-read (sp.analyze H1). Rendering it only when `status === "new"`
was rejected: after a set-back-to-New refresh it would remount and
immediately mark the message read again. The endpoint does an atomic
conditional update, `{ _id, status: "new" } → { status: "read",
statusChangedAt: now }`, and returns whether anything changed. The
component then calls `router.refresh()`. A ref guard ensures one call
per mount, even under StrictMode's double effect.

**Rationale**:

- A layout does not re-render on client navigation. The Next 16 docs
  state: "On navigation, layouts preserve state, remain interactive,
  and do not rerender" (`01-getting-started/03-layouts-and-pages.md`).
  `router.refresh()` does re-render every Server Component, including
  the dashboard layout that renders the sidebar count (see `use-router.md`). So
  every message change (auto-read, status change, delete) finishes
  with `router.refresh()`. That is how US7 and FR-031 are met without
  polling.
- If the page render itself marked the message read, rendering a GET
  would change data. The dashboard layout renders in parallel with
  the page, so it could count before the page's write and show a
  stale badge. A prefetch could also mark a message read that the
  admin never opened. Dynamic routes are not fully prefetched today
  (`04-linking-and-navigating.md`), but relying on that would be
  fragile.
- The update is conditional, so it only ever changes new to read.
  Opening a read or responded message never downgrades it (FR-020),
  and a repeated call does nothing.

**Alternatives considered**:

- A Server Action with `refresh()` from `next/cache`. It would work,
  but the 004 admin mutations are route handlers called with `fetch`
  plus `router.refresh()`. Keeping one pattern makes the
  unauthorised-access tests uniform.
- `PATCH { status: "read" }` from the client. Rejected: it is
  unconditional, so a double-fired effect could race a manual
  "set back to new" and win.

## 6. Status changes, delete and the "no longer available" case

**Decision**:

- `PATCH /api/admin/messages/[id]` with body `{ status: "new" | "read"
  | "responded" }` sets the status and `statusChangedAt = now`
  (FR-021). The last write wins (spec edge case). It returns the saved
  status, and the client shows that value.
- `DELETE /api/admin/messages/[id]` soft-deletes through
  `Message.softDeleteById`.
- Both return `404` for an unknown, malformed or deleted id. The
  client shows a "no longer available" toast and refreshes.
- The detail page for a deleted or unknown id renders a "no longer
  available" panel with a back link, inside the admin layout. It does
  not use Next's `notFound()` page, per the spec edge case.
- `MessageStatusControl` is a client component: a labelled select
  (New / Read / Responded) plus a primary "Mark as responded" button
  when the status isn't already responded. It shows the saved status
  and only changes it after a `200`. On failure it shows an error
  toast and keeps the previous value (US3 scenario 5).

**Rationale**: This mirrors 004's delete contract and toasts. Using a
select for the three-way choice keeps it to one control, and the
button is the common action.

## 7. Inbox query, search, filter, preview

**Decision**: `listMessages({ q, status, page })` in
`src/lib/messages/admin-queries.ts`:

- `q` is trimmed and escaped with `escapeRegExp`, then matched with a
  case-insensitive regex over `$or: [name, email, subject]`. It works
  with Urdu, because the match is a literal substring.
- `status` must be one of `MESSAGE_STATUSES`. Anything else means all.
- Sort is `{ createdAt: -1, _id: -1 }`, with 20 rows per page
  (`ADMIN_PAGE_SIZE`). The result is `Paged<MessageRow>`.
- `MessageRow.preview` is built on the server by `toPreview(body)`:
  collapse whitespace and line breaks to single spaces, then cut to
  100 code points (never inside a surrogate pair), adding `…` when
  cut. The full body never reaches the list page's client payload.

Counts come from `countMessages()`, which returns `{ total, new }`
from two `countDocuments` calls in parallel. The soft-delete plugin
filters out deleted messages automatically.

Indexes: `{ createdAt: -1 }` for the default list, and
`{ status: 1, createdAt: -1 }` for the status filter and the new
count. The plugin adds `deletedAt`.

**Rationale**: This is the same shape as `listSignups`. At the
expected volume (hundreds of messages a year) an unanchored regex
meets SC-007 (200 rows, under 1 s) easily.

**Alternatives considered**: a MongoDB text index. Rejected: it
doesn't do substring matches, it tokenises Urdu poorly, and a regex
is enough at this scale.

## 8. Back link that keeps search, filter and page

**Decision**: Inbox row links go to `/admin/messages/<id>?from=<qs>`,
where `qs` is the inbox's current query (`q`, `status`, `page`).
The detail page rebuilds the back link through
`inboxHref(from)`. That function parses `from` with `URLSearchParams`,
keeps only `q`, `status` (whitelisted) and `page` (a positive
integer), and always prefixes `/admin/messages`. Delete from the
detail page uses the same href as its redirect.

**Rationale**: This meets the Q1 clarification. Rebuilding from a
whitelist means `from` can never become an open redirect or a
`javascript:` URL. The `use-router.md` note warns against pushing
untrusted URLs.

## 9. Reply links

**Decision**: The detail page has three links:

- Email: `mailto:<email>?subject=<encodeURIComponent("Re: " + subject)>`.
- Phone, when present: `tel:+923XXXXXXXXX`, displayed as `03XXXXXXXXX`.
- WhatsApp, when present: `https://wa.me/923XXXXXXXXX` (E.164 without
  the `+`), with `target="_blank" rel="noopener noreferrer"`.

With no phone, the phone line reads "Not provided" and neither the
phone nor the WhatsApp link is rendered.

**Rationale**: `wa.me/<digits>` is WhatsApp's documented click-to-chat
format, and the stored E.164 form maps onto it directly. This is the
reason 004 chose E.164 in the first place.

## 10. Safe display of untrusted text (FR-019, SC-006)

**Decision**: Name, email, subject and message are rendered only as
React text children. Nothing uses `dangerouslySetInnerHTML`, nothing
parses Markdown, and nothing auto-links. The message body uses
`whitespace-pre-wrap` plus `[overflow-wrap:anywhere]` (a Tailwind
arbitrary *property*, not an arbitrary design value), so line breaks
survive and long words or URLs wrap (spec edge case). Every text node
that could be Urdu gets `dir="auto"`, plus `font-body-urdu` when
`isRtlScript()` is true.

Proof:

1. A Vitest jsdom test renders `MessageDetail` and `MessagesTable`
   with `<script>alert(1)</script><img src=x onerror="window.__xss=1">`
   in the name, subject and body. It asserts that the literal text is
   present and that the container has no `script` or `img` element.
2. A Playwright test submits that payload through the public form,
   opens it in the admin, and asserts that `window.__xss` is
   undefined, no `dialog` event fired, and the literal text is visible.

**Rationale**: React escapes text children, so the safety comes from
the rendering method. The tests stop a later "nice to have" such as
auto-linking from quietly bringing in HTML rendering.

## 11. Sidebar badge and overview card

**Decision**:

- `src/app/admin/(dashboard)/layout.tsx` calls `countNewMessages()`
  and passes the result through `AdminShell` (new prop
  `newMessagesCount`) to the existing `AppSidebar` prop. If the
  database fails, the layout catches the error and passes `0`. A count
  failure must never break every admin page.
- The overview page replaces `MESSAGES_COUNT` and `NEW_MESSAGES_COUNT`
  with `countMessages()`. The existing `StatCard` highlight shows the
  new count. The stale `TODO(007-contact)` comment is removed.

**Rationale**: The sidebar badge slot and the `StatCard` highlight
were built in 002 for exactly this. Freshness comes from §5's
`router.refresh()` after every change.

## 12. Contact details source (Settings-shaped, 005-ready)

**Decision**:

- Extend `ContactInfo` in `src/content/site-shell.ts` with
  `mapUrl: string` (an ordinary Google Maps link, per clarification
  Q2) and `officeHours: string`.
- Add `src/lib/contact-details.ts` with
  `export async function getContactDetails(): Promise<ContactInfo>`.
  For now it returns the content file's `contactInfo`. In 005 its body
  becomes a Settings read, and nothing else changes.
- The Contact page reads only through `getContactDetails()`.
- The header and footer keep their current direct import. 005 owns
  switching them, per PRD §9.
- Values not yet supplied (address, hours, map link) are marked with
  the site's existing placeholder convention: a comment in the content
  file plus `data-placeholder` on the rendered element.

**Rationale**: This meets FR-025 and the brief ("the switch is a
change of source only"). The getter is async now, so callers don't
change when it starts reading the database.

## 13. Map embed

**Decision** (map approved by the user 2026-09-24 as part of the
"real map" deviation): `ContactMap` (server) renders a map area whose
size is fixed from the first render by a token
(`--spacing-contact-map-height`, full width), so nothing moves when the
map arrives. Inside it, `LazyMapFrame` (client) renders nothing but
the reserved box until an `IntersectionObserver` (`rootMargin: "0px"`,
`threshold: 0`) reports the box in view; it then inserts the
`<iframe>` with
`src="https://maps.google.com/maps?q=<encodeURIComponent(address)>&output=embed"`,
`title="Map showing <address>"`, `loading="lazy"`,
`referrerPolicy="no-referrer-when-downgrade"`, absolutely positioned to
fill the box, and disconnects the observer. Native `loading="lazy"`
alone is not enough: browsers start lazy iframes well before they are
visible (Chrome uses a distance of over a thousand pixels), and on a
1440px desktop the map sits within that distance of the first screen,
so it would load immediately (user requirement: "only when it scrolls
into view"). Under the iframe, the map area always renders the address
and an "Open in Google Maps" link to `mapUrl` (FR-024). The
fallback content is always present, not shown only after a failure.
The page can't reliably detect a failed cross-origin iframe, because
`onload` fires on error pages too.

**Rationale**: This is a keyless embed of a public URL, not an SDK,
dependency or account. No project config adds a CSP, so no
`frame-src` change is needed. The embed is built from the address
(clarification Q2).

**Risk**: `output=embed` is not a formally versioned Google API. If it
stops working, the fallback link keeps the feature usable. The
replacement is the keyed Maps Embed API (free) with a key in `.env`.
That change is recorded as a follow-up and needs approval, because it
adds a credential.

**Alternatives considered**: storing an embed URL (Q2 option B,
declined). Leaflet with OpenStreetMap tiles. Rejected: a new
dependency (Constitution II) and a different look from the reference's
Google map.

## 14. Public page structure and reference assets

**Decision**: The page is composed only of section components
(Constitution VI):

`/contact` = `ContactBanner` → `ContactDetails` (4 ×
`ContactDetailColumn`) → `ContactMap` → `ContactFormSection` (server
band) → `ContactForm` (client).

- The four illustrations and the banner background image are
  downloaded once from the live reference into
  `public/images/contact/` by the extraction script (§15), and their
  source URLs are recorded in `design-tokens.md`. They are the
  client's own network's assets, which the site reproduces
  (Constitution I).
- `ContactBanner`: if the extracted banner height and title/breadcrumb
  values equal the News banner tokens, `NewsBanner` is lifted into a
  shared `PageBanner` with an optional `backgroundImage`, and
  `NewsBanner` becomes a wrapper (the same lift pattern as §2).
  Otherwise `ContactBanner` gets its own `--*-contact-banner-*`
  tokens. The extraction result decides; nothing is guessed.
- Form layout (spec Deviations):
  - Desktop and tablet: Name | Email, then Phone | Subject, then
    Message at full width, then Send at full width.
  - Phone: every field stacked, as the reference stacks Name and Email.
- The Write Us link is `href="#contact-form"`. A small client handler
  also focuses the Name input (US5 scenario 3), and the anchor still
  works without JavaScript.

## 15. Token extraction for the contact page (Constitution V gate)

**Decision**: Add `research/extract-contact-tokens.ts` and
`research/extract-contact-tokens.browser.js`, the same harness as the
signup script (Playwright `channel: "chrome"`, 4 viewports). The
target is `https://das.edu.pk/contact/`. They capture:

- banner: height, background image URL, and the title and breadcrumb
  styles;
- detail columns: icon size, heading style, the letter-spaced subtitle
  style (letter-spacing, weight, size), body text style, column gap
  and layout per width;
- the map heading style and the map area height;
- the form band: background, padding, input and textarea height,
  border, placeholder colour, gaps, and button style and hover;
- the image URLs to download.

The output goes to `research/tokens/contact-page-{375,768,1024,1440}.json`. The `contact-page-` prefix avoids overwriting the first crawl's `contact-*.json` page aggregates.
A new "Contact page (008)" section in `design-tokens.md` and matching
`@theme` entries in `globals.css` follow. Values equal to existing
tokens (such as `color-cta`, `--color-cta-hover`, `text-button`,
`color-primary`) are reused, not duplicated. Public contact UI work is
blocked until this is done.

**Rationale**: This is the same gate 003 and 004 used. The page-level
`contact-*.json` aggregates already in `research/tokens/` (from the
first crawl) don't hold per-element values.

## 16. Tests and rate limiting in Playwright

**Decision**:

- The four public contact specs join the serial `forms` project: its
  `testMatch` becomes
  `/(signup-.*|contact-(public|details|protection|visual))\.spec\.ts/`
  and chromium's `testIgnore` becomes
  `/(admin-.*|signup-.*|contact-(public|details|protection|visual))\.spec\.ts/`.
  The names are explicit because the existing 001 spec
  `e2e/contact-and-social.spec.ts` must stay in `chromium`.
- Specs that submit through the public form set a unique
  `X-Forwarded-For: 203.0.113.<n>` (the TEST-NET-3 documentation
  range) with `test.use({ extraHTTPHeaders })`. `protectPublicForm`
  keys the limit on that header, so each spec gets its own budget.
  This is what lets the admin journey spec (in the `admin` project)
  send real messages while the `forms` project's rate-limit spec
  exhausts its own budget at the same time. Neither needs to wipe the
  shared `throttles` collection.
- Admin list, filter and delete specs seed through
  `e2e/helpers/messages.ts`, which inserts directly like
  `helpers/signups.ts`.
- `e2e/global-setup.ts` adds `"messages"` to its wipe list.

**Rationale**: The 004 approach (`clearThrottle()` in `beforeEach`)
only works when every public-form spec is serial in one project. The
brief's journey ("send a message; see it as new in the inbox") has to
log in, so it belongs in the serial `admin` project, which can run at
the same time as `forms`. Separate addresses isolate the budgets
without loosening the real limit.

**Observed (pre-existing, not changed here)**: `extractIp` trusts the
first `X-Forwarded-For` value. Behind a proxy that sets or overwrites
the header this is correct. On a host that passes a client-supplied
header through unchanged, the header could be spoofed to get around
the per-IP limit for both signup and contact. This is recorded as a
follow-up to check on the chosen host (PRD open question 8). It is
not fixed in this feature, because 002 owns that module.

## 17. Testing map

| Layer | What | Where |
|---|---|---|
| Vitest (pure) | schema: each field, limits, phone optional plus 4 formats, CRLF, Urdu; `toPreview`; `inboxHref` whitelist; status constants | `src/lib/validation/message.test.ts`, `src/lib/messages/*.test.ts` |
| Vitest (jsdom) | `ContactForm` states: field errors, success clears, 429/503 keep values, counter, honeypot hidden; `MessageDetail`/`MessagesTable` XSS and no-phone rendering | `src/components/contact/contact-form.test.tsx`, `src/components/admin/messages/*.test.tsx` |
| Vitest (DB) | `createMessage` (two from the same email → 2 docs); `listMessages` (order, search name/email/subject including Urdu, status filter, paging, deleted excluded); `countMessages`; `markMessageRead` conditional; `setMessageStatus`; `deleteMessage` | `src/lib/messages/*.test.ts` |
| Vitest (route) | public: 200 / honeypot 200 with nothing stored / 400 / 413 / 429 on the 6th / 503; admin: **401 for PATCH, DELETE and POST read**, plus 200/400/404 | `src/app/api/public/messages/route.test.ts`, `src/app/api/admin/messages/**/route.test.ts` |
| Playwright `forms` | `contact-public.spec.ts` (send, validation, 2 from the same email, 429, honeypot, error keeps text, Write Us focus); `contact-visual.spec.ts` (4 widths, no horizontal scroll, tokens, map fallback link present) | `e2e/` |
| Playwright `admin` | `admin-messages-journey.spec.ts` (form → New in inbox → open → Read → responded → back to new → filter → search → delete → gone and badge drops); `admin-messages-list.spec.ts` (order, preview, New styling, paging keeps filters, empty state, Urdu, long body, no phone, mailto/tel/wa.me hrefs, XSS payload inert, overview card); `admin-messages-protected.spec.ts` (both pages redirect when logged out; API 401s through `request`) | `e2e/` |

## 18. No new dependencies

**Decision**: No packages, services, environment variables or version
changes. The Google Maps iframe is a keyless public embed (§13).

**Rationale**: Constitution II.
