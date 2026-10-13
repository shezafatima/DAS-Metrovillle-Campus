---
id: 0004
title: Generate Resources page tasks
stage: tasks
date: 2026-10-13
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: /sp.tasks
labels: ["resources", "tasks", "mobile-apps", "gallery", "client-review"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/tasks.md
tests:
 - none run (task generation only)
---

## Prompt

/sp.tasks (no additional user input)

## Response snapshot

Generated `specs/019-resources/tasks.md` with 35 tasks in the strict checklist format, TDD order (tests fail first):
- Phase 1 Setup (T001–T003): verbatim `mobile-apps.txt`, byte-copy of the flyer from the 2026-10-12 scratchpad download, content-source README and folders.
- Phase 2 Foundational (T004–T008): two tokens, `src/lib/resources/schema.ts` with `linkMatchesType` (+ tests), optional `beside`/`below` on `AboutSection` (+ tests).
- US1 (T009–T020, MVP): fidelity/content/component/E2E tests, content file + parsed index, icon map, `AppCard`, `MobileAppsSection`, page rewrite composing `pageSections.resources`, and the two `e2e/page-sections.spec.ts` edits (FR-028).
- US2 (T021–T024): nav/section-list unit guard, menu/anchor/one-h1/no-`#downloads`/`#our-books` E2E, admin-project order and background spec, `site-shell.ts` comment.
- US3 (T025–T027): 007 E2E failure-set baseline, gallery moved into `AboutSection` (surface, stroke), diff after.
- US4 (T028–T030): coverage unit test and `docs/content-source/resources/client-review.md`; portal links unchanged.
- Polish (T031–T035): architecture doc check, sequential test/lint/tsc/build then Playwright, screenshots, SC walk-through.

## Outcome

- ✅ Impact: Feature is ready for /sp.implement, starting with the US1 MVP.
- 🧪 Tests: None run; tests are planned as tasks (unit, component, chromium E2E, admin E2E, axe).
- 📁 Files: specs/019-resources/tasks.md
- 🔁 Next prompts: /sp.analyze, then /sp.implement
- 🧠 Reflection: Confirmed the flyer already exists in an earlier session's scratchpad, so T002 copies it rather than downloading again; `AnchoredSection` becomes unused after T020 but is left in place to keep the diff small.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): format check (checkbox, ID, story label, file path) PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
