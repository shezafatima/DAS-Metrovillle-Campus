---
id: 47
title: Propose analysis remediation edits
stage: misc
date: 2026-10-17
surface: agent
model: claude-opus-5-5
feature: 014-page-settings
branch: 014-page-settings
user: shezafatima
command: remediation proposal after /sp.analyze
labels: ["analyze", "remediation", "permissions", "release"]
links:
  spec: specs/014-page-settings/spec.md
  ticket: null
  adr: history/adr/0013-settings-panels-partial-save-and-permissions.md
  pr: null
files:
 - history/prompts/014-page-settings/47-propose-analysis-remediation.misc.prompt.md
tests:
 - none
---

## Prompt

Yes, suggest concrete fixes for C1, G1, I1, I2, G2 and U1, and show
them before applying. G1 especially: add the missing access case,
since this slice is about permissions.

G3: add the Pages grant to the release steps in quickstart.md as the
first step, run against the production database BEFORE deploying the
slice, with a dry run first that lists the accounts it will change.

## Response snapshot

Proposed exact edits, none applied:
- C1: key panel forms on the panel key only; T019 rerender test; T050 waits for the refresh.
- G1: three cases for every old URL including no session → login with `next`=destination; T047 rewritten, T035 imports the cases.
- I1: FR-019 and US2-2 name the 011 page outcome (`/admin?denied=1`).
- I2: FR-009 and Assumptions mention the optional per-panel last-saved marker.
- G2: new round-trip DB test task after T033.
- U1: Home reads groups with allSettled and shows per-panel "couldn't be loaded"; single-read tabs use the existing admin error page (`src/app/admin/error.tsx`); copy and E2E case added.
- G3: quickstart release order now dry run → grant → deploy → check; both modes print the connected DB host/name and the account list; `--dry-run` writes nothing; R14, T038, T044, T045 updated.
- Renumber tasks T034+ (63 → 64).
Awaiting "apply".

## Outcome

- ✅ Impact: remediation plan ready for approval
- 🧪 Tests: none
- 📁 Files: this PHR only
- 🔁 Next prompts: "apply", then /sp.implement
- 🧠 Reflection: the dry run needed code changes (R14/T044/T045), not only a quickstart edit

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
