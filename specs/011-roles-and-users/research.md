> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Research: Roles & Users (011)

All Technical Context unknowns are resolved here. Sources are the installed packages
(`better-auth` 1.7.5, `next` 16.3 docs in `node_modules/next/dist/docs/`) and the existing code.

## §1 One access check: extend the DAL, not per-feature checks

**Decision**: `src/lib/dal.ts` stays the single place that reads "who is this and what may they do".

- `getAdminSession()` is extended to return `role`, `permissions`, `mustChangePassword` and account state. It returns `null` for a disabled or deleted account, exactly as for no session.
- `requireAdminSession()` is replaced by two entry points that share one decision function, `decideAccess(session, access)`:
  - `requireAdminPage(access)` for pages. It redirects to `/admin/login?next=…` (no session), `/admin/set-password` (password must change), or `/admin?denied=1` (forbidden). Otherwise it returns the session.
  - `requireAdminAccess(access)` for route handlers and Server Actions. It returns `{ ok: true, session }` or `{ ok: false, reason: "unauthorized" | "forbidden" | "password_change_required" }`. `accessErrorResponse(reason)` turns that into 401 or 403.
- `access` is a `Permission` key (`news`, `messages`, `careers`, `settings`, `pages`), `"main_admin"` (users, change record, registrations, design system), or `"any"` (overview, own account, session probe, notifications). The `"any"` case still refuses pending-password users.

Every existing `requireAdminSession` call site (pages, route handlers, account actions; listed in contracts/access-matrix.md) moves to one of the two entry points with an explicit `access`. There is no default, so a call without an access level fails to type-check.

**Rationale**: This is the user's instruction. It also follows the Next 16 guide (`02-guides/authentication.md` "Layouts and auth checks"): layouts don't re-render on client navigation and don't gate their children or Server Actions, so each page, route and action must check for itself through the DAL. A single decision function means the three-case tests cover one piece of logic, and each call site only declares its access key.

**Alternatives considered**:
- Per-feature helpers (`requireNewsAccess()` …). Rejected: logic spreads out and new sections need new code (FR-005).
- A check in `proxy.ts`. Rejected: the proxy is optimistic and cookie-only by design (002). It can't read the DB cheaply and would never cover Server Actions.
- Next's `forbidden()` with `authInterrupts`. Rejected: it is experimental, and the spec asks for a redirect to the overview with a message, not a 403 page.

## §2 Where role and permissions live: Better Auth `user.additionalFields`

**Decision**: Add these fields to Better Auth's `user` model through `user.additionalFields`, all with `input: false`:

- `role`: `"main_admin" | "content_manager"`, default `"content_manager"`.
- `permissions`: `string[]`, default `[]`.
- `mustChangePassword`: boolean, default `false`.
- `tempPasswordIssuedAt`: date or null.
- `disabledAt`: date or null.
- `deletedAt`: date or null.
- `lastLoginAt`: date or null.

`getSession` returns them on `result.user`.

**Freshness (FR-007, SC-006)**: `session.cookieCache` is off. It is opt-in (`cookieCache.enabled === true`, see `api/routes/session.mjs`), and `auth.ts` doesn't set it. There is also no `secondaryStorage`. So every `getSession` reads the session and user from MongoDB, and a grant change, disable or delete applies on the next request in every browser. **Guardrail**: a unit test asserts `cookieCache` stays disabled, and `auth.ts` gets a comment explaining why.

**Default is the least privilege**: `content_manager` with `[]`. An account created by any unexpected path gets overview and account only, never everything.

**Rationale**: Role and permissions sit next to the identity Better Auth already loads on every request, so no second query is needed. `input: false` means no Better Auth endpoint can accept them from a client. The field types (`string[]`, `date`) are supported by the adapter factory in `@better-auth/core`.

**Alternatives considered**:
- A separate `adminPermissions` collection. Rejected: it adds a second read per request and a join that can drift.
- Encoding grants into the session. Rejected: stale until re-login, which breaks FR-007.

## §3 Why not the Better Auth `admin` plugin

**Decision**: Don't install the `admin` plugin. Call the same internal primitives it uses directly: `ctx.internalAdapter.createUser`, `linkAccount`, `updateUser`, `updatePassword`, `deleteUserSessions`.

**Rationale**:
- The plugin's permission model is role-based access-control statements. Ours is per-user section grants, and the plugin would add a second, unused model.
- It mounts about 15 HTTP routes (`/admin/*`) that would all have to go into `disabledPaths`, and each is a way around our rules (self-demotion, last main admin, the change record).
- Its ban error at sign-in (`BANNED_USER`) differs from invalid credentials, which conflicts with FR-028.
- `revokeUserSessions` in the plugin is a thin wrapper over `internalAdapter.deleteUserSessions`.

We reuse Better Auth's session revocation exactly as asked, without the extra surface. The seed script already uses the same primitives.

## §4 Session revocation for disable, reset and delete

**Decision**: Disable, reset and delete each call `ctx.internalAdapter.deleteUserSessions(targetId)` right after writing the account change. The first-password set calls `auth.api.revokeOtherSessions` with the caller's headers, which keeps the current session (same call as 010 "Sign out other devices").

**Belt and braces**: even if a session survived (for example, a crash between the two writes), `getAdminSession()` treats `disabledAt` or `deletedAt` as no session, so the next request is refused anyway (FR-012).

## §5 Refusing disabled, deleted and expired logins

**Decision**: Use `databaseHooks.session.create.before`. It runs only after Better Auth has verified the password, for every sign-in path, both `auth.api.signInEmail` and the mounted `/api/auth/sign-in/email`. It loads the user and:

- if `disabledAt` or `deletedAt` is set, throws `APIError("UNAUTHORIZED", { code: "INVALID_EMAIL_OR_PASSWORD" })`, the same status and code as a wrong password (FR-028);
- if `mustChangePassword` is set and `tempPasswordIssuedAt` is more than 7 days ago, throws `APIError("UNAUTHORIZED", { code: "TEMP_PASSWORD_EXPIRED" })`. The login action maps this to the "expired" message.

Other session creations (010's `changePassword`, which issues a fresh session) are for active users and pass through.

**Verified**: `db/with-hooks.mjs` calls the `before` hook without a try/catch, so a thrown error propagates. `result === false` would only turn into a generic failure, which is why we throw instead. Because the throw is a 401, the existing `loginLockoutAfter` counts it as a failed login. Disabled-account guessing is therefore throttled like any other.

**Spike (first implementation task)**: an integration test proves that (a) a disabled user with the right password gets the same 401 and body as a wrong password, and (b) no session row is written. **Fallback** if the hook doesn't behave as read: in `hooks.after` for `/sign-in/email`, delete `ctx.context.newSession` and return the same 401.

**Last login**: `loginLockoutAfter`'s success branch (`ctx.context.newSession`) also writes `lastLoginAt` through `internalAdapter.updateUser`. That branch only runs for a real sign-in, not for a password-change session.

## §6 Forced first-login password

**Decision**:
- There's a new page, `/admin/set-password`, outside the `(dashboard)` layout (like `/admin/login`), so the shell and notification polling don't load for a pending user.
- `requireAdminPage` sends a pending user there from every dashboard page.
- `requireAdminAccess` returns `password_change_required` (403, `{ error: "password_change_required" }`) for every admin route and action. The two exceptions are logout and `setInitialPassword`.
- The login action redirects to `/admin/set-password` when the signed-in user has `mustChangePassword`.
- The form has **new password** and **confirm** only. The temporary password was just proven at login, and asking for it again adds nothing.
- The rules come from `src/lib/validation/account.ts`: a new `validateSetPassword` shares `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH` and the 010 error keys. "Same as temporary" is checked on the server with `ctx.password.verify` against the stored hash. The expiry is checked again on submit.

**On success**: hash, then `updatePassword`, then `updateUser({ mustChangePassword: false, tempPasswordIssuedAt: null })`, then `revokeOtherSessions`, then record the change (`first_password_set`) and log it. Then redirect to `/admin`.

**No lockout**: this page takes no current password, so there is nothing to guess.

## §7 Passwords set in the panel (revised 2026-09-29)

**Decision**: The admin **types the password or generates it with one click, in the user panel**. It is sent once with the form, hashed by Better Auth's hasher, and returned nowhere. It counts as temporary whatever it is: `mustChangePassword: true`, `tempPasswordIssuedAt: now`.

- **Rules**: 12 to 128 characters, compared exactly as typed (`adminSetPasswordSchema`, reusing `PASSWORD_MIN_LENGTH`/`PASSWORD_MAX_LENGTH` from 010). Checked in the panel first and again on the server.
- **Generate**: 20 characters from `crypto.getRandomValues` (Web Crypto) with rejection sampling, over an alphabet of letters and digits without the look-alikes (0 O 1 l I L). About 116 bits. Web Crypto (not `node:crypto`) so the same module runs in the browser for the Generate button and on the server. No symbols: easy to read out over the phone.
- **Revealing**: the shared `PasswordInput` (research §15) hides the value by default and lets the admin reveal it to read it out. There is no clipboard button: revealing is enough for the stated purpose, and a copy button would put the password in the clipboard history.
- **Lifetime**: the panel's form is mounted only while the panel is open, so the value lives in its React state only until it closes. It is never returned by an action, stored readable, logged, recorded in `userChanges`, or put in a URL, redirect or cookie.
- **Reset**: the same field on an existing user's edit panel. A filled field runs the reset (new hash, temporary, sessions ended, `temp_password_issued` recorded) as the last step of `updateUserAccess`, so a refused role change (e.g. the last main admin) applies no password either.

**Supersedes** the first design, in which the server generated the password and returned it once for a "shown once" panel with a copy button.

**Alternatives considered**: server-generated only (rejected: the brief now wants the admin to be able to choose it); a separate reset action and dialog (rejected: the brief puts reset in the panel, and one code path is smaller).

## §8 Keeping at least one main admin under concurrency (FR-027)

**Decision**: guarded write, then verify, then compensate. Transactions are not assumed, because the hosting and replica-set status are still TODO in `docs/architecture.md`.

1. Refuse at once if the target is the actor (FR-026), since self-changes are never allowed.
2. Apply the change with a conditional update (e.g. `{ _id: target, role: "main_admin", disabledAt: null, deletedAt: null }` → set `role: "content_manager"`).
3. Recount active main admins (`role: main_admin, disabledAt: null, deletedAt: null`).
4. If the count is 0, revert the target to its previous values and refuse with `last_main_admin`.

**Why it's safe**: the actor must be an active main admin other than the target. So the only race is two main admins acting on each other. Each recount sees whatever writes are already committed, and whichever sees 0 reverts. At most one change survives and the end state always has at least one active main admin. The worst case is that both are refused, and the admins retry.

The transient window only affects the two actors, and the seed `--reset` stays as the recovery path. A DB-backed test runs the two actions in parallel 20 times and asserts the invariant each time.

**Alternative**: MongoDB transactions. Rejected for now because they need a replica set, which the test DB may not have. Revisit once hosting is chosen.

## §9 Change record storage

**Decision**: A new Mongoose model, `UserChange`, in the `userChanges` collection. It is append-only. There is no update or delete path in code, and no soft-delete plugin.

Fields: `actorId`, `actorEmail`, `targetId`, `targetEmail`, `type`, `details`, `at`. Emails are snapshotted, so an entry stays readable after the target's email is reused or the account is deleted. It has a `{ at: -1 }` index and is listed 20 per page with the existing `admin-list.ts` pagination helpers.

It is written in the same function as the account change, after the change succeeds. A failed record write is logged as an error and doesn't undo the change. The security log (§11) is the second trail.

## §10 How user-management mutations reach the server

**Decision**: Server Actions in `src/app/admin/(dashboard)/users/actions.ts`: `createUser`, `updateUserAccess` (role and grants), `disableUser`, `enableUser`, `resetUserPassword`, `deleteUser`. `setInitialPassword` is in `src/app/admin/set-password/actions.ts`.

Each action:
- starts with `requireAdminAccess("main_admin")`;
- reads only `targetId` plus its own fields;
- validates with a shared zod schema (`src/lib/validation/users.ts`);
- returns a copy key, never Better Auth error text.

This mirrors the 010 account actions and login.

**Rationale**:
- Server Actions carry Next's built-in Origin/Host check (FR-029; `02-guides/server-actions.md`, "allowedOrigins").
- The one-time temporary password can come back in the action result instead of a URL or a later fetch.
- The Users page is a server-rendered list, so there is no read API to protect or version.

Constitution X: the chatbot is a read consumer of content, not of admin accounts, so no REST surface is built ahead of need. The access decision lives in `dal.ts`, and a future route can reuse it unchanged.

**Tests "by request"**: the actions are called directly in Vitest with a real session cookie through mocked `next/headers`, which is the 010 pattern. E2E also posts to a forbidden page URL and API route as a content manager.

## §11 Logging

`SecurityEventType` gains `access_denied`, `user_created`, `user_access_changed`, `user_disabled`, `user_enabled`, `user_deleted`, `temp_password_issued`, `first_password_set` and `temp_password_expired`. `SecurityEvent` gains an optional `target` (email).

As before, the type has no field that could carry a password or token. `access_denied` records the actor email, the `access` key and the path, but no data.

## §12 Permission-aware shell, overview and notifications

- `src/lib/permissions.ts` is the registry. It holds `PERMISSION_KEYS`, the `Access` type, and `canAccess(session, access)`. The latter is pure and shared by server and client. It is the only function the DAL, nav and overview use to decide.
- `src/content/admin.ts` nav items each gain an `access` key. A **Users** item (`main_admin`) is added.
- The layout passes the session's allowed item list to `AdminShell`, and `AppSidebar` renders only those. That is presentation only.
- `getNotificationsSummary(session)` includes message counts and items only with `messages`, and signup counts and items only with `careers`. Registration counts arrive in 013 as main admin only. The response shape doesn't change: missing kinds are `0` and absent from `items`.
- `markAllNotificationsRead` only touches the kinds the caller may see.
- Overview cards render only for permitted sections. A content manager with no grants sees the "No sections have been granted yet" note.
- **Known limit**: a layout doesn't re-render on client-side navigation (Next guide). So after a grant change the sidebar updates on the next full render (reload, or the next server navigation that re-renders the layout). The pages, routes and actions refuse at once, and that is the enforcement.

## §13 Existing account on deploy (FR-034)

The seed command becomes role-aware:
- it creates the account with `role: "main_admin"`;
- on "already exists" it makes sure that account has `role: "main_admin"`, prints `Admin role confirmed: <email>`, and changes nothing else;
- `--reset` also sets `role: "main_admin"` and clears `mustChangePassword`, `disabledAt` and `deletedAt`. This makes it the full lock-out recovery path.

It stays run-manually-only (Constitution IV). **Deploy runbook step**: run `npm run seed:admin` once after deploying 011. Until then, the pre-existing account has the least-privilege default (§2) and sees only the overview and account. That fails safe, not open.

## §14 Email uniqueness and restore

- Emails are trimmed and lowercased before any lookup or write.
- The unique `{ email: 1 }` index on `user` (created by the seed) enforces uniqueness in the database (Constitution VI). A duplicate-key error on create maps to `email_taken`.
- For a soft-deleted match, `createUser` restores the same document: it clears `deletedAt` and `disabledAt`, sets the new role, grants, `mustChangePassword: true` and `tempPasswordIssuedAt: now`, replaces the password, and deletes any sessions. The change is recorded as `created` with `details.restored: true` (Clarification 3).
- The users list excludes `deletedAt ≠ null`.

## §15 One shared password input (added 2026-09-29)

**Decision**: `src/components/ui/password-input.tsx` is the only password field in the admin: login, Set your password, the Account page's current/new/confirm and the user panel.

- It renders a plain `<input>` plus an eye `<button type="button">` with `aria-pressed` and a changing accessible name. It forwards `ref` and every input prop, so controlled forms, `autoComplete`, pasting and password managers behave as before (the field is `type="password"` while hidden, so managers still recognise it).
- Hidden by default. It goes back to hidden on the form's `submit` and `reset` events (a native listener on `input.form`, so it works for React form actions and for `onSubmit` handlers alike) and on unmount (a closing panel).
- `revealNonce` lets a Generate button reveal what it filled in.

**Alternatives considered**: a per-form show/hide state (rejected: five copies drifting apart); a native `<input>` with the browser's own reveal control (rejected: not present in all browsers, not stylable, and cannot reset on submit).
