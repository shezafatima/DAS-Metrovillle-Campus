---
id: 0005
title: Generate news tasks
stage: tasks
date: 2026-09-21
surface: agent
model: claude-opus-5
feature: 003-news
branch: 003-news
user: shezafatima
command: /sp.tasks
labels: ["news", "tasks", "planning"]
links:
  spec: specs/003-news/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/003-news/tasks.md
 - history/prompts/003-news/0005-generate-news-tasks.tasks.prompt.md
tests:
 - format validation of tasks.md (75 tasks, 0 malformed, IDs sequential, every task has a path)
---

## Prompt

(empty — `/sp.tasks` with no arguments)

## Response snapshot

Ran `check-prerequisites.ps1` (research, data-model, contracts,
quickstart available). Read the tasks template, 002's tasks.md for
house conventions (`[DB]` marker, describeWithDb, e2e helpers),
`e2e/global-setup.ts` and `src/test/db.ts` to wire fixtures correctly.

Generated `specs/003-news/tasks.md`: 75 tasks in 10 phases.
- Phase 1 Setup (T001–T005): deps, env, remotePatterns, e2e wipe list
  + `e2e/helpers/news.ts`.
- Phase 2 Foundational (T006–T021): categories, slug, sanitize,
  excerpt, dates, cloudinary-loader (each with unit tests), Zod schema
  + tests, model + `[DB]` index tests, cloudinary wrapper + tests,
  copy files.
- US1 (13): mutations + `[DB]` tests, 4 route files, 401 test for
  every verb, RichTextEditor, unsaved-changes hook, NewsEditor,
  new/[id] pages, editor e2e.
- US2 (8): listAdminPosts + tests, filters, pagination, delete
  dialog, table, list page, list e2e.
- US3 (12): token extraction gate (T043), public queries +
  never-returns-drafts `[DB]` matrix test, components, force-dynamic
  pages, public/detail e2e with 4-width screenshots, the Acceptance
  journey e2e (T054).
- US4 (5): sign route + tests, server verification, CoverImageField,
  editor wiring, stubbed-Cloudinary e2e.
- US5 (3), US6 (3), US7 (5), Polish (5).
Tests are included because spec Acceptance + Constitution VIII require
them. 37 tasks marked [P]. MVP = US1→US2→US3.

## Outcome

- ✅ Impact: Executable, dependency-ordered task list ready for `/sp.implement`.
- 🧪 Tests: format validation script — PASS.
- 📁 Files: tasks.md + this PHR.
- 🔁 Next prompts: `/sp.analyze` (cross-artifact check) then `/sp.implement`.
- 🧠 Reflection: Putting the token-extraction task inside US3 as an explicit gate keeps Constitution V from being skipped under delivery pressure.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): checklist-format grep — PASS (0 malformed, 75/75 with paths).
- Prompt variant (if applicable): none.
- Next experiment (smallest change to try): none.
