# Contract: Admin message routes and pages

**Feature**: 008-contact-messages | **Namespace**: `/api/admin/*` and `/admin/*` — session required (Constitution III)

Every handler below calls `requireAdminSession({ mode: "api" })` first
and returns `401 { "error": "unauthorized" }` (`Cache-Control:
no-store`) without a valid session. Every page calls
`requireAdminSession()` and redirects to `/admin/login?next=…`. **Each
has an unauthorized-access test** (Constitution VIII, spec SC-005).

Error bodies use the shared envelope from `src/lib/route-errors.ts`
(lifted from `src/lib/signup/route-errors.ts`, research §2).

## Page: `GET /admin/messages` (inbox)

Server Component; replaces the 002 `AdminPlaceholder`.

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Trimmed; case-insensitive substring over name, email, subject |
| `status` | `new` \| `read` \| `responded` \| `all` | `all` | Unknown values → `all` |
| `page` | positive integer | `1` | Carried by `AdminPagination` with `q`/`status` |

Renders `AdminListFilters` (search + status select), `MessagesTable`,
`AdminPagination`. 20 rows, newest `createdAt` first.

Row: Name (`dir="auto"`, Urdu font when RTL) · Subject (same) ·
Preview (one line, truncated with ellipsis, muted) · Status badge ·
Received (`dd MMM yyyy, HH:mm` PKT) · Delete.

- Name and subject link to `/admin/messages/<id>?from=<current inbox query>`.
- A `new` row: `font-bold` name + subject and a `highlight` "New"
  badge; `read` → `secondary` "Read"; `responded` → `outline`
  "Responded" (never colour alone — FR-014).
- Empty state: `messagesCopy.table.empty` / `.emptyFiltered`.

## Page: `GET /admin/messages/[id]` (detail)

Server Component. `getMessage(id)`:

- Found → `MessageDetail`: back link (`inboxHref(from)`), subject as
  `h1`, sender block (name; email as `mailto:<email>?subject=Re%3A%20<subject>`;
  phone as `tel:+92…` showing `03…` plus a "WhatsApp" link to
  `https://wa.me/92…` in a new tab — or "Not provided" with no links),
  received date, `MessageStatusControl`, `DeleteMessageDialog`
  (`redirectTo = inboxHref(from)`), body in a
  `whitespace-pre-wrap [overflow-wrap:anywhere]` block with
  `dir="auto"`.
- Always renders `<MarkReadOnOpen key={id} id status />`. It fires only if the status **at mount** was `new`, once per visit; it is never rendered conditionally on the status (research §5).
- `null` → "This message is no longer available." panel + back link,
  inside the admin layout (not `notFound()`).

## `POST /api/admin/messages/[id]/read`

Conditional "opened" transition: `new → read` only.

| Status | Body | When |
|---|---|---|
| `200` | `{ "id", "status": "read" \| "responded", "changed": boolean }` | Found. `changed: true` when it was `new` (now `read`); otherwise `changed: false` and the current status, unchanged |
| `401` | `{ "error": "unauthorized" }` | No session |
| `404` | `{ "error": "not_found" }` | Unknown, malformed or deleted id |
| `503` | `{ "error": "unavailable" }` | Database failure |

Client (`MarkReadOnOpen`): fires once per mount, and only if the status at mount was `new` (ref guard); on `200`
with `changed` → `router.refresh()` (updates the status on the page,
the sidebar badge and nothing else); on error → silent (status stays
`new`; the admin can set it manually).

## `PATCH /api/admin/messages/[id]`

Body `{ "status": "new" | "read" | "responded" }`.

| Status | Body | When |
|---|---|---|
| `200` | `{ "id", "status", "statusChangedAt": "<ISO>" }` | Saved (last write wins) |
| `400` | `{ "error": "validation", "fields": { "status": "…" } }` | Missing/unknown status or non-JSON body |
| `401` | `{ "error": "unauthorized" }` | No session |
| `404` | `{ "error": "not_found" }` | Unknown, malformed or deleted id |
| `503` | `{ "error": "unavailable" }` | Database failure |

Client (`MessageStatusControl`): select New/Read/Responded + "Mark as
responded" button (hidden when already responded). While saving the
controls are disabled. `200` → toast "Status updated to <Label>",
show the returned status, `router.refresh()`. `404` → toast "This
message is no longer available", refresh. Other → toast "Couldn't
update the status. Please try again.", previous status kept.

## `DELETE /api/admin/messages/[id]`

Soft delete.

| Status | Body | When |
|---|---|---|
| `200` | `{ "id", "deleted": true }` | Was live, now soft-deleted |
| `401` | `{ "error": "unauthorized" }` | No session |
| `404` | `{ "error": "not_found" }` | Unknown, malformed or already deleted |
| `503` | `{ "error": "unavailable" }` | Database failure |

Client (`DeleteMessageDialog` → shared `AdminDeleteDialog`): confirm
dialog "Delete this message?" / "It will be removed from the inbox."
→ `200` toast "Message deleted" then `router.push(redirectTo)` when
given (detail page) or `router.refresh()` (inbox row); `404` toast
"This message is no longer available" + same navigation; other →
toast "Service temporarily unavailable".

## Sidebar badge and overview card

- `src/app/admin/(dashboard)/layout.tsx`: `countNewMessages()` (caught
  → `0`) → `AdminShell newMessagesCount` → `AppSidebar
  newMessagesCount` (existing prop; badge hidden at 0).
- `src/app/admin/(dashboard)/page.tsx`: `countMessages()` → `StatCard
  title="Messages" value={total} highlightCount={new}
  highlightLabel="new"`; constants and `TODO(007-contact)` removed.
- Freshness: every mutation above ends with `router.refresh()`, which
  re-renders the layout (research §5).

## Safe display (FR-019)

Name, email, subject, preview and body are only ever React text
children. No `dangerouslySetInnerHTML`, no Markdown, no auto-linking
anywhere in `src/components/admin/messages/*`. Tested with a
`<script>` / `<img onerror>` payload in Vitest (jsdom) and Playwright.

## Unauthorized-access test matrix

| Target | Test |
|---|---|
| `POST /api/admin/messages/[id]/read` | Vitest route test → 401 |
| `PATCH /api/admin/messages/[id]` | Vitest route test → 401 |
| `DELETE /api/admin/messages/[id]` | Vitest route test → 401 |
| `GET /admin/messages` | Playwright → redirect to `/admin/login?next=%2Fadmin%2Fmessages` |
| `GET /admin/messages/[id]` | Playwright → redirect to login with `next` |
| All three API routes | Playwright `request` (no cookie) → 401 (belt and braces over the proxy) |

## Not provided (by design)

- No JSON list/detail GET endpoints — the pages call
  `src/lib/messages/admin-queries.ts` directly (same as 004). A future
  consumer can call those functions or get an endpoint when it exists
  (Constitution VII — no speculative surface).
- No restore endpoint or trash view (spec Out of Scope).
- No reply/send endpoint (spec Out of Scope; no email this phase).
