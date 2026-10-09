# Research: Admin Account (010)

Every finding below was verified against the installed packages
(`better-auth@1.7.x` under `node_modules/better-auth/dist`, `next@16.3.x` docs
under `node_modules/next/dist/docs`) and against this repo's existing 002/009
code. None of it relies on recalled API shapes.

---

## §1 Password change: Better Auth `changePassword`

**Decision**: Call `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers })` from a Server Action.

**Verified behaviour** (`api/routes/update-user.mjs:75–194`):
- It uses `sensitiveSessionMiddleware`, so it throws `401 UNAUTHORIZED` when there is no session.
- It checks `newPassword.length` against `minPasswordLength` and throws `400 PASSWORD_TOO_SHORT` (we already set 12 in `src/lib/auth.ts:55`). It also checks `maxPasswordLength` and throws `400 PASSWORD_TOO_LONG`.
- It finds the credential account, verifies `currentPassword` against the hash, and throws `400 INVALID_PASSWORD` on a mismatch. This happens **before** anything is written.
- It writes the new hash with `updateAccount(account.id, { password })`.
- When `revokeOtherSessions` is true, it calls `deleteUserSessions(userId)`, which deletes **every** session including the current one. It then calls `createSession(userId)` and `setSessionCookie(...)`. With the `nextCookies()` plugin already registered (`auth.ts:85`), a Server Action sends that cookie back to the browser. So the requesting device stays logged in on a **new** session id, and every other device is signed out.

**Rationale**: This is the built-in feature the user asked for. It already enforces the length rule, checks the current password on the server, and replaces the session. It matches 002's decision that a password reset ends existing sessions, while keeping the current device logged in (FR-009).

**Gaps we fill ourselves**:
- *New password must differ from the current one* (FR-008). Better Auth does not check this. If `newPassword === currentPassword` byte for byte and the current password is correct, the new password is the same. If the current password is wrong, the change fails anyway. So a plain string comparison in the action, run before calling Better Auth, is exact. It needs no extra hash check and records no lockout failure. Order of checks: shape (zod) → confirm matches → differs from current → Better Auth.
- *Confirmation matches* (FR-008). Better Auth has no confirm field, so the Server Action's zod schema enforces it (`src/lib/validation/account.ts`). The same schema is reused on the client (Constitution VI).

**Alternatives considered**:
- *Hash and update through `$context.internalAdapter` ourselves.* Rejected: this rebuilds the built-in feature, which the user ruled out.
- *`revokeOtherSessions: false` followed by a separate `revokeOtherSessions` call.* Rejected: it is two calls and a wider partial-failure window, and gains nothing.

**Partial failure: detected and reported honestly (FR-011).** `updateAccount` → `deleteUserSessions` → `createSession` are separate writes and do not run in one transaction. After an unexpected error, the action does not guess. It runs a **saved-check** (contracts/account-actions.md):

- It verifies `newPassword` against the credential account's stored hash, server-side only.
- If it matches, the password saved. The action then checks whether this device's session still exists, which tells "other sessions not ended" (offer Sign out other devices) apart from "this device was signed out" (ask them to log in again).
- If the check can't run, the answer is "couldn't confirm", never "nothing changed".

**Why verify the hash and not compare `updatedAt`?** Verifying is exact: it answers "is the new password the real one now?" directly. It is also immune to clock skew or to another write touching the row. It costs one scrypt verify, and only on the rare failure path.

**Alternative rejected**: map every unexpected error to "couldn't save". This could be false, and would make the admin believe their old password still works.

---

## §2 Sign out other devices: Better Auth `revokeOtherSessions`

**Decision**: `auth.api.revokeOtherSessions({ headers })`.

**Verified** (`api/routes/session.mjs:450–479`): it requires a session (`sensitiveSessionMiddleware`), lists the user's sessions, filters out expired ones and the current token, deletes the rest, and returns `{ status: true }`. With zero other sessions it deletes nothing and still returns `{ status: true }`, which satisfies US2 scenario 4 with no special case.

---

## §3 Account page lockout (separate counter, per account)

**Decision**: Add a new Better Auth hook pair in `src/lib/password-change-lockout.ts` for `ctx.path === "/change-password"`. It is modelled directly on `src/lib/login-lockout.ts` and reuses its primitives (`isBlocked`, `recordFailure`, `clearKeys` from `src/lib/rate-limit.ts`):

- **Key**: `password-change:user:<userId>`. It is keyed only by the account's user id, never by IP or session id. Logging out and back in, or using another device, therefore lands on the same key (spec FR-010, US1 sc. 14). Session revocation deletes `session` documents and never touches `throttles`, so ending sessions cannot clear the block.
- **Policy**: new `PASSWORD_CHANGE_POLICY = { threshold: 5, windowSeconds: 900, blockSeconds: 900 }` in `rate-limit.ts`, alongside the two login policies. It lives in the same `throttles` collection, so it survives restarts (FR-010), but under a separate key prefix. Login's keys (`login:ip:*`, `login:email:*`) and this one never overlap, which satisfies FR-010a by construction.
- **Before hook**: gets the session with `getSessionFromCtx(ctx)` (exported from `better-auth/api`; the endpoint's own session middleware has not run yet at hook time). With no session it returns and lets the endpoint's own `401` handle it. If `isBlocked(key)` is true, it logs `password_change_blocked` and throws `APIError("TOO_MANY_REQUESTS", { code: "PASSWORD_CHANGE_BLOCKED" })`. The correct password therefore makes no difference.
- **After hook**: `ctx.context.returned` is an `APIError` with status 400 and `body.code === "INVALID_PASSWORD"` → log `password_change_failed` and call `recordFailure(PASSWORD_CHANGE_POLICY)`. If that reports `blocked: true`, also log `password_change_blocked`. On success (the returned value is not an error), call `clearKeys([key])`, as login does. This only clears a *count below the threshold*: an active block can never reach success, because the before hook refuses it first. That keeps the spec's "a successful change doesn't lift an active block".
- `auth.ts` `hooks.before`/`after` become small composers that run the login and password-change middlewares in turn. Each one returns early on paths it does not own.

**Why hooks and not the Server Action?** This is the 002 precedent (research.md §6 there): hooks fire for every `auth.api.*` call and every HTTP call. The counter therefore holds even if the HTTP route were ever re-enabled (§4).

**Only `INVALID_PASSWORD` counts**. A too-short password or a mismatch never reaches Better Auth (zod rejects it first), so validation mistakes cannot lock the admin out.

---

## §4 Close the raw HTTP routes that this feature does not use

**Finding**: `src/app/api/auth/[...all]/route.ts` mounts Better Auth's whole router. So `POST /api/auth/change-password`, `/revoke-other-sessions`, `/revoke-sessions`, `/revoke-session` and `/update-user` are reachable over HTTP today, with only Better Auth's origin check in front of them. They would bypass the Server Action's confirm and differs-from-current rules (FR-008 "enforced on the server even if the page's checks are bypassed").

**Decision**: Set `disabledPaths: ["/change-password", "/revoke-other-sessions", "/revoke-sessions", "/revoke-session", "/update-user", "/change-email", "/set-password"]` in `auth.ts`.

**Verified** (`api/index.mjs:165–168`): `disabledPaths` is checked only in the HTTP router's `onRequest` and returns `404`. `auth.api.*` calls from server code skip the router, so the Server Actions keep working.

**Rationale**:
- Every account mutation now goes through one entry point, the Server Actions, which get Next's built-in Server Action origin check (FR-014 "only accepted from the admin panel's own origin").
- The lockout hooks still cover them.
- The spec's out-of-scope items are enforced as well: no email or name editing, since `/update-user` and `/change-email` are closed.

**Alternative rejected**: leave the routes open and copy the confirm and differs checks into a hook. That gives two places to enforce one rule, and still leaves email change reachable.

---

## §5 "Password last changed"

**Decision**: Read the credential account's `updatedAt` through a new server-only helper, `getPasswordChangedAt(userId)` in `src/lib/account.ts`. It calls `(await auth.$context).internalAdapter.findCredentialAccount(userId)` and returns only the `Date`.

*Revised after /sp.analyze I2.* The first plan used `auth.api.listUserAccounts({ headers })`. That needs the request's session, and right after `changePassword` the request still carries the **deleted** token, so it would always fail. The helper needs no session. It works on the page, on the success path and in every saved-check outcome.

**Verified**:
- The Better Auth account table declares `updatedAt` with `onUpdate: () => new Date()` (`@better-auth/core/dist/db/get-tables.mjs:274`). The adapter factory applies `onUpdate` on every update (`adapter/utils.mjs:2–6`, `factory.mjs:115`).
- The panel path goes through `updateAccount` → `updateWithHooks`.
- The setup command's `--reset` goes through `updatePassword` → `updateManyWithHooks`.
- Both stamp `updatedAt`. At first creation, `linkAccount` sets `createdAt`/`updatedAt` together, which gives "when the password was first set" (FR-012).
- `findCredentialAccount` returns the whole account, including the hash. The helper therefore returns only `account?.updatedAt ?? null`, so the hash never leaves it.

**Rationale**:
- No new field, no schema change, no migration.
- The setup command (`scripts/seed-admin.ts`) needs no edit to keep FR-019's "setup command updates last-changed".
- For a credential account, only a password write updates the row. There are no OAuth tokens to refresh it.

**Verification tasks (tests, not assumptions)**:
- An integration test asserts that `updatedAt` advances after both `changePassword` and the seed `--reset`.
- A unit test asserts that `getPasswordChangedAt` returns a `Date` (or `null`) and nothing else.
- If the `updateMany` path turns out not to stamp it, the fallback is a one-line `updateAccount(id, {})` touch in the setup command. That is recorded as the contingency, not the plan.

**Alternative rejected**: a new `passwordChangedAt` user field through `additionalFields`. It needs a schema addition and edits to the seed, and a column already records the same fact.

---

## §6 Form pattern (reuse 002)

**Decision**: Follow `src/components/admin/login-form.tsx` and `src/app/admin/login/actions.ts`:
- `useActionState` with a typed `{ status, error }` state that holds **only copy keys**, never field values.
- Copy lives in `src/content/admin.ts` (`accountCopy`).
- Errors show in `role="alert"`; success shows in `role="status"`.
- The submit button is disabled while the action is `pending` (double-submit edge case).

**One deliberate difference**: the three password inputs are **controlled** (client `useState`) rather than uncontrolled:
- React 19 resets uncontrolled forms after an action runs. The spec keeps typed values on `unavailable`, and FR-015 says values are never sent back from the server. Client-side state does both.
- The component needs the values to derive "dirty" for the unsaved-changes warning anyway.

What the component does after each result:
- On `success`: clear all three fields.
- On `wrong_current`: clear only the current-password field.
- On any other result: keep all three.

**Autofill (FR-018)**:
- A visually hidden `<input type="email" name="username" autoComplete="username" value={email} readOnly>` gives password managers the account identifier.
- `autoComplete="current-password"` on the current-password field and `"new-password"` on the other two.
- Real `<label>`s, no `onPaste` blocking.

---

## §7 Unsaved-changes warning

**Decision**: Reuse `useUnsavedChanges(isDirty)` from `src/components/admin/news/use-unsaved-changes.ts` (the 003 pattern: `beforeunload` plus a capture-phase link-click `confirm`).
- Move the hook to `src/components/admin/use-unsaved-changes.ts`.
- It takes the prompt string as a parameter (default: the existing news copy), so the news editor behaves exactly as before.
- The Account form passes `accountCopy.unsavedPrompt`.
- `isDirty` = any field is non-empty.

**Why not `Link onNavigate`?** The Next 16 docs (`link.md` "Blocking navigation") show `onNavigate`, but it only covers `<Link>`s that opt in, and the existing hook already covers sidebar links, the profile menu's Account and Logout links, and `beforeunload`. Constitution IX says reuse, don't duplicate.

**Logout while dirty**: Logout is a form submit, not a link, so today's `closest("a[href]")` match would miss it, and the spec's "leaving the page warns first" would fail.
**Decision**: widen the hook's selector to `a[href], [data-leaves-page]`. The profile menu's Logout item carries `data-leaves-page`. This is a one-attribute opt-in, the news editor is unaffected, and no module-level state is needed.

---

## §8 Profile menu primitive

**Decision**: Add `src/components/ui/dropdown-menu.tsx` wrapping `@base-ui/react/menu`, which already ships inside the fixed-stack dependency (`node_modules/@base-ui/react/menu`). It follows the same pattern ADR-0002 set for `popover.tsx`.

**Why Menu and not the existing Popover?**
- FR-003 requires arrow-key movement between items and `role="menu"` semantics.
- Base UI Menu provides roving focus, Escape, outside-click, close-on-select and focus return to the trigger.
- Popover is a dialog-like surface without menu keyboard semantics.

ADR-0002 anticipated "a user menu" reusing Popover. Using Menu instead is a narrow refinement: Popover stays the primitive for *panels*, Menu for *action lists*. This is noted in the plan, and an ADR is suggested (see plan.md).

**Items**:
- The email: a non-interactive label, a Menu group label, so it cannot be focused as an action.
- `Account`: a Menu `LinkItem`/item rendered as a Next `<Link href="/admin/account">`.
- `Logout`: an item that submits the existing `logout` Server Action. The action is unchanged.

**Trigger**:
- A 36px (`size-9`) round button showing `email[0].toUpperCase()`, placed to the left of `NotificationBell`, with `aria-label="Account menu"`.
- It uses only design tokens (`bg-primary text-primary-foreground`), per Constitution VII.

**Phone width (375px)**: the top bar holds sidebar trigger + separator + truncating title (`min-w-0 truncate`) + [profile, bell]. The right cluster is two `size-9` buttons with `gap-1`, about 76px. The title already truncates, so nothing wraps.

---

## §9 Removing the sidebar-footer logout (FR-004)

**Decision**: delete `src/components/admin/admin-sidebar-footer.tsx` and its use in `app-sidebar.tsx`. `AppSidebar` stops taking `email`. `AdminShell` passes `email` to `AdminTopBar` instead, which renders `ProfileMenu`. Tests that need changes:
- `src/components/admin/app-sidebar.test.tsx`: any footer or email assertions are removed.
- `e2e/admin-login-logout.spec.ts`: its logout step switches to the profile menu, which also covers the acceptance item "Logout still works from its new place".

---

## §10 Page title in the top bar

**Finding**: `AdminTopBar.currentPageTitle` looks up `adminNavItems` and falls back to `"Admin"`. The Account page is not a nav item (spec assumption), so it would show "Admin".

**Decision**: add a small non-nav title map (`adminExtraPageTitles = { "/admin/account": "Account" }`) in `src/content/admin.ts`, checked after the nav items. The page `metadata.title` is `"Account"`.

---

## §11 Security events (FR-016)

**Decision**: extend `SecurityEventType` in `src/lib/log.ts` with `password_changed`, `password_change_failed`, `password_change_blocked`, `password_change_unconfirmed` and `other_sessions_revoked`. `password_changed` carries `outcome` = `ok` | `sessions_not_revoked` | `current_session_lost`. The event type still has no field that could carry a password or session id, which is the 002 guarantee enforced by the type itself.

**Test**: a vitest spy on `console.info`/`warn`/`error` across every action branch asserts that no captured argument contains either test password (SC-005).

---

## §12 E2E strategy (one spec per user story)

All account specs are named `admin-account-*.spec.ts`, so they run in the existing serial `admin` Playwright project (`workers: 1`). They share the seeded admin with every other admin spec, so:

- **Restoring the password**: any spec that changes the password restores it in `afterEach` through a new helper, `e2e/helpers/account.ts#restoreAdminPassword()`. The helper reruns the seed command with `--reset` and the E2E credentials, exactly as `global-setup.ts` already does. This is test-only use of the manual command, never wired into build or startup, and it matches the spec's recovery path.
- **Throttle keys**: `clearThrottle()` (already exported) runs in `beforeEach`, so earlier login-lockout specs cannot leak blocks into these tests.
- **Second device**: a second `browser.newContext()` logs in separately, which gives a distinct session.

Specs (the suite is kept small, as the user asked):

1. `admin-account-change-password.spec.ts` (US1): one journey test, in `test.step`s:
   - open the profile menu by keyboard → Account
   - wrong current password rejected
   - mismatch rejected
   - short password rejected
   - same-as-current rejected
   - valid change → confirmation shown; the current context is still on `/admin`; the second context is redirected to login
   - log out through the profile menu → the old password fails and the new one succeeds
   - every Server Action response body captured through `page.on("response")` is checked, and none contains any test password
2. `admin-account-sign-out-others.spec.ts` (US2): two contexts; the last-changed date is visible; "Sign out other devices" → confirm → the second context is signed out, the first stays, and login with the unchanged password still works.
3. `admin-account-protected.spec.ts`:
   - no session → `/admin/account` redirects to login with `next=/admin/account`
   - `POST /api/auth/change-password`, `/revoke-other-sessions` and `/update-user` return 404 with and without a session
4. `admin-account-layout.spec.ts`: at 375/768/1024/1440, the profile menu and Account page show no horizontal overflow and no overlap between profile, bell and trigger. Escape and outside-click close the menu.

The lockout (5 in 15 min, per account, survives re-login, independent of login) is covered by **DB-backed vitest integration tests** (`describeWithDb`, same pattern as `src/lib/login-lockout.test.ts`) rather than more E2E. This keeps the E2E suite at one spec per story, plus the access and layout specs the acceptance list requires.

---

## §13 Session read after a cookie change in a Server Action (spike, from /sp.analyze I1)

**Question**: `changePassword` deletes the current session and sets a new session cookie. Does the admin layout's `requireAdminSession()` see the new session when Next re-renders inside the action's response?

**Source reading (Next 16.3.5)**:
- `MutableRequestCookiesAdapter` sets `workStore.pathWasRevalidated = ActionDidRevalidateStaticAndDynamic` on any cookie write (`server/web/spec-extension/adapters/request-cookies.js:130`). So a cookie write alone makes the page re-render in the same response. `revalidatePath` is not needed and can't be avoided.
- Before that re-render, `action-handler.js:996–1003` calls `synchronizeMutableCookies(requestStore)`. That replaces `requestStore.cookies`, which is what `cookies()` returns, but **not** the headers. The function itself carries `// TODO: does this need to update headers as well?` (`server/async-storage/request-store.js:196–198`).

**Empirical spike**:
- Setup: a throwaway page and Server Action under `src/app/spike-i1/` (outside `/admin`, no database), driven by Playwright against `next dev --port 3200`.
- Steps: the browser starts with `spike_token=OLD`, and the action sets `spike_token=NEW`.

| Read | Normal load | Re-render inside the action response |
|---|---|---|
| `headers().get("cookie")` | OLD | **OLD** |
| `cookies().get()` | OLD | NEW |
| Browser cookie jar | OLD | NEW |

The spike files were deleted afterwards.

**Consequence**: `getAdminSession()` (`src/lib/dal.ts`, 002) passes `nextHeaders()` to Better Auth. After a successful password change, the layout's re-render would look up the **deleted** token, get no session, and redirect to login. That breaks FR-009 ("stays logged in on this device").

**Decision** (approved by the user; it touches 002's DAL): add `getAuthRequestHeaders()` to `src/lib/dal.ts`:
- It copies the incoming headers and replaces `cookie` with one rebuilt from `cookies().getAll()`.
- `getAdminSession()` uses it.
- On an ordinary request, `cookies()` is parsed from that same header, so behaviour is unchanged. Only the re-render inside an action's response differs, where it now sees the cookie the action just set.
- The 010 actions and page use the same helper for their `auth.api.*` calls. The one exception is the saved-check's "is the old session still alive?" probe, which deliberately uses the original raw headers.

**Alternatives considered**:
- *Redirect after success* (`redirect("/admin/account?changed=1")`). Next's redirect path forwards merged request and response cookies (`action-handler.js:74–94`), so it would work. It was rejected because it moves the confirmation and partial-save states into the URL and loses the inline, live-updating UI.
- *A second 010-only session reader.* Rejected because the dashboard layout, shared by every admin page, is what redirects. It would create two session readers to keep in sync (Constitution IX).

**Regression guard**:
- Every existing admin route test and admin E2E spec must pass unchanged.
- A new unit test covers `getAuthRequestHeaders`.
- US1's E2E asserts that the device stays on `/admin/account`, still signed in, after the change.
