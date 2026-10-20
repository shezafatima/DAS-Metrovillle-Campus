---
id: 36
title: Analyze student registration artifacts
stage: misc
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: /sp.analyze
labels: ["analyze", "consistency", "constitution", "student-registration"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: history/adr/0012-student-registration-data-handling.md
  pr: null
files:
 - history/prompts/013-student-registration/36-analyze-student-registration.misc.prompt.md
tests:
 - none (read-only analysis)
---

## Prompt

/sp.analyze (no additional input)

## Response snapshot

Read-only analysis of spec.md, plan.md, tasks.md against the constitution. 12 findings:
- **CRITICAL (1)**: US7 has no end-to-end test task (Constitution XI requires a passing E2E for every user story).
- **HIGH (2)**: the privacy notice says deleted records are "permanently removed within 30 days" while Atlas backups may keep them longer (ADR-0012 negative), and no task resolves it; the spec edge case "rate-limit store unavailable → try-again" has no task, and the route would answer 500, which the form doesn't map.
- **MEDIUM (4)**: SC-005 promises a log search over the E2E run that no task performs; no reference page or breakpoint source for /admission/register (Constitution I/XI); ADR-0012 still Proposed; T040's TZ mechanism deferred to "check 020's file".
- **LOW (5)**: FR-014 "at most 8" vs exactly 8; Status Change entity vs embedded history naming; ADR-0011 not annotated; FR-016/017/020 overlap; SC-001 and the admin list performance target have no measuring task.

Coverage: 44/44 functional requirements mapped (FR-043 satisfied by ADR-0012); 94 tasks, none unmapped. No files modified.

## Outcome

- ✅ Impact: 1 critical gap to fix before /sp.implement.
- 🧪 Tests: none.
- 📁 Files: this PHR only.
- 🔁 Next prompts: approve remediation edits (add a US7 E2E task, a notice wording decision, a rate-limit-failure task); then /sp.implement.
- 🧠 Reflection: The US7 gap came from treating the retention behaviour as Vitest-only; the constitution's per-story E2E rule applies regardless.

## Evaluation notes (flywheel)

- Failure modes observed: tasks generation missed a constitution MUST (per-story E2E).
- Graders run and results (PASS/FAIL): constitution alignment — FAIL (1 critical).
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): have /sp.tasks check every story phase for an e2e/ task before writing.
