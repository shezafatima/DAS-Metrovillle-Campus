---
id: 0003
title: Amend VI for time-windowed limits
stage: constitution
date: 2026-10-03
surface: agent
model: claude-opus-5-5
feature: none
branch: 012-careers
user: shezafatima
command: /sp.constitution
labels: ["constitution","data-integrity","concurrency","careers"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0008-career-application-30-day-reapply-window.md
  pr: null
files:
 - .specify/memory/constitution.md
 - specs/012-careers/plan.md
 - specs/012-careers/spec.md
 - history/adr/0008-career-application-30-day-reapply-window.md
 - docs/architecture.md
tests:
 - none
---

## Prompt

/sp.constitution (no arguments; run directly after /sp.analyze recommended amending Principle VI for findings C1/C2)

## Response snapshot

Constitution 2.0.0 → 3.0.0 (MAJOR: a MUST is loosened and a bullet redefined). VI now says natural-key records MUST NOT be silently duplicated, with each spec stating the write rule (upsert / refuse on conflict / refuse within a time window) recorded in an ADR; per-person limits must hold under concurrency, enforced by a unique index or, only when an index can't express the rule, by check-then-insert while holding a lock whose exclusivity is a database unique key; concurrency tests are mandatory. Added the amendment-5 Sync Impact Report, updated the version/date line. Propagated: 012 plan Constitution Check VI → PASS (v3.0.0); spec FR-011 wording; ADR-0008 consequence and reference; architecture.md validation rules. Templates and command files are generic, so no edits were needed. Earlier features (004, 008, 011) still comply.

## Outcome

- ✅ Impact: /sp.analyze CRITICAL findings C1/C2 resolved at the source.
- 🧪 Tests: none
- 📁 Files: constitution + 4 propagated files
- 🔁 Next prompts: apply the remaining analyze remediations (C3, I1–I4, U1, G1), then /sp.implement
- 🧠 Reflection: chose MAJOR over MINOR because the amendment loosens a stated MUST, even though race-safety is preserved.

## Evaluation notes (flywheel)

- Failure modes observed: CRLF in architecture.md needed explicit \r\n in replacements
- Graders run and results (PASS/FAIL): no unexplained bracket tokens (only the historical [TEMPLATE] in amendment-1's report); version line matches report; ISO dates — PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
