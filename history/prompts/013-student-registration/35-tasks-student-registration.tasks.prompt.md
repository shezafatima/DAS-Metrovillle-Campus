---
id: 35
title: Tasks student registration
stage: tasks
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: /sp.tasks
labels: ["tasks", "student-registration", "e2e", "access-matrix", "retention"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: history/adr/0012-student-registration-data-handling.md
  pr: null
files:
 - specs/013-student-registration/tasks.md
 - history/prompts/013-student-registration/35-tasks-student-registration.tasks.prompt.md
tests:
 - none run (task generation)
---

## Prompt

/sp.tasks (no additional input)

## Response snapshot

Generated tasks.md with 94 tasks in 11 phases:
- Setup: T001–T007 (baseline, env, log types, lifted helpers).
- Foundational: T008–T025 (rules, age, reference, duplicate key, models, notification state, Settings classes + uniqueText, availability, content, shared schema, requireAdminPageOr404, inventory kind).
- US1: T026–T038. US2: T039–T044. US3: T045–T065. US4: T066–T069. US5: T070–T074. US6: T075–T076. US7: T077–T083. US8: T084–T086.
- Polish: T087–T094.

Tests are included (spec SC-012 and Constitution XI require them). Working rules from project memory are embedded: sequential build/Playwright/DB tests, the env wrapper for DB tests, the E2E server env, the baseline failure diff, inventory rows in the same task, CRLF docs. Every referenced existing file was verified to exist. MVP = US1+US2; the production minimum is US1–US4 + US7.

## Outcome

- ✅ Impact: Ready for /sp.implement (or /sp.analyze first).
- 🧪 Tests: none run.
- 📁 Files: tasks.md, this PHR.
- 🔁 Next prompts: /sp.analyze; /sp.implement.
- 🧠 Reflection: US1 can't function without the class list, so the Settings field and availability moved into Foundational; US5 keeps only the warning, editor and E2E.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): format check — every task has a checkbox, ID, story label in story phases, and a file path — PASS.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
