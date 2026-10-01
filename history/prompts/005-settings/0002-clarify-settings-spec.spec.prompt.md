---
id: 0002
title: Clarify settings spec
stage: spec
date: 2026-09-30
surface: agent
model: claude-sonnet-5-5
feature: 005-settings
branch: 005-settings
user: shezafatima
command: /sp.clarify
labels: ["settings", "clarify", "hero-slides", "concurrency", "soft-delete"]
links:
  spec: specs/005-settings/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/005-settings/spec.md
 - specs/005-settings/checklists/requirements.md
 - history/prompts/005-settings/0002-clarify-settings-spec.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.clarify (no arguments)

Follow-up user answers: Q1 "recomended" (A), Q2 "recomemded" (B), Q3 "yes" (A).

## Response snapshot

Asked 3 questions, all answered with the recommended option:
1. Starting hero slide → one visible branded placeholder image with alt text.
2. Two admins editing one group → save refused if the group changed since it was opened; message "This group was changed by someone else. Reload to see their changes."; edits stay on screen (updated Clarifications, US7 scenario 5, FR-031).
3. "Recoverable" delete → soft delete only, no restore screen; developer restores if needed.

## Outcome

- ✅ Impact: Removed the missing-image dependency, changed conflict handling from last-save-wins to refuse-on-change, confirmed restore scope.
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: remaining items are plan-level (image delivery sizes, cache timing, field-definition shape).

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
