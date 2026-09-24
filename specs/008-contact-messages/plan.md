# Implementation Plan: Contact & Messages

**Branch**: `008-contact-messages` | **Date**: 2026-09-24 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/008-contact-messages/spec.md`

**Note**: This template is filled in by the `/sp.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Replace the `/contact` placeholder with the reference Contact page —
banner, four detail columns (phone + office hours, email, address,
"Write Us" jump link), a keyless Google Maps embed built from the
address — requested only when scrolled into view, inside a reserved
fixed-size area — with an always-present "Open in Google Maps" link, and a
yellow form band — whose values come from a Settings-shaped
`getContactDetails()` (content file today, Settings in 005). The
client `ContactForm` posts name, email, optional phone, subject and
message to `POST /api/public/messages`, protected by the 002 honeypot +
per-IP rate limit under its own `"contact"` budget and validated by one
shared Zod schema; **every valid submission inserts a new `messages`
document** (append-only — ADR-0001's upsert rule explicitly not
applied). Replace the `/admin/messages` placeholder with an inbox
(newest first, preview, New styling, search name/email/subject, status
filter, 20 per page) and add a detail page `/admin/messages/[id]` that
marks `new → read` on open via a conditional POST + `router.refresh()`,
offers mailto/tel/WhatsApp reply links, status changes (PATCH) and
soft delete, and renders all visitor text as plain text. Wire the
sidebar new-messages badge (dashboard layout) and the overview
Messages card. User constraints honoured: reuse 002/004 form
protection, shared form/table patterns and the `Paged`/search helpers
(lifted to shared modules where they were signup-only); each message a
separate record.

## Technical Context

**Language/Version**: TypeScript strict on Next.js 16.3.x (App Router), React 19, Node 24 — unchanged.
**Primary Dependencies**: **None new** (research §18). Reused as-is: `protectPublicForm`/`tooManyRequestsResponse`, `HONEYPOT_FIELD`, `softDeletePlugin`, `requireAdminSession`, `connectDb`, `Paged<T>`/`ADMIN_PAGE_SIZE`/`escapeRegExp` (`src/lib/admin-list.ts`), `AdminPagination`, `StatCard`, `AppSidebar`'s `newMessagesCount` slot, `Badge` (`highlight`), `Table/*`, `Select`, `Input`, `AlertDialog/*`, `toast`, `isRtlScript`, `font-body-urdu`, `--color-error`/`--color-success`, `PublicShell`. Lifted from signup-only to shared (old paths re-export, research §2): `src/lib/phone.ts`, `src/lib/admin-datetime.ts`, `src/lib/route-errors.ts`, `src/lib/validation/field-errors.ts`, `AdminListFilters`, `AdminDeleteDialog`.
**Storage**: MongoDB Atlas Flex via the cached Mongoose connection — one new collection `messages` (data-model.md): no unique index; `{createdAt:-1}`, `{status:1, createdAt:-1}`, plugin `deletedAt`. Rate-limit state in the existing `throttles` collection (key `form:contact:ip:<ip>`).
**Testing**: Vitest (pure: schema, preview, inbox-href, statuses; jsdom: `ContactForm` states, `MessageDetail`/`MessagesTable` XSS + no-phone; `describeWithDb`: mutations incl. two-from-same-email, queries, counts, public route matrix incl. 413/429/honeypot, **401 for every admin route**) and Playwright (`forms` project extended to `contact-*` specs; `admin` project for inbox/journey/protected; per-spec `X-Forwarded-For` isolates rate-limit budgets). Research §16–17.
**Target Platform**: Web, server-rendered; Node runtime for route handlers (Mongoose).
**Project Type**: Single existing Next.js app (see Project Structure).
**Performance Goals**: SC-001 thank-you immediately after Send — one insert per submission, client validation avoids round trips for bad input. SC-007 inbox search over 200 messages < 1 s — regex over three fields, 20-row pages, preview computed server-side so the list payload never carries full bodies. Public page is Server Components except `ContactForm`, `WriteUsLink` and `LazyMapFrame`; the map iframe is only inserted once its reserved area intersects the viewport (SC-012), so it adds no work to the initial load and no layout shift.
**Constraints**: Constitution I (reference layout/values via extraction; deviations already in spec), II (no new deps/providers; map is a keyless public embed), III (public route rate-limited + honeypot + 64 KiB size guard; every admin page/route calls `requireAdminSession`), IV (one shared Zod schema; soft delete; **no upsert — messages have no natural key**; no email sent), V (contact tokens extracted before public UI), VI (sections = components; client only where interactive; copy in `src/content/contact.ts`; shared helpers lifted not copied), VII (lib functions return plain DTOs; thin routes; no speculative endpoints), VIII (E2E per story, 401 per admin route, four widths). User constraints above.
**Scale/Scope**: 1 model, 2 Zod schemas, ~7 `src/lib/messages` modules + 1 `contact-details.ts`, 6 lifted shared modules (re-export shims), 4 route handlers (1 public, 3 admin), 2 admin pages (1 replaced, 1 new), ~6 admin components, ~7 public components, 1 content file + `ContactInfo` +2 fields, 1 token-extraction pass + 5 images, ~15 Vitest files, 10 Playwright specs, 0 env vars.

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|---|---|---|
| I. Purpose & Fidelity | PASS | Layout from `screenshots/das.edu.pk_contact_*.png` at all three captured widths; values from a per-element extraction pass (research §15). Every conflict between brief, PRD and reference is recorded in spec "Deviations". Added Phone/Subject, single campus, a real map for the blank capture, and no reCAPTCHA were **approved by the user on 2026-09-24**. The position of the details relative to the form follows the reference (details and map above a full-width form band at every width); the user confirmed this after being shown that the screenshots contradict the brief's "alongside" wording. Live-vs-screenshot drift found during extraction is flagged, not chosen. Scope = PRD §5.8/§6.4/§7 + clarified overview card. |
| II. Fixed Stack | PASS | No dependency, env var or version change. The Google Maps `<iframe>` embed was **approved by the user on 2026-09-24** as part of the approved "real map" deviation (spec Clarifications). It is a keyless embed, loaded only when scrolled into view; the keyed Embed API remains a follow-up that would need separate approval (research §13). |
| III. Security | PASS | `POST /api/public/messages`: size guard → honeypot → 5/10-min per-IP limit (own `"contact"` budget) before any DB write. `PATCH`/`DELETE /api/admin/messages/[id]`, `POST …/[id]/read`, and both admin pages call `requireAdminSession`; 401/redirect tests for each. Back-link `from` rebuilt from a whitelist (no open redirect). Visitor text rendered as text only, XSS payload tested. Pre-existing `X-Forwarded-For` trust noted as a hosting follow-up, not changed (002-owned). |
| IV. Data Integrity | PASS | One `messageInputSchema` client + server; Mongoose `maxlength` mirrors it; `softDeletePlugin` on the model. "Natural-key records MUST be upserted" does not apply — a message has no natural key; append-only is the spec requirement (FR-010) and ADR-0001's stated boundary. No notifications. |
| V. Design System | PASS (gated) | Admin UI uses 002 tokens/primitives only. Public contact UI is blocked behind the extraction task that adds `--*-contact-*` tokens (reusing equal existing ones) and the reference images; no arbitrary design values (`[overflow-wrap:anywhere]` is a CSS property, not a design value). |
| VI. Components | PASS | Page composes `ContactBanner`, `ContactDetails`, `ContactMap`, `ContactFormSection`; client only for `ContactForm`, `WriteUsLink`, `LazyMapFrame`, `MarkReadOnOpen`, `MessageStatusControl`, filters and delete dialog. Six signup-only helpers lifted to shared modules instead of copied (research §2). Copy in `src/content/contact.ts` + `messagesCopy` in `src/content/admin.ts`. |
| VII. Extensibility | PASS | `src/lib/messages/*` are plain functions returning DTOs; `getContactDetails()` is the single seam for 005; no JSON list endpoint or restore endpoint built speculatively. |
| VIII. Testing & DoD | PASS (planned) | Spec acceptance E2E list covered by `admin-messages-journey.spec.ts` + list/public specs; 401 for all three admin API routes + redirects for both pages; HTML-safety tests; four-width visual spec (research §17). |

No violations — Complexity Tracking not needed.

**Post-design re-check (after Phase 1)**: unchanged. Points that
touched principle boundaries, resolved toward the principle:
(a) "mark read on open" done by a conditional POST from the client
rather than inside the page render — avoids a GET side effect and a
stale layout count (research §5); (b) six helper lifts are the
minimal change that avoids second copies (VI) while leaving every 004
import path and test intact via re-exports; news's own filter/dialog
are deliberately not touched (scope); (c) the map embed stays keyless
to avoid adding a credential/provider (II/III).

## Project Structure

### Documentation (this feature)

```text
specs/008-contact-messages/
├── plan.md                        # This file
├── research.md                    # Phase 0 — 18 resolved decisions
├── data-model.md                  # Phase 1 — `messages`, statuses, schemas, write/read paths, transitions, ContactInfo
├── quickstart.md                  # Phase 1 — tokens pass, run, verify by hand, tests
├── contracts/
│   ├── public-contact-api.md      # POST /api/public/messages + ContactForm behaviour
│   ├── admin-messages-api.md      # inbox + detail pages, POST read, PATCH, DELETE, badge/card, 401 matrix
│   └── contact-page.md            # page composition, components, content, layout, tokens, assets
├── checklists/requirements.md     # from /sp.specify
└── tasks.md                       # Phase 2 (/sp.tasks — not created here)
```

### Source Code (repository root)

```text
research/extract-contact-tokens.ts, extract-contact-tokens.browser.js   # per-element pass + image download (research §15)
research/tokens/contact-page-{375,768,1024,1440}.json                   # extraction output
research/design-tokens.md, src/app/globals.css                          # + "Contact page (008)" tokens
public/images/contact/                                                  # banner + 4 illustrations from the reference
playwright.config.ts                                                    # forms: signup-* + contact-(public|details|protection|visual); chromium ignores those (not contact-and-social)
e2e/global-setup.ts                                                     # + "messages" in the wipe list
docs/architecture.md                                                    # + messages module map, /api/public/messages, append-only note, XFF test note

src/
├── models/message.ts                               # schema + softDeletePlugin + indexes
├── lib/
│   ├── phone.ts                                    # LIFTED from signup/phone.ts (signup/phone.ts → re-export)
│   ├── admin-datetime.ts                           # LIFTED formatAdminDateTime (signup/dates.ts keeps alias + csvDateStamp)
│   ├── route-errors.ts                             # LIFTED (signup/route-errors.ts → re-export)
│   ├── contact-details.ts                          # getContactDetails(), mapEmbedSrc()
│   ├── validation/
│   │   ├── field-errors.ts                         # LIFTED fieldErrors(), collapseSpaces() (validation/signup.ts re-exports)
│   │   └── message.ts                              # messageInputSchema, messageStatusUpdateSchema, MESSAGE_MAX_LENGTH
│   └── messages/
│       ├── statuses.ts                             # MESSAGE_STATUSES, isMessageStatus(), statusLabel()
│       ├── preview.ts                              # toPreview()
│       ├── inbox-href.ts                           # inboxHref(from) — whitelist rebuild
│       ├── mutations.ts                            # createMessage, markMessageRead, setMessageStatus, deleteMessage
│       └── admin-queries.ts                        # listMessages, getMessage, countMessages, countNewMessages
├── app/
│   ├── (public)/contact/page.tsx                   # replaces PagePlaceholder
│   ├── api/public/messages/route.ts                # POST
│   ├── api/admin/messages/[id]/route.ts            # PATCH (status), DELETE (soft)
│   ├── api/admin/messages/[id]/read/route.ts       # POST (conditional new → read)
│   └── admin/(dashboard)/
│       ├── layout.tsx                              # + countNewMessages() → AdminShell
│       ├── page.tsx                                # Messages card → countMessages()
│       └── messages/
│           ├── page.tsx                            # inbox (replaces AdminPlaceholder)
│           └── [id]/page.tsx                       # detail
├── components/
│   ├── contact/
│   │   ├── contact-banner.tsx                      # (or PageBanner usage — research §14)
│   │   ├── contact-details.tsx, contact-detail-column.tsx
│   │   ├── contact-map.tsx                         # server: heading, reserved area, caption link
│   │   ├── lazy-map-frame.tsx                      # "use client": IntersectionObserver → insert iframe
│   │   ├── contact-form-section.tsx
│   │   ├── contact-form.tsx                        # "use client"
│   │   └── write-us-link.tsx                       # "use client"
│   └── admin/
│       ├── admin-shell.tsx                         # + newMessagesCount prop → AppSidebar
│       ├── admin-list-filters.tsx                  # LIFTED generic search + select
│       ├── admin-delete-dialog.tsx                 # LIFTED generic confirm-delete (optional redirectTo)
│       ├── signups/signups-table-filters.tsx       # → wrapper over AdminListFilters
│       ├── signups/delete-signup-dialog.tsx        # → wrapper over AdminDeleteDialog
│       └── messages/
│           ├── messages-table.tsx                  # server: rows, New styling, preview, links with ?from=
│           ├── message-detail.tsx                  # server: sender block, reply links, body
│           ├── message-status-control.tsx          # "use client": select + Mark as responded → PATCH
│           ├── mark-read-on-open.tsx               # "use client": POST read once → refresh
│           └── delete-message-dialog.tsx           # "use client": wrapper over AdminDeleteDialog
└── content/
    ├── contact.ts                                  # public copy
    ├── site-shell.ts                               # ContactInfo + mapUrl, officeHours (placeholder-marked)
    └── admin.ts                                    # + messagesCopy

e2e/
├── helpers/messages.ts                             # seedMessages(), findMessages(), clearMessages()
├── contact-public.spec.ts                          # forms (US1): send, validation, phone formats, 2 from same email, 503 keeps text
├── contact-details.spec.ts                         # forms (US5): columns, links, map src + fallback link, Write Us focus
├── contact-protection.spec.ts                      # forms (US6): 429 keeps text, honeypot stores nothing, 5,001 chars, honeypot not tabbable
├── contact-visual.spec.ts                          # forms: 375/768/1024/1440 vs tokens/reference, no horizontal scroll
├── admin-messages-list.spec.ts                     # admin (US2): order, preview, New styling, search/filter/paging, Urdu, long body, no phone, reply hrefs, XSS inert, "no longer available"
├── admin-messages-status.spec.ts                   # admin (US3): auto-read on open, responded, back to new, failed save keeps status
├── admin-messages-delete.spec.ts                   # admin (US4): cancel/confirm, gone from search/filters, delete from detail returns to filtered inbox
├── admin-messages-indicator.spec.ts                # admin (US7): sidebar badge + overview card after open/status/delete
├── admin-messages-journey.spec.ts                  # admin: brief's acceptance sequence end to end
└── admin-messages-protected.spec.ts                # admin: page redirects + API 401s without a session
```

**Structure Decision**: Extends the single Next.js app along
`docs/architecture.md` exactly as 004 did: model in `src/models`,
domain logic in `src/lib/messages`, shared validation in
`src/lib/validation`, public route under `/api/public`, admin routes
under `/api/admin`, admin pages under `admin/(dashboard)`, public
sections under `src/components/contact`, copy in `src/content`.
Helpers both features need move up one level to `src/lib` /
`src/components/admin` with re-export shims.

## Implementation phases (for /sp.tasks)

1. **Shared lifts (no behaviour change)** — `phone`, `admin-datetime`,
   `route-errors`, `validation/field-errors`, `AdminListFilters`,
   `AdminDeleteDialog` + signup shims; run the full 004 Vitest suite
   and signup E2E as the regression gate.
2. **Foundation** — `statuses.ts`, `preview.ts`, `inbox-href.ts`,
   `validation/message.ts` (unit tests); `models/message.ts`;
   `mutations.ts` + `admin-queries.ts` (DB tests: two-from-same-email,
   order, search incl. Urdu, status filter, paging, counts,
   conditional read, deleted excluded).
3. **Public API** — `POST /api/public/messages` + route tests (200,
   honeypot, 400 per field, 413, 429 sixth + separate from signup,
   503).
4. **Token + asset extraction** — script, JSON, images,
   `design-tokens.md`, `@theme` (blocks phase 5).
5. **Public UI (US1, US5, US6)** — `ContactInfo` fields,
   `getContactDetails()`, `content/contact.ts`, `ContactForm` (+ jsdom
   tests), sections, page.
6. **Admin (US2, US3, US4)** — `messagesCopy`; admin routes (401/400/
   404 tests); `MessagesTable`, `MessageDetail`,
   `MessageStatusControl`, `MarkReadOnOpen`, `DeleteMessageDialog`
   (+ XSS/no-phone jsdom tests); inbox + detail pages.
7. **Indicator (US7)** — layout → `AdminShell` → `AppSidebar` badge;
   overview card.
8. **E2E + docs** — Playwright config, helper, global-setup, five
   specs; `docs/architecture.md`.

## Follow-ups and risks

- **Keyless map embed** (`output=embed`) is not a versioned Google API;
  if it breaks, the always-present "Open in Google Maps" link keeps the
  page usable, and the keyed Maps Embed API (free, needs an `.env` key
  and approval) is the replacement.
- **`X-Forwarded-For` trust** in 002's `extractIp` (pre-existing): on
  a host that doesn't overwrite the header, the per-IP limit for both
  public forms can be bypassed. Verify on the chosen host (PRD open
  question 8); fix belongs to 002's module.
- **Placeholder contact values** (address, hours, map link) mean the
  map shows a placeholder location until the client supplies the real
  Metroville details; they are marked, and 005 will make them
  admin-editable.

## Complexity Tracking

Not needed — no constitution violations.
