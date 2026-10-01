---
id: 0003
title: Plan roles and users
stage: plan
date: 2026-09-29
surface: agent
model: claude-opus-5-5
feature: 011-roles-and-users
branch: 011-roles-and-users
user: shezafatima
command: /sp.plan
labels: ["plan", "roles", "permissions", "dal", "better-auth", "session-revocation"]
links:
  spec: specs/011-roles-and-users/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/011-roles-and-users/plan.md
 - specs/011-roles-and-users/research.md
 - specs/011-roles-and-users/data-model.md
 - specs/011-roles-and-users/quickstart.md
 - specs/011-roles-and-users/contracts/access-matrix.md
 - specs/011-roles-and-users/contracts/dal-access.md
 - specs/011-roles-and-users/contracts/user-actions.md
 - specs/011-roles-and-users/contracts/users-ui.md
tests:
 - none (planning stage)
---

## Prompt

/sp.plan Extend the existing
getAdminSession helper into one permission check used by every
admin page, route and action, rather than per-feature checks.
Reuse Better Auth's session revocation for disable and reset.

## Response snapshot

Plan and Phase 0/1 artifacts written.
- One access check: getAdminSession extended with role, permissions and mustChangePassword (disabled or deleted → null); pure decideAccess behind requireAdminPage (redirects) and requireAdminAccess (401/403); requireAdminSession removed; an inventory test enforces the access matrix.
- Storage: Better Auth user.additionalFields (input:false, least-privilege defaults); cookieCache stays off so reads are fresh.
- Session revocation: internalAdapter.deleteUserSessions for disable, reset and delete; revokeOtherSessions for the first password set. Admin plugin rejected (extra HTTP surface, second permission model, ban error leaks).
- Login gate: databaseHooks.session.create.before gives disabled or deleted accounts the generic 401 and expired temporary passwords TEMP_PASSWORD_EXPIRED; a spike test comes first, with a hooks.after fallback.
- Last-main-admin: guarded write, recount, compensate (no transactions assumed).
- userChanges: append-only collection.
- Server Actions for user management; /admin/set-password outside the dashboard layout; seed backfills role main_admin.
- Constitution Check PASS (pre and post design).
- update-agent-context.ps1 could not be run (tool permission check returned no verdict twice).

## Outcome

- ✅ Impact: Design complete; ready for /sp.tasks
- 🧪 Tests: none (planned: decideAccess unit, login-gate spike, inventory, three-case matrix, concurrency, 5 E2E specs)
- 📁 Files: plan, research, data-model, quickstart, 4 contracts
- 🔁 Next prompts: /sp.adr role-permissions-model; /sp.tasks
- 🧠 Reflection: The biggest risk is a missed call site; removing the old helper plus the inventory test closes it structurally.

## Evaluation notes (flywheel)

- Failure modes observed: agent-context script not executed (classifier unavailable)
- Graders run and results (PASS/FAIL): Constitution Check PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): run update-agent-context.ps1 manually
