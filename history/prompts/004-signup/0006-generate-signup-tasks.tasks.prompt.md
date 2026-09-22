---
id: 0006
title: Generate signup tasks
stage: tasks
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.tasks
labels: ["signup", "tasks", "planning"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - specs/004-signup/tasks.md
tests:
 - none run (task generation); test tasks embedded per story
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Loaded plan.md, spec.md (6 user stories after clarification),
research.md, data-model.md, the three contracts, quickstart.md and
ADR-0001, plus the 003 tasks.md for house style. Wrote
`specs/004-signup/tasks.md` with 58 tasks in 9 phases:

- Phase 1 Setup (3): global-setup wipe list, serial `forms` Playwright
  project + chromium `testIgnore`, `e2e/helpers/signups.ts`.
- Phase 2 Foundational (10): sources, phone (+tests), dates (+tests),
  shared Zod schema (+tests), model, `upsertSignup`/`deleteSignup`
  (+DB test), route-errors.
- US1 Visitor signs up (12): public route + DB test, token extraction
  script → design-tokens.md → `@theme` (Constitution V gate), content,
  `SignupForm`, `SignupSection`, Home placement, jsdom test, public
  E2E, four-width visual E2E. **MVP.**
- US2 One record per person (4): update/restore/`$addToSet`/10-way
  concurrency DB tests, identical-response route test, E2E repeat,
  email-normalisation unit test.
- US3 Admin views (9): `listSignups`/`countSignups`/
  `findSignupsForExport` + DB tests, `signupsCopy`, `AdminPagination`
  lift with news wrapper, filters, table, page, overview count, E2E
  incl. unauthenticated redirect.
- US4 Delete (5): DELETE route + 401/404 tests, dialog, restore DB
  test (withDeleted regression guard), E2E delete/restore.
- US5 Protection (4): honeypot input, jsdom a11y/429 tests, route
  honeypot + 429 tests, E2E sixth-submission + bot POST.
- US6 Export (6): csv.ts + tests, export route + 401/CSV tests,
  Export link, E2E download with BOM/Urdu/quoted name.
- Polish (5): architecture.md, deviations note, full lint/type/test
  sweep incl. chromium regression, quickstart walk-through + Excel
  check, raw-value and `withDeleted` greps.

Format validated by script: 58/58 match `- [ ] Txxx [P?] [USn?] …`,
IDs sequential, 23 parallel tasks, every task names a file path
except the command-only verification task.

## Outcome

- ✅ Impact: Executable task list; ready for `/sp.implement` (after committing/stashing the 003 work still on this branch).
- 🧪 Tests: none run.
- 📁 Files: specs/004-signup/tasks.md
- 🔁 Next prompts: `/sp.analyze` (optional consistency pass), then `/sp.implement`.
- 🧠 Reflection: Putting the atomic upsert in Foundational and letting US2/US4 prove its semantics with tests kept the stories independent without splitting one `findOneAndUpdate` across phases.

## Evaluation notes (flywheel)

- Failure modes observed: first draft of T035 had a muddled stub instruction and a wrong forward reference (T038 vs T041); fixed before validation.
- Graders run and results (PASS/FAIL): format grep PASS (58/58), ID sequence PASS, story coverage PASS (US1–US6 each have impl + tests).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
