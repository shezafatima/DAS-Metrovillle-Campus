# Contract: Account Server Actions and auth configuration (010)

Both actions live in `src/app/admin/(dashboard)/account/actions.ts`. They
follow the 002 login action contract:
- The returned state carries **copy keys only**. It never includes a field value, a hash, a token, or error text from Better Auth.
- An unexpected error in `signOutOtherDevices` maps to `unavailable`. An unexpected error in `changePassword` runs the saved-check (below). Either way it is logged without request data.

Before calling Better Auth, each action checks the session through
`requireAdminSession({ mode: "api" })`. With no session, it returns
`{ status: "error", error: "unauthorized" }` and does **not** call Better Auth.
The client then sends the browser to `/admin/login?next=/admin/account`.

Only the caller's own account is ever affected. Neither action accepts a user
id or email input. The target always comes from the session, so a
"wrong-role"/other-account request cannot be expressed. See plan.md
Constitution Check III/XI.

---

## `changePassword(prevState, formData)`

Input (FormData): `currentPassword`, `newPassword`, `confirmPassword`. Any
other fields are ignored.

State type:

```ts
type ChangePasswordState =
  | { status: "idle" }
  | { status: "success"; passwordChangedAt: string } // ISO; drives US2 sc.2 live update
  // Password saved, but ending other sessions failed; this device still signed in (FR-011b)
  | { status: "changed_others_remain"; passwordChangedAt: string }
  // Password saved, but this device's session was lost mid-change (FR-011c)
  | { status: "changed_signed_out" }
  // Could not determine whether the password saved (FR-011d)
  | { status: "unconfirmed" }
  | {
      status: "error";
      error:
        | "unauthorized"
        | "invalid"
        | "too_short"
        | "too_long"
        | "mismatch"
        | "same_as_current"
        | "wrong_current"
        | "blocked"
        | "unavailable";
    };
```

| Condition (evaluated in this order) | Result | Side effects |
|---|---|---|
| No valid session | `error: "unauthorized"` | none |
| zod shape fails (missing or non-string) | `error: "invalid"` | none |
| `newPassword.length < 12` | `error: "too_short"` | none, not counted |
| `newPassword.length > 128` | `error: "too_long"` | none, not counted |
| `confirmPassword !== newPassword` | `error: "mismatch"` | none, not counted |
| `newPassword === currentPassword` | `error: "same_as_current"` | none, not counted |
| Before hook: `password-change:user:<id>` blocked | `APIError 429 PASSWORD_CHANGE_BLOCKED` → `error: "blocked"` | log `password_change_blocked`; record unchanged |
| Better Auth `400 INVALID_PASSWORD` | `error: "wrong_current"` | after hook: log `password_change_failed`, `recordFailure`; on the 5th failure also log `password_change_blocked` |
| Better Auth `401` (session vanished mid-request) | `error: "unauthorized"` | none |
| Better Auth `400 PASSWORD_TOO_SHORT`/`TOO_LONG` (backstop) | `too_short`/`too_long` | none |
| Any other error (DB down, 5xx `APIError`, etc.) | Run the **saved-check** below | `console.error` with a fixed message and the error *name* only |
| Success | `status: "success"`, `passwordChangedAt` from `getPasswordChangedAt(userId)` (falls back to now) | hash replaced; all sessions deleted; new session plus cookie for this device (`nextCookies`); throttle key cleared (after hook); log `password_changed` with `outcome: "ok"`. **No `revalidatePath`:** the cookie write already makes Next re-render the page in the same response (see "Session read after a cookie change" below), and the client updates the date from the returned state. |

### Saved-check (FR-011): runs only after an unexpected error

Better Auth's `changePassword` performs these writes in order:
1. `updateAccount` (the password)
2. `deleteUserSessions`
3. `createSession`
4. set the cookie

An unexpected error doesn't say which step failed, so the action asks the
database directly instead of guessing:

1. **Was the password saved?**
   - Take `userId` from the session read at the start of the action. Load the credential account with `(await auth.$context).internalAdapter.findCredentialAccount(userId)`.
   - Check `ctx.password.verify({ hash: account.password, password: newPassword })`.
   - The hash is compared on the server only and never leaves the action. This is an exact check. It does not rely on timestamps.
2. **If it was not saved** → `error: "unavailable"`. Nothing changed, so the fields are kept.
3. **If it was saved**, check whether this device is still signed in. Call `auth.api.getSession({ headers: originalHeaders })` with the raw `headers()` captured at the **start** of the action, **not** `getAuthRequestHeaders()`. The check is deliberately about the *old* token:
   - still valid → `status: "changed_others_remain"`, with `passwordChangedAt` = `account.updatedAt`. Step 2 of the write sequence failed before this token was deleted, so other sessions may remain.
   - not valid → `status: "changed_signed_out"`. Step 2 ran, which signed out *every* device including this one, and step 3 or 4 failed.
   - In both cases: log `password_changed` with `outcome: "sessions_not_revoked"` or `"current_session_lost"`, and clear the throttle key. The after hook's success branch doesn't run on a thrown error, so the action does this itself. `passwordChangedAt` = `account.updatedAt` from the lookup in step 1.
4. **If the check itself throws** (the database is still down) → `status: "unconfirmed"`. Log `password_change_unconfirmed` with no outcome detail.

The check never counts toward the lockout, because only `INVALID_PASSWORD` does.

The Better Auth call is:

```ts
auth.api.changePassword({
  body: { currentPassword, newPassword, revokeOtherSessions: true },
  headers: await headers(),
});
```

Copy (in `src/content/admin.ts` → `accountCopy.errors`/`accountCopy.success`):

| Key | Message |
|---|---|
| `wrong_current` | "Your current password is incorrect." |
| `too_short` | "The new password must be at least 12 characters." |
| `too_long` | "The new password must be 128 characters or fewer." |
| `mismatch` | "The new passwords don't match." |
| `same_as_current` | "The new password must be different from your current password." |
| `blocked` | "Too many attempts. Please try again later." (same string as login) |
| `unavailable` | "We couldn't save your change. Nothing was changed — please try again." |
| `unauthorized` | not shown; the client redirects |
| `invalid` | "Please fill in all three fields." |
| success | "Your password has been changed. Other devices have been signed out." |
| `changed_others_remain` | "Your password has been changed, but other devices may still be signed in." The **Sign out other devices** button is shown inline with this message. It uses the same `signOutOtherDevices` action and the same confirm dialog. Shown with `role="status"`, not as an error. |
| `changed_signed_out` | "Your password has been changed. This device was signed out — please log in again with your new password, then use Sign out other devices on the Account page in case any other device is still signed in." Includes a "Log in" link to `/admin/login?next=/admin/account`. (Ending sessions may have stopped partway, so other devices aren't guaranteed to be signed out.) |
| `unconfirmed` | "We couldn't confirm whether your password was changed. Please reload the page and check \"Password last changed\" before trying again." |

---

## `signOutOtherDevices(prevState, formData)`

This action is called after the confirmation dialog (`AdminDeleteDialog`-style `alert-dialog`).

```ts
type SignOutOthersState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: "unauthorized" | "unavailable" };
```

| Condition | Result | Side effects |
|---|---|---|
| No valid session | `error: "unauthorized"` | none |
| `auth.api.revokeOtherSessions({ headers })` succeeds (including when there are 0 other sessions) | `success` | other sessions deleted; current kept; log `other_sessions_revoked` |
| Any error | `error: "unavailable"` | The current session is never touched. Some other sessions may already be deleted, because Better Auth deletes them one by one. Retrying is safe, since the operation is idempotent. |

Copy: success "All other devices have been signed out." / unavailable "We couldn't sign out other devices. Please try again."

The password lockout does **not** apply. This action takes no password.

---

## Page: `GET /admin/account` (Server Component)

- `await requireAdminSession()` (page mode). With no session, it redirects to `/admin/login?next=/admin/account` (002 FR-015/016).
- It reads `passwordChangedAt` with `getPasswordChangedAt(session.userId)`. If that read fails, the page renders with "Unavailable" in place of the date and the form still works.
- It renders the email (read-only), the last-changed date (`src/lib/admin-datetime.ts` formatting), `ChangePasswordForm`, and `SignOutOthersCard`.
- It passes **no password data** to the client components. Their initial field values are always `""`.

---

## Session read after a cookie change (`src/lib/dal.ts`, 002, changed in 010)

**Spike result (2026-09-28, Next 16.3.5):**
- In a Server Action, `cookies().set()` marks the page as revalidated, so Next re-renders it in the same response (`request-cookies.js:130`).
- Before that re-render, `synchronizeMutableCookies` updates `cookies()` but **not** `headers()` (`request-store.js:196–198`).
- Measured: `headers()` still returned `OLD`, while `cookies()` and the browser had `NEW`.

Today `getAdminSession()` passes `nextHeaders()` to Better Auth. After `changePassword` replaces the session, the dashboard layout's re-render would send the deleted token and redirect to login.

**Change**: add `getAuthRequestHeaders(): Promise<Headers>` to `src/lib/dal.ts`:
- It copies `await headers()` into a new `Headers`.
- It replaces the `cookie` header with `(await cookies()).getAll()` serialized as `name=value; …`.
- If there are no cookies, it deletes the header.

`getAdminSession()` passes this to `auth.api.getSession`. The 010 page and actions use it for every `auth.api.*` call except the saved-check's step 3.

On a normal request, `cookies()` is parsed from the same `cookie` header, so the result is the same session. The only difference is in a re-render inside an action's response, where it now sees the cookie the action just set.

**Regression obligations:**
- Every existing admin route test and admin E2E spec passes unchanged.
- A unit test covers `getAuthRequestHeaders`:
  - the cookie is rebuilt from `cookies()`
  - other headers are kept (`x-forwarded-for`, `user-agent`)
  - there is no `cookie` header when there are no cookies
- US1's E2E (T028 step 7) proves the device stays signed in after a change.

## `getPasswordChangedAt(userId)` (`src/lib/account.ts`, new)

Returns `(await auth.$context).internalAdapter.findCredentialAccount(userId)?.updatedAt ?? null` as a `Date | null`. The account object, including its hash, never leaves the function. It needs **no session**, so it works right after sessions are replaced and in every saved-check outcome. The page and both success paths use it.

## Auth configuration changes (`src/lib/auth.ts`)

```ts
disabledPaths: [
  "/change-password", "/revoke-other-sessions", "/revoke-sessions",
  "/revoke-session", "/update-user", "/change-email", "/set-password",
],
hooks: {
  before: composeAuthMiddleware(loginLockoutBefore, passwordChangeLockoutBefore),
  after:  composeAuthMiddleware(loginLockoutAfter,  passwordChangeLockoutAfter),
},
```

HTTP behaviour after the change:

| Request | Result |
|---|---|
| `POST /api/auth/change-password` (any session state) | `404 Not Found` |
| `POST /api/auth/revoke-other-sessions` (any session state) | `404` |
| `POST /api/auth/update-user` / `/change-email` | `404` |
| `POST /api/auth/sign-in/email`, `/sign-out`, `GET /get-session` | unchanged (002) |

---

## Test obligations

- Vitest (action, mocked auth):
  - the unauthorized branch never calls Better Auth
  - each validation branch never calls Better Auth
  - each `APIError` maps to the right copy key
  - the returned state never contains the submitted passwords (`JSON.stringify(state)` check)
  - saved-check, one test per outcome:
    - verify false → `unavailable`
    - verify true + session valid → `changed_others_remain`
    - verify true + session invalid → `changed_signed_out`
    - the account lookup throws → `unconfirmed`
    - `unavailable` is never returned when verify is true
  - console spies capture no password
- Vitest (DB-backed, `describeWithDb`):
  - 5 wrong → blocked; the correct password is refused while blocked
  - a new session for the same user is still blocked
  - login is unaffected by a password-change block, and the reverse
  - success clears a count below the threshold
  - `updatedAt` advances after `changePassword` and after the seed `--reset`
  - `getPasswordChangedAt` returns only a `Date` or `null`, never an object carrying the hash
- Playwright: see research §12.
