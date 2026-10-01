# Research: Admin Notifications

**Feature**: 009-admin-notifications | **Date**: 2026-09-26 | **Spec**: [spec.md](./spec.md)

Every item in the plan's Technical Context is resolved below. There
are no remaining NEEDS CLARIFICATION items.

---

## 1. The one new piece of state: per-admin "Signups last opened"

**Decision**: One new collection, `adminNotificationStates`, with one
document per admin: `_id` = the admin's Better Auth user id (string,
no separate unique index needed — the id itself is the key),
`signupsLastOpenedAt: Date`. Read/write through
`src/lib/notifications/state.ts`:

- `getSignupsLastOpenedAt(adminId)` — `findById`; if no document
  exists yet, **creates one with `signupsLastOpenedAt = now`** (not an
  epoch/zero date) and returns `now`.
- `markSignupsOpened(adminId, now = new Date())` — upsert, `$set:
  { signupsLastOpenedAt: now }`.

**Rationale**: Messages already carry their own "new" state (008's
`status` field) — no new storage needed there. Signups (004) have no
such field, and the spec's rule ("created since the admin last opened
the Signups page") is inherently relative to a moment that must be
remembered somewhere durable, per admin, across devices (spec FR-019).
Defaulting a *never-opened* admin's moment to **now** rather than the
epoch means the day this feature ships, the hundreds of pre-existing
signups don't all suddenly light up as new — only genuinely new
arrivals after that moment do. This reads the spec's "since the admin
last opened" as intending *new arrivals relative to actual admin
behaviour*, not a backfill flood, and needs no data migration script.

**Alternatives considered**:

- A field added to the Better Auth `user` collection. Rejected —
  002-foundation's data model states app code never defines models for
  or writes to Better-Auth-owned collections; that boundary is a
  constitution-adjacent guarantee (only the seed script's sanctioned
  exception touches `user`).
- Store the moment in a cookie or `localStorage`. Rejected — the spec
  explicitly requires it to survive a different device/browser (FR-019
  "regardless of which device, browser or session"); client storage is
  per-browser only.
- Default a never-opened admin to the epoch (`new Date(0)`), so every
  existing signup counts as new on first login post-launch. Rejected —
  see Rationale; it would show a wall of "new" signups the first time
  anyone opens the bell after deploying this feature, which is exactly
  the flood the spec's edge cases are trying to avoid for messages/
  deleted records and would surprise the (single) admin.
- Per-signup "seen" flags instead of one timestamp. Rejected — the
  spec's rule is explicitly time-based ("since ... last opened"), and a
  flag-per-record needs a write per signup instead of one write per
  admin action; the timestamp already reproduces "seen again after a
  repeat submission" for free (§2).

## 2. What counts as new, and the combined panel query

**Decision**: `src/lib/notifications/queries.ts`:

- `countNewSignups(adminId)` → `Signup.countDocuments({ lastSignupAt:
  { $gt: lastOpened } })` (the soft-delete plugin's default filter
  already excludes deleted signups). `lastSignupAt` — not
  `firstSignupAt` — is the comparison field: 004's data model already
  treats it as "set on every accepted submission (create, update,
  restore)", so a repeat submission that refreshes `lastSignupAt`
  automatically makes the signup "new again" relative to
  `lastOpened`, satisfying the spec edge case with no extra code.
- Messages reuse 008's existing `countNewMessages()` unchanged
  (`status: "new"`, plugin-filtered).
- `listNotificationItems(adminId, limit = 10)` — fetches up to `limit`
  new messages (`{ status: "new" }`, sorted `createdAt` desc, fields
  `_id, name, subject, createdAt`) and up to `limit` new signups
  (`{ lastSignupAt: { $gt: lastOpened } }`, sorted `lastSignupAt` desc,
  fields `_id, name, email, lastSignupAt`) **in parallel**, maps each to
  a common `NotificationItem` shape, merges the two short lists by
  timestamp descending, and slices to `limit`. Fetching `limit` from
  *each* side before merging (rather than `limit` total from a single
  query) is enough at this feature's scale — one merge of two ≤10-row
  lists — and guarantees the newest `limit` across both kinds even in
  the worst case where all of them are one kind.
- `getNotificationsSummary(adminId)` — `Promise.all([countNewMessages(),
  countNewSignups(adminId), listNotificationItems(adminId)])`, combined
  into `{ messagesNew, signupsNew, items }`. This one function backs
  both the polling endpoint and the initial SSR seed (§3), so the
  sidebar, the bell and the panel are computed by the same code path
  every time (spec FR-014).

**`NotificationItem`** (`src/lib/notifications/types.ts`):

```ts
export interface NotificationItem {
  kind: "message" | "signup";
  id: string;
  title: string;        // message sender's name, or signup's name
  description: string;  // message subject, or signup's email
  timestamp: string;    // ISO — createdAt (message) or lastSignupAt (signup)
  href: string;          // /admin/messages/<id>, or /admin/signups
}
```

**Rationale**: Reusing `countNewMessages()` as-is keeps 008's contract
untouched (Constitution VI — no duplicate counting logic). Signups
have no per-item detail page (004's data model has none), so every
signup item's `href` is the same `/admin/signups` — matching the
brief's "the Signups list" literally, not a guessed detail route.

**Alternatives considered**:

- One aggregation pipeline (`$unionWith` across `messages` and
  `signups`) computed in MongoDB. Rejected — the two collections have
  different shapes and "new" predicates; a hand-rolled `$unionWith`
  pipeline would be harder to read and test than two small queries plus
  an in-memory merge of at most 20 documents, with no measurable
  performance difference at this scale (hundreds, not millions, of
  rows).
- Cursor-based "since last seen item id" pagination for the panel.
  Rejected — Out of Scope rules out a history of past alerts; the panel
  only ever needs "what's new right now," which a plain time-sorted
  query already gives.

## 3. Live updates without a new dependency

**Decision**: A single client Context, `NotificationsProvider`
(`src/components/admin/notifications/notifications-provider.tsx`),
mounted once inside `AdminShell` (so it survives client-side
navigation between admin pages and isn't remounted per page):

- Seeded with `initialMessagesNew` / `initialSignupsNew`, computed
  server-side by the dashboard layout exactly like 008 already does for
  `newMessagesCount` (`getNotificationsSummary(session.userId).catch(() =>
  ({ messagesNew: 0, signupsNew: 0, items: [] }))` — a count/list
  failure must never break every admin page, same precedent as 008's
  layout).
- On mount, calls `refresh()` once (to populate `items`, which have no
  SSR seed) and then every ~60 seconds via `setInterval` (spec FR-020).
- Listens for the page's visibility: on `visibilitychange`, if the
  document became hidden, the interval is cleared; if it became
  visible again, a `refresh()` fires immediately and the interval is
  re-armed (spec FR-022, edge case "resumes when it returns").
- `refresh()` calls `GET /api/admin/notifications`; on success it
  replaces `messagesNew`/`signupsNew`/`items`; **on failure it leaves
  the current state untouched and does not surface an error** (spec
  FR-026) — the same "keep the last good value" contract 002's overview
  card fallback already uses at the layout level, applied here to a
  client fetch instead of a server one.
- `refreshNow()` — the same fetch, exposed for mutation call sites
  (message read/status-change/delete, signup delete, "Signups opened")
  to call right after their own request succeeds, so the indicators
  update immediately rather than waiting for the timer (spec FR-021).
  This runs **alongside**, not instead of, each mutation's existing
  `router.refresh()` call — `router.refresh()` still re-renders that
  page's own Server Component data (e.g. the messages table); polling
  the notifications endpoint is what keeps the bell/sidebar in sync,
  since those are client state seeded once at shell-mount, not re-read
  from props on every navigation.
- `markAllRead()` — `POST /api/admin/notifications/read`, then sets
  local state to `{ messagesNew: 0, signupsNew: 0, items: [] }`
  immediately (optimistic; the endpoint is authoritative and a
  following `refreshNow()` reconciles it).

Exposed via `useNotifications()`, consumed by `AppSidebar` (both
badges), `NotificationBell`, and `PageTitleBadge` (§6) — one shared
piece of state, so the sidebar and the bell can never disagree (spec
FR-014): there is only one place the numbers are computed on the
client.

**Rationale**: Constitution II fixes the stack; no data-fetching
library (SWR, React Query, etc.) is in it, and none is needed — a
`fetch` on an interval, paused by the standard
`document.visibilityState` API, is the entire mechanism the spec asks
for ("checking on a timer is enough," Out of Scope explicitly rules out
a server-push transport). One Provider avoids the alternative of
threading two separate counts through props at every level (sidebar,
bell, page-title) with three chances to drift out of sync.

**Alternatives considered**:

- Add a small dependency (`swr`) for the polling/cache logic.
  Rejected outright by Constitution II ("No new frameworks... may be
  introduced" without amending the constitution first) — and
  unnecessary for one polled endpoint with no caching-across-routes
  need.
- Server-Sent Events / WebSocket push. Rejected — Out of Scope
  ("Live updates pushed from the server... a timer is enough").
- Let each consumer (`AppSidebar`, the bell) poll independently.
  Rejected — duplicate requests and duplicate timers, and no
  guaranteed agreement between them (the exact risk FR-014 exists to
  avoid).

## 4. Bell panel: a new shared Popover primitive, not a second overlay type

**Decision**: Add `src/components/ui/popover.tsx`, wrapping
`@base-ui/react/popover` the same way `src/components/ui/dialog.tsx`
already wraps `@base-ui/react/dialog` (Root/Trigger/Portal/Positioner/
Popup/Backdrop/Close, styled with the project's existing motion and
token classes). `@base-ui/react` is already in the fixed stack and
already ships a `popover` module (`node_modules/@base-ui/react/popover`)
— nothing new to install.

`NotificationBell` renders `Popover.Trigger` (icon button) +
`Popover.Popup` containing `NotificationPanel`. The "full width on a
phone instead of a narrow dropdown" requirement (spec FR-011) is a
**responsive width on the same Popup**, not a second, different overlay
component for small screens: `w-[calc(100vw-2rem)] sm:w-96` (capped,
anchored) — one implementation, one set of keyboard/focus behaviours to
test, matching the brief's own framing ("stays usable on a phone,
opening full width") rather than a phone-only code path.

Base UI's Popover already provides, out of the box (the same behaviours
`AlertDialog`/`Dialog` already rely on in this codebase): Escape to
close, click-outside to close, a focus trap while open, return-focus to
the trigger on close, and `role`/`aria-*` wiring — covering spec FR-009
and most of FR-010 for free. The remaining keyboard work is arrow-key
movement between the panel's items and the "Mark all as read" action,
which is ordinary tab order plus `role="menu"`-free list semantics (a
list of links/buttons, not a `menu` — the items navigate, they don't
perform in-place actions, so plain focusable elements are the correct
semantic, not `Menu`/`Menubar`).

**Rationale**: Constitution VI — one shared primitive, reused, not a
one-off built inside the notifications feature. Reusing Base UI's own
overlay behaviour (rather than hand-rolling Escape/outside-click
handling a second time) is exactly the precedent `dialog.tsx` and
`sidebar.tsx`'s `Drawer` usage already set.

**Alternatives considered**:

- `@base-ui/react/menu` instead of `popover`. Rejected — Menu's
  semantics (roving tabindex, `Escape` selects/closes tied to menu
  items, typeahead) fit a command list, not a mixed feed of navigable
  items with a distinct "mark all as read" action and empty state;
  Popover is the more accurate primitive, matching how notification
  panels are conventionally built.
- A conditional `Dialog` on mobile / `Popover` on desktop (two
  components). Rejected — doubles the surface to test (two sets of
  open/close/focus behaviour) for a difference that is purely CSS
  width; the existing `Dialog` wrapper is left untouched and unused by
  this feature.

## 5. Sidebar indicator: dot-or-count, shared with the bell

**Decision**: One presentational component,
`src/components/admin/notifications/notification-badge.tsx`
(`NotificationBadge({ count, pending }: { count: number; pending?:
boolean })`), renders either a small dot (`pending`, or — in principle
— a not-yet-known count) or `formatCount(count)` (§7) inside the
existing `Badge` (`variant="highlight"`). `AppSidebar` (008's
`newMessagesCount` prop) is generalised to read both numbers from
`useNotifications()` directly instead of taking `newMessagesCount` as a
prop — since the count now genuinely lives in one shared client store,
threading it through props a second time (for `signupsNew`) would be
the exact duplication FR-014 exists to prevent. `app-sidebar.test.tsx`
is updated to render `AppSidebar` inside a `NotificationsProvider` test
wrapper instead of passing a prop.

The existing `SidebarMenuBadge` already repositions itself for the
collapsed/icon-only sidebar state (`lg:right-1 lg:top-1
lg:translate-y-0` when `state === "collapsed"`) — built in 002 and
already exercised by 008's Messages badge — so no sidebar-shell change
is needed for FR-015; only the Signups item gains the same
`SidebarMenuBadge` treatment the Messages item already has.

**Rationale**: Minimises the number of places a count is computed
(Constitution VI) and keeps the "shows a dot when not yet known"
behaviour identical between the sidebar and the bell, because they now
literally read the same state.

**Alternatives considered**: keep `newMessagesCount` as a prop and add
`newSignupsCount` alongside it. Rejected — this is the "two props, one
truth" shape that risks the sidebar and bell reading different values
if a future change updates one call site and not the other; moving
both into the shared context removes that risk structurally rather
than by convention.

## 6. Overview cards: same source, refreshed at render time — not client-polled

**Decision**: The Overview page (`/admin`, a Server Component) computes
its own "new" highlights the same way it already computes
`countMessages()` — by calling the same query functions the sidebar's
initial server-side seed uses (`countNewMessages()` here unchanged,
`countNewSignups(session.userId)` newly added) — **not** by reading the
client `NotificationsProvider` context. `AdminOverviewPage` calls
`requireAdminSession()` itself (the same one-line pattern the Signups
and Messages pages already use) purely to obtain `session.userId` for
`countNewSignups`.

**Rationale**: Because the dashboard layout and the Overview page both
run their queries fresh, server-side, within the same request, they
read the same database state — "the same source," satisfying spec
FR-023 and SC-007 at the moment the page renders. What this decision
does *not* do is keep the Overview page's numbers updating every 60
seconds while the admin sits on that page without navigating; Out of
Scope explicitly rules out server-pushed live updates, and the spec's
Overview story only requires the cards to agree with the sidebar, not
to independently poll. If the admin stays on Overview for several
minutes, its two highlights are current as of the last render — a full
page reload or navigation away and back re-renders them from the live
database, exactly like the Messages card already behaves today.

**Alternatives considered**: Wire the Overview highlights to
`useNotifications()` so they update live every 60 seconds without a
reload. Rejected as unnecessary complexity for a requirement the spec
states as "same source" (correctness), not "always live" (freshness
over time) — Overview already isn't live for anything else on that
page (total news/signups counts), and Out of Scope backs the simpler
reading.

## 7. Small shared formatters (new, none existed)

**Decision**: Two small, pure, unit-tested helpers:

- `src/lib/format-count.ts` — `formatCount(n: number): string` → `n >
  99 ? "99+" : String(n)`. Used by the sidebar badges, the bell's
  total, and the Overview highlights (spec FR-027/edge case), so the
  "99+" rule is enforced in exactly one place.
- `src/lib/relative-time.ts` — `formatRelativeTime(date: Date, now =
  new Date()): string` → `"just now"`, `"5 minutes ago"`, `"3 hours
  ago"`, `"2 days ago"`, falling back to `formatAdminDateTime(date)`
  (008/004's existing absolute formatter) once the gap exceeds 7 days.
  Used only by the notification panel's "how long ago" column (spec
  FR-004) — nothing existing needed a relative formatter before this
  feature (008/004's admin tables show absolute PKT date-times
  throughout).

**Rationale**: Neither existed; both are small enough, and specific
enough to this feature's display needs, to be plain functions rather
than a dependency (e.g. no `date-fns`/`dayjs` addition — Constitution
II).

**Alternatives considered**: `Intl.RelativeTimeFormat`. Considered and
folded in as the implementation detail behind `formatRelativeTime` (it
already ships in every supported Node/browser target — no dependency),
rather than hand-rolled string interpolation; the "why" that matters
for this record is that a *relative* formatter is new, not which
Intl API produces it.

## 8. Page title prefix

**Decision**: `PageTitleBadge` (client, no visual output), mounted
once inside `AdminShell` alongside the Provider. On mount, and again
whenever `usePathname()` changes (a client-side navigation swaps
`document.title` to the new page's own title without a full reload —
`generateMetadata`/`export const metadata` sets it per route), it
captures the current `document.title` as that page's "base title" (by
stripping any `"(<count>) "` prefix already present, so navigating
between two admin pages while something is new doesn't accumulate
prefixes). Whenever `messagesNew + signupsNew` changes, it sets
`document.title = total > 0 ? `(${formatCount(total)}) ${baseTitle}` :
baseTitle`.

**Rationale**: Next's App Router sets `document.title` from each page's
own metadata on both the initial SSR render and client-side
navigations; a small client effect keyed off the pathname is the
minimal way to keep "the real page title" and "the notification
prefix" from fighting each other, without a new dependency or
duplicating every page's `metadata.title` into notification code.

**Alternatives considered**: Read each page's title from a shared
constant instead of `document.title` itself. Rejected — titles already
live in each route's own `metadata` export (Next convention, and this
codebase's existing pattern); duplicating them elsewhere would be a
second source of truth for something Next already owns.

## 9. Access control

**Decision**: `GET /api/admin/notifications`, `POST
/api/admin/notifications/read` and `POST /api/admin/signups/opened` all
open with `const session = await requireAdminSession({ mode: "api"
}); if (!session) return unauthorizedResponse();` — the identical guard
008's message routes use, from the identical shared module
(`src/lib/dal.ts`, `src/lib/route-errors.ts`). `AdminSession`
(`src/lib/dal.ts`) gains one field, `userId: string` (Better Auth's
`result.user.id`, already returned by `auth.api.getSession` and simply
not read before now), needed to key `adminNotificationStates` and to
compute `countNewSignups` per admin.

**Rationale**: Constitution III — every admin route verifies the
session on the server; reusing the exact existing helper and response
envelope (rather than a bespoke check) is what keeps the "401 for every
admin route" test suite uniform across features (spec FR-030, SC-003).

**Alternatives considered**: none — this is 002's established,
unmodified pattern; the only change is reading one more field off the
session object that was already being fetched.

## 10. No new dependencies

**Decision**: No packages, services, environment variables or version
changes. `@base-ui/react/popover` ships in the already-installed
`@base-ui/react`; polling uses the platform `fetch` and
`document.visibilityState` APIs.

**Rationale**: Constitution II.
