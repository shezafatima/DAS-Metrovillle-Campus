---
id: 26
title: Admission tasks
stage: tasks
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 020-admission
branch: 020-admission
user: shezafatima
command: /sp.tasks
labels: ["admission", "tasks", "admission-window", "coverflow", "settings-engine"]
links:
  spec: specs/020-admission/spec.md
  ticket: null
  adr: history/adr/0011-admission-window-evaluation.md
  pr: null
files:
 - specs/020-admission/tasks.md
 - specs/020-admission/contracts/admission-window.md
 - specs/020-admission/research.md
 - specs/020-admission/plan.md
 - history/adr/0011-admission-window-evaluation.md
tests:
 - none (tasks stage)
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Generated specs/020-admission/tasks.md: 70 tasks (T001–T070) in 9 phases: Setup (5), Foundational (18), US1 procedure (6), US2 admin window (7), US3 public banner (6), US4 uniform cards (9), US5 menu and redirects (7), US6 Apply hook (5), Polish (7). 30 tasks are marked [P]. Tests come first in every story. US4 has a home-coverflow regression gate (T047) before the uniform section. The format check passed (checkbox, sequential IDs, story labels, file paths). Aligned the contract, research, plan and ADR-0011 to the split of pure `window.ts` and server-only `server.ts`. Found that AnchoredPage is used only by /admission, so the task removes it.

## Outcome

- ✅ Impact: tasks.md ready for /sp.implement
- 🧪 Tests: none run; unit, component and E2E tasks defined per story
- 📁 Files: tasks.md, plus small alignment edits to the contract, research, plan and ADR
- 🔁 Next prompts: /sp.analyze (optional), then /sp.implement
- 🧠 Reflection: T001 blocks on the requester committing or stashing the 020-news-category-label edits

## Evaluation notes (flywheel)

- Failure modes observed: the plan had placed server-only functions in the pure module; split during task generation
- Graders run and results (PASS/FAIL): format validation PASS (70/70)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
