---
id: 48
title: Apply analysis remediation edits
stage: misc
date: 2026-10-17
surface: agent
model: claude-opus-5-5
feature: 014-page-settings
branch: 014-page-settings
user: shezafatima
command: apply (remediation after /sp.analyze)
labels: ["analyze", "remediation", "permissions", "release"]
links:
  spec: specs/014-page-settings/spec.md
  ticket: null
  adr: history/adr/0013-settings-panels-partial-save-and-permissions.md
  pr: null
files:
 - specs/014-page-settings/spec.md
 - specs/014-page-settings/research.md
 - specs/014-page-settings/quickstart.md
 - specs/014-page-settings/contracts/tabs-and-panels.md
 - specs/014-page-settings/contracts/access-matrix.md
 - specs/014-page-settings/tasks.md
 - history/prompts/014-page-settings/48-apply-analysis-remediation.misc.prompt.md
tests:
 - none
---

## Prompt

apply

## Response snapshot

Applied the approved fixes:
- C1: forms keyed on panel key (R4 client side, contract rule, T019 rerender test, T022 key rule, T051 waits for refresh).
- G1: three access cases for every old URL (contract rows; T048 rewritten around a shared case table; T036 imports it).
- I1: FR-019 and US2-2 name the 011 page outcome.
- I2: FR-009 and Assumptions mention the optional per-panel last-saved marker.
- G2: new T034 round-trip DB test.
- U1: Home allSettled with a per-panel unavailable message; single-read tabs use the admin error page (spec edge case, T010 copy, T018 case, T027).
- G3: quickstart release order dry run → grant → deploy → check against production; R14, T039, T045, T046 add `--dry-run` and print the connected DB host/name.

Tasks renumbered T035+ (64 total, US1 = 17) with cross-references and the dependency graph updated.

## Outcome

- ✅ Impact: all six issues plus G3 resolved in the artifacts; ready for /sp.implement
- 🧪 Tests: none run
- 📁 Files: see list
- 🔁 Next prompts: /sp.implement
- 🧠 Reflection: renumbering by script kept every cross-reference consistent

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): task count 64 matches the checkbox count
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
