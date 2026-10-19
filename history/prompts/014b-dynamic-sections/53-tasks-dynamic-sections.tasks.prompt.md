---
id: 53
title: Generate tasks dynamic sections 014b
stage: tasks
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: /sp.tasks
labels: ["tasks","settings-groups","syllabi","class-levels","portal-links","seed-scripts"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: history/adr/0014-dynamic-sections-as-settings-groups.md
  pr: null
files:
 - specs/014b-dynamic-sections/tasks.md
 - history/prompts/014b-dynamic-sections/53-tasks-dynamic-sections.tasks.prompt.md
tests:
 - none (task generation)
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Generated specs/014b-dynamic-sections/tasks.md: 111 tasks in 9 phases, all in the strict checklist format (checkbox, sequential IDs T001–T111 with no gaps, [P] on 52, story labels on story phases only, file paths in every task). Tests are included because Constitution XI requires an E2E per story, three access cases per entry point and four-width checks.

Phases and counts:
- Setup (2): confirm slice 1 is committed; record the baseline.
- Foundational (13): pendingConfirmation, log events, editor slot, panel-check seam, dynamic-sections resolver, paragraphs helper, header wiring.
- US1 Portal Links (17).
- US2 Class Levels + checklist + 013 test updates (26).
- US3 migration (5).
- US4 Syllabi (19).
- US5 Examination (11).
- US6 seeds + confirm actions (12).
- Polish (6).

Story order: US1, US2 and US4 are independent after the foundation; US3 depends on US2, US5 on US4, and US6 on US1, US4 and US5. The shared-file edit order is US1 → US2 → US4 → US5 → US6. MVP = Foundation + US1.

## Outcome

- ✅ Impact: tasks.md is ready for /sp.analyze or /sp.implement.
- 🧪 Tests: none run; test tasks are defined per story.
- 📁 Files: tasks.md
- 🔁 Next prompts: /sp.analyze (recommended), then /sp.implement, after the user confirms 014 slice 1 is committed (T001)
- 🧠 Reflection: Engine additions were placed in the story that first needs them (URL options → US1, dayMonth → US2, lines/maxTotalLines → US4) to keep the foundation small and the stories independent.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): format check PASS (111/111 match `- [ ] T### `; story counts sum to 90 + 21 non-story tasks)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
