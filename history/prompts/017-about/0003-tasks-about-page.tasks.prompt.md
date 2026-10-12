---
id: 0003
title: Tasks About page
stage: tasks
date: 2026-10-09
surface: agent
model: claude-opus-5-5
feature: 017-about
branch: 017-about
user: shezafatima
command: /sp.tasks
labels: ["about", "tasks", "e2e", "content"]
links:
  spec: specs/017-about/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/017-about/tasks.md
 - history/prompts/017-about/0003-tasks-about-page.tasks.prompt.md
tests:
 - none run (task generation only); tests planned in tasks T004, T006, T010–T016, T028–T029, T034, T038–T039, T043–T044, T047
---

## Prompt

/sp.tasks (no additional user input)

## Response snapshot

Generated specs/017-about/tasks.md: 54 tasks in 8 phases.
- Setup (T001–T003): copy and rename the source documents, verbatim .txt extraction, README.
- Foundational (T004–T012): Zod schemas, aboutView/visibility, new pageSections.about and legacyAboutRedirects, team content, Paragraphs/AboutSection/PersonPhoto.
- US1 (15 tasks): content files, fidelity test, Story/V&M/Values sections, page. This is the MVP.
- US2 (6): async Header feeding nav items and the search index from aboutView.
- US3 (4): redirects in next.config.ts, home card link, page-sections spec.
- US4 (5): messages content and section, alternating photo side, no toggle.
- US5 (4): placeholder cards in dev; hidden in production via the cookie-forced E2E.
- Polish (8): four-width layout and a11y assertions, nav spec updates, client-review document, lint/tsc, unit suite, sequential build (static-route check), then the public E2E suite.

27 tasks are parallelisable. Tests come first in each story. Deploy only after US2, US4 and US5, so the menu never points at missing sections.

## Outcome

- ✅ Impact: Executable task list ready for /sp.implement.
- 🧪 Tests: none run
- 📁 Files: tasks.md, this PHR
- 🔁 Next prompts: /sp.analyze (optional), then /sp.implement
- 🧠 Reflection: The menu/page coupling means the MVP alone should not be deployed. This is called out in Implementation Strategy.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): format check PASS (54/54 tasks match checkbox + ID + labels)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
