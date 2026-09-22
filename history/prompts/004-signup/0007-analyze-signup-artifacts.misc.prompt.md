---
id: 0007
title: Analyze signup artifacts
stage: misc
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.analyze
labels: ["signup", "analyze", "consistency", "coverage"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - none (read-only analysis)
tests:
 - none
---

## Prompt

/sp.analyze (no arguments)

## Response snapshot

Read-only cross-artifact analysis of spec.md, plan.md, tasks.md (plus
research, data-model, contracts, ADR-0001) against the constitution
v1.1.0. 12 findings, 0 CRITICAL, 4 MEDIUM, 8 LOW:

- I1 (MEDIUM) spec US1 scenario 8 says placeholder copy is "visibly"
  marked; plan/tasks follow the 001 comment + data-attribute
  convention. Reword scenario.
- C1 (MEDIUM) FR-007 "correcting a field clears its message" has no
  implementing/test task (T020/T023).
- C2 (MEDIUM) SC-006 (<1 s search over 100 rows) has no task seeding
  ≥100 rows or asserting timing.
- U1 (MEDIUM) Error/success text colours for the form states are not
  in the T018 token list — Constitution V needs named tokens.
- A1 (MEDIUM) T020 "visible label … sr-only at ≥1024" is
  contradictory; labels should be sr-only at all widths.
- I2, D1, A2, A3, U2, T1, I3 (LOW): honeypot-not-counted sentence in
  the public contract; `Paged`/`escapeRegExp` duplication vs. news
  import; brittle `getByLabel` on aria-hidden honeypot; "timing
  category" wording; JSON token key shape; source/page terminology;
  phone storage now consistent.

Coverage: 37/39 requirements fully covered, FR-007 partial, SC-006
uncovered; no unmapped tasks; no constitution violations.
Recommended fixing the MEDIUM items before `/sp.implement`; offered
concrete remediation edits pending approval.

## Outcome

- ✅ Impact: Artifacts judged implementation-ready after four small MEDIUM fixes.
- 🧪 Tests: none.
- 📁 Files: none modified.
- 🔁 Next prompts: approve remediation edits, then `/sp.implement`.
- 🧠 Reflection: The one real behavioural gap (FR-007 clear-on-edit) came from the spec's last sentence of a requirement — worth scanning trailing clauses when generating tasks.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): coverage 94.9% PASS; constitution alignment PASS.
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
