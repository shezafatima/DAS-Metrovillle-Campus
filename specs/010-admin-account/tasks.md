---
description: "Task list for 010 Admin Account"
---

# Tasks: Admin Account

**Input**: Design documents from `specs/010-admin-account/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/account-actions.md, contracts/profile-menu-ui.md, quickstart.md

**Tests**: These are required by the spec's acceptance list and Constitution XI. The E2E suite is kept small, as the user asked: **one E2E spec per user story**, plus the protected-access and layout specs that the acceptance list names. Lockout, saved-check and no-password-leak rules are covered by Vitest.

**Organization**: Setup → Foundational (auth config, lockout, shell and profile menu) → US1 (change password) → US2 (last changed and sign out other devices) → Polish.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: US1 / US2 (from spec.md)

## Ground rules for every task

- Before touching Next-specific APIs (Server Actions, `cookies()`/`headers()`, `Link`, route groups), read the relevant guide in `node_modules/next/dist/docs/` (CLAUDE.md: "This is NOT the Next.js you know").
- Never run `npm run build` and Playwright at the same time. Run them one after another (project memory).
- All copy goes in `src/content/admin.ts`, with no strings hardcoded in components (Constitution IX). Styling uses tokens only (Constitution VII).
- No password, hash, token or session id may appear in any returned state, response, log line, or URL (FR-015).
- Do **not** edit the setup command (`npm run seed:admin`, `scripts/seed-admin.ts`), and do not wire it into any build, deploy, postinstall or startup path (FR-019, Constitution IV).

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Shared constants, copy, schema and log types that later phases import.

- [X] T001 [P] Add `PASSWORD_CHANGE_POLICY = { threshold: 5, windowSeconds: 900, blockSeconds: 900 } as const` next to `LOGIN_EMAIL_POLICY` in `src/lib/rate-limit.ts`, and extend the header comment to mention the per-account password-change lockout (spec FR-010; data-model.md "Password-change failure record").
- [X] T002 [P] Extend `SecurityEventType` in `src/lib/log.ts` with `"password_changed" | "password_change_failed" | "password_change_blocked" | "password_change_unconfirmed" | "other_sessions_revoked"`. Update the doc comment (FR-016). Do not add any new field to `SecurityEvent`. `outcome` carries `ok` | `sessions_not_revoked` | `current_session_lost` for `password_changed`.
- [X] T003 [P] Add to `src/content/admin.ts`:
  - (a) `accountCopy`:
    - page title "Account"
    - "Signed in as" label
    - field labels Current password / New password / Confirm new password, and helper "At least 12 characters."
    - submit "Change password"
    - `unsavedPrompt`
    - `errors` keyed exactly as in contracts/account-actions.md: `invalid`, `too_short`, `too_long`, `mismatch`, `same_as_current`, `wrong_current`, `blocked` (same string as `loginCopy.errors.blocked`), `unavailable`
    - `success`, `changedOthersRemain`, `changedSignedOut` + `loginAgainLink`, `unconfirmed`
    - `lastChangedLabel` and the "Unavailable" fallback
    - sign-out-others button, dialog title/body/cancel/confirm, and success/unavailable messages
  - (b) `profileMenuCopy`: trigger aria-label "Account menu", item labels "Account" and "Logout" (reuse `loginCopy.logout`).
  - (c) `adminExtraPageTitles: Record<string, string> = { "/admin/account": "Account" }`.
- [X] T004 [P] Create `src/lib/validation/account.ts`. It exports `changePasswordSchema` (zod 4) plus a `validateChangePassword(input)` helper that returns the **first** failing key in this order: `invalid` (non-string or missing) → `too_short` (<12) → `too_long` (>128) → `mismatch` → `same_as_current` → `null`. There is no trimming. Export the `ChangePasswordErrorKey` type. It is shared by the Server Action and the client form (Constitution VI; data-model.md validation order).
- [X] T005 [P] Create `src/lib/validation/account.test.ts` with one case per key in T004's order. Include: exactly 12 chars passes; leading/trailing spaces are preserved and count; confirm is checked before same-as-current; the same value with a different case is **not** "same".

**Checkpoint**: The constants, copy, schema and log types compile (`npx tsc --noEmit`), and T005 passes.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: The auth surface, the lockout hook, a reusable unsaved-changes hook, and the profile menu in the shell. Both stories depend on these, and the profile menu is the only way to reach the Account page.

**⚠️ CRITICAL**: No user-story work begins until this phase is complete.

### Auth surface and lockout

- [X] T006 Create `src/lib/password-change-lockout.ts`, modelled on `src/lib/login-lockout.ts` (research §3):
  - Export `passwordChangeLockoutBefore` and `passwordChangeLockoutAfter` (`createAuthMiddleware`). Both return early unless `ctx.path === "/change-password"`.
  - Key helper: `passwordChangeKey(userId) => \`password-change:user:${userId}\``. Never use IP or session id.
  - **before**: resolve the session with `getSessionFromCtx(ctx)` from `better-auth/api`. If there is none, return and let the endpoint 401. If `isBlocked(key)`, call `logSecurityEvent({ type: "password_change_blocked", ip, email })` and throw `new APIError("TOO_MANY_REQUESTS", { message: "Too many attempts. Please try again later.", code: "PASSWORD_CHANGE_BLOCKED" })`.
  - **after**:
    - If `ctx.context.returned` is an `APIError` with `statusCode === 400` and `body?.code === "INVALID_PASSWORD"`: log `password_change_failed` and `recordFailure({ key, ...PASSWORD_CHANGE_POLICY })`. If that returns `{ blocked: true }`, also log `password_change_blocked`.
    - If the returned value is not an error: `clearKeys([key])`.
    - Anything else: do nothing.
- [X] T007 Edit `src/lib/auth.ts`:
  - (a) Add a local `composeAuthMiddleware(...mws)` helper, a `createAuthMiddleware` that awaits each in turn. Set `hooks.before = composeAuthMiddleware(loginLockoutBefore, passwordChangeLockoutBefore)` and `hooks.after = composeAuthMiddleware(loginLockoutAfter, passwordChangeLockoutAfter)`. The login behaviour must stay identical.
  - (b) Add `disabledPaths: ["/change-password", "/revoke-other-sessions", "/revoke-sessions", "/revoke-session", "/update-user", "/change-email", "/set-password"]`, with a comment citing research §4. These are HTTP-only closures; `auth.api.*` is unaffected.
  - Depends on T006.
  - **As built:** the lockout hooks are registered as a small plugin (`passwordChangeLockout()`, placed before `nextCookies()`) with a `/change-password` path matcher, instead of a `composeAuthMiddleware` around the login hooks. Better Auth runs plugin hooks through the same runner and context (`api/dispatch.mjs`), and 002's login hooks stay byte-for-byte unchanged.
- [X] T008 Create `src/lib/password-change-lockout.test.ts` (`// @vitest-environment node`, `describeWithDb` from `src/test/db.ts`, collections `["user","account","session","throttles"]`), seeding its own admin as in `src/lib/login-lockout.test.ts`. Get a session by calling `auth.api.signInEmail` with `returnHeaders: true` and use its `set-cookie` for the headers. Cases:
  - 5 wrong `changePassword` calls → the 6th, **with the correct password**, rejects with 429 `PASSWORD_CHANGE_BLOCKED`, and the password is unchanged (the old one still signs in).
  - After the block, sign in again (new session) → `changePassword` is still 429 (FR-010, US1 sc.14).
  - While the password-change block is active, `signInEmail` with the correct password **succeeds** (FR-010a).
  - After tripping the login lockout (5 wrong sign-ins from one IP), a logged-in session's `changePassword` with the correct current password **succeeds** (FR-010a, US1 sc.15).
  - 3 wrong, then 1 correct → the key is cleared (no throttle doc for `password-change:user:<id>`).
  - `newPassword` too short never creates a throttle doc.
  - Depends on T007.
- [X] T009 [P] Create `src/lib/account.ts` (server-only) exporting `getPasswordChangedAt(userId: string): Promise<Date | null>`. It returns `(await (await getAuth()).$context).internalAdapter.findCredentialAccount(userId)?.updatedAt ?? null` and must **never** return or log the account object or its hash (research §5, contracts/account-actions.md). Then create `src/lib/account.test.ts` (DB-backed, `describeWithDb`, collections `["user","account","session"]`) checking that `getPasswordChangedAt` **advances**:
  - (a) after `auth.api.changePassword`
  - (b) after `ctx.internalAdapter.updatePassword(userId, hash)`, the exact call the setup command's `--reset` makes
  - (c) the return value is a `Date` (or `null` for an unknown id) and nothing else. Assert `Object.prototype.toString.call(v) === "[object Date]"` and check that there is no `password` property anywhere on it.
  - If (b) fails, stop and report. The contingency in research §5 edits the setup command and needs user approval. Depends on T007.
- [X] T010 Run `npx vitest run src/lib/login-lockout.test.ts src/lib/rate-limit.test.ts` to confirm 002's login lockout is unchanged after T007.

### Session read after a cookie change (002 DAL, spike-verified — research §13)

- [X] T011 Edit `src/lib/dal.ts` (002). Add and export `getAuthRequestHeaders(): Promise<Headers>`:
  - It copies `await headers()` into `new Headers(...)`.
  - It replaces `cookie` with `(await cookies()).getAll().map(c => \`${c.name}=${c.value}\`).join("; ")`, or deletes `cookie` when that list is empty.
  - `getAdminSession()` passes `await getAuthRequestHeaders()` to `auth.api.getSession` instead of `await nextHeaders()`. `requireAdminSession` is otherwise unchanged.
  - Add a doc comment citing the spike: `synchronizeMutableCookies` updates `cookies()` but not `headers()` in an action's re-render.
  - Create `src/lib/dal.test.ts` (node env). Mock `next/headers` so `headers()` and `cookies()` return controlled values. Cases:
    - (a) the cookie comes from `cookies()` when it differs from the raw header (the post-action case)
    - (b) `x-forwarded-for`, `user-agent` and `x-pathname` are kept
    - (c) there is no `cookie` header when `cookies()` is empty
    - (d) `getAdminSession` calls `getSession` with those headers.
- [X] T012 Regression gate for T011, which touches every admin page and route. Run these **one at a time**:
  1. `npx vitest run src/app/api/admin src/lib`
  2. `npx playwright test --project=admin`
  - Every result must match the pre-change baseline, allowing only the known stale 001–003 failures (project memory). Do not start Phase 3 until this passes. If anything regresses, revert T011 and report.
  - Depends on T011.

### Shared UI plumbing

- [X] T013 [P] Move `src/components/admin/news/use-unsaved-changes.ts` → `src/components/admin/use-unsaved-changes.ts`. Change the signature to `useUnsavedChanges(isDirty: boolean, prompt: string = newsCopy.editor.unsavedPrompt)` and widen the click-capture selector from `"a[href]"` to `"a[href], [data-leaves-page]"` (research §7). Update the import in `src/components/admin/news/news-editor.tsx`, plus any test importing the old path (`grep -r "news/use-unsaved-changes" src`). Run `npx vitest run src/components/admin/news` and confirm it still passes.
- [X] T014 [P] Create `src/components/ui/dropdown-menu.tsx`, wrapping `@base-ui/react/menu`. Follow the same style as `src/components/ui/popover.tsx` (read it first, plus `node_modules/@base-ui/react/menu` exports):
  - export `DropdownMenu` (Root), `DropdownMenuTrigger`, `DropdownMenuContent` (Portal+Positioner+Popup, `align="end"`, `sideOffset`, token classes, `max-w-[calc(100vw-2rem)]`), `DropdownMenuItem`, `DropdownMenuGroup`, `DropdownMenuGroupLabel`, `DropdownMenuSeparator`
  - no new dependency.
- [X] T015 Create `src/components/admin/profile-menu.tsx` (client) per contracts/profile-menu-ui.md:
  - Trigger: a round `size-9` button, `bg-primary text-primary-foreground`, showing `email.charAt(0).toUpperCase()`, `aria-label={profileMenuCopy.triggerLabel}`.
  - Content: group label with the email (`truncate`, `title={email}`), separator, then:
    - an "Account" item rendered as Next `<Link href="/admin/account">` with the `UserRound` icon and `aria-current="page"` when `usePathname() === "/admin/account"`
    - a "Logout" item that submits a `<form action={logout}>` (import from `src/app/admin/(dashboard)/actions.ts`), with the `LogOut` icon and a `data-leaves-page` attribute.
  - Depends on T003, T014.
- [X] T016 Create `src/components/admin/profile-menu.test.tsx` (jsdom, Testing Library):
  - the trigger shows the upper-cased initial
  - Enter opens the menu and focus moves to the first item; **Space** also opens it (FR-003); ArrowDown moves; Escape closes and returns focus to the trigger
  - an outside click closes it
  - choosing Account closes it
  - the email is shown and is not a menuitem
  - with a dirty `useUnsavedChanges` mounted and `window.confirm` mocked to `false`, activating Logout does **not** submit (plan Risk 3). If this fails because Base UI activates on pointerup, add an explicit `onClick` confirm guard in the Logout item and retest.
  - Depends on T013, T015.
- [X] T017 Edit `src/components/admin/admin-top-bar.tsx`:
  - accept `email: string`
  - replace the lone `<NotificationBell />` with `<div className="flex shrink-0 items-center gap-1"><ProfileMenu email={email} /><NotificationBell /></div>` (profile to the **left** of the bell, FR-001)
  - make `currentPageTitle` fall back to `adminExtraPageTitles[pathname]` before `"Admin"`
  - update the stale doc comment.
  - Depends on T015.
- [X] T018 Edit `src/components/admin/admin-shell.tsx` to pass `email` to `<AdminTopBar email={email} />` and stop passing it to `AppSidebar`. Edit `src/components/admin/app-sidebar.tsx` to drop the `email` prop and the `<AdminSidebarFooter />` render and import. Delete `src/components/admin/admin-sidebar-footer.tsx` (FR-004: single logout location). Update `src/components/admin/app-sidebar.test.tsx` to remove any footer, email or Logout assertions and any `email` prop. Depends on T017.
- [X] T019 Update existing E2E specs that relied on the sidebar footer:
  - `e2e/admin-login-logout.spec.ts`: replace `getByText(E2E_ADMIN.email)` visibility checks with `getByRole("button", { name: "Account menu" })` being visible. In the logout test, open the profile menu and click `getByRole("menuitem", { name: "Logout" })`. This covers the acceptance item "Logout still works from its new place".
  - `e2e/admin-layout.spec.ts`: same substitution for its email and Logout assertions.
  - Add a shared helper `openProfileMenu(page)` in a new `e2e/helpers/account.ts` and use it in both.
  - Depends on T018.

**Checkpoint**:
- `npx vitest run` passes (T005, T008, T009, T011, T016, the existing suites).
- The T012 regression gate has passed: the DAL change left every existing admin route and admin E2E spec unchanged.
- The profile menu shows left of the bell and Logout works from it.
- `/api/auth/change-password` returns 404.
- The sidebar has no email or logout.

---

## Phase 3: User Story 1 — Change password from the panel (Priority: P1) 🎯 MVP

**Goal**: From the profile menu → Account, the admin changes their password with current + new + confirm. They stay logged in here, every other device is signed out, and a partial failure is reported truthfully.

**Independent Test**: Log in on two contexts. In one, open the profile menu → Account and try wrong current / mismatch / short / same-as-current (each rejected, nothing changed), then a valid change. A confirmation shows, this context stays signed in, and the other context is sent to login. Log out: the old password fails and the new one works.

### Tests for User Story 1

- [X] T020 [P] [US1] Create `src/app/admin/(dashboard)/account/actions.test.ts` (node env). Mock `@/lib/auth` (`getAuth` → fake `api.changePassword`, `api.getSession`, `$context` with `internalAdapter.findCredentialAccount` and `password.verify`), `@/lib/dal` (`requireAdminSession`, `getAuthRequestHeaders`), `@/lib/account` (`getPasswordChangedAt`) and `next/headers`, following the mocking style of existing action/route tests (e.g. `src/test/admin-session.ts`). Cases for `changePassword`, one per row of the contracts/account-actions.md table:
  - no session → `unauthorized`, `changePassword` not called
  - each validation key → that key, not called
  - `APIError` 429 → `blocked`
  - 400 `INVALID_PASSWORD` → `wrong_current`
  - 401 → `unauthorized`
  - 400 `PASSWORD_TOO_SHORT` → `too_short`
  - success → `status: "success"` with an ISO `passwordChangedAt` taken from `getPasswordChangedAt(userId)`, `revokeOtherSessions: true` was passed, and `changePassword` received the headers from `getAuthRequestHeaders()`. There is no `revalidatePath` call; assert `next/cache` is not imported.
- [X] T021 [US1] In the same file `src/app/admin/(dashboard)/account/actions.test.ts`, add the **saved-check** cases (FR-011). `changePassword` throws a plain `Error`, then:
  - `verify` → false ⇒ `error: "unavailable"`
  - `verify` → true and `getSession` → session ⇒ `status: "changed_others_remain"` + `passwordChangedAt`
  - `verify` → true and `getSession` → null ⇒ `status: "changed_signed_out"`
  - the `getSession` probe receives the **original raw** `headers()` value captured at the start of the action, not `getAuthRequestHeaders()`
  - `findCredentialAccount` throws ⇒ `status: "unconfirmed"`
  - plus a property-style assertion that `unavailable` is **never** returned when `verify` resolves true.
  - Also assert `logSecurityEvent` outcomes (`sessions_not_revoked`, `current_session_lost`, `password_change_unconfirmed`).
- [X] T022 [US1] In `src/app/admin/(dashboard)/account/actions.test.ts`, add the no-leak cases (FR-015, SC-005). Across **every** branch above, using two distinctive passwords (`"leak-check-current-A1"`, `"leak-check-new-B2"`):
  - `JSON.stringify(state)` contains neither
  - `vi.spyOn(console, "info" | "warn" | "error" | "log")` captured arguments (stringified) contain neither.
- [X] T023 [P] [US1] Create `src/components/admin/account/change-password-form.test.tsx` (jsdom). Mock the action.
  - The fields start empty and have the right `type`/`autoComplete` (`current-password`, `new-password` ×2).
  - A hidden `username` input carries the email.
  - Submit is disabled while pending. Clicking submit twice quickly calls the action **once** (spec edge case "Double submit").
  - On each result:
    - `success` → all fields cleared, `role="status"` success text, and `onPasswordChanged` called with the date
    - `wrong_current` → only the current field cleared and focused, with a `role="alert"` message
    - `unavailable` → values kept
    - `changed_others_remain` → fields cleared, status text, and an inline "Sign out other devices" button present
    - `changed_signed_out` → status text (including the advice to use Sign out other devices after logging in) plus a "Log in" link to `/admin/login?next=/admin/account`
    - `unconfirmed` → fields cleared, message shown
    - `unauthorized` → `router.replace` called with the login URL
  - `beforeunload` is registered only once a field is non-empty.

### Implementation for User Story 1

- [X] T024 [US1] Create `src/app/admin/(dashboard)/account/actions.ts` (`"use server"`) exporting `changePassword(prevState, formData)` and the `ChangePasswordState` type exactly as in contracts/account-actions.md.
  - Order of work:
    1. `const session = await requireAdminSession({ mode: "api" })`. If it is null, return `unauthorized`. Otherwise take `userId` and `email` from `session`, never from `formData`. Capture `const originalHeaders = await headers()` for the saved-check probe.
    2. `validateChangePassword` (T004).
    3. `auth.api.changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers: await getAuthRequestHeaders() })`.
    4. Map `isAPIError` by status/code.
    5. Any other error → the saved-check (contract §"Saved-check"):
       - look up the account with `(await auth.$context).internalAdapter.findCredentialAccount(userId)`
       - verify with `ctx.password.verify({ hash, password: newPassword })`
       - then probe with `auth.api.getSession({ headers: originalHeaders })`, deliberately using the old token.
  - On success paths:
    - read `passwordChangedAt` with `getPasswordChangedAt(userId)` from T009, falling back to `new Date()`. This works with no live session (analyze I2). In the saved-check use the `updatedAt` of the account already loaded.
    - `logSecurityEvent({ type: "password_changed", outcome })`.
    - **Do not call `revalidatePath`.** The session cookie write already makes Next re-render in the same response (research §13), and the client updates the date from the returned state.
  - On a saved-check "saved" result, also `clearKeys([passwordChangeKey(userId)])` (export the key helper from T006). The after-hook doesn't run its success branch on a thrown error.
  - `console.error` logs a fixed message plus `err.name` only.
  - The **user id always comes from the session**. Ignore any id or email in `formData`.
  - Make T020–T022 pass. Depends on T004, T006, T007, T009, T011.
- [X] T025 [P] [US1] Create `src/components/admin/account/account-summary.tsx` (server component): the "Signed in as" label and the email as read-only text, using `Card` from `src/components/ui/card.tsx`.
- [X] T026 [US1] Create `src/components/admin/account/change-password-form.tsx` (client) per contracts/profile-menu-ui.md §2:
  - `useActionState(changePassword, { status: "idle" })`
  - three **controlled** inputs starting at `""`, with labels and helper text from `accountCopy`
  - a visually hidden `<input type="email" name="username" autoComplete="username" value={email} readOnly>` for password managers; no `onPaste` blocking
  - client pre-check with `validateChangePassword` for instant messages (the server stays authoritative)
  - `useUnsavedChanges(dirty, accountCopy.unsavedPrompt)` from T013
  - result handling as in T023
  - an `onPasswordChanged(isoDate)` prop
  - For `changed_others_remain`, render a `SignOutOthersButton`. Until T033 lands, render a plain disabled placeholder button with the same label, which T033 replaces.
  - Make T023 pass. Depends on T003, T004, T013, T024.
- [X] T027 [US1] Create `src/app/admin/(dashboard)/account/page.tsx` (server):
  - `export const metadata = { title: accountCopy.pageTitle }`
  - `const session = await requireAdminSession()`
  - read `passwordChangedAt` with `getPasswordChangedAt(session.userId)` (T009), wrapped so a failure yields `null` and never throws
  - render a single column `max-w-xl` with `AccountSummary`, then a client wrapper `AccountPanels` (create `src/components/admin/account/account-panels.tsx`) holding `lastChangedAt` state, which renders `ChangePasswordForm` (passing `onPasswordChanged` to update the state).
  - Pass **no password data** to any client component. Depends on T025, T026.
- [X] T028 [US1] Create `e2e/admin-account-change-password.spec.ts` (one test, `test.step`s, in the serial `admin` project).
  - Setup and teardown: `beforeEach` → `clearThrottle()` (from `e2e/global-setup.ts`); `afterEach` → `restoreAdminPassword()`. Add `restoreAdminPassword()` to `e2e/helpers/account.ts`. It runs `npx tsx scripts/seed-admin.ts --reset` with the same env and the Windows `shell` flag that `e2e/global-setup.ts` uses, and the `E2E_ADMIN` credentials. This is test-only use and does not change the script.
  - Record every POST response body on the page with `page.on("response")`.
  - Steps:
    1. Log in context A and context B.
    2. In A, open the profile menu **by keyboard** (focus trigger, Enter, ArrowDown to "Account", Enter) → URL `/admin/account`, heading "Account".
    3. Wrong current → alert "Your current password is incorrect."
    4. Mismatch → "The new passwords don't match."
    5. 11 chars → "at least 12 characters".
    6. Same as current → "must be different".
    7. Valid change → the success status is visible and "Password last changed" is present. **Without reloading**, A is still on `/admin/account` and the "Account menu" trigger is visible. This proves the in-response re-render kept the session (I1, research §13). A then reloads and still sees `/admin/account`. B's `goto("/admin")` lands on `/admin/login`.
    8. In A, log out through the profile menu. Log in with the **old** password → the generic error. Log in with the **new** password → `/admin`.
    9. Assert that no recorded response body contains the old password, the new password, or the wrong-current value.
  - Depends on T019, T027.

**Checkpoint**: US1 works end to end and T020–T023 and T028 pass. **This is the MVP.** Password rotation from the panel is shippable without US2.

---

## Phase 4: User Story 2 — Password age and sign out other devices (Priority: P2)

**Goal**: The Account page shows when the password was last changed (including changes by the setup command), and offers "Sign out other devices" with a confirm step. Other sessions end; this one stays and the password is unchanged.

**Independent Test**: Log in on two contexts. In A, see "Password last changed", then choose Sign out other devices → confirm → a success status. B is sent to login, A stays, and the unchanged password still logs in.

### Tests for User Story 2

- [X] T029 [US2] In `src/app/admin/(dashboard)/account/actions.test.ts`, add the `signOutOtherDevices` cases:
  - no session → `unauthorized`, `revokeOtherSessions` not called
  - success → `status: "success"` and `logSecurityEvent({ type: "other_sessions_revoked" })`
  - it throws → `error: "unavailable"`
  - a `formData` carrying `userId`/`email` fields is ignored (`revokeOtherSessions` is called only with `headers`).
- [X] T030 [P] [US2] Create `src/components/admin/account/sign-out-others-card.test.tsx` (jsdom):
  - it renders "Password last changed" with `formatAdminDateTime` output, and "Unavailable" when the prop is null
  - the button opens an alert dialog; Cancel does not call the action; Confirm calls it
  - success shows a `role="status"` message
  - `unavailable` shows the retry message
  - updating the `lastChangedAt` prop updates the text (US2 sc.2).

### Implementation for User Story 2

- [X] T031 [US2] Add `signOutOtherDevices(prevState, formData)` and the `SignOutOthersState` type to `src/app/admin/(dashboard)/account/actions.ts`:
  - `requireAdminSession({ mode: "api" })`, then `auth.api.revokeOtherSessions({ headers: await getAuthRequestHeaders() })`, then log `other_sessions_revoked`
  - any error → `unavailable`
  - no lockout
  - Make T029 pass. Depends on T024.
- [X] T032 [P] [US2] Create `src/components/admin/account/sign-out-others-button.tsx` (client): a button plus an alert-dialog confirm, using `src/components/ui/alert-dialog.tsx` and following `src/components/admin/admin-delete-dialog.tsx`'s structure. It uses the dialog title and body from `accountCopy`, calls `signOutOtherDevices` through `useActionState`, and renders the result message (`role="status"`). It is shared by the card and by US1's `changed_others_remain` state. Depends on T031.
- [X] T033 [US2] Create `src/components/admin/account/sign-out-others-card.tsx` (client, `Card`). It renders `accountCopy.lastChangedLabel` + `formatAdminDateTime(new Date(lastChangedAt))` (from `src/lib/admin-datetime.ts`) or "Unavailable", followed by `SignOutOthersButton`. In `change-password-form.tsx`, replace T026's placeholder with `SignOutOthersButton`. Make T030 pass. Depends on T032.
- [X] T034 [US2] Render `SignOutOthersCard` in `src/components/admin/account/account-panels.tsx` below `ChangePasswordForm`, fed by the shared `lastChangedAt` state, so a password change updates it live without a reload (US2 sc.2). Depends on T033, T027.
- [X] T035 [US2] Create `e2e/admin-account-sign-out-others.spec.ts` (one test, `test.step`s):
  - `beforeEach` `clearThrottle()`
  - log in contexts A and B
  - A goes to `/admin/account` → the "Password last changed" text is visible and matches a date pattern
  - click "Sign out other devices" → the dialog → Cancel → B is still on `/admin` after `goto("/admin")`
  - repeat → Confirm → the success status is shown
  - B's `goto("/admin")` → `/admin/login`
  - A reloads → still `/admin/account`
  - log out A → log in with the **unchanged** `E2E_ADMIN.password` → `/admin`
  - no password change happens, so no restore is needed, but still call `restoreAdminPassword()` in `afterEach` for safety.
  - Depends on T034.

**Checkpoint**: US1 and US2 both work independently. T029, T030 and T035 pass.

---

## Phase 5: Polish & Cross-Cutting Concerns

- [X] T036 [P] Create `e2e/admin-account-protected.spec.ts` (FR-014, SC-004, acceptance "account routes reject unauthorized requests"):
  - (a) a fresh context with no session: `goto("/admin/account")` → URL `/admin/login?next=%2Fadmin%2Faccount`
  - (b) using `request` with **no** session: `POST /api/auth/change-password`, `/api/auth/revoke-other-sessions`, `/api/auth/update-user` and `/api/auth/change-email` (JSON bodies) each return **404**
  - (c) the same four with a **logged-in** context's cookies → still **404**, and the admin's password still works afterwards (log out, then log in with `E2E_ADMIN.password`).
- [X] T037 [P] Create `e2e/admin-account-layout.spec.ts` (FR-020, SC-007, acceptance "work at 375, 768, 1024 and 1440px"). For each width in `[375, 768, 1024, 1440]`:
  - log in (or reuse a storage state) and visit `/admin/account`
  - assert `document.documentElement.scrollWidth <= clientWidth`
  - assert the bounding boxes of the sidebar trigger, the profile trigger and the bell do not intersect, with the profile's `x` < the bell's `x`
  - open the profile menu → its popup box is fully inside the viewport
  - Escape closes it and focus returns to the trigger
  - reopen, click outside, and it closes
  - the three password fields and the two card buttons are fully visible (no clipping).
  - Keep it to one `test` looping the widths, to keep the suite small.
- [X] T038 [P] Add the account specs to the `quickstart.md` "Run the tests" block if the names differ, and add `/admin/account` to any admin route inventory in `docs/architecture.md` (only if such a list exists; smallest diff).
- [X] T039 Search with the **Grep tool** (or the Bash tool, not PowerShell) for `seed-admin|seed:admin` across `package.json`, `next.config.*`, `.github/`, `scripts/`, `src/` and `e2e/`. Confirm the setup command is referenced only by the `seed:admin` npm script, its own test, and e2e helpers. It must not be referenced by `build`, `postinstall`, `start`, `dev` or any startup code (FR-019, Constitution IV). Record the result in the PR description.
- [ ] T040 Full verification, **run one at a time**:
  1. `npx tsc --noEmit`
  2. `npm run lint`
  3. `npx vitest run`
  4. `npx playwright test --project=admin`
  5. then `npm run build`, separately, never concurrently with step 4.
  - Treat the known stale 001–003 E2E failures (project memory) as pre-existing. Report any other failure with its output.
- [ ] T041 Manual quickstart pass (`specs/010-admin-account/quickstart.md` "Manual checks"):
  - Chrome's password manager offers to save the new password
  - SC-001: time a change from opening the profile menu to seeing the confirmation (target: under 1 minute)
  - 5 wrong current passwords → blocked; log out and back in → still blocked; login still works
  - DevTools shows no password in any Server Action response.
  - Note the results in the PR description.

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (T001–T005)**: no dependencies; all [P].
- **Foundational (T006–T019)**: depends on Setup. It blocks both stories.
  - T006 → T007 → {T008, T009, T010}
  - T011 → T012. T012 is the regression gate for the 002 DAL change; nothing in Phase 3 starts until it passes.
  - T013 ∥ T014 → T015 → T016, T017 → T018 → T019
- **US1 (T020–T028)**: depends on Foundational.
- **US2 (T029–T035)**: depends on Foundational, **and on T024 + T027** (the shared actions file and the page and panels). It can start its tests (T029, T030) as soon as Foundational is done.
- **Polish (T036–T041)**: T036 and T037 need T027 (US1 page). T037's card-button assertion needs T034. T040 and T041 come last.

### User Story Dependencies

- **US1 (P1)**: independent once Foundational is done. This is the MVP.
- **US2 (P2)**: reuses US1's page and actions file. Its behaviour (sign out others, last changed) is independently testable, and US1 does not need US2. The one cross-link: US1's `changed_others_remain` state renders US2's `SignOutOthersButton` (T033 replaces T026's placeholder).

### Within Each Story

Tests (T020–T023, T029–T030) are written first and fail. Then come the action, then the components, then the page, then the E2E.

---

## Parallel Examples

```text
# Setup: all at once
T001 rate-limit.ts   T002 log.ts   T003 content/admin.ts   T004 validation/account.ts   T005 validation test

# Foundational: three lanes
Lane A: T006 → T007 → T008 | T009 | T010
Lane C: T011 → T012 (DAL change + regression gate; T012's Playwright run must not overlap any build)
Lane B: T013 | T014 → T015 → T016 | T017 → T018 → T019

# US1: tests in parallel, then implementation
T020 → T021 → T022 (same file) ∥ T023 ∥ T025
then T024 → T026 → T027 → T028

# US2
T029 | T030 → T031 → T032 → T033 → T034 → T035

# Polish
T036 | T037 | T038 → T039 → T040 → T041
```

---

## Implementation Strategy

### MVP First (User Story 1 only)

1. Phase 1 Setup → Phase 2 Foundational. The profile menu and Logout now work, and the raw routes are closed.
2. Phase 3 US1. **Stop and validate:** T028 passes, and the four rejection cases and the second-device sign-out behave.
3. Shippable: the admin can rotate their password without the setup script.

### Incremental Delivery

1. + US2 → last-changed date and a standalone "Sign out other devices" (T035).
2. Polish → protected and layout specs, setup-command wiring audit, full sequential verification.

### Carried forward

The wrong-role (third) access case for these actions is **not** a task here. Roles don't exist yet. It is an acceptance criterion in `docs/briefs/011-roles-and-users.md` ("Carried over from 010").

---

## Notes

- `[P]` = different files and no dependency on an incomplete task. T020–T022 and T029 share `actions.test.ts`, so only T020 is marked [P].
- The E2E suite for this feature is 4 new specs (T028, T035, T036, T037) plus 2 edited (T019).
- Commit after each checkpoint on `010-admin-account`. Don't push or merge unless asked (project memory).
