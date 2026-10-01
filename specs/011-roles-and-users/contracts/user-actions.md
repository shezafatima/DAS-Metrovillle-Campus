> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Contract: User-management Server Actions

Revised 2026-09-29 for the right-hand panel: the admin **types or generates the password in the panel**, so no action ever returns a password. There is no separate reset action; a filled password field in the edit panel is the reset.

Every action returns a copy key, never a field value, hash, token, password or Better Auth error text.

- User-management actions start with `requireAdminAccess("main_admin")`.
- The target comes only from `targetId`.
- The actor always comes from the session.

Common error keys: `unauthorized` · `forbidden` · `invalid` · `not_found` (the target is missing or deleted) · `unavailable`.

A validation failure that belongs to a field carries `field: "email" | "password"`, so the panel shows it under that field.

Password rules (FR-021): 12 to 128 characters, compared exactly as typed, enforced here even though the panel checks first. Shared schema: `adminSetPasswordSchema` in `src/lib/validation/users.ts`.

Actions are in `src/app/admin/(dashboard)/users/actions.ts`. There are exactly five: `createUser`, `updateUserAccess`, `disableUser`, `enableUser`, `deleteUser`.

## `createUser(prev, formData)`

Input: `email`, `role` (default `content_manager`), `permissions[]` (repeated field; ignored for a main admin), `password` (required).

| Result | When |
|---|---|
| `{ status: "success" }` | Added, or restored from a deleted account (research §14) |
| `{ status: "error", error: "email_taken", field: "email" }` | A non-deleted account has this email (including the duplicate-key race) |
| `{ status: "error", error: "invalid", field: "email" \| "password" }` | Schema failure: bad email, or password not 12 to 128 characters |
| `{ status: "error", error: "invalid" }` | Any other schema failure (unknown role, a grant that is not one of the five keys) |

Side effects:
- user and credential account written; a main admin stores no grants;
- sessions of a restored account deleted;
- `UserChange created` recorded (`details.restored` for a restore);
- `user_created` logged.

The password is hashed by Better Auth's hasher and appears in no result, record or log.

## `updateUserAccess(prev, formData)`

Input: `targetId`, `role`, `permissions[]`, `password` (optional; an empty field means "not setting one").

| Result | When |
|---|---|
| `{ status: "success" }` | Saved (or nothing changed) |
| `{ status: "error", error: "self" }` | `targetId` is the actor (FR-011, FR-026) |
| `{ status: "error", error: "last_main_admin" }` | A demotion would leave zero active main admins (research §8). No password is applied either. |
| `{ status: "error", error: "invalid", field: "password" }` | A filled password that is not 12 to 128 characters. Nothing at all is applied. |

Side effects:
- `role_changed` and/or `permissions_changed` entries, and a `user_access_changed` log. Sessions are **not** ended by an access change: the next request reads the new access.
- **When `password` is present** (FR-024): the password is replaced, every session of the target ends, a `password_set` entry is recorded and `password_set` is logged. It is applied last, so a refused role change never leaves a half-applied edit.

## `disableUser` / `enableUser` / `deleteUser` (prev, formData)

Input: `targetId`. Also returns `self` and `last_main_admin` where they apply (enable never does).

| Action | Side effects |
|---|---|
| disable | Set `disabledAt`, `deleteUserSessions(target)`, record `disabled`, log `user_disabled` |
| enable | Clear `disabledAt`, record `enabled`, log `user_enabled` |
| delete | Set `deletedAt`, `deleteUserSessions(target)`, record `deleted`, log `user_deleted`. The UI asks for confirmation first. |

## Account actions (`admin/(dashboard)/account/actions.ts`, feature 010, changed by 011)

The main admin controls every password (Constitution III).

| Action | Access | Result |
|---|---|---|
| `changePassword` | `main_admin`, own account only. The account acted on is the session's, never an id or email from the form. | A content manager gets `{ status: "error", error: "forbidden" }` and Better Auth is never called; no lockout counter is touched. |
| `signOutOtherDevices` | any signed-in role, own account only | unchanged from 010 |

## Login action

Unchanged from 002: every failure, including a disabled or deleted account, is the generic `generic` key. There is no `temp_expired` and no redirect to a set-password page; a successful login goes to `next` or `/admin`.
