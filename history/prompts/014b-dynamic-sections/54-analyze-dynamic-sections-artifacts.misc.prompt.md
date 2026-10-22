---
id: 54
title: Analyze dynamic sections artifacts
stage: misc
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: /sp.analyze
labels: ["analyze","consistency","constitution"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: history/adr/0014-dynamic-sections-as-settings-groups.md
  pr: null
files:
 - history/prompts/014b-dynamic-sections/54-analyze-dynamic-sections-artifacts.misc.prompt.md
tests:
 - none (read-only analysis)
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only analysis of spec.md, plan.md and tasks.md (plus research, data-model and contracts) against constitution v3.0.0. 43 requirements (35 FR + 8 SC) and 111 tasks; 100% of requirements have at least one task. 12 findings:
- **1 CRITICAL**, C1: Constitution VI soft-delete default. Removing a subject or group inside a live syllabus level is a hard delete (research R3, ADR-0014), and the oldest deleted levels beyond 10 are purged, but the spec never states a confirmed hard delete. Group removal also has no confirmation (FR-012 covers levels and subjects only).
- **3 MEDIUM**:
  - I1: FR-032 says the checklist stores no name copies, but the design keeps a name snapshot.
  - D1: Constitution XI asks for the reference site's own breakpoints, but the tasks check only 375/768/1024/1440.
  - I2: FR-050 says "verbatim" while the Q5 clarification allows structural adaptations.
- **8 LOW**: missing duplicate-name warning task; whitespace-only tests only for links; FR-005/FR-045 overlap; only 2 of 6 /portal URLs tested; the `#site-footer` anchor is not in the plan; group reorder is implicit; the SC-002 timing in E2E may be flaky; the "no overlapping content" check is undefined.

Recommended fixing C1 before /sp.implement. Offered concrete remediation edits; none applied.

## Outcome

- ✅ Impact: Report delivered; 1 critical issue to resolve before implementation.
- 🧪 Tests: none
- 📁 Files: this PHR only (analysis is read-only)
- 🔁 Next prompts: approve remediation for C1, I1, I2 and D1 (spec FR-012/FR-032/FR-050 edits, tasks T069/T078/T107/T023 edits), then /sp.implement
- 🧠 Reflection: The soft-delete rule's "unless a spec requires a confirmed hard delete" clause makes the fix a spec statement plus a group-removal confirmation, not a design change.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): coverage 43/43 PASS; constitution 1 FAIL (VI)
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
