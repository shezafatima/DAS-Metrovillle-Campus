---
id: 32
title: Clarify deleted registration removal
stage: spec
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: answer to /sp.specify Question 1
labels: ["clarification", "retention", "soft-delete", "restore", "privacy-notice"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/013-student-registration/spec.md
 - specs/013-student-registration/checklists/requirements.md
 - history/prompts/013-student-registration/32-clarify-deleted-registration-removal.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Q1: B. Deleted registrations are permanently removed 30 days after
deletion. The main admin can restore within that period. The privacy
notice says deleted records are permanently removed within 30 days.

## Response snapshot

Recorded the answer in a new Clarifications section. Replaced the US7 marker with: kept under 30 days, permanently removed (with history) at 30+ days; added restore-from-Deleted-view and not-restorable scenarios. FR-029 now records who/when on delete and drops deleted records from duplicate checks; new FR-029a defines the main-admin-only Deleted view (days left) and restore (unchanged record, logged). FR-030 removes at the earlier of retention age or 30 days after deletion. Privacy notice requirement and draft wording now state deleted records are permanently removed within 30 days. Added edge cases (deletion near retention end, restore after 30 days before sweep, restore creating duplicate pair, restore/sweep race), access-matrix coverage of Deleted view and restore, SC-007/SC-012 updates. Checklist now fully passes.

## Outcome

- ✅ Impact: Spec has no open clarifications; ready for /sp.plan.
- 🧪 Tests: none.
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: /sp.plan; then /sp.adr registration-write-rule-and-encryption.
- 🧠 Reflection: Restore implies a Deleted view and a restore route, both of which needed main-admin-only access rows.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist — PASS.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
