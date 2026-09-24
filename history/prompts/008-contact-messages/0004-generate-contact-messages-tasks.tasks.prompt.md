---
id: 0004
title: Generate contact messages tasks
stage: tasks
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.tasks
labels: ["tasks", "contact", "messages", "admin-inbox", "e2e"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/tasks.md
 - specs/008-contact-messages/plan.md
 - history/prompts/008-contact-messages/0004-generate-contact-messages-tasks.tasks.prompt.md
tests:
 - none (task generation; tests are defined as tasks)
---

## Prompt

/sp.tasks (no additional input)

## Response snapshot

Generated `specs/008-contact-messages/tasks.md` with 74 tasks in the strict checklist format.

| Phase | Tasks | Count |
|---|---|---|
| Setup | T001–T003 | 3 |
| Foundational | T004–T017 | 14 |
| US1 (send enquiry, MVP) | T018–T031 | 14 |
| US2 (inbox and detail) | T032–T040 | 9 |
| US3 (status) | T041–T049 | 9 |
| US4 (delete) | T050–T054 | 5 |
| US5 (contact details and map) | T055–T061 | 7 |
| US6 (spam protection) | T062–T064 | 3 |
| US7 (new-message indicator) | T065–T068 | 4 |
| Polish | T069–T074 | 6 |

Foundational includes the 6 shared-helper lifts and a 004 regression gate.

Tests are included because the spec's Acceptance section and Constitution VIII require them: Vitest (unit, DB and jsdom) plus 10 Playwright specs. The plan's Project Structure was updated to list those 10 specs; it previously listed 5.

## Outcome

- ✅ Impact: The task list is ready for /sp.implement; the MVP is Phases 1–3.
- 🧪 Tests: none run.
- 📁 Files: tasks.md, and plan.md (the list of e2e specs).
- 🔁 Next prompts: /sp.analyze (recommended), then /sp.implement.
- 🧠 Reflection: US2 seeds its own data through the e2e helper, so it can be built in parallel with US1. US7 is last because it tests the refresh behaviour that US3 and US4 produce.

## Evaluation notes (flywheel)

- Failure modes observed: two cross-references to task IDs were wrong in the first draft (the honeypot task and the route test extension). Both were fixed before saving.
- Graders run and results (PASS/FAIL): format check PASS (74 of 74 lines match the checkbox, ID, labels and path format)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
