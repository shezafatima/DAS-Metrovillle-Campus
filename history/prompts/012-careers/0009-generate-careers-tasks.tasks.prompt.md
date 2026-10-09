---
id: 0009
title: Generate careers tasks
stage: tasks
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.tasks
labels: ["tasks","careers","vercel-blob","reapply-window","signup-retirement"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0007-private-document-store-vercel-blob.md, history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - specs/012-careers/tasks.md
 - specs/012-careers/contracts/admin-careers-api.md
tests:
 - none
---

## Prompt

/sp.tasks (no arguments)

## Response snapshot

Generated specs/012-careers/tasks.md: 99 tasks in 11 phases (Setup 5, Foundational 19, US1 12, US2 8, US3 7, US4 25, US5 2, US6 3, Retention 4, US7 7, Polish 7), tests included because the spec and Constitution XI require them. Order: US1 → US2 → US3 → US4 → (US5 ∥ US6) → Retention → US7 → Polish; US7 (signup deletion) is placed after US4 removes every runtime dependency on signups. Working rules carried from memory: no concurrent build + Playwright, compare against the admin E2E baseline, add access-inventory entries with each route. Also fixed a stale "frees email and phone" phrase in the admin contract. Format validated: all 99 tasks match `- [ ] T### …`; story labels present exactly in story phases.

## Outcome

- ✅ Impact: Executable task list ready for /sp.implement.
- 🧪 Tests: none run (planning)
- 📁 Files: tasks.md; admin contract wording fix
- 🔁 Next prompts: /sp.analyze (recommended) then /sp.implement starting with the MVP (Phases 1–3)
- 🧠 Reflection: retention has no user story, so it got its own unlabeled phase rather than being forced into one.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): checklist format PASS (99/99); story label placement PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
