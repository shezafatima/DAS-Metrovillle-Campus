# Contract: Notification bell, sidebar badges and page title

**Feature**: 009-admin-notifications

All client pieces below read from one `NotificationsProvider` /
`useNotifications()` (research §3) — there is exactly one place the
counts and items live on the client, so nothing below can disagree
with anything else below.

## `NotificationsProvider`

`src/components/admin/notifications/notifications-provider.tsx`
("use client"), mounted once in `AdminShell`, wrapping the sidebar, top
bar (bell) and `{children}` (so it survives client-side navigation and
is available to every admin page, including Overview).

```ts
interface NotificationsState {
  messagesNew: number;
  signupsNew: number;
  items: NotificationItem[];
  loading: boolean;          // true only during the very first fetch
}

interface NotificationsContextValue extends NotificationsState {
  refresh: () => Promise<void>;      // GET, replaces state on success, no-ops on failure
  refreshNow: () => Promise<void>;   // alias of refresh(), called by mutation sites
  markAllRead: () => Promise<void>;  // POST .../read, optimistic clear, reconciles on failure
}

export function useNotifications(): NotificationsContextValue;
```

Props: `initialMessagesNew: number`, `initialSignupsNew: number` (the
server-side seed — research §3). `items` starts empty and is populated
by the mount-time `refresh()`.

Behaviour: `setInterval(refresh, 60_000)` while
`document.visibilityState === "visible"`; cleared on `visibilitychange`
to `"hidden"`; an immediate `refresh()` plus a fresh interval on
`visibilitychange` back to `"visible"` (spec FR-020/FR-022).

## `NotificationBell`

`src/components/admin/notifications/notification-bell.tsx`
("use client"), rendered in `AdminTopBar`, on every admin page except
the login page (the login page is outside the `(dashboard)` layout
entirely, so the bell — mounted only inside `AdminShell` — structurally
cannot appear there, satisfying spec FR-028 by construction rather than
a runtime check).

- Trigger: bell icon button (`aria-label="Notifications"`), wrapped in
  `Popover.Trigger` (`src/components/ui/popover.tsx`, research §4).
  Shows `NotificationBadge` (§ below) overlapping its corner when
  `messagesNew + signupsNew > 0`.
- `Popover.Popup` (`role="dialog"` via Base UI, `aria-label="Notifications"`):
  width `w-[calc(100vw-2rem)] sm:w-96` (full width on a phone, a
  bounded dropdown from `sm` up — spec FR-011), containing
  `NotificationPanel`.
- Opening the popover also calls `refresh()` once, so the list is as
  fresh as possible at the moment the admin actually looks (not just
  whatever the last 60-second tick produced).
- Closes on Escape, on an outside click/tap (both native Base UI
  Popover behaviour), and after choosing an item (the item's own
  `onClick` calls the popover's close handler before/along with
  navigating) — spec FR-009.

## `NotificationPanel`

`src/components/admin/notifications/notification-panel.tsx`

- `messagesNew + signupsNew === 0` → empty state: "You're all caught
  up — nothing new." (spec FR-008).
- Otherwise: an ordered list of `items` (already newest-first, ≤10,
  from the context), each rendered as a link (`href` from the item) —
  title, description, `formatRelativeTime(timestamp)`, and a visible
  "New" treatment (bold text + a small `highlight` badge — the same
  convention 008's Messages inbox already uses for `status === "new"`
  rows) applied uniformly, since every item in this list is by
  definition new (spec Assumptions).
- Footer: "See all messages" (`/admin/messages`) and "See all signups"
  (`/admin/signups`) links, always present — spec FR-006.
- "Mark all as read" button, disabled while `messagesNew + signupsNew
  === 0` (nothing to clear) or while a request is in flight.
- Every item and the "Mark all as read" button are plain, tab-reachable
  focusable elements (links/buttons) in DOM order, so arrow-key-free
  Tab/Shift+Tab movement is already correct; no roving-tabindex widget
  is introduced (research §4).

## `NotificationBadge`

`src/components/admin/notifications/notification-badge.tsx` — the one
place "dot vs. count vs. nothing" is decided:

```ts
function NotificationBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return <Badge variant="highlight">{formatCount(count)}</Badge>;
}
```

Used by: the bell trigger (`count = messagesNew + signupsNew`), the
Messages sidebar item (`count = messagesNew`), the Signups sidebar item
(`count = signupsNew`). The "dot while not yet known" path (spec FR-002/
FR-013) only matters before the very first successful fetch — which the
SSR-seeded initial props already resolve for the common case (research
§3) — so it is a defensive branch (`loading && count === 0` → a plain
dot), not a commonly hit state.

## Sidebar

`src/components/admin/app-sidebar.tsx` — reads `useNotifications()`
directly (no more `newMessagesCount` prop): the Messages item shows
`<SidebarMenuBadge><NotificationBadge count={messagesNew} /></SidebarMenuBadge>`,
the Signups item the same with `signupsNew`. `SidebarMenuBadge`'s
existing collapsed-state positioning (002/008) is unchanged and applies
to both (spec FR-015).

## `PageTitleBadge`

`src/components/admin/notifications/page-title-badge.tsx`
("use client", renders nothing), mounted once in `AdminShell`. Tracks
`usePathname()` to re-capture each page's own `document.title` as the
"base title," then keeps `document.title` prefixed with
`(${formatCount(messagesNew + signupsNew)}) ` whenever the total is
greater than zero, and unprefixed otherwise (spec FR-024, P3).

## Overview cards

`src/app/admin/(dashboard)/page.tsx` stays a Server Component: passes
`highlightCount={messagesNew}` / `highlightCount={signupsNew}` (from
the server-side `countNewMessages()`/`countNewSignups()` calls,
contracts/admin-notifications-api.md) into the existing `StatCard` —
no client/context involvement (research §6).

## Responsive / visual acceptance

Indicators (bell badge, both sidebar badges) render correctly, present
only when their count is greater than zero, at 375, 768, 1024 and
1440px, with the sidebar both expanded and collapsed to icons — spec
SC-004. The bell popup is full-width at 375px and a bounded dropdown at
768px and up.
