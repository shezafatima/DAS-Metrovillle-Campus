# Implementation Plan: Admin Account

**Branch**: `010-admin-account` | **Date**: 2026-09-28 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/010-admin-account/spec.md`

## Summary

The admin can change their own password, and sign out other devices, from a new
**Account** page. The page is reached through a **profile menu** in the admin top bar, which
replaces the sidebar-footer logout.

The work uses Better Auth's built-in features, as the user asked:
- `auth.api.changePassword` with `revokeOtherSessions: true`: verifies the current password, enforces the 12-character minimum, deletes every session, and gives this device a new session cookie.
- `auth.api.revokeOtherSessions`.

Both are called from Server Actions that follow the 002 login-form pattern.
The rules Better Auth doesn't cover (confirm matches, differs from current) live in a
shared zod schema.

The Account-page lockout is a **new Better Auth hook pair** modelled on 002's
`login-lockout.ts`. It reuses the `throttles` store under a separate
per-account key (`password-change:user:<id>`, 5 failures in 15 minutes, 15-minute block), so it
is independent of login and survives logout and re-login.

The raw Better Auth HTTP paths for password, session and user mutation are
closed with `disabledPaths`, so the Server Actions are the only way in.
"Password last changed" is the credential account's own `updatedAt`, which the
panel and the setup command both stamp. It is read by a session-free helper,
and no schema change is needed.

One change reaches into 002: `getAdminSession()` now builds the headers it
passes to Better Auth from `cookies()` (`getAuthRequestHeaders()`). The I1
spike (research §13) showed that, after a Server Action sets a cookie, Next
re-renders the page with a stale `headers()` cookie. Without this change the
layout would treat the admin as logged out right after a successful change.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19.2, Next.js 16.3 App Router
**Primary Dependencies**: better-auth 1.7 (`changePassword`, `revokeOtherSessions`, `$context.internalAdapter.findCredentialAccount`, hooks, `disabledPaths`), @base-ui/react 1.8 (`menu`, already installed), zod 4, lucide-react, shadcn/ui wrappers. **No new packages.**
**Storage**: MongoDB (Mongoose + Better Auth mongodb adapter). Existing collections `user`, `account`, `session`, `throttles`. No new collections or fields.
**Testing**: Vitest (unit + `describeWithDb` integration), Playwright (serial `admin` project)
**Target Platform**: Web. Admin panel at 375/768/1024/1440px.
**Project Type**: Single Next.js web app (`src/`)
**Performance Goals**: A password change completes in under 2 seconds on a normal connection. Most of that is the scrypt hash and verify. Menu open under 100ms.
**Constraints**:
- Passwords never appear in responses, state or logs.
- The setup command (`npm run seed:admin`) stays manual-only.
- No new dependencies (Constitution II).
- Tokens only (VII).
**Scale/Scope**: One admin account. About 12 source files touched or added, 4 E2E specs.

No NEEDS CLARIFICATION remains. Every item was resolved in [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Purpose & Fidelity | ✅ | Scope matches the spec; the admin panel has no das.edu.pk counterpart. |
| II. Fixed Stack | ✅ | Only Better Auth, Base UI (already a dependency), zod and Mongoose. Nothing added. |
| III. Roles & Access | ✅ with note | Checked on the server in every action and on the page (`requireAdminSession`). Roles (main admin / content manager) **do not exist in code yet**, and the spec rules them out of scope. The account actions are **self-scoped**: the target account always comes from the session, and there is no user-id input. So every future role may change only its own password, and no "other account" request can be made. This also gives the future "temporary password must be changed at first login" rule a mechanism to reuse. |
| IV. Security | ✅ | Hashing is Better Auth's scrypt. The setup command is untouched and manual. The lockout reuses 002. Raw HTTP mutation paths are closed (research §4). Server Actions carry Next's origin check. |
| V. Personal Data | N/A | No uploads or personal records. |
| VI. Data Integrity | ✅ | One zod schema is shared by the client and the server action. No new records, and no deletes beyond session revocation, which is intended. |
| VII. Design System | ✅ | Existing admin tokens and shadcn wrappers only. The profile trigger uses `bg-primary`/`text-primary-foreground`. |
| VIII. Content | ✅ | All copy is in `src/content/admin.ts` (`accountCopy`). |
| IX. Components | ✅ | Server page composes `AccountSummary`, `ChangePasswordForm` and `SignOutOthersCard`. Client code is used only for interaction. `use-unsaved-changes` is moved and reused, not duplicated. The `dropdown-menu` primitive is built once. |
| X. Extensibility | ✅ | No speculative features. Self-scoped actions work unchanged once roles arrive. |
| XI. Testing & DoD | ✅ with note | One E2E per user story, plus the protected-access and layout specs. Four widths covered. The three-case access matrix becomes **no session** (tested) and **correct session** (tested). The **wrong-role** case can't be expressed until roles exist: the actions accept no target, so there is nothing to scope. The protected spec also asserts that raw HTTP mutation paths return 404. The wrong-role case is recorded as an acceptance criterion in [`docs/briefs/011-roles-and-users.md`](../../docs/briefs/011-roles-and-users.md) ("Carried over from 010"), so 011 cannot finish without it. |

**Gate result: PASS.** The two notes are the principles' own conditions: roles aren't built yet, and the actions are self-scoped. They are not waivers.

## Project Structure

### Documentation (this feature)

```text
specs/010-admin-account/
├── plan.md                     # this file
├── research.md                 # Phase 0: verified Better Auth behaviour + decisions
├── data-model.md               # Phase 1: reused entities, throttle key, state machine
├── quickstart.md               # Phase 1: try it / recovery / test commands
├── contracts/
│   ├── account-actions.md      # Server Actions, state types, error map, auth config
│   └── profile-menu-ui.md      # Top bar, profile menu, Account page UI contract
├── checklists/requirements.md  # spec quality (from /sp.specify)
└── tasks.md                    # Phase 2: /sp.tasks (not created here)
```

### Source Code (repository root)

```text
src/
├── app/admin/(dashboard)/account/
│   ├── page.tsx                      # NEW  server page (requireAdminSession, last-changed read)
│   ├── actions.ts                    # NEW  changePassword, signOutOtherDevices
│   └── actions.test.ts               # NEW  branch map, no-password-in-state/log
├── components/
│   ├── ui/dropdown-menu.tsx          # NEW  wraps @base-ui/react/menu
│   └── admin/
│       ├── profile-menu.tsx          # NEW  initial trigger + email/Account/Logout
│       ├── profile-menu.test.tsx     # NEW  keyboard, Escape, close-on-select
│       ├── account/
│       │   ├── account-summary.tsx       # NEW
│       │   ├── change-password-form.tsx  # NEW  (+ .test.tsx)
│       │   └── sign-out-others-card.tsx  # NEW  (+ .test.tsx)
│       ├── use-unsaved-changes.ts    # MOVED from admin/news/, + prompt param, + [data-leaves-page]
│       ├── admin-top-bar.tsx         # EDIT  email prop, ProfileMenu left of bell, extra titles
│       ├── admin-shell.tsx           # EDIT  pass email to top bar, not sidebar
│       ├── app-sidebar.tsx           # EDIT  drop footer + email prop (+ test update)
│       ├── admin-sidebar-footer.tsx  # DELETE
│       └── news/news-editor.tsx      # EDIT  import path only
├── content/admin.ts                  # EDIT  accountCopy, adminExtraPageTitles
├── lib/
│   ├── dal.ts                        # EDIT (002)  getAuthRequestHeaders(); getAdminSession uses it (+ dal.test.ts)
│   ├── account.ts                    # NEW  getPasswordChangedAt(userId), session-free, returns Date only
│   ├── auth.ts                       # EDIT  disabledPaths, composed hooks
│   ├── password-change-lockout.ts    # NEW  before/after hooks (+ .test.ts, DB-backed)
│   ├── rate-limit.ts                 # EDIT  PASSWORD_CHANGE_POLICY
│   ├── log.ts                        # EDIT  5 new event types
│   └── validation/account.ts         # NEW  shared zod schema (+ .test.ts)
e2e/
├── helpers/account.ts                # NEW  restoreAdminPassword(), openProfileMenu()
├── admin-account-change-password.spec.ts   # NEW  US1 journey
├── admin-account-sign-out-others.spec.ts   # NEW  US2 journey
├── admin-account-protected.spec.ts         # NEW  unauthorized + 404 raw paths
├── admin-account-layout.spec.ts            # NEW  4 widths, menu keyboard/close
├── admin-login-logout.spec.ts              # EDIT  logout via profile menu
└── admin-layout.spec.ts                    # EDIT  email/Logout now in the profile menu
```

**Structure Decision**: This is the existing single Next.js app layout. The Account page
sits under the `(dashboard)` route group, so it inherits the admin shell and the
session gate. The setup command (`npm run seed:admin`, `scripts/seed-admin.ts`)
is **not edited** (research §5).

## Key Decisions

1. **Built-in `changePassword` with `revokeOtherSessions: true`**, rather than custom hashing (research §1). This device keeps a new session through `nextCookies()`. Partial failures are detected by a saved-check and reported as what actually happened.
2. **The lockout is a separate Better Auth hook pair, keyed per account** (research §3). It reuses `rate-limit.ts` primitives and adds a new policy constant.
3. **Raw Better Auth mutation paths are closed with `disabledPaths`** (research §4). Server Actions become the single entry point, which also enforces the out-of-scope ban on email and name editing.
4. **Last-changed = credential `account.updatedAt`**, read by the session-free `getPasswordChangedAt(userId)` (research §5). No schema change and no setup-command edit.
5. **The profile menu uses Base UI Menu, not the 009 Popover** (research §8). This refines ADR-0002: Popover is for panels, Menu is for action lists.
6. **Controlled password inputs**, a deviation from the uncontrolled login form, so values stay on screen after `unavailable` without ever being sent back from the server (research §6).
7. **The session read uses `cookies()`, not the raw cookie header** (research §13, spike-verified). This is a small change to 002's `getAdminSession()`, made through `getAuthRequestHeaders()`. There is no `revalidatePath` in the account actions: the cookie write already triggers the re-render.

## Risks

1. **Password-change writes are not atomic.** `updateAccount` → `deleteUserSessions` → `createSession` are separate writes.
   - Mitigation: after any unexpected error, the action runs a saved-check. It verifies the new password against the stored hash, then checks this device's session.
   - It reports the truth: not saved (`unavailable`); saved but other devices remain (`changed_others_remain`, with Sign out other devices offered inline); saved but this device was signed out (`changed_signed_out`); or unknown (`unconfirmed`).
   - It never says "couldn't save" when the password did save (spec FR-011, contracts/account-actions.md).
   - Residual: `unconfirmed` happens only when the database is still down at check time.
2. **E2E password changes can leak into other admin specs.**
   - Guardrail: every account spec restores the password in `afterEach` (setup command `--reset`, test-only) and clears throttles in `beforeEach`. The `admin` project stays serial.
3. **Base UI Menu vs. the unsaved-changes click capture.**
   - If Base UI activates items on `pointerup` rather than `click`, the `[data-leaves-page]` guard might not intercept Logout.
   - Guardrail: a unit test in `profile-menu.test.tsx` asserts that confirm is shown and that cancelling it keeps the session. The fallback is an explicit `onClick` check inside the Logout item.
4. **Changing 002's session reader affects every admin page and route.** `getAdminSession()` now rebuilds the cookie header from `cookies()`.
   - Blast radius: all of `/admin` and `/api/admin/*`.
   - Why it's safe: on an ordinary request `cookies()` is parsed from the same header, so the session is identical. It differs only inside an action's re-render (spike, research §13).
   - Guardrails:
     - a unit test for `getAuthRequestHeaders` (cookie rebuilt, other headers such as `x-forwarded-for` kept, header dropped when empty)
     - the full existing admin route suite and the admin E2E project must pass unchanged before US1 work starts (T012)
     - US1's E2E proves the device stays signed in after a change
   - Rollback: revert the one function.

## Complexity Tracking

No constitution violations to justify.
