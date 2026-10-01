---
id: 0006
title: Generate admin account tasks
stage: tasks
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: /sp.tasks
labels: ["admin", "account", "tasks", "better-auth", "e2e"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/tasks.md
tests:
 - none (tasks stage)
---

## Prompt

/sp.tasks (no additional arguments)

## Response snapshot

Generated `specs/010-admin-account/tasks.md` with 39 tasks:
- Setup T001–T005 (policy constant, log types, copy, shared zod schema + test)
- Foundational T006–T017:
  - lockout hook pair + auth.ts composed hooks + `disabledPaths`
  - DB-backed lockout and last-changed tests
  - move the unsaved-changes hook
  - dropdown-menu primitive and profile menu + test
  - top bar/shell/sidebar edits, deleting the sidebar footer
  - updating the `admin-login-logout` and `admin-layout` E2E specs
- US1 T018–T026 (action tests incl. saved-check and no-leak, form test, action, summary, form, page, one E2E journey)
- US2 T027–T033 (action tests, card test, `signOutOtherDevices`, shared confirm button, card, live wiring, one E2E journey)
- Polish T034–T039 (protected spec incl. 404 raw routes, 4-width layout spec, docs, seed-script wiring audit, sequential full verification, manual quickstart)

16 tasks are [P]. The MVP is Setup + Foundational + US1. The wrong-role case is deferred to the 011 brief.

## Outcome

- ✅ Impact: Executable task list; ready for /sp.implement
- 🧪 Tests: none run; 4 new + 2 edited E2E specs and ~8 Vitest files planned
- 📁 Files: tasks.md
- 🔁 Next prompts: /sp.analyze (optional), /sp.implement
- 🧠 Reflection: A grep of e2e found `admin-layout.spec.ts` also asserting the sidebar email/Logout. Without it, moving logout would have broken it silently.

## Evaluation notes (flywheel)

- Failure modes observed: One classifier no-verdict on PowerShell; the retry succeeded.
- Graders run and results (PASS/FAIL): format check — all 39 tasks match `- [ ] T### [P?] [US?] … path`
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
