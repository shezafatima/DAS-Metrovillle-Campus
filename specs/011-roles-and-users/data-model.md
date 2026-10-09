> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

The `mustChangePassword` and `tempPasswordIssuedAt` fields, the `awaiting_first_login` / `temp_expired` statuses and the state diagram below are **removed**: status is only `active` or `disabled`. Change types: `first_password_set` and `temp_password_issued` are replaced by one `password_set`.

# Data Model: Roles & Users (011)

## User (Better Auth `user` collection, extended)

Existing fields (`id`, `email`, `name`, `emailVerified`, `createdAt`, `updatedAt`) are unchanged. The fields below are added through `user.additionalFields`, all `input: false` (research §2).

| Field | Type | Default | Rules |
|---|---|---|---|
| `role` | `"main_admin" \| "content_manager"` | `"content_manager"` | Only a main admin acting on **another** user can change it (FR-011, FR-026). |
| `permissions` | `Permission[]` | `[]` | A subset of `PERMISSION_KEYS`, stored sorted with duplicates removed. Ignored for `main_admin`, because `canAccess` grants everything. |
| `disabledAt` | Date \| null | `null` | Set by disable, cleared by enable. |
| `deletedAt` | Date \| null | `null` | Soft delete (Constitution VI). Cleared by restore-on-create. |
| `lastLoginAt` | Date \| null | `null` | Written on each successful sign-in (research §5). |

**Invariants**
- `email` is trimmed, lowercased and unique (existing unique index; research §14).
- There is always at least one user with `role = main_admin`, `disabledAt = null` and `deletedAt = null` (FR-027; research §8).
- A password is never stored here. It lives in Better Auth's `account` collection as a scrypt hash.

**Derived status** (computed, never stored):

```
deletedAt        → (hidden from list)
disabledAt       → "disabled"
mustChangePassword && now − tempPasswordIssuedAt > 7 days → "temp_expired"
mustChangePassword → "awaiting_first_login"
otherwise        → "active"
```

**State transitions**

```
            create / restore
(none|deleted) ───────────────▶ awaiting_first_login ──7 days──▶ temp_expired
                                    │  ▲                            │
                  setInitialPassword│  │ reset                      │ reset
                                    ▼  │                            │
                                  active ◀──────────────────────────┘
                                    │  ▲
                            disable │  │ enable (returns to prior password state)
                                    ▼  │
                                  disabled
any non-deleted state ──delete──▶ deleted   (sessions ended at every ▶ into disabled, deleted and reset)
```

Enabling returns the account to whatever password state it had before. For example, a disabled pending account comes back still pending.

## Permission (code registry, not stored as a collection)

`src/lib/permissions.ts`:

```ts
export const PERMISSION_KEYS = ["news", "messages", "careers", "settings", "pages"] as const;
export type Permission = (typeof PERMISSION_KEYS)[number];
export type Access = Permission | "main_admin" | "any";
export function canAccess(user: { role: Role; permissions: readonly string[] }, access: Access): boolean;
```

To add a section, append one key (FR-005). `main_admin` is not a key and can't be stored in `permissions`. The validation schema rejects it.

**Section map** (FR-006; the full list is in contracts/access-matrix.md): News, and uploads signing → `news` · Messages → `messages` · Signups (→ Careers in 012) → `careers` · Settings → `settings` · page content (014) → `pages` · Users, the change record, design system and registrations (013) → `main_admin` · Overview, own Account, session probe and notifications → `any`.

## Session (Better Auth `session` collection, unchanged)

No new fields. It is ended through `internalAdapter.deleteUserSessions` by disable, delete and reset, and through `revokeOtherSessions` by the first password set (research §4).

## UserChange (new, `userChanges` collection)

Append-only record of account and permission changes (FR-030 to FR-032).

| Field | Type | Notes |
|---|---|---|
| `_id` | ObjectId | |
| `at` | Date | Required. Indexed `{ at: -1 }`. |
| `actorId` | string | Better Auth user id. For `first_password_set` it is the user themselves. |
| `actorEmail` | string | Snapshot at the time of the change. |
| `targetId` | string | |
| `targetEmail` | string | Snapshot. |
| `type` | enum | `created`, `role_changed`, `permissions_changed`, `disabled`, `enabled`, `temp_password_issued`, `deleted`, `first_password_set` |
| `details` | object | See below. Never holds a password, hash or token. |

`details` by type:
- `created`: `{ role, permissions, restored: boolean }`
- `role_changed`: `{ from, to }`
- `permissions_changed`: `{ added: Permission[], removed: Permission[] }`
- all others: `{}`

One save of the edit form can produce both a `role_changed` and a `permissions_changed` entry. No entry is written for a save that changes nothing.

There is no update, delete or soft-delete path, and nothing in the admin panel edits entries (FR-031). Retention is indefinite in this phase (spec Assumptions).

## Validation schemas (`src/lib/validation/users.ts`, shared client/server)

- `createUserSchema`: `email` (trimmed, lowercased, valid email, ≤254), `role` (enum), `permissions` (array of `PERMISSION_KEYS`, may be empty).
- `updateUserAccessSchema`: `targetId` (non-empty string), `role`, `permissions`.
- `targetSchema`: `targetId`, used by disable, enable, reset and delete.
- `setPasswordSchema` / `validateSetPassword` (in `validation/account.ts`): `newPassword`, `confirmPassword`, using the 010 length constants and error keys (`too_short`, `too_long`, `mismatch`). `same_as_current` is checked on the server against the hash.
