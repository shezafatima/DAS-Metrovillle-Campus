---
id: 0004
title: Tasks roles and users
stage: tasks
date: 2026-09-29
surface: agent
model: claude-opus-5-5
feature: 011-roles-and-users
branch: 011-roles-and-users
user: shezafatima
command: /sp.tasks
labels: ["tasks", "roles", "permissions", "access-matrix"]
links:
  spec: specs/011-roles-and-users/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/011-roles-and-users/tasks.md
tests:
 - none (task generation)
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Generated tasks.md with 82 tasks:
- Setup 3; Foundational 21 (auth fields, login-gate spike and hook, DAL rewrite removing requireAdminSession, seed role backfill, migration of every existing entry point with wrong-permission route tests, access inventory test);
- US2 12 (first login, placed before US1 as a dependency); US1 15 (MVP create user + one-time password); US3 10 (permission-aware shell, overview, notifications; page matrix E2E; two-browser test); US4 7 (lifecycle, self and last-main-admin guards, concurrency test); US5 5 (change record); US6 4 (010 carried-over cases, route matrix audit, closed routes for every role); Polish 5 (4-width layout E2E, docs, security sweep, sequential full verification).
- Tests are included because the spec's acceptance requires them. Every task follows the checklist format with IDs, [P] and story labels, and file paths.
- check-prerequisites.ps1 could not run (tool classifier gave no verdict); the feature dir is known from earlier steps.

## Outcome

- ✅ Impact: Implementation-ready task list
- 🧪 Tests: planned in tasks (Vitest three-case, DB integration, 9 E2E specs)
- 📁 Files: tasks.md
- 🔁 Next prompts: /sp.analyze; /sp.adr role-permissions-model; /sp.implement
- 🧠 Reflection: Ordering US2 before US1 avoids an MVP where created accounts cannot finish logging in.

## Evaluation notes (flywheel)

- Failure modes observed: prerequisite script not executed
- Graders run and results (PASS/FAIL): format check PASS (all 82 tasks have checkbox, ID, path; story labels on story phases only)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
