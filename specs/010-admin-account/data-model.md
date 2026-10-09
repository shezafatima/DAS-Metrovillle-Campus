# Data Model: Admin Account (010)

This feature adds **no new collections and no schema changes**. It reads and
writes existing Better Auth collections (from 002) and adds one new key
family to the existing `throttles` collection.

## Admin (Better Auth `user`, from 002)

This feature does not change it. The `email` is displayed read-only (the profile menu label, the Account page, and the hidden `username` autofill field). The email is not editable, and the `/update-user` and `/change-email` HTTP paths are disabled (research §4).

## Credential account (Better Auth `account`, `providerId: "credential"`, from 002)

| Field | Use in 010 |
|---|---|
| `userId` | Links the account to the admin. |
| `password` | The hash is replaced by `changePassword`. It is read only inside the server action's saved-check (`password.verify`) and never leaves it. `getPasswordChangedAt` returns only the date. |
| `updatedAt` | **"Password last changed"** (FR-012). Stamped automatically (`onUpdate`) by the panel change (`updateAccount`) and by the setup command `--reset` (`updatePassword`). At creation it equals `createdAt`, which is "first set". |

Validation for a new password (checked in the Server Action in this order; the first failure wins):

1. All three fields are present strings (zod). If the shape is wrong: `invalid`.
2. `newPassword.length >= 12`. Otherwise: `too_short`. Better Auth enforces the same rule as a backstop.
3. `newPassword.length <= 128` (Better Auth's default `maxPasswordLength`). Otherwise: `too_long`.
4. `confirmPassword === newPassword`. Otherwise: `mismatch`.
5. `newPassword !== currentPassword`. Otherwise: `same_as_current`.
6. The current password is verified by Better Auth. A wrong one gives `wrong_current`, which counts toward the lockout.

Passwords are compared exactly as typed, with no trimming (spec edge case).

## Session (Better Auth `session`, from 002)

The shape is unchanged. New ways a session can end:

| Trigger | Sessions deleted | Requesting device |
|---|---|---|
| Password change (`revokeOtherSessions: true`) | **All** of the admin's sessions | Gets a **new** session and cookie at once, so it stays logged in with a new session id |
| Sign out other devices | All except the current token | Keeps its existing session |
| Setup command `--reset` (002, unchanged) | All | Must log in again |

A session that has been deleted behaves like "no session" on its next request, as 002's FR-018 already specifies.

## Password-change failure record (`throttles`, new key family)

The model (`src/models/throttle.ts`) and the state machine are reused unchanged from 002.

| Attribute | Value |
|---|---|
| `key` | `password-change:user:<userId>`. Keyed by account only, never by IP or session. |
| `count` | Failed current-password checks in the current window |
| `windowStart` | Start of the 15-minute fixed window |
| `blockedUntil` | Set to now + 15 min when `count` reaches 5; `null` otherwise |
| `expiresAt` | TTL housekeeping (existing) |

Policy: `PASSWORD_CHANGE_POLICY = { threshold: 5, windowSeconds: 900, blockSeconds: 900 }`.

State transitions:

```text
(none) --wrong current--> counting(1..4) --5th wrong within window--> blocked(15 min)
counting --window elapses--> (reset to 1 on next failure)
counting --successful change--> (cleared)
blocked --any attempt, correct or not--> refused, record unchanged
blocked --15 min elapse--> (expired; next failure starts a new window)
```

Rules that hold by construction:
- **Independent of login**: the login keys `login:ip:*` and `login:email:*` never share a prefix with this key, so neither lockout can read or write the other's record (FR-010a).
- **Survives logout, re-login and new devices**: the key contains no session or IP data (FR-010).
- **Survives session revocation**: revocation deletes `session` documents only.
- **Survives restart**: the record is stored in MongoDB (as with 002).

## Security events (application log, from 002)

New `SecurityEventType` values: `password_changed` (outcome `ok` | `sessions_not_revoked` | `current_session_lost`), `password_change_failed`, `password_change_blocked`, `password_change_unconfirmed` and `other_sessions_revoked`. The fields are unchanged: `at`, `kind`, `type`, `ip`, `email`, `outcome`. There is no field that could carry a password or session id.
