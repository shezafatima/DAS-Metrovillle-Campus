---
description: "Task list for 011 Roles & Users"
---

# Tasks: Roles & Users

**Input**: Design documents from `specs/011-roles-and-users/`: plan.md, spec.md, research.md, data-model.md, quickstart.md, and contracts/ (access-matrix, dal-access, user-actions, users-ui).
**Prerequisites**: plan.md, spec.md, and the 010 working tree already on this branch.

**Tests**: These are required. The spec's Acceptance, SC-003 to SC-009 and Constitution XI call for three-case access tests on every admin entry point, E2E for every story, and layout checks at 4 widths.
- Vitest DB suites use `describeWithDb` (`src/test/db.ts`), plus real sessions from `src/test/admin-session.ts`.
- E2E specs join the serial `admin` Playwright project.
- Start the dev server before running Playwright, and never run `npm run build` at the same time.

**Organization**: Phase 2 (foundation, then migrating every existing entry point) blocks everything. Then each user story is its own phase, in spec priority order. The order within P1 is **US2 before US1**: a created account is unusable until first-login works, and US1's E2E ends with the first login.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: US1–US6 from spec.md

---

## Phase 1: Setup

**Purpose**: Shared types and copy that every later task imports. There are no new packages (plan: Constitution II).

- [X] T001 [P] Create `src/lib/permissions.ts` per contracts/dal-access.md:
  - `PERMISSION_KEYS = ["news","messages","careers","settings","pages"] as const`, plus the `Permission`, `Role` (`"main_admin" | "content_manager"`) and `Access` (`Permission | "main_admin" | "any"`) types;
  - `isPermission(value)`;
  - `normalizePermissions(values)`, which drops unknown keys and duplicates and sorts in `PERMISSION_KEYS` order;
  - pure `canAccess(user, access)`: main_admin → true for all; content_manager → `access === "any"` or `permissions.includes(access)`, never `"main_admin"`;
  - `PERMISSION_LABELS` (News, Messages, Careers, Settings, Page content).
  
  It has no server imports, so client components can use it.
- [X] T002 [P] Write `src/lib/permissions.test.ts`:
  - `canAccess` for both roles × every `Access` value;
  - a content manager holding all 5 keys still fails `"main_admin"`;
  - `normalizePermissions` drops `"main_admin"`, `"users"`, `"registrations"` and unknown keys, and removes duplicates.
- [X] T003 [P] Add all 011 UI copy to `src/content/admin.ts`:
  - the denied notice ("You don't have access to that section.");
  - the no-grants note;
  - Users page labels, status labels, dialog labels and helper text;
  - the temporary-password panel text;
  - user-action error copy keyed by the contracts/user-actions.md keys (`email_taken`, `self`, `last_main_admin`, `not_found`, `forbidden`, `invalid`, `unavailable`);
  - set-password heading, intro and errors (`same_as_current` → "must be different from your temporary password", `expired`);
  - the login `temp_expired` copy;
  - change-record column labels.
  
  Do not change `adminNavItems` yet (T055).

---

## Phase 2: Foundational (blocking prerequisites)

**Purpose**: One access check (research §1), role storage (§2), the login gate (§5), and migrating **every** existing entry point. No story can start until this phase is done.

### 2a. Auth storage and login gate

- [X] T004 Edit `src/lib/auth.ts`:
  - add `user.additionalFields`, all `input: false`: `role` (string, default `"content_manager"`), `permissions` (`string[]`, default `[]`), `mustChangePassword` (boolean, default `false`), `tempPasswordIssuedAt`, `disabledAt`, `deletedAt`, `lastLoginAt` (date, `required: false`);
  - add a comment above `session` saying `cookieCache` MUST stay disabled, because grants must be read fresh on every request (research §2, FR-007);
  - export `TEMP_PASSWORD_TTL_MS = 7 * 24 * 60 * 60 * 1000`.
- [X] T005 Write the spike test first (research §5) in `src/lib/login-gate.test.ts` (`describeWithDb`). It must fail until T006.
  - Seed a user with the right password and `disabledAt` set. `auth.api.signInEmail` throws an `APIError` with `statusCode === 401` and the same `body.code` as a wrong-password attempt, and no `session` row exists for that user afterwards.
  - Same for `deletedAt`.
  - `mustChangePassword: true` with `tempPasswordIssuedAt` 8 days ago gives a 401 with code `TEMP_PASSWORD_EXPIRED` and no session.
  - 6 days ago succeeds.
  - A wrong password for a disabled user still gives the generic 401.
  - The auth instance config has `session.cookieCache?.enabled !== true`.
- [X] T006 Create `src/lib/login-gate.ts`, exporting a `sessionCreateBefore(session, ctx)` hook. It loads the user by `session.userId` through `ctx.context.internalAdapter.findUserById`, then:
  - if `disabledAt` or `deletedAt` is set, throws `new APIError("UNAUTHORIZED", { message: "Invalid email or password", code: "INVALID_EMAIL_OR_PASSWORD" })`, copying the exact code Better Auth uses for a bad password;
  - if `mustChangePassword` is set and `tempPasswordIssuedAt + TEMP_PASSWORD_TTL_MS < now`, throws `APIError("UNAUTHORIZED", { code: "TEMP_PASSWORD_EXPIRED" })` and logs `temp_password_expired`.
  
  Wire it into `src/lib/auth.ts` as `databaseHooks: { session: { create: { before: sessionCreateBefore } } }`. If T005 still fails, use the research §5 fallback in `hooks.after` for `/sign-in/email`: delete `ctx.context.newSession.session` and return the same APIError. Record which one was used in a comment.
- [X] T007 Edit the `ctx.context.newSession` success branch of `loginLockoutAfter` in `src/lib/login-lockout.ts` so it also calls `ctx.context.internalAdapter.updateUser(newSession.user.id, { lastLoginAt: new Date() })`. Wrap it in try/catch so a failure never fails the login. Add a case to `src/lib/login-lockout.test.ts` asserting `lastLoginAt` is set after a successful sign-in, and unchanged after a failure.
- [X] T008 [P] Edit `src/lib/log.ts`:
  - add the event types `access_denied`, `user_created`, `user_access_changed`, `user_disabled`, `user_enabled`, `user_deleted`, `temp_password_issued`, `first_password_set`, `temp_password_expired`;
  - add optional `target?: string` and `access?: string` fields to `SecurityEvent`, and emit them as `target` and `access` (null when absent);
  - update the header comment.
  
  There must still be no field that could hold a password or token.
- [X] T009 [P] Edit `src/lib/route-errors.ts`: add `forbiddenResponse(reason: "forbidden" | "password_change_required" = "forbidden")` (403, `{ error: reason }`, `NO_STORE`) and `accessErrorResponse(reason: AccessDenial)` (401 for `unauthorized`, otherwise `forbiddenResponse(reason)`). Import the `AccessDenial` type from `@/lib/dal` as a type-only import.

### 2b. The one access check (DAL)

- [X] T010 Write the new cases in `src/lib/dal.test.ts` first (mocking `getAuth`, as the file already does).
  - `getAdminSession` maps `role`, `permissions` (through `normalizePermissions`) and `mustChangePassword`, and returns `null` when `disabledAt` or `deletedAt` is set.
  - A missing `role` maps to `content_manager`.
  - `decideAccess` table: `null` → unauthorized; pending → password_change_required, for every access including `"any"`; a content manager without the key → forbidden; with the key → null; a main admin → null for all.
  - `requireAdminPage` redirects to `/admin/login?next=…`, `/admin/set-password` and `/admin?denied=1` for the three denials.
  - `requireAdminAccess` returns `{ ok: false, reason }` without redirecting, and logs `access_denied` for forbidden and password_change_required but not for unauthorized.
  - Remove the old `requireAdminSession` tests.
- [X] T011 Rewrite `src/lib/dal.ts` per contracts/dal-access.md:
  - extend the `AdminSession` type (`role`, `permissions`, `mustChangePassword`), and make `getAdminSession()` return null for disabled or deleted accounts;
  - add `export type AccessDenial`, and a pure `decideAccess(session, access)`;
  - add `requireAdminPage(access): Promise<AdminSession>`, which redirects and keeps the existing `x-pathname` / `safeAdminReturnPath` handling for the login redirect;
  - add `requireAdminAccess(access)`, which logs `access_denied` with `email`, `access` and the `x-pathname` path;
  - **delete `requireAdminSession`**, so every old call fails to compile until it's migrated;
  - keep `getAuthRequestHeaders` unchanged.
- [X] T012 Edit `src/test/admin-session.ts`: `seedTestAdmin(email, password, opts?: { role?, permissions?, mustChangePassword?, tempPasswordIssuedAt?, disabledAt?, deletedAt? })`. The default role is `main_admin`, so existing route tests keep their meaning. Pass the fields to `internalAdapter.createUser`. If the user exists, `updateUser` it with `opts`, so one email can be re-used with new grants. Add `seedTestContentManager(email, password, permissions)` as a thin wrapper.
- [X] T013 Edit `scripts/seed-admin.ts` (research §13):
  - on create, pass `role: "main_admin"`;
  - on "already exists" without `--reset`, set `role: "main_admin"` if it's different, and print `Admin role confirmed: <email>` (or keep the old line if it was already main_admin);
  - `--reset` also sets `role: "main_admin"`, `mustChangePassword: false`, `tempPasswordIssuedAt: null`, `disabledAt: null`, `deletedAt: null`.
  
  Update `scripts/seed-admin.test.ts` for the new line and for the recovery of a disabled or deleted main admin. Update `specs/002-foundation/contracts/seed-admin-cli.md` with the new stdout line. Do **not** wire the seed anywhere automatic (Constitution IV).

### 2c. Migrate every existing entry point (contracts/access-matrix.md)

All of T014–T022 depend on T011. Each **[P]** task touches a different file set. Each route task also extends that route's existing `route.test.ts` with the **wrong-permission** case, using `seedTestContentManager` with every key except the required one. It asserts `403 { error: "forbidden" }` and no data. It also asserts the correct case with a content manager holding **only** the required key. This covers US6 acceptance 1.

- [X] T014 [P] News routes → `requireAdminAccess("news")` plus `accessErrorResponse`:
  - `src/app/api/admin/news/route.ts` (POST)
  - `src/app/api/admin/news/[id]/route.ts` (GET, PUT, DELETE)
  - `src/app/api/admin/news/[id]/publish/route.ts`
  - `src/app/api/admin/news/[id]/unpublish/route.ts`
  - `src/app/api/admin/uploads/sign/route.ts`
  
  Extend their `route.test.ts` files, and create `src/app/api/admin/uploads/sign/route.test.ts` if it's missing.
- [X] T015 [P] Messages routes → `requireAdminAccess("messages")`:
  - `src/app/api/admin/messages/[id]/route.ts` (PATCH, DELETE)
  - `src/app/api/admin/messages/[id]/read/route.ts`
  
  Extend their tests.
- [X] T016 [P] Signups routes → `requireAdminAccess("careers")` (Clarification 2):
  - `src/app/api/admin/signups/[id]/route.ts`
  - `src/app/api/admin/signups/opened/route.ts`
  - `src/app/api/admin/signups/export/route.ts`
  
  Extend their tests. For export, the wrong-permission case must return no CSV body.
- [X] T017 [P] `src/app/api/admin/session/route.ts` → `requireAdminAccess("any")`. Test: a content manager with no grants gets 200; a pending user gets `403 password_change_required`.
- [X] T018 [P] News pages → `requireAdminPage("news")`:
  - `src/app/admin/(dashboard)/news/page.tsx`
  - `src/app/admin/(dashboard)/news/new/page.tsx`
  - `src/app/admin/(dashboard)/news/[id]/page.tsx`
- [X] T019 [P] Messages pages → `requireAdminPage("messages")`:
  - `src/app/admin/(dashboard)/messages/page.tsx`
  - `src/app/admin/(dashboard)/messages/[id]/page.tsx`
- [X] T020 [P] Other section pages:
  - `src/app/admin/(dashboard)/signups/page.tsx` → `requireAdminPage("careers")`
  - `src/app/admin/(dashboard)/settings/page.tsx` → `"settings"`
  - `src/app/admin/(dashboard)/design-system/page.tsx` → `"main_admin"`
  - `src/app/admin/(dashboard)/account/page.tsx` → `"any"`
- [X] T021 Account actions in `src/app/admin/(dashboard)/account/actions.ts`: `changePassword` and `signOutOtherDevices` → `requireAdminAccess("any")`. Map `!ok` to `{ status: "error", error: access.reason === "unauthorized" ? "unauthorized" : "forbidden" }`, and add `"forbidden"` to both state unions. Update `account/actions.test.ts` so a pending-password user is refused.
- [X] T022 Overview, layout, notifications and login-page callers. These are only compile-level changes here; the permission filtering is US3.
  - `src/app/admin/(dashboard)/page.tsx` → `requireAdminPage("any")`
  - `src/app/admin/(dashboard)/layout.tsx` → `requireAdminPage("any")`
  - `src/app/api/admin/notifications/route.ts` and `notifications/read/route.ts` → `requireAdminAccess("any")` plus `accessErrorResponse`
  - `src/app/admin/login/page.tsx`: keep `getAdminSession()`, but send a signed-in pending user to `/admin/set-password` instead of `/admin`.
- [X] T023 Create `src/test/access-inventory.test.ts` (node environment, no DB):
  - Glob `src/app/admin/**/page.tsx`, `src/app/api/admin/**/route.ts` and every `src/app/admin/**/actions.ts`.
  - Hold the contracts/access-matrix.md table as a typed `EXPECTED` map from path to access (or `"public"` for `login`, `"pending_self"` for `set-password`, and `"none"` for the dashboard `actions.ts` logout).
  - Assert that every file on disk is in `EXPECTED` and every entry exists on disk.
  - Assert that each file's source contains `requireAdminPage("<access>")` or `requireAdminAccess("<access>")` for its expected access, one per exported handler or action.
  - Assert that no file under `src/` contains `requireAdminSession`.
  - Write the entries for the not-yet-created `users`, `users/activity` and `set-password` files now. The test is expected to fail until US1, US2 and US5 add them. Mark those three with `it.todo` until then, so the suite stays green.
- [ ] T024 Checkpoint:
  1. Run `npx tsc --noEmit`; there must be zero references to `requireAdminSession`.
  2. Run `npm test`.
  3. Run the existing admin E2E suite. Compare it against the known baseline (memory: about 35 pre-existing failures) and confirm no **new** failures. The seeded E2E admin must be `main_admin`: update `e2e/global-setup.ts` to seed with `role: "main_admin"`.

**Checkpoint**: Every existing entry point is gated by one check. A main admin behaves exactly as before.

---

## Phase 3: User Story 2 - First login forces a new password (Priority: P1)

**Goal**: A user with a temporary password can do nothing except set a new password (FR-014 to FR-018).

**Independent Test**: Seed a pending content manager directly with `seedTestAdmin(..., { mustChangePassword: true, tempPasswordIssuedAt: now })`.
- Logging in lands on `/admin/set-password`.
- `/admin/news` redirects back there, and `GET /api/admin/session` gives 403.
- Setting a valid password lands on `/admin`.
- An 8-day-old temporary password is refused at login with the expired message.

### Tests (write first)

- [X] T025 [P] [US2] Write `src/lib/validation/account.test.ts` additions for `validateSetPassword`: `too_short` (11 characters), `too_long` (129), `mismatch`, a valid 12 and 128, no trimming, and `invalid` for non-strings.
- [X] T026 [P] [US2] Write `src/app/admin/set-password/actions.test.ts` (`describeWithDb`, real session cookie through mocked `next/headers`, following `account/actions.test.ts`):
  - no session → `unauthorized`;
  - an active user → redirect to `/admin` with no change;
  - same as the temporary password → `same_as_current`, with the password unchanged;
  - an expired temporary password → `expired`;
  - success → the password verifies against the new value; `mustChangePassword` is false and `tempPasswordIssuedAt` null; another session of the same user is gone and the current one survives; one `UserChange` `first_password_set` (actor = target = self); a `first_password_set` log line containing neither password.
  
  Also a crafted `email` or `userId` form field is ignored.
- [X] T027 [P] [US2] Extend `src/app/admin/login/actions.test.ts`: an expired temporary password returns `{ error: "temp_expired" }`; a disabled account with the right password returns `generic`; a pending user's successful login redirects to `/admin/set-password`, whatever `next` is.

### Implementation

- [X] T028 [US2] Create `src/models/user-change.ts` per data-model.md:
  - a Mongoose schema with `at` (required, default `Date.now`), `actorId`, `actorEmail`, `targetId`, `targetEmail`, `type` (enum of the 8 types) and `details` (Mixed, default `{}`);
  - collection `userChanges`, index `{ at: -1 }`, `timestamps: false`, no soft-delete plugin;
  - the same `mongoose.models` guard as `src/models/admin-notification-state.ts`;
  - export `UserChangeType`.
  
  It is needed here for `first_password_set` and reused by US1, US4 and US5.
- [X] T029 [US2] Add `recordUserChange(entry)` in a new `src/lib/users/mutations.ts`. It calls `connectDb()` and `UserChange.create`. On error it does `console.error` with the error name only, and never throws (research §9).
- [X] T030 [US2] Add `validateSetPassword(input)` to `src/lib/validation/account.ts`. It reuses `PASSWORD_MIN_LENGTH` and `PASSWORD_MAX_LENGTH` and returns `"invalid" | "too_short" | "too_long" | "mismatch" | null`. Export `SetPasswordErrorKey`, which also includes `same_as_current`, `expired` and `unauthorized`.
- [X] T031 [US2] Add `setInitialPassword({ userId, email, newPassword, requestHeaders })` to `src/lib/users/mutations.ts`:
  - re-read the user, and refuse `expired` if `tempPasswordIssuedAt + TEMP_PASSWORD_TTL_MS < now`;
  - get the credential account, and return `same_as_current` if `ctx.password.verify` matches;
  - `ctx.password.hash`, then `internalAdapter.updatePassword`, then `internalAdapter.updateUser({ mustChangePassword: false, tempPasswordIssuedAt: null })`;
  - `auth.api.revokeOtherSessions({ headers: requestHeaders })`;
  - `recordUserChange` `first_password_set`, and `logSecurityEvent({ type: "first_password_set", email })`.
- [X] T032 [US2] Create `src/app/admin/set-password/actions.ts` (`"use server"`), with `setInitialPassword(prev, formData)` per contracts/user-actions.md:
  - `getAdminSession()`; null → `unauthorized`; not pending → `redirect("/admin")`;
  - `validateSetPassword`, then the mutation with `getAuthRequestHeaders()`, then `redirect("/admin")` on success;
  - read only `newPassword` and `confirmPassword`.
- [X] T033 [US2] Create `src/app/admin/set-password/page.tsx` plus a client form component, `src/components/admin/set-password-form.tsx`, per contracts/users-ui.md:
  - the page does its own checks: no session → login; not pending → `/admin`;
  - use the `/admin/login` card layout (no dashboard shell), with `useActionState`;
  - fields `newPassword` and `confirmPassword` with `autocomplete="new-password"`, paste allowed, never re-filled after submit;
  - a Log out control using the existing `logout` action;
  - copy from `src/content/admin.ts`.
- [X] T034 [US2] Edit `src/app/admin/login/actions.ts`:
  - map a 401 with `body.code === "TEMP_PASSWORD_EXPIRED"` to `{ error: "temp_expired" }`, and extend the `LoginActionState["error"]` union;
  - after a successful `signInEmail`, read the returned user (`asResponse: false` gives `{ user }`), and if `user.mustChangePassword`, redirect to `/admin/set-password`;
  - show the `temp_expired` copy in the login form component that renders `error`.
- [X] T035 [US2] Remove the `it.todo` for `set-password` in `src/test/access-inventory.test.ts`, and check it expects `pending_self`: the action and page use `getAdminSession` plus a pending check, not `requireAdminAccess`, so assert `getAdminSession` and `mustChangePassword` appear in the source.
- [X] T036 [US2] Write E2E `e2e/admin-roles-first-login.spec.ts`, seeding pending users through a new `e2e/helpers/users.ts` (`seedUser({ email, password, role, permissions, mustChangePassword, tempPasswordIssuedAt })` over the test DB, `loginAs(page, email, password)`):
  - login leads to Set your password;
  - `/admin/news` and `/admin` redirect back there;
  - under 12 characters shows the 010 message;
  - same as the temporary password shows its message;
  - success lands on the overview;
  - the temporary password no longer logs in;
  - an 8-day-old temporary password shows the expired message;
  - Log out from the page works.

**Checkpoint**: A pending account is fully contained. US1 can now create real ones.

---

## Phase 4: User Story 1 - Main admin creates a content manager (Priority: P1) 🎯 MVP

**Goal**: A Users page (main admin only), create with grants, and a temporary password shown once with Copy (FR-019 to FR-021).

**Independent Test**:
- As the main admin, create `cm@…` with News. The panel shows the password once and Copy works.
- Reload: the password is gone and the row shows "Awaiting first login".
- A duplicate email in different case is refused.
- A content manager opening `/admin/users` is redirected with the denied notice.

### Tests (write first)

- [X] T037 [P] [US1] Write `src/lib/temp-password.test.ts`: length 20; only the 54-character alphabet (no `0 O 1 l I`); 1,000 generations are all unique; uses `crypto.randomInt` (spy).
- [X] T038 [P] [US1] Write `src/lib/validation/users.test.ts`:
  - `createUserSchema` trims and lowercases the email, rejects bad or over-254-character emails, defaults the role to `content_manager`, and rejects `permissions` containing `main_admin`, `users` or `registrations`;
  - `updateUserAccessSchema` requires `targetId`;
  - `targetSchema`.
- [X] T039 [P] [US1] Write the `createUser` cases in `src/lib/users/mutations.test.ts` (`describeWithDb`):
  - creates the user with role, grants, `mustChangePassword` and `tempPasswordIssuedAt`, plus a credential account whose hash verifies the returned temporary password;
  - a duplicate (`Ayesha@School.PK` versus an existing `ayesha@school.pk`) → `email_taken`;
  - a concurrent double-create of the same new email → exactly one success and one `email_taken`;
  - restoring a soft-deleted email gives the same `_id`, `deletedAt` null, the **new** role and grants only, the old password no longer verifying, and zero sessions;
  - one `created` change with `details.restored`;
  - no log line or `UserChange` document contains the temporary password (serialize and search).
- [X] T040 [P] [US1] Write `src/app/admin/(dashboard)/users/actions.test.ts` → the `createUser` action, three cases:
  - no session → `unauthorized`;
  - a content manager with all 5 grants → `forbidden`, with no user created;
  - a main admin → `success` with `temporaryPassword`.
  
  Also a pending main admin → `password_change_required`, and a crafted `role=main_admin` from a content manager is still refused.

### Implementation

- [X] T041 [P] [US1] Create `src/lib/temp-password.ts`: `generateTemporaryPassword(length = 20)` using `crypto.randomInt` over `ABCDEFGHJKMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789` (confirm it's exactly 54 characters with no `0 O 1 l I`, and adjust the test if not). No logging.
- [X] T042 [P] [US1] Create `src/lib/validation/users.ts` per data-model.md: `createUserSchema`, `updateUserAccessSchema` and `targetSchema`, using zod 4, `PERMISSION_KEYS` from `@/lib/permissions`, and `formData.getAll("permissions")` parsing helpers. Export the `UserActionErrorKey` union from contracts/user-actions.md.
- [X] T043 [US1] Add `createOrRestoreUser({ actor, email, role, permissions })` to `src/lib/users/mutations.ts` (research §14):
  - `findUserByEmail`: if it isn't deleted → `email_taken`; if it's deleted → restore in place (`updateUser` role, permissions, `deletedAt: null`, `disabledAt: null`, `mustChangePassword: true`, `tempPasswordIssuedAt: now`), then `updatePassword`, then `deleteUserSessions`;
  - otherwise `createUser` and `linkAccount` (as `scripts/seed-admin.ts` does), mapping a duplicate-key error (11000) → `email_taken`;
  - `recordUserChange` `created` `{ role, permissions, restored }`, and log `user_created` (actor email, `target`);
  - return `{ ok: true, email, temporaryPassword }`.
- [X] T044 [US1] Create `src/lib/users/queries.ts`:
  - `listUsers()` reads the Better Auth `user` collection through `mongoose.connection.db.collection("user")`, projecting only the data-model fields, excluding `deletedAt ≠ null`, sorted by email;
  - it maps `status` with the derived rule from data-model.md, in a pure `deriveUserStatus(user, now)` that is exported and unit-tested in `src/lib/users/queries.test.ts`;
  - `countActiveMainAdmins()`.
- [X] T045 [US1] Create `src/app/admin/(dashboard)/users/actions.ts` (`"use server"`) with `createUser(prev, formData)`:
  - `requireAdminAccess("main_admin")`, parse with `createUserSchema`, call `createOrRestoreUser`, then `revalidatePath("/admin/users")`;
  - return per contracts/user-actions.md, with no Better Auth error text.
- [X] T046 [P] [US1] Create `src/components/admin/users/temp-password-panel.tsx`:
  - the email, and the password in a read-only monospace input;
  - a Copy button (`navigator.clipboard.writeText`, and a polite `aria-live` "Copied");
  - the shown-once warning;
  - Done calls `onDone`, which clears the state.
  
  Add a component test at `src/components/admin/users/temp-password-panel.test.tsx` (copy called with the value; live region text).
- [X] T047 [P] [US1] Create `src/components/admin/users/user-access-dialog.tsx`, a shadcn Dialog used for both create and edit:
  - an email input (create only);
  - a role radio;
  - one checkbox per `PERMISSION_KEYS` using `PERMISSION_LABELS`, disabled with a note when Main admin is chosen;
  - `useActionState` on the passed action;
  - on create success it swaps to `TempPasswordPanel`, and inline errors come from content keys.
  
  Add a component test, `user-access-dialog.test.tsx`: no Registrations or Users checkbox; checkboxes disabled for Main admin.
- [X] T048 [US1] Create `src/components/admin/users/users-table.tsx` (≥768px table) and `user-card.tsx` (<768px stacked cards) per contracts/users-ui.md:
  - columns: Email, Role, Sections ("All" / "None" / labels), Status badge, Last login (`admin-datetime.ts`, "Never");
  - own row marked "(you)".
  
  Row actions are added in US4. Leave a `renderActions` prop.
- [X] T049 [US1] Create `src/app/admin/(dashboard)/users/page.tsx`:
  - `requireAdminPage("main_admin")`, `export const dynamic = "force-dynamic"`;
  - heading, a New user button opening `UserAccessDialog` with `createUser`, a link to `/admin/users/activity`, and `listUsers()` rendered through the table and cards;
  - add `"/admin/users": "Users"` handling to the top-bar title lookup in `src/content/admin.ts` (`adminExtraPageTitles` or nav).
- [X] T050 [US1] Remove the `users` `it.todo` in `src/test/access-inventory.test.ts` (page → `main_admin`; `users/actions.ts` → `main_admin` for every exported action).
- [X] T051 [US1] Write E2E `e2e/admin-roles-create-user.spec.ts` (main admin from global setup):
  - open Users, then New user, enter an email, tick News and Messages, Create;
  - the panel shows the email and password; Copy shows "Copied" (grant `clipboard-read` / `clipboard-write` in the context);
  - Done, then reload: the password text is not on the page (search `page.content()` for the captured value);
  - the row shows Awaiting first login and "News, Messages";
  - a duplicate in different case shows `email_taken` copy;
  - then **log in as the new user in a second context** with the captured password, set a new password, and land on the overview (joins US2).

**Checkpoint (MVP)**: The main admin can onboard a content manager end to end.

---

## Phase 5: User Story 3 - Permissions are enforced everywhere (Priority: P1)

**Goal**: The shell, overview and notifications show only permitted sections, forbidden URLs and requests are refused, and changes apply on the next request (FR-007 to FR-013).

**Independent Test**: A content manager with only News:
- sees the sidebar as Overview and News;
- sees only the News card and no message or signup counts in the bell;
- is redirected from `/admin/messages` and `/admin/signups` with the notice;
- gets 403 from `GET /api/admin/signups/export`.

### Tests (write first)

- [X] T052 [P] [US3] Write `src/lib/notifications/queries.test.ts` additions:
  - `getNotificationsSummary(session)` for a content manager with `[]` → `{ messagesNew: 0, signupsNew: 0, items: [] }`, and no Message or Signup queries run (spy);
  - with `messages` only → message counts and items only;
  - with `careers` only → signup counts and items only;
  - a main admin → both.
  
  Also `markAllNotificationsRead` in `mutations.test.ts` touches only permitted kinds.
- [X] T053 [P] [US3] Write the route three-case tests for `src/app/api/admin/notifications/route.test.ts` and `notifications/read/route.test.ts`: no session 401; pending 403; a no-grant content manager 200 with zeroed counts.
- [X] T054 [P] [US3] Write `src/components/admin/app-sidebar.test.tsx` additions: renders only the `allowedHrefs` given; no Users item for a content manager; Users present for a main admin; badges only on rendered items.

### Implementation

- [X] T055 [US3] Edit `src/content/admin.ts` `adminNavItems`: add `access: Access` to `AdminNavItem`:
  - Overview `any`, News `news`, Messages `messages`, Signups `careers`, Settings `settings`;
  - a new `{ label: "Users", href: "/admin/users", access: "main_admin" }`.
  
  Add `visibleNavItems(user)`, which filters by `canAccess`.
- [X] T056 [US3] Edit `src/lib/notifications/queries.ts`: change `getNotificationsSummary(adminId)` to `getNotificationsSummary(session: Pick<AdminSession,"userId"|"role"|"permissions">)`:
  - skip the Message query unless `canAccess(session,"messages")`, and skip the Signup query unless `canAccess(session,"careers")`;
  - `listNotificationItems` takes the same flags.
  
  Update `src/lib/notifications/mutations.ts` `markAllNotificationsRead` the same way. Update the callers in `src/app/api/admin/notifications/route.ts`, `notifications/read/route.ts` and `src/app/admin/(dashboard)/layout.tsx`. The `read` route response returns only the zeroed kinds the caller may see; the shape is unchanged.
- [X] T057 [US3] Edit `src/app/admin/(dashboard)/layout.tsx` and `src/components/admin/admin-shell.tsx`:
  - the layout computes `allowedHrefs = visibleNavItems(session).map(i => i.href)` and passes it, plus `role`, to `AdminShell`, which passes it to `AppSidebar`;
  - add a comment that this is presentation only (Constitution III), and that pages enforce because layouts don't re-render on client navigation (research §12).
- [X] T058 [US3] Edit `src/components/admin/app-sidebar.tsx`: render only items whose `href` is in `allowedHrefs`, and add a `Users` icon (lucide `Users`) to `iconByHref`. Also hide the bell's message and signup rows for kinds the user can't see: they're already zero from T056, so confirm `src/components/admin/admin-top-bar.tsx` and the bell popover don't render empty-kind headings.
- [X] T059 [US3] Edit `src/app/admin/(dashboard)/page.tsx`:
  - read `searchParams.denied`, and show a dismissible notice with the content copy when it's `"1"` (`role="status"`);
  - render the News, Messages and Signups `StatCard`s only when `canAccess` allows, and only run each count query when it does (no wasted or leaking queries);
  - when a content manager has no grants, show the no-grants note;
  - `countNewSignups` stays inside the careers branch.
- [X] T060 [US3] Write E2E `e2e/admin-roles-enforcement.spec.ts` (seed through `e2e/helpers/users.ts`):
  - a content manager with News only: sidebar items are exactly Overview and News; overview cards are exactly News; the bell shows no message or signup rows;
  - `/admin/messages`, `/admin/signups`, `/admin/settings`, `/admin/users`, `/admin/users/activity` and `/admin/design-system` each land on `/admin` with the denied notice;
  - `page.request` to `GET /api/admin/signups/export`, `PATCH /api/admin/messages/<id>`, `DELETE /api/admin/signups/<id>` → 403 `{"error":"forbidden"}`, and the body contains no seeded names;
  - a content manager with **all 5** grants is still redirected from `/admin/users` and `/admin/users/activity`. Server Actions can't be posted cleanly from Playwright, so action refusal is covered by the Vitest cases in T040 and T063;
  - a no-grants content manager sees the overview plus the note, and the Account page works;
  - **two contexts** logged in as the same content manager: the main admin (third context) removes News; both contexts reload `/admin/news` and get the redirect; the sidebar has no News after reload; no re-login.
- [X] T061 [US3] Write E2E `e2e/admin-roles-access-matrix.spec.ts`, the page half of contracts/access-matrix.md. For each page path in the matrix, a data-driven loop checks:
  1. a fresh context with no cookie → `/admin/login?next=…`;
  2. a content manager with every key except the required one (for `main_admin` pages, all keys) → `/admin?denied=1`, plus a pending user → `/admin/set-password`;
  3. a content manager with exactly the key (or a main admin for `main_admin` pages) → the page heading is visible.

**Checkpoint**: All three P1 stories are complete. Enforcement is proven for pages (E2E), routes (Vitest) and actions (Vitest).

---

## Phase 6: User Story 4 - Managing users (Priority: P2)

**Goal**: Edit access, disable and enable, reset, and delete, with the self and last-main-admin guards (FR-022 to FR-028).

**Independent Test**:
- As the main admin: edit a content manager's grants; disable them, and their open session hits login on the next request; enable; reset, and a new password is shown once while the old sessions end; delete, and the row is gone.
- On your own row there are no Disable, Delete or role controls.
- Demoting the last main admin is refused.

### Tests (write first)

- [X] T062 [P] [US4] Write the rest of the `src/lib/users/mutations.test.ts` cases (`describeWithDb`):
  - `updateUserAccess`: grants change, `permissions_changed` added and removed; role change, `role_changed`; a no-op writes no entry; `self` refused; the target's sessions are **not** deleted, and a follow-up `getAdminSession` with the target's cookie shows the new grants;
  - `disableUser`: `disabledAt` set, zero sessions, `getAdminSession` with the old cookie returns null, and `signInEmail` gives the generic 401;
  - `enableUser`: the same password logs in again, with grants intact;
  - `resetUserPassword`: the old password fails, the new one verifies, `mustChangePassword` true, zero sessions, and resetting another main admin is allowed;
  - `deleteUser`: `deletedAt` set, zero sessions, hidden from `listUsers`, and old change entries still present;
  - each of disable, delete and demote on the **last active main admin** → `last_main_admin`, with the state unchanged;
  - **concurrency**: two main admins A and B, `Promise.all([demote(A→B), demote(B→A)])` × 20 iterations; after each, `countActiveMainAdmins() ≥ 1`;
  - no `UserChange` or log line contains a temporary password.
- [X] T063 [P] [US4] Extend `src/app/admin/(dashboard)/users/actions.test.ts` with the three access cases for `updateUserAccess`, `disableUser`, `enableUser`, `resetUserPassword` and `deleteUser`:
  - no session;
  - a content manager with all grants → `forbidden`;
  - a main admin → success.
  
  Also **FR-011**: a content manager posting `updateUserAccess` with `targetId` = their own id and `permissions` = all keys → `forbidden`, with permissions unchanged; a main admin with `targetId` = self → `self`.

### Implementation

- [X] T064 [US4] Add a private `guardLastMainAdmin(targetId, apply, revert)` to `src/lib/users/mutations.ts`, implementing research §8: conditional write, then `countActiveMainAdmins()`, then revert and return `last_main_admin` if 0.
- [X] T065 [US4] Add these to `src/lib/users/mutations.ts`, each refusing `self` when `targetId === actor.userId` and `not_found` for missing or deleted targets:
  - `updateUserAccess({ actor, targetId, role, permissions })`: diff old and new; route demotions through the guard; `normalizePermissions`; write `role_changed` and `permissions_changed` entries; log `user_access_changed`.
  - `disableUser`: guard if the target is main_admin; then `internalAdapter.deleteUserSessions(targetId)` (research §4); record; log.
  - `enableUser`.
  - `resetUserPassword`: `generateTemporaryPassword`, hash, `updatePassword`, `updateUser({ mustChangePassword: true, tempPasswordIssuedAt: now })`, `deleteUserSessions`, record `temp_password_issued`, log; return `{ email, temporaryPassword }`.
  - `deleteUser`: guard; `deletedAt: now`; `deleteUserSessions`; record; log.
- [X] T066 [US4] Add `updateUserAccess`, `disableUser`, `enableUser`, `resetUserPassword` and `deleteUser` to `src/app/admin/(dashboard)/users/actions.ts`:
  - each does `requireAdminAccess("main_admin")`, parses (`updateUserAccessSchema` / `targetSchema`), calls the mutation, then `revalidatePath("/admin/users")`;
  - return per contracts/user-actions.md;
  - update the T050 inventory entries.
- [X] T067 [US4] Create `src/components/admin/users/user-row-actions.tsx`:
  - Edit access opens `UserAccessDialog` in edit mode with `updateUserAccess`;
  - Reset password asks for confirmation, then shows `TempPasswordPanel`;
  - Disable or Enable (toggle by status) asks for confirmation;
  - Delete reuses the `src/components/admin/admin-delete-dialog.tsx` pattern.
  
  The **own row** omits Disable, Delete and the role control, and shows "Change your password on the Account page" instead of Reset. Error copy for `self` and `last_main_admin` is shown inline. Wire it into `users-table.tsx` and `user-card.tsx` through `renderActions`.
- [X] T068 [US4] Write E2E `e2e/admin-roles-manage-users.spec.ts`:
  - edit grants → the content manager's next reload shows the new sidebar (joins US3);
  - disable while the content manager context is open → its next navigation lands on `/admin/login`; logging in again shows the generic error, with no "disabled" wording;
  - enable → login works with the old password;
  - reset → the panel shows a new password, the content manager's open context is logged out, the old password fails, and the new one leads to Set your password;
  - delete (confirm) → the row disappears and login fails;
  - own row: no Disable, Delete or role control;
  - with a second main admin seeded, demoting the only other main admin works, but then demoting yourself isn't offered, and disabling the last one is refused with "At least one main admin must remain."

**Checkpoint**: Full account lifecycle.

---

## Phase 7: User Story 5 - Record of changes (Priority: P2)

**Goal**: The main admin views account and permission changes, newest first (FR-030 to FR-032).

**Independent Test**: Create, change grants, disable and reset. `/admin/users/activity` then lists 4 entries, newest first, with actor, target, change text and time, and no password.

- [X] T069 [P] [US5] Write `src/lib/users/change-text.test.ts` for `describeUserChange(entry)`: each of the 8 types plus combined added and removed ("Sections: added Messages; removed News"), and the role arrow text per contracts/users-ui.md.
- [X] T070 [P] [US5] Create `src/lib/users/change-text.ts`: `describeUserChange(entry)`, using `PERMISSION_LABELS` and content copy.
- [X] T071 [US5] Add `listUserChanges({ page })` to `src/lib/users/queries.ts`: `UserChange.find().sort({ at: -1 })`, 20 per page, using the pagination helpers in `src/lib/admin-list.ts`; returns `{ items, total, page, pageCount }`. Add a DB test in `src/lib/users/queries.test.ts` for ordering and paging with 25 entries.
- [X] T072 [US5] Create `src/components/admin/users/change-record-list.tsx` (a table at 768px and up, stacked cards below; When through `admin-datetime.ts`, By, User, Change) and `src/app/admin/(dashboard)/users/activity/page.tsx`:
  - `requireAdminPage("main_admin")`, `force-dynamic`, `?page=` pagination like the existing lists, an empty state, and a back link to Users;
  - add a "Change record" top-bar title in `src/content/admin.ts`.
  
  Remove the `users/activity` `it.todo` in `src/test/access-inventory.test.ts`.
- [X] T073 [US5] Write E2E `e2e/admin-roles-change-record.spec.ts`:
  - perform create, grant change, disable and reset through the UI;
  - `/admin/users/activity` shows 4 new entries in newest-first order with the expected text and the main admin's email as By;
  - no captured temporary password appears in `page.content()`;
  - as a content manager with all grants, the page redirects with the denied notice.

---

## Phase 8: User Story 6 - Existing features gain checks (Priority: P2)

**Goal**: Complete the three-case matrix for the pre-011 features, and the 010 carried-over wrong-role cases (`docs/briefs/011-roles-and-users.md`).

**Independent Test**: `npm test` shows three-case coverage for every route in contracts/access-matrix.md, and the carried-over account cases pass.

Most route coverage landed in T014–T017 and T053. This phase closes the gaps and the account cases.

- [X] T074 [US6] Audit every `src/app/api/admin/**/route.test.ts` against contracts/access-matrix.md. Each exported method must have exactly: a no-session 401, a wrong-permission 403 (or pending 403 for `any` routes), and a correct-permission success with a **content manager holding only that key** (not just the main admin). Add any missing case. In a comment at the top of `src/test/access-inventory.test.ts`, list the route test file for each matrix row.
- [X] T075 [US6] Extend `src/app/admin/(dashboard)/account/actions.test.ts` (`describeWithDb`) with the carried-over cases:
  - a no-grants content manager can `changePassword` and `signOutOtherDevices` on their own account;
  - after the content manager's change, the main admin's old password still logs in and every main admin session is still valid;
  - the content manager's "sign out others" leaves the main admin's sessions, and vice versa;
  - a crafted `userId` or `email` form field is ignored, and only the caller is affected;
  - 5 wrong current-password attempts by the content manager block only the content manager's change, not the main admin's (`password-change:user:<id>` keys).
- [X] T076 [US6] Extend the existing closed-route test (the 010 `disabledPaths` test, found by `rg "revoke-other-sessions" src --glob "*.test.ts"`) to loop over three sessions (none, content manager, main admin) and assert 404 for `/change-password`, `/revoke-other-sessions`, `/revoke-sessions`, `/revoke-session`, `/update-user`, `/change-email` and `/set-password`. Also assert that `/api/auth/admin/*` returns 404, which proves the admin plugin isn't mounted.
- [X] T077 [US6] Write E2E `e2e/admin-roles-account-scope.spec.ts`: a no-grants content manager opens Account, changes their own password and signs out their other devices, while a main admin context stays signed in throughout (reload succeeds), and the main admin's password still works.

---

## Phase 9: Polish & cross-cutting concerns

- [X] T078 [P] Write E2E `e2e/admin-roles-layout.spec.ts`. At 375, 768, 1024 and 1440px, check `/admin/users` (table at 768 and up, cards below), the create dialog, the temporary-password panel, `/admin/users/activity` and `/admin/set-password`. At each width assert `document.documentElement.scrollWidth <= innerWidth`, that no control overlaps (bounding boxes of row actions don't intersect), and that the dialogs are fully in view.
- [X] T079 [P] Update `docs/architecture.md`:
  - a "Roles & permissions" section (the registry, the one DAL check, `additionalFields`, cookieCache-off rule, the login gate, `userChanges`);
  - add the deploy runbook step "run `npm run seed:admin` once after deploying 011";
  - update the test section with the access inventory test.
- [X] T080 [P] Update `docs/prd.md` §9 Build Order to mark 011 built, and `docs/briefs/011-roles-and-users.md` to point at `specs/011-roles-and-users/spec.md`.
- [X] T081 Security sweep:
  - `rg -n "temporaryPassword" src` → it appears only in `temp-password.ts`, `users/mutations.ts` return values, `users/actions.ts` results and the UI panel, and never in a `logSecurityEvent`, `console.*`, `recordUserChange`, `redirect(` or URL;
  - `rg -n "requireAdminSession" src` → none;
  - `rg -n "cookieCache" src/lib/auth.ts` → comment only.
  
  Fix any hit.
- [ ] T082 Full verification, run **sequentially**:
  1. `npx tsc --noEmit`
  2. `npm run lint`
  3. `npm test`
  4. `npm run build`, and wait for it to finish
  5. start the dev server, then `npm run test:e2e`
  
  Compare admin E2E failures with the pre-existing baseline. New failures must be zero. Run through quickstart.md by hand.

---

## Phase 10: Revision 2026-09-29 (the brief changed during implementation)

The user replaced the create/reset dialog and the "shown once" temporary password with a **right-hand slide-in panel** where the admin types or generates the password, and asked for **one reusable show/hide password input** across the admin. The access design is unchanged. This phase records the change; it **supersedes** T046 (temporary-password panel), T047 (user-access dialog) and the "shown once with a Copy button" parts of T041, T043, T045, T051, T065/T066 and the reset row action, which were built first and then reworked. See spec Clarifications (Session 2026-09-29), research §7 and §15, and the revised contracts.

- [X] T083 [P] Create the reusable `PasswordInput` in `src/components/ui/password-input.tsx`: hidden by default, an eye `<button type="button">` (keyboard reachable, `aria-pressed`, changing accessible name), back to hidden on form submit/reset and on unmount, forwards `ref` and all input props, `revealNonce` for Generate. Test in `src/components/ui/password-input.test.tsx`.
- [X] T084 Use `PasswordInput` for every password field: `src/components/admin/login-form.tsx`, `src/components/admin/set-password-form.tsx`, and the three fields of `src/components/admin/account/change-password-form.tsx`. The existing login/account form tests still pass.
- [X] T085 [P] Make `generateTemporaryPassword` isomorphic (Web Crypto with rejection sampling) in `src/lib/temp-password.ts`, so the panel's Generate button and the server share it. Tests in `src/lib/temp-password.test.ts`.
- [X] T086 Add `adminSetPasswordSchema` (12 to 128), a required `password` on `createUserSchema`, an optional one on `updateUserAccessSchema`, `failedField`, and empty-field-means-absent in `readUserForm`, in `src/lib/validation/users.ts`; tests in `src/lib/validation/users.test.ts`.
- [X] T087 Server: `createOrRestoreUser` takes the admin's `password` and returns only `{ ok, email }`; `resetUserPassword` takes a password and returns no secret; `updateUserAccess` accepts an optional `password` that resets it last (a refused role change applies none). Remove the `resetUserPassword` Server Action (five actions remain). Tests in `src/lib/users/mutations.test.ts` and `src/app/admin/(dashboard)/users/actions.test.ts`.
- [X] T088 [P] Create `src/components/ui/sheet.tsx` (right-hand side sheet on the Base UI dialog: full width on phones, `max-w-md` from 640px, slide-in transition).
- [X] T089 Create `src/components/admin/users/user-panel.tsx` (email, role, sections only for a content manager, password + Generate, discard warning on Escape/outside/X/Cancel when dirty, closes on save and refreshes the list); use it from `users/page.tsx` and `user-row-actions.tsx` (Edit / Disable / Enable / Delete; no separate reset). Delete `user-access-dialog.tsx` and `temp-password-panel.tsx` with their tests. Tests in `src/components/admin/users/user-panel.test.tsx`.
- [X] T090 Update copy in `src/content/admin.ts` (`usersCopy.panel`, "Add user", password messages) and the spec, plan, research and contracts to match.
- [X] T091 Update the E2E helpers and specs for the panel (`createUserViaUi`, `resetPasswordViaPanel`, `admin-roles-create-user`, `admin-roles-first-login`, `admin-roles-enforcement`).
- [X] T092 E2E `e2e/admin-roles-password-input.spec.ts`: the eye toggle on login, Set your password, the Account page (all three fields) and the panel: hidden by default, reveal and hide by mouse and by keyboard (Tab to the eye, Enter/Space), back to hidden after submit, and after the panel closes and reopens.
- [X] T093 Layout spec (T078) also covers the panel: full width at 375px, a fixed side panel at 768/1024/1440px, no horizontal scroll, every field and button reachable.

---

## Phase 11: Revision 2026-09-30 (owner decision: the main admin controls every password)

The owner decided that only the main admin sets and changes passwords: **a content manager cannot change any password, and there is no forced first-login change.** Constitution III was amended (version 2.0.0, MAJOR: a stated guarantee was removed) with the owner's approval. This **supersedes** US2 "First login forces a new password" (T025 to T036), the 7-day expiry, and the "temporary password" wording everywhere; those tasks were built first and then removed.

- [X] T094 Amend Constitution III in `.specify/memory/constitution.md` (1.2.0 to 2.0.0), with a Sync Impact Report entry and the accepted trade-offs.
- [X] T095 Remove the first-login flow: `src/app/admin/set-password/` (page, action, test), `src/components/admin/set-password-form.tsx`, `setInitialPassword`, `validateSetPassword`, the login redirect and `temp_expired` message, `mustChangePassword`/`tempPasswordIssuedAt` (auth fields, DAL, seed, test helpers), the `password_change_required` refusal, the 7-day expiry in the login gate, and the `awaiting_first_login` / `temp_expired` statuses (a user is Active or Disabled).
- [X] T096 One password event: change type and log event `password_set` replace `temp_password_issued`, `first_password_set` and `temp_password_expired`.
- [X] T097 Rename the generator to `src/lib/generate-password.ts` (`generatePassword`); update the panel copy ("Only a main admin can change it later").
- [X] T098 Enforce it: `changePassword` requires `main_admin` (a content manager gets `forbidden`, Better Auth is never called); the Account page shows a content manager a note instead of the form (`AccountPanels`, `canChangePassword`); `signOutOtherDevices` stays open to any role.
- [X] T099 Update the tests: dal, login gate, login action, inventory (per-action access for the account actions), users actions and mutations, queries, account actions (`actions.roles.test.ts`: a content manager is forbidden and untouched counters; a main admin changes only their own).
- [X] T100 Update the E2E specs and helpers: delete `admin-roles-first-login.spec.ts`; onboarding is now log in and land on the overview; the Account page differs by role (`admin-roles-account-scope`, `admin-roles-password-input`); the `any` pages' second access case is an account disabled while holding a live cookie (`disableUserRaw`).
- [X] T101 Update the spec, contracts, data model, research, plan, quickstart and `docs/architecture.md`.
- [X] T102 Re-run everything sequentially (owner runs it): typecheck, lint, Vitest (database suites through `scripts/with-test-env.sh`), then Playwright `e2e/admin-roles-*.spec.ts` with the test-environment dev server.

---

## Dependencies & execution order

```
Phase 1 (T001–T003)
   └─▶ Phase 2a (T004–T009) ─▶ 2b (T010–T013) ─▶ 2c (T014–T024)   ← blocks all stories
                                                   ├─▶ US2 (T025–T036)
                                                   │      └─▶ US1 (T037–T051)  MVP
                                                   │             ├─▶ US3 (T052–T061)
                                                   │             ├─▶ US4 (T062–T068) ─▶ US5 (T069–T073)
                                                   │             └─▶ US6 (T074–T077)
                                                   └────────────────────────────────▶ Polish (T078–T082)
```

- US2 comes before US1 because US1's E2E ends in first login, and US2 creates `UserChange` and `recordUserChange`.
- US3 needs only Phase 2 for its code, but its two-browser E2E (T060) uses the edit action from US4 through the UI. Until US4 lands, T060 may flip grants with `e2e/helpers/users.ts` `updateUser` directly.
- US5's E2E needs US4's actions to produce entries. Its page and queries can be built right after US1.
- US6 T074–T076 can start right after Phase 2, and T077 after US2.

## Parallel opportunities

- **Phase 1**: T001, T002 and T003 together.
- **Phase 2a**: T008 and T009 alongside T004–T007.
- **Phase 2c**: T014–T020 are all [P] (disjoint files), after T011 and T012.
- **US2**: tests T025, T026 and T027 together.
- **US1**: tests T037–T040 together; T041, T042, T046 and T047 together.
- **US3**: T052, T053 and T054 together.
- **US4**: T062 and T063 together.
- **US5**: T069 and T070 together.
- **Polish**: T078, T079 and T080 together.

Example for US1:

```text
Parallel: T037 temp-password.test.ts | T038 validation/users.test.ts | T039 mutations.test.ts (create) | T040 users/actions.test.ts
Then parallel: T041 temp-password.ts | T042 validation/users.ts | T046 temp-password-panel.tsx | T047 user-access-dialog.tsx
Then: T043 → T044 → T045 → T048 → T049 → T050 → T051
```

## Implementation strategy

1. **MVP**: Phases 1–2, then US2, then US1. The main admin can onboard a content manager who must set their own password, and every existing section is already gated by one check (Phase 2c).
2. **Secure increment**: US3, which makes the shell, overview and bell permission-aware, adds the page matrix E2E, and runs the two-browser test.
3. **Operate**: US4 (lifecycle and guards), then US5 (change record).
4. **Close out**: US6 (010 carried-over cases, audit of the route matrix), then Polish.

Suggested commit points: after T024, T036, T051, T061, T068, T073, T077 and T082.

## Summary

- **Total tasks**: 102 (82 planned, plus 11 for the 2026-09-29 revision and 9 for the 2026-09-30 owner decision)
- **Per phase**: Setup 3 · Foundational 21 · US2 12 · US1 15 · US3 10 · US4 7 · US5 5 · US6 4 · Polish 5
- **MVP scope**: T001–T051
