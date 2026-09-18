---
id: 0006
title: Sync logo task with plan
stage: tasks
date: 2026-09-16
surface: agent
model: claude-sonnet-5
feature: 001-site-shell
branch: 001-site-shell
user: s2636309@gmail.com
command: /sp.phr
labels: [tasks, site-shell, logo, assets]
links:
  spec: specs/001-site-shell/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/001-site-shell/tasks.md
tests:
 - none (documentation-only change)
---

## Prompt

Also update specs/001-site-shell/tasks.md to match.

## Response snapshot

Grepped `tasks.md` for "Logo" and found two places referencing the
component: task T006 in Phase 2 Foundational, and its restatement in the
"Parallel Example: Foundational Phase" bash block. Updated T006 from
"Create `Logo` server component ... linking to `/`" to match the just-
updated plan.md line: renders `public/images/logo.svg`, alt text
`"Dar-e-Arqam School Metroville Campus"`, links to `/`, sized to match
`screenshots/`/`research/design-tokens.md` at each viewport, no
placeholder — with a "per plan.md" pointer. Updated the parallel-example
task description the same way for consistency. Left T015 (Header composing
Logo + NavDesktop, which references T006 by ID only) untouched since it
doesn't restate the Logo spec itself.

## Outcome

- ✅ Impact: tasks.md's T006 now matches plan.md's real-asset/alt-text/viewport-sizing requirement for the Logo component; no drift between the two artifacts.
- 🧪 Tests: None — documentation-only change.
- 📁 Files: specs/001-site-shell/tasks.md (edited: T006 description, Parallel Example bash block).
- 🔁 Next prompts: none required; ready for `/sp.implement` to pick up T006 as written.
- 🧠 Reflection: Keeping generated artifacts (plan.md, tasks.md) in sync after a targeted edit is a small, mechanical follow-up — worth checking for cross-references (grep by component name) rather than assuming a single edit site.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): not applicable — no automated grader configured for this stage.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
