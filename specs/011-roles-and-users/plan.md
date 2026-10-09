> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Implementation Plan: Roles & Users

**Branch**: `011-roles-and-users` | **Date**: 2026-09-29 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/011-roles-and-users/spec.md`, plus the planning direction: *"Extend the existing getAdminSession helper into one permission check used by every admin page, route and action, rather than per-feature checks. Reuse Better Auth's session revocation for disable and reset."*

## Revision 2026-09-29: the brief changed after this plan was written

The user revised the brief while implementation was under way. The access design (one DAL check, `additionalFields`, the login gate, session revocation, the last-main-admin guard, the change record) is **unchanged**. What changed is the user-management UI and how a password is chosen:

- Adding and editing a user happens in a **panel that slides in from the right** (`src/components/ui/sheet.tsx`, `src/components/admin/users/user-panel.tsx`), not a dialog and not a page. Sections appear only for a content manager. Escape, an outside click, the X and Cancel warn first when anything has been typed.
- The **admin types or generates the password** in the panel (revealable while open, never shown after). It is temporary whatever it is and must be 12 to 128 characters. The server no longer generates or returns passwords, so there is no "shown once" panel and no copy button. A filled password on an existing user is the reset; there is no separate reset action.
- One reusable **`PasswordInput`** with an eye toggle is used for every password field in the admin.

See research §7 and §15, contracts/user-actions.md, contracts/users-ui.md and the spec's Clarifications (Session 2026-09-29, brief revised). The Source Code tree below is updated accordingly.

## Summary

The work adds two roles, per-section grants, user management, and a record of changes. Enforcement goes through **one** access check in the existing DAL.

- **One check.** `getAdminSession()` in `src/lib/dal.ts` is extended to return `role`, `permissions` and `mustChangePassword`. It also treats disabled or deleted accounts as no session. A single pure `decideAccess(session, access)` backs two entry points:
  - `requireAdminPage(access)` for pages (redirects);
  - `requireAdminAccess(access)` for route handlers and Server Actions (401/403 results).
  
  `requireAdminSession` is removed, and every existing call site declares an explicit `access` (a permission key, `main_admin`, or `any`). An inventory test fails the build if any admin page, route or action is missing from the access matrix.
- **Storage.** Role, grants and account state are Better Auth `user.additionalFields` (`input: false`, least-privilege defaults). Better Auth's cookie cache stays off, so every request reads current values (FR-007).
- **Better Auth's session revocation is reused.** `internalAdapter.deleteUserSessions` for disable, reset and delete, and `api.revokeOtherSessions` for the first password set. The optional `admin` plugin is **not** installed (research §3): it would add about 15 HTTP routes to close, a second permission model, and a login error that reveals a ban.
- **Login gate.** A `databaseHooks.session.create.before` hook refuses disabled or deleted accounts with the same 401 as a wrong password, and refuses expired temporary passwords with a distinct code. It runs only after password verification, and covers both the Server Action and the mounted HTTP route.
- **New screens.** `/admin/users` and `/admin/users/activity` (main admin), and `/admin/set-password` (forced first-login change).
- **Existing screens become permission-aware.** The sidebar, overview and notification bell.

## Technical Context

**Language/Version**: TypeScript 6 (strict), React 19.2, Next.js 16.3 App Router
**Primary Dependencies**:
- better-auth 1.7.5: `user.additionalFields`, `databaseHooks.session.create.before`, `hooks.after`, `$context.internalAdapter` (`createUser`, `linkAccount`, `updateUser`, `updatePassword`, `deleteUserSessions`, `findUserByEmail`), `$context.password.hash/verify`, `api.revokeOtherSessions`;
- Mongoose 9, zod 4, @base-ui/react 1.8, shadcn/ui wrappers, lucide-react.

**No new packages** (Constitution II).
**Storage**: MongoDB.
- `user` gains 7 fields (data-model.md).
- New append-only `userChanges` collection.
- `session`, `account` and `throttles` are unchanged.

**Testing**:
- Vitest: unit tests, plus `describeWithDb` integration using real sessions through `src/test/admin-session.ts`, extended with a role and grants.
- Playwright: the serial `admin` project.

**Target Platform**: Web admin panel at 375/768/1024/1440px
**Project Type**: Single Next.js web app (`src/`)
**Performance Goals**:
- The access check adds no DB round trip beyond the `getSession` that already runs: the user doc is already loaded.
- The Users page renders in under 1s for fewer than 50 accounts.
- Create or reset takes under 2s (scrypt hash).

**Constraints**:
- Temporary passwords never appear in logs, records, URLs, redirects or cookies.
- The seed stays manual-only.
- There is no email.
- MongoDB transactions are not assumed (research §8).

**Scale/Scope**:
- Fewer than 20 admin accounts.
- About 16 pages, routes and action files migrate to the new check.
- About 10 new source files and 5 E2E specs.

No NEEDS CLARIFICATION remains. Every item is resolved in [research.md](./research.md).

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design (below).*

| Principle | Status | How this plan satisfies it |
|---|---|---|
| I. Purpose & Fidelity | ✅ | Admin-only feature. No public page changes. |
| II. Fixed Stack | ✅ | Better Auth, Mongoose, zod and shadcn only. No new packages. The Better Auth admin plugin is deliberately not added. |
| III. Roles & Access | ✅ | This feature *is* Principle III: two roles; registrations and users are main-admin only and can't be granted; a server check on every page, route and action through one DAL function; the nav is presentation only; public sign-up stays disabled and accounts come only from the main admin or the seed; temporary passwords are forced to change at first login; changes are recorded with actor and time (`userChanges`). |
| IV. Security | ✅ | scrypt hashing through Better Auth. The temporary password comes from `crypto.randomInt` (about 115 bits) and is shown once. Secrets stay in env. The seed stays manual. Login responses don't reveal disabled or deleted accounts. Server Actions carry Next's origin check. |
| V. Personal Data | ✅ | A content manager can never reach registrations. Signups (personal data) needs the `careers` grant. The change record holds only admin emails. |
| VI. Data Integrity | ✅ | Shared zod schemas (`validation/users.ts`, `validation/account.ts`). Soft delete through `deletedAt`. Email uniqueness from the DB unique index, with restore-on-create instead of duplicates. The last-main-admin invariant is guarded against races (research §8). No email. |
| VII. Design System | ✅ | Existing tokens and admin components only. |
| VIII. Content | ✅ | All new UI copy lives in `src/content/admin.ts`. |
| IX. Components | ✅ | shadcn dialog, checkbox and radio wrappers. The table becomes stacked cards below 768px, following the existing admin list patterns. |
| X. Extensibility | ✅ | Permission keys are a registry: adding a section is one line (FR-005). The access decision is route-agnostic, so a future API reuses it. No user-management REST API is built ahead of need. |
| XI. Testing & DoD | ✅ | contracts/access-matrix.md lists every entry point with three cases, enforced by an inventory test. E2E covers every user story. The 010 carried-over wrong-role cases are included. Layout is checked at 4 widths. |

**Gate result: PASS.** Nothing needs recording under Complexity Tracking.

**Re-check after Phase 1**: PASS. The design added no dependency, no public route and no REST surface. The one deviation from "Better Auth built-ins", skipping the admin plugin, was made to *reduce* attack surface, and research §3 records it.

## Project Structure

### Documentation (this feature)

```text
specs/011-roles-and-users/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── access-matrix.md     # every admin entry point → access key; three-case rules
│   ├── dal-access.md        # requireAdminPage / requireAdminAccess / canAccess API
│   ├── user-actions.md      # Server Action inputs, results, side effects
│   └── users-ui.md          # Users, change record, set-password, shell changes
├── checklists/requirements.md
└── tasks.md                 # /sp.tasks
```

### Source Code (repository root)

```text
src/
├── lib/
│   ├── permissions.ts              NEW  PERMISSION_KEYS, Role, Access, canAccess (pure)
│   ├── dal.ts                      EDIT getAdminSession extended; decideAccess, requireAdminPage, requireAdminAccess; requireAdminSession removed
│   ├── auth.ts                     EDIT user.additionalFields; databaseHooks.session.create.before (login gate); cookieCache-off guard comment
│   ├── login-lockout.ts            EDIT success branch writes lastLoginAt
│   ├── route-errors.ts             EDIT forbiddenResponse, accessErrorResponse
│   ├── log.ts                      EDIT new event types + optional `target`
│   ├── temp-password.ts            NEW  generateTemporaryPassword() (Web Crypto: the panel's Generate button)
│   ├── users/
│   │   ├── queries.ts              NEW  listUsers (derived status), countActiveMainAdmins, listUserChanges
│   │   ├── mutations.ts            NEW  create/restore, updateAccess, disable, enable, reset, delete, setInitialPassword; last-main-admin guard; records UserChange
│   │   └── change-text.ts          NEW  UserChange → display string
│   ├── notifications/queries.ts    EDIT take the session; filter kinds by canAccess
│   ├── notifications/mutations.ts  EDIT markAllNotificationsRead marks permitted kinds only
│   └── validation/
│       ├── users.ts                NEW  createUser / updateUserAccess / target schemas
│       └── account.ts              EDIT validateSetPassword (shares 010 constants)
├── models/user-change.ts           NEW  UserChange (append-only)
├── content/admin.ts                EDIT nav items gain `access`; Users item; all new copy
├── app/admin/
│   ├── login/actions.ts            EDIT temp_expired key; redirect pending users to /admin/set-password
│   ├── set-password/{page,actions}.tsx|ts   NEW
│   └── (dashboard)/
│       ├── layout.tsx              EDIT requireAdminPage("any"); pass allowed nav + session to shell
│       ├── page.tsx                EDIT cards filtered; denied notice; no-grants note
│       ├── users/{page.tsx,actions.ts}      NEW
│       ├── users/activity/page.tsx          NEW
│       └── account|news|messages|signups|settings|design-system/**  EDIT access key per matrix
├── app/api/admin/**/route.ts       EDIT requireAdminAccess(<key>) per matrix
├── components/admin/
│   ├── app-sidebar.tsx             EDIT render only allowed items
│   ├── admin-shell.tsx             EDIT accept allowed items
│   └── users/                      NEW  users-table, user-card, user-panel (right-hand panel), user-row-actions, change-record-list
└── test/
    ├── admin-session.ts            EDIT seedTestAdmin({ role, permissions, mustChangePassword, … })
    └── access-inventory.test.ts    NEW  every page/route/action is in the matrix and calls the right helper
scripts/seed-admin.ts               EDIT role main_admin on create; confirm role on existing; --reset also clears mustChangePassword/disabledAt/deletedAt
e2e/
├── helpers/users.ts                NEW  create CM through UI, login-as helpers
├── admin-roles-create-and-first-login.spec.ts   NEW  US1 + US2
├── admin-roles-enforcement.spec.ts              NEW  US3 (+ forbidden URL/API, no-grants, two browsers)
├── admin-roles-manage-users.spec.ts             NEW  US4 (edit, disable, reset, delete, self/last guards)
├── admin-roles-change-record.spec.ts            NEW  US5
└── admin-roles-layout.spec.ts                   NEW  375/768/1024/1440
```

**Structure Decision**:
- Single Next.js app, following the existing `src/lib/<domain>/{queries,mutations}.ts` and `src/app/admin/(dashboard)/<section>/{page,actions}` conventions.
- `set-password` sits outside `(dashboard)` like `login`, so the shell never loads for a pending user.

## Phases (for /sp.tasks)

1. **Foundation (blocks everything)**:
   - `permissions.ts` and its tests;
   - `additionalFields` and the login-gate hook, with the §5 spike test first;
   - the DAL rewrite (`decideAccess` unit tests: 3 cases × 3 access kinds);
   - `route-errors`, log types, `seedTestAdmin` options, and the seed role backfill.
2. **Migrate every existing entry point** to the matrix access key, then add the inventory test. Existing route tests gain the wrong-permission case, which is US6.
3. **US2 first-login**: set-password page and action, login redirect and expired message.
4. **US1 create**: Users page (list plus create), temporary-password panel, create and restore mutation, change record write.
5. **US3 shell**: permission-aware sidebar, overview and notifications; denied notice; no-grants note.
6. **US4 manage**: edit access, disable/enable, reset, delete, self and last-main-admin guards (concurrency test).
7. **US5 change record page.**
8. **010 carried-over cases**, the E2E suite, the 4-width layout pass, and docs (`docs/architecture.md` roles section, deploy runbook step).

## Risks

1. **The login-gate hook doesn't propagate as the source suggests.** *Mitigation*: the spike test comes first, with the documented fallback in `hooks.after` (research §5).
2. **Enabling `session.cookieCache` later would silently make grants stale.** *Mitigation*: a unit test asserts it is off, plus a comment in `auth.ts`.
3. **A missed call site stays open to every role.** *Mitigation*: removing `requireAdminSession` makes old calls fail to compile, and the inventory test makes new entry points fail CI until they appear in the matrix.

## Complexity Tracking

No violations. Nothing to justify.
