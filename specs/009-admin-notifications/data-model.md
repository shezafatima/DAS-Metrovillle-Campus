# Data Model: Admin Notifications

**Feature**: 009-admin-notifications | **Date**: 2026-09-26

This feature adds **one** new collection and **one** field to an
existing session type. Everything else is computed from the existing
`messages` (008) and `signups` (004) collections.

## AdminNotificationState → `adminNotificationStates`

`src/models/admin-notification-state.ts`

One document per admin. The admin's own Better Auth user id is the
document's `_id` — no separate unique index is needed, and there is at
most one document per admin by construction.

| Field | Type | Rules |
|---|---|---|
| `_id` | String | The admin's Better Auth `user._id` (not a Mongoose ObjectId — Better Auth ids are strings). |
| `signupsLastOpenedAt` | Date | The moment this admin last opened the Signups list. Lazily created on first read with value `now` (research §1) — never an epoch/zero date, so pre-existing signups never flood in as "new" the day this feature ships. |
| `createdAt` / `updatedAt` | Date | Mongoose `timestamps: true`. |

Schema options: `{ timestamps: true, collection: "adminNotificationStates" }`. No plugin — this record is never soft-deleted; it simply gets overwritten.

### Statics / functions (`src/lib/notifications/state.ts`)

```ts
/** Creates the doc with signupsLastOpenedAt = now on first read for this admin. */
export async function getSignupsLastOpenedAt(adminId: string): Promise<Date>;

/** Upsert; returns the moment that was recorded. */
export async function markSignupsOpened(adminId: string, now?: Date): Promise<Date>;
```

### State transitions

```
(no document) ── first read (any notifications query) ──▶ { signupsLastOpenedAt: now }
any            ── admin opens the Signups list ───────────▶ { signupsLastOpenedAt: now }   (POST /api/admin/signups/opened)
any            ── "Mark all as read" from the bell ───────▶ { signupsLastOpenedAt: now }   (POST /api/admin/notifications/read)
```

## Reused, unchanged: Message (008) and Signup (004)

No schema changes to either. Notifications reads:

| Collection | Field(s) read | Predicate for "new" |
|---|---|---|
| `messages` | `status`, `name`, `subject`, `createdAt` | `status === "new"` (plugin excludes deleted) |
| `signups` | `name`, `email`, `lastSignupAt` | `lastSignupAt > signupsLastOpenedAt` (plugin excludes deleted) |

`lastSignupAt` — not `firstSignupAt` — is the comparison field
(research §2): 004 already updates it on every accepted submission,
including a repeat one, which is exactly what makes "a signup updated
by a repeat submission counts as new again" (spec edge case) fall out
of the existing model with no extra bookkeeping.

## NotificationItem (computed, not stored)

`src/lib/notifications/types.ts`

```ts
export interface NotificationItem {
  kind: "message" | "signup";
  id: string;
  title: string;        // message: sender's name · signup: name
  description: string;  // message: subject · signup: email
  timestamp: string;    // ISO — message: createdAt · signup: lastSignupAt
  href: string;          // message: `/admin/messages/${id}` · signup: `/admin/signups`
}

export interface NotificationsSummary {
  messagesNew: number;
  signupsNew: number;
  items: NotificationItem[]; // newest first, at most 10, mixed kinds
}
```

## Read paths (`src/lib/notifications/queries.ts`)

```ts
export async function countNewSignups(adminId: string): Promise<number>;
// Signup.countDocuments({ lastSignupAt: { $gt: await getSignupsLastOpenedAt(adminId) } })

export async function listNotificationItems(adminId: string, limit = 10): Promise<NotificationItem[]>;
// up to `limit` newest new messages + up to `limit` newest new signups,
// mapped to NotificationItem, merged by timestamp desc, sliced to `limit`

export async function getNotificationsSummary(adminId: string): Promise<NotificationsSummary>;
// Promise.all([countNewMessages(), countNewSignups(adminId), listNotificationItems(adminId)])
```

`countNewMessages()` is 008's existing function
(`src/lib/messages/admin-queries.ts`), reused unchanged.

## Write path (`src/lib/notifications/mutations.ts`)

```ts
export async function markAllNotificationsRead(adminId: string, now = new Date()): Promise<void>;
// Message.updateMany({ status: "new" }, { $set: { status: "read", statusChangedAt: now } })
// + markSignupsOpened(adminId, now)
```

Only messages currently `"new"` are touched — `"read"` and
`"responded"` messages are never written by this path (spec Assumption:
"Mark all as read" never regresses a `responded` message).

## Indexes

No new indexes are required beyond what 004 and 008 already declare:

- `messages`: `{ status: 1, createdAt: -1 }` (008) already serves both
  `countNewMessages()` and the new-messages half of
  `listNotificationItems`.
- `signups`: `{ lastSignupAt: -1, deletedAt: 1 }` (004) already serves
  both `countNewSignups()` (a range scan on `lastSignupAt`, filtered by
  the plugin's `deletedAt: null`) and the new-signups half of
  `listNotificationItems`.
- `adminNotificationStates`: no secondary index — every lookup is by
  `_id` (the admin id), which Mongo indexes by default.

## `AdminSession` gains one field

`src/lib/dal.ts` — `AdminSession` (currently `{ email, sessionId }`)
gains `userId: string`, read from `result.user.id` (Better Auth already
returns it; this feature is the first caller that needs it). No shape
change to `getAdminSession()`'s contract otherwise — existing callers
that only read `.email` are unaffected.

## Collections touched by tests

- Vitest `describeWithDb`: `["messages", "signups",
  "adminNotificationStates"]` for the notifications query/mutation
  tests; `["user", "session", "account", "adminNotificationStates"]`
  for the notifications route tests (401 matrix + happy path needs a
  real seeded admin id).
- Playwright: `e2e/global-setup.ts` adds `"adminNotificationStates"` to
  its wipe list. `e2e/helpers/notifications.ts` exposes
  `seedAdminNotificationState({ adminId, signupsLastOpenedAt })` for
  tests that need a specific "last opened" moment (e.g. to make an
  existing seeded signup count as new, or not).
