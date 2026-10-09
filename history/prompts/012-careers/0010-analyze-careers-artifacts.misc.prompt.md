---
id: 0010
title: Analyze careers artifacts
stage: misc
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.analyze
labels: ["analyze","careers","constitution","consistency"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - none (read-only analysis)
tests:
 - none
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only analysis of spec.md, plan.md, tasks.md against the constitution. 16 findings: 2 CRITICAL (Constitution VI literal MUSTs: "one record per person → unique index, never check-then-insert" vs ADR-0008's lock + window check, and "records keyed by a natural identifier MUST be upserted, never duplicated" vs intentional repeat records; the plan rates both PASS with a wording note and Complexity Tracking says no violations), 3 HIGH (no release gate for the client-approved privacy notice (Constitution V); unanchored `careers-.*` Playwright testMatch also matches admin-careers-access.spec.ts; E2E X-Forwarded-For range shared with the messages helper), plus MEDIUM/LOW items (crash-left pending gives a misleading 30-day date, retention default not client-agreed, 4 MB change absent from PRD, careers-entry-points project mismatch, multiple-file edge untested, plan tree missing task files, PRD §5.9 editable intro vs static, search-and-filter vs search only, US1 MVP without window protection, SC-001 only manually checked). Coverage: 34/34 FRs and 11/11 SCs have tasks (SC-001 manual only). Recommend resolving the CRITICALs via /sp.constitution before /sp.implement.

## Outcome

- ✅ Impact: Pre-implementation risks surfaced; no files modified.
- 🧪 Tests: none
- 📁 Files: none
- 🔁 Next prompts: /sp.constitution (VI amendment for time-windowed rules), then remediation edits to plan/tasks, then /sp.implement
- 🧠 Reflection: the plan's "PASS (wording note)" was a reinterpretation the analyze rules don't allow; reported as CRITICAL.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
