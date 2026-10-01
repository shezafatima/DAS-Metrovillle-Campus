# Contract: Admin notifications routes

**Feature**: 009-admin-notifications | **Namespace**: `/api/admin/*` — session required (Constitution III)

Every handler below calls `requireAdminSession({ mode: "api" })` first
and returns `401 { "error": "unauthorized" }` (`Cache-Control:
no-store`) without a valid session — the identical guard 008's message
routes use. **Each has an unauthorized-access test** (Constitution
VIII, spec FR-030/SC-003).

Error bodies use the shared envelope from `src/lib/route-errors.ts`.

## `GET /api/admin/notifications`

Polled by `NotificationsProvider` on mount, every ~60 seconds while the
tab is visible, immediately when it becomes visible again, and on
demand when the bell panel opens.

| Status | Body | When |
|---|---|---|
| `200` | `{ "messagesNew": number, "signupsNew": number, "items": NotificationItem[] }` | Always, when authorized |
| `401` | `{ "error": "unauthorized" }` | No session |
| `503` | `{ "error": "unavailable" }` | Database failure |

`items` — at most 10, newest first, mixed `kind: "message" | "signup"`:

```json
{
  "kind": "message",
  "id": "…",
  "title": "Ali Khan",
  "description": "Admission enquiry",
  "timestamp": "2026-09-26T09:14:00.000Z",
  "href": "/admin/messages/…"
}
```

```json
{
  "kind": "signup",
  "id": "…",
  "title": "Sara Ahmed",
  "description": "sara@example.com",
  "timestamp": "2026-09-26T09:10:00.000Z",
  "href": "/admin/signups"
}
```

Client (`NotificationsProvider.refresh()`): on `200`, replaces
`messagesNew`/`signupsNew`/`items`. On any other outcome (network
error, non-200, malformed body), the previous state is left exactly as
it was and nothing is shown to the admin (spec FR-026) — there is no
error toast for a background poll failure.

## `POST /api/admin/notifications/read`

"Mark all as read" — the bell panel's one bulk action.

| Status | Body | When |
|---|---|---|
| `200` | `{ "messagesNew": 0, "signupsNew": 0 }` | Every message with status `"new"` set to `"read"`; this admin's `signupsLastOpenedAt` set to now |
| `401` | `{ "error": "unauthorized" }` | No session |
| `503` | `{ "error": "unavailable" }` | Database failure |

Never touches a message already `"read"` or `"responded"`, and never
changes or deletes a signup record — it only advances the admin's
"last opened Signups" moment (spec Assumptions).

Client (`NotificationsProvider.markAllRead()`): optimistically sets
`{ messagesNew: 0, signupsNew: 0, items: [] }` on click, then awaits
the request; on failure, calls `refresh()` to reconcile with the real
state and shows an error toast. On success, the panel stays open
showing the empty state (spec FR-007/FR-008 — "Mark all as read" is not
one of the panel's close triggers).

## `POST /api/admin/signups/opened`

The Signups list's "opened" marker — mirrors 008's `.../messages/[id]/read`
pattern (an always-rendered client component that fires once per mount).

| Status | Body | When |
|---|---|---|
| `200` | `{ "signupsNew": 0 }` | This admin's `signupsLastOpenedAt` set to now |
| `401` | `{ "error": "unauthorized" }` | No session |
| `503` | `{ "error": "unavailable" }` | Database failure |

Client (`MarkSignupsOpened`, rendered once on `/admin/signups`, `key`
not tied to any row so it fires exactly once per page visit): fires on
mount; on `200` calls `useNotifications().refreshNow()` (not
`router.refresh()` — the Signups table's own data doesn't change, only
the notification counts do). On failure: silent, matching
`MarkReadOnOpen`'s existing precedent — the admin can still see the
list; the indicator simply doesn't clear until the next successful
poll or visit.

## Sidebar badges, bell and Overview cards

- `src/app/admin/(dashboard)/layout.tsx`: `getNotificationsSummary(session.userId)`
  (caught → `{ messagesNew: 0, signupsNew: 0, items: [] }`) seeds
  `NotificationsProvider`, which `AppSidebar` and `NotificationBell`
  both read (research §3, §5) — replaces the old direct
  `newMessagesCount` prop on `AppSidebar`.
- `src/app/admin/(dashboard)/page.tsx` (Overview): calls
  `requireAdminSession()` for `session.userId`, then
  `countNewMessages()` and `countNewSignups(session.userId)` directly
  (server-side, same request, same source as the sidebar's initial
  render — research §6) for the two `StatCard` highlights; `countMessages()`
  and `countSignups()` keep supplying the totals as today.
- Freshness: `NotificationsProvider`'s ~60-second poll and its
  `refreshNow()` calls (wired into every message/signup mutation that
  already calls `router.refresh()`) keep the sidebar and bell current
  without a reload (spec FR-020–FR-022). The Overview page's own
  numbers refresh on next navigation/reload, the same as its other
  cards (research §6).

## Unauthorized-access test matrix

| Target | Test |
|---|---|
| `GET /api/admin/notifications` | Vitest route test → 401 |
| `POST /api/admin/notifications/read` | Vitest route test → 401 |
| `POST /api/admin/signups/opened` | Vitest route test → 401 |
| All three | Playwright `request` (no cookie) → 401 |

## Not provided (by design)

- No per-notification "dismiss" or "mark one as read from the panel"
  endpoint beyond choosing the item (which already marks a message read
  via the existing detail-page flow) or "Mark all as read" — the spec
  only asks for those two interactions.
- No history/list-of-past-alerts endpoint (spec Out of Scope).
- No server-push transport (WebSocket/SSE) — polling only (spec Out of
  Scope; research §3).
