---
id: 0003
title: Tasks admin notifications feature
stage: tasks
date: 2026-09-26
surface: agent
model: claude-sonnet-5
feature: 009-admin-notifications
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.tasks
labels: [admin, notifications, tasks]
links:
  spec: specs/009-admin-notifications/spec.md
  ticket: null
  adr: history/adr/0002-admin-notifications-live-state-and-shared-popover.md
  pr: null
files:
  - specs/009-admin-notifications/tasks.md
tests:
  - none (tasks stage; no tests run — tasks.md schedules them)
---

## Prompt

/sp.tasks

(no additional arguments — the command's own outline instructs running
`.specify/scripts/powershell/check-prerequisites.ps1 -Json`, loading
plan.md/spec.md/research.md/data-model.md/contracts/quickstart.md for
the already-planned 009-admin-notifications feature, and generating a
dependency-ordered, per-user-story tasks.md.)

## Response snapshot

Ran `check-prerequisites.ps1 -Json`, confirming `FEATURE_DIR` and the
available design docs. Read 008-contact-messages' `tasks.md` in full
(both halves, ~740 lines) to match this project's established
task-writing conventions: exact function signatures inline in task
descriptions, a paired test task immediately after each implementation
task (rather than strict red-green ordering), `[DB]`-tagged Vitest
suites using `describeWithDb`, route tests using
`seedTestAdmin`/`getTestSessionCookie` from `src/test/admin-session.ts`,
and Playwright specs seeded through direct-insert `e2e/helpers/*.ts`
modules. Also read `e2e/helpers/signups.ts` and `news.ts` (for the
`withConnection`/seed-helper pattern and `loginAsAdmin`),
`src/test/admin-session.ts` and a sample admin route test (for how a
real session cookie plus a real Better-Auth user id is obtained in
tests — needed here because `adminNotificationStates` is keyed by that
id), and `src/components/admin/app-sidebar.test.tsx` (to plan its
exact required edit: replacing the `newMessagesCount` prop with a
`NotificationsProvider` test wrapper).

Organized 009's spec.md user stories (US1 Bell, US2 Sidebar, US3 What
counts as new — all P1; US4 Live updates, US5 Overview — both P2; US6
Page title — P3) into 6 implementation phases, **reordered within the
P1 tier for buildability**: US3 first (independently testable purely
through the three notification API routes and the Signups "opened"
marker, with no UI), then US1 (the bell, consuming US3's query layer),
then US2 (the sidebar, consuming US1's `NotificationsProvider`) — this
reordering and its justification is stated explicitly at the top of
tasks.md so a reader isn't confused by phase numbers not matching
spec.md's story numbers. Noted that `NotificationsProvider` itself
grows across two phases (a working seed-plus-fetch-on-open shape in
US1's phase; the ~60-second timer, visibility pause/resume and
`refreshNow()`-into-every-mutation wiring added in US4's phase),
mirroring how 008's `mutations.ts` grew incrementally across its own
phases rather than being fully speculatively built up front.

Produced `tasks.md`: 60 tasks (T001–T060) across Setup, Foundational,
and the 6 reordered story phases plus Polish, each in the required
`- [ ] [TaskID] [P?] [Story?] Description with file path` format,
including a small new testability seam not previously named in
plan.md — `src/lib/notifications/poll-interval.ts` reading
`NEXT_PUBLIC_NOTIFICATIONS_POLL_MS` so the live-update E2E spec doesn't
need to wait 60 real seconds — introduced here as an implementation
detail within scope of research §3's decision, not a new design
decision requiring a plan re-run. Included Dependencies & Execution
Order (explicit per-phase and per-task dependency notes, plus which
phases can run in parallel — US5 flagged as buildable independently of
the whole bell/sidebar/live-update chain), two Parallel Examples, and
an Implementation Strategy section (MVP = through US1; incremental
delivery order; a two-developer parallel split).

## Outcome

- ✅ Impact: `specs/009-admin-notifications/tasks.md` is ready for
  `/sp.implement`.
- 🧪 Tests: None run at this stage; every implementation task in
  tasks.md is paired with the Vitest/Playwright coverage it needs
  (unit, DB-backed, route, jsdom component, and 6 new E2E specs plus a
  dedicated protected-route spec and a visual spec), fulfilling the
  spec's Acceptance section and Constitution VIII.
- 📁 Files: 1 new file (`tasks.md`); no source code changed yet.
- 🔁 Next prompts: `/sp.tasks` output is ready for `/sp.implement`
  (implementation was not requested in this turn).
- 🧠 Reflection: The main judgment call was reordering US1/US2/US3
  within their shared P1 tier rather than following spec.md's literal
  story order — justified because US3's own Independent Test in
  spec.md is already phrased in terms of counts and API-observable
  behaviour, not bell/sidebar UI, so building it first (and proving it
  correct via T024's API-level E2E spec) gives every later phase a
  trustworthy foundation instead of testing three intertwined pieces
  at once.

## Evaluation notes (flywheel)

- Failure modes observed: None.
- Graders run and results (PASS/FAIL): Manual check against the task
  format rules — PASS (every task has a checkbox, sequential ID,
  correct `[P]`/`[Story]` placement, and an exact file path); manual
  check that every user story phase has its own Independent Test
  restated at the top of its phase — PASS.
- Prompt variant (if applicable): N/A.
- Next experiment (smallest change to try): N/A.
