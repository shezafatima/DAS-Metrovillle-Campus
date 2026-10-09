---
id: 0005
title: Tasks gallery albums
stage: tasks
date: 2026-09-30
surface: agent
model: claude-opus-5-5
feature: 007-gallery-albums
branch: 007-gallery-albums
user: shezafatima
command: /sp.tasks
labels: ["gallery","albums","tasks","adr"]
links:
  spec: specs/007-gallery-albums/spec.md
  ticket: null
  adr: history/adr/0005-gallery-albums-single-document-cas.md
  pr: null
files:
 - history/adr/0005-gallery-albums-single-document-cas.md
 - specs/007-gallery-albums/plan.md
 - specs/007-gallery-albums/tasks.md
tests:
 - none (tasks stage)
---

## Prompt

Accept ADR-0005. Note in it that the one-document approach depends
on the 6/8 caps keeping the record small, and would need revisiting
if the caps were ever raised. Then run /sp.tasks.

## Response snapshot

ADR-0005 status is set to Accepted, with a new "Validity Condition" section: the one-document approach depends on the 6/8 caps and must be revisited (storage shape, retry policy and retention, not just the constants) before any cap increase. The plan's ADR link now says "Accepted; valid only while the 6/8 caps hold". tasks.md has 57 tasks: Setup 4, Foundational 13, US1 7, US2 6, US3 4, US4 12, US5 4, Polish 7. 34 are marked [P]. Tests are required and written first. The plan's `*.db.test.ts` file names are corrected to `describeWithDb` in `*.test.ts`. The flat-group retirement (T015) is paired with the 005 E2E rewrite (T051).

## Outcome

- ✅ Impact: ADR accepted; feature ready for /sp.implement
- 🧪 Tests: none run; test tasks defined per story
- 📁 Files: ADR-0005, plan.md, tasks.md
- 🔁 Next prompts: /sp.analyze (optional), /sp.implement
- 🧠 Reflection: the settings nav is driven by GROUP_KEYS, so removing gallery needs an explicit nav link (T015).

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): format check PASS (57/57 tasks have checkbox, ID and file path; story labels on all story-phase tasks)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
