---
id: 0004
title: Plan admin account feature
stage: plan
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: /sp.plan
labels: ["admin", "account", "better-auth", "lockout", "profile-menu", "plan"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/plan.md
 - specs/010-admin-account/research.md
 - specs/010-admin-account/data-model.md
 - specs/010-admin-account/contracts/account-actions.md
 - specs/010-admin-account/contracts/profile-menu-ui.md
 - specs/010-admin-account/quickstart.md
 - CLAUDE.md
tests:
 - none (plan stage)
---

## Prompt

Use Better Auth's built-in
password change and session revocation. Reuse the lockout and admin
form patterns from 002. One e2e test per user story.

## Response snapshot

Verified Better Auth 1.7 source in node_modules:
- `changePassword` checks the minimum length and verifies the current password (400 `INVALID_PASSWORD`) before writing. With `revokeOtherSessions: true` it deletes all sessions, then creates a new session and cookie for this device.
- `revokeOtherSessions` keeps the current token.
- `disabledPaths` applies only in the HTTP router.
- `account.updatedAt` has `onUpdate`.

Plan decisions:
- Server Actions (002 login pattern) call the built-ins. zod handles the confirm and differs-from-current checks.
- The lockout is a new hook pair (`password-change:user:<id>`, 5/15 min/15 min block) reusing `rate-limit.ts`, so it is independent of login and survives re-login.
- `disabledPaths` closes the raw HTTP mutation routes.
- Last-changed = credential `account.updatedAt`. No schema or seed change.
- The profile menu uses Base UI Menu through a new `dropdown-menu` wrapper, and the sidebar-footer logout is removed.
- `use-unsaved-changes` is moved and reused, with a `[data-leaves-page]` opt-in for Logout.
- E2E: one spec per story, plus protected and layout specs. The password is restored after each test through the seed `--reset` helper. Lockout is covered by DB-backed vitest.

The Constitution Check passes. Notes: roles aren't built yet, and the actions are self-scoped.

## Outcome

- ✅ Impact: Complete Phase 0/1 design; ready for /sp.tasks
- 🧪 Tests: none run (plan stage); test obligations listed in contracts
- 📁 Files: plan, research, data-model, 2 contracts, quickstart, CLAUDE.md context line
- 🔁 Next prompts: /sp.adr admin-account-auth-surface (optional), /sp.tasks
- 🧠 Reflection: Reading Better Auth's source revealed that the HTTP routes were open and that `changePassword` deletes the current session too. Both would have been missed with recalled API knowledge.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): Constitution Check PASS (pre and post design)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
