---
id: 0004
title: Generate foundation tasks
stage: tasks
date: 2026-09-18
surface: agent
model: claude-opus-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.tasks
labels: ["tasks","foundation","better-auth","admin-layout","testing"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-foundation/tasks.md
tests:
 - none run (tasks stage); tasks.md defines 11 Vitest files (7 DB-backed) and 6 Playwright specs as tasks T006, T012, T013, T019, T025, T026, T034, T035, T039, T040, T047, T048, T051, T052, T054, T056, T058, T059
---

## Prompt

/so.tasks

(typed as `/so.tasks`; interpreted and invoked as `/sp.tasks` with no additional input)

## Response snapshot

Ran `check-prerequisites.ps1 -Json` (FEATURE_DIR resolved; research,
data-model, contracts, quickstart all available). Loaded plan.md, spec.md
(6 user stories, 34 FRs, 10 SCs), data-model.md, both contracts, and the
001 tasks.md for house style.

Wrote `specs/002-foundation/tasks.md` with **64 tasks** in 9 phases:

- Phase 1 Setup (T001–T004): install better-auth/mongoose/zod/@next/env,
  seed script entry, `.env.example`, two admin layout tokens.
- Phase 2 Foundational (T005–T023): env schema + instrumentation, cached
  DB connection, security log, `Throttle` model + `rate-limit.ts`,
  honeypot, `describeWithDb` test helper + vitest env globs, Playwright
  `global-setup.ts`, Better Auth instance + handler, login/return-path
  schemas, DAL, and the `(public)` route-group move with a green-001-suite
  gate.
- US1 Account setup (T024–T026): seed script via `auth.$context`, DB test
  incl. 10 concurrent runs, e2e incl. sign-up route 400.
- US2 Login/logout (T027–T035): admin content, admin metadata layout,
  `login` action with every contract branch, `LoginForm`, login page,
  `logout` action, temporary dashboard layout, action unit test, e2e with
  byte-equal error assertion.
- US3 Protected area (T036–T040): `proxy.ts`, `/api/admin/session`,
  placeholder routes, 401/expired DB test, e2e incl. stale-cookie case.
- US4 Admin layout (T041–T048): sidebar, top bar, mobile nav, shell,
  placeholder, layout swap, sidebar unit test, 4-breakpoint e2e.
- US5 Abuse protection (T049–T052): lockout hooks, wiring, DB test incl.
  per-account key + simulated restart + HTTP route 429, e2e.
- US6 Building blocks (T053–T059): soft-delete plugin, public-form
  wrapper, health route, three DB tests, e2e.
- Phase 9 Polish (T060–T064): architecture/README docs, lint/tsc, full
  gate with and without `MONGODB_URI`, quickstart walk-through.

Per-story counts: US1 3, US2 9, US3 5, US4 8, US5 4, US6 7; 24 tasks
marked [P]. Dependency table: US3 → US2 → US1-data; US4 → US3; US5 and US6
need only Phase 2. Format validated by script: all 64 lines match
`- [ ] Txxx [P?] [USn?] …`, IDs sequential.

## Outcome

- ✅ Impact: Feature 002 has an executable, dependency-ordered task list; MVP = Phases 1–3 (seed command).
- 🧪 Tests: none run; 18 test-file tasks map every spec Acceptance item and SC to a concrete file.
- 📁 Files: specs/002-foundation/tasks.md
- 🔁 Next prompts: `/sp.analyze` (cross-artifact consistency), optionally `/sp.adr auth-and-admin-foundation`, then `/sp.implement`
- 🧠 Reflection: A heredoc large enough for the whole file exceeded the shell's spawn limit (ENAMETOOLONG); the Write tool was the correct fallback. Splitting US2's temporary layout from US4's real shell keeps US2 independently demoable without letting US4 become a rewrite.

## Evaluation notes (flywheel)

- Failure modes observed: Bash heredoc of ~30 KB failed with ENAMETOOLONG on Windows/Git Bash; fell back to the Write tool.
- Graders run and results (PASS/FAIL): checklist-format regex over all task lines — PASS (64/64); ID sequence — PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
