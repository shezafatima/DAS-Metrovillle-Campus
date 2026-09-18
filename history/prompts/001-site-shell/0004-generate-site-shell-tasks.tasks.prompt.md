---
id: 0004
title: Generate site shell tasks
stage: tasks
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: /sp.tasks
labels: [tasks, site-shell, sdd]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-site-shell/tasks.md
tests:
 - none (task generation only; no code executed)
---

## Prompt

/sp.tasks

(No additional user input text was provided — the command was invoked with an empty argument body.)

## Response snapshot

Ran `.specify/scripts/powershell/check-prerequisites.ps1 -Json` to resolve
`FEATURE_DIR` (`specs/001-site-shell`) and confirmed `plan.md`, `spec.md`,
`research.md`, `data-model.md`, `contracts/content-schema.md`, and
`quickstart.md` all exist. Read all six design documents plus
`research/design-tokens.md`, `docs/prd.md` §4, `docs/architecture.md`, and
the current `src/`/`e2e/` tree to ground tasks in the actual codebase state
(existing create-next-app scaffold, shadcn `Button`, empty
`src/content/`). Generated `specs/001-site-shell/tasks.md` (41 tasks,
T001–T041) organized as: Phase 1 Setup (design tokens/breakpoint), Phase 2
Foundational (content-file contract, SkipLink/PagePlaceholder/Logo, 8 route
stubs, not-found, root layout skip-link+main wiring — blocking all
stories), Phases 3–8 one per spec.md user story (US1 desktop nav → US2
mobile nav → US3 contact/social → US4 footer → US5 scroll behavior → US6
shared layout/placeholder verification), and Phase 9 Polish (Urdu/long-label
fixtures, token-fidelity e2e assertions, manual a11y pass, full test run,
quickstart validation). Each user story phase includes its Vitest/Playwright
test tasks first (tests requested per plan.md + contracts/content-schema.md),
then implementation tasks with exact file paths and FR references. Flagged
`header.tsx`/`layout.tsx` as shared files extended sequentially across
US1/US2/US3/US5 and Foundational/US1/US4 respectively, so those specific
tasks are not marked [P] despite each story remaining independently
testable at its own checkpoint.

## Outcome

- ✅ Impact: `specs/001-site-shell/tasks.md` created — ready for `/sp.implement`.
- 🧪 Tests: None run; task generation only. Test tasks (Vitest + Playwright, one e2e spec per user story) are encoded as T003, T012/T013, T017/T018, T023/T024, T027/T028, T031, T033, T037, T038.
- 📁 Files: specs/001-site-shell/tasks.md (new).
- 🔁 Next prompts: `/sp.analyze` (cross-artifact consistency check) or `/sp.implement` to begin Phase 1.
- 🧠 Reflection: Feature is a single cohesive UI shell where `header.tsx`/`layout.tsx` are legitimately shared across multiple stories — documented that dependency explicitly in the Dependencies section rather than forcing artificial story isolation.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): not applicable — no automated grader configured for this stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
