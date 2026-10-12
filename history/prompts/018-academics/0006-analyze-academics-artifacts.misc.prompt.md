---
id: 0006
title: Analyze academics artifacts
stage: misc
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 018-academics
branch: 018-academics
user: shezafatima
command: /sp.analyze
labels: ["analyze", "consistency", "academics"]
links:
  spec: specs/018-academics/spec.md
  ticket: null
  adr: history/adr/0010-shared-click-to-load-video-block.md
  pr: null
files:
 - none (read-only analysis)
tests:
 - none
---

## Prompt

/sp.analyze

## Response snapshot

Read-only cross-check of spec.md, plan.md and tasks.md (plus research, data model, contracts and the constitution v3.0.0). Result: 0 CRITICAL, 0 HIGH, 6 MEDIUM, 6 LOW. All 27 FRs and 8 SCs map to at least one task; FR-003 and FR-006 are only partly covered.

- MEDIUM:
  - F1: the edge cases say an invalid video URL is hidden and more than 3 photos show the first 3, but the schema's parse-at-load throws instead.
  - F2: FR-003 says restoring Syllabi is "a content change", but sections are fixed layout (Constitution VIII and the data model).
  - C1: anchor landing is tested only at 1440 and 375, not at all 4 widths (SC-001).
  - C4: docs/architecture.md still names the YouTubeEmbed facade after T042 deletes it, and Instagram isn't recorded.
  - B1: T026's video-gap classes contain "…" and an unnamed token.
  - U1: no task step reads node_modules/next/dist/docs before the Next.js API work (CLAUDE.md).
- LOW: B2 (placeholder fixture ids in T043), C2 (no single-photo E2E), C3 (dev-mode 2/3-photo E2E missing), I1 (FR-013 "full width" vs max-w-prose), I2 (T044 variable names vs T024's view), I3 (spec says photos have an "order" field; the data model uses array order), I4 (shared content-mode imports from About's view).

## Outcome

- ✅ Impact: The artifacts are consistent enough to implement. 6 medium fixes are suggested before /sp.implement.
- 🧪 Tests: none
- 📁 Files: none modified
- 🔁 Next prompts: approve the remediation edits, then /sp.implement
- 🧠 Reflection: The reference breakpoint rule (Constitution XI) is satisfied because the only measured reference breakpoint (the menu collapse between 768 and 1024) falls inside the four tested widths. The PRD lists Academics as in scope.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): read-only PASS; constitution check PASS; findings ≤ 50 PASS
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
