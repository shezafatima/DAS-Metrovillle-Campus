---
id: 34
title: ADR registration data handling
stage: misc
date: 2026-10-14
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: /sp.adr registration-write-rule-and-encryption
labels: ["adr", "student-registration", "personal-data", "encryption", "retention"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: history/adr/0012-student-registration-data-handling.md
  pr: null
files:
 - history/adr/0012-student-registration-data-handling.md
 - specs/013-student-registration/plan.md
 - history/prompts/013-student-registration/34-adr-registration-data-handling.misc.prompt.md
tests:
 - none
---

## Prompt

/sp.adr registration-write-rule-and-encryption

## Response snapshot

Prerequisites passed (plan, research, data-model, contracts present). No create-adr script exists, so the ADR was written from .specify/templates/adr-template.md. Extracted one decision cluster: registration data handling. It covers the append-only write rule (no natural key, unique random reference), a read-time hashed duplicate flag, at-rest encryption only (field-level encryption deferred), main-admin-only visibility (404 for content managers), log/export rules, and the deletion lifecycle (30-day grace + restore, earlier-of purge, visit-triggered sweep). It passed all three significance tests. Created ADR-0012 (Proposed) with alternatives (refuse/merge, unique duplicate key, stored flag, CSFLE, immediate purge, retention-age purge, submit-only sweep, stdout export logs, denied redirect). Referenced ADR-0008, ADR-0004 and ADR-0011; ADR-0011's isAdmissionApplyOpen condition is amended by 013 (window AND classes, not window AND constant), noted in plan.md. Linked ADR-0012 from plan.md.

## Outcome

- ✅ Impact: 1 ADR created; 3 existing referenced; 1 amendment flagged.
- 🧪 Tests: none.
- 📁 Files: ADR-0012, plan.md link, this PHR.
- 🔁 Next prompts: accept ADR-0012 (owner) and optionally add an "Amended by ADR-0012/013" note to ADR-0011; /sp.tasks.
- 🧠 Reflection: Backups outliving the 30-day purge is a real gap in the notice's "permanently removed" wording; surfaced as a negative consequence.

## Evaluation notes (flywheel)

- Failure modes observed: create-adr script missing; agent-native fallback used.
- Graders run and results (PASS/FAIL): clustered PASS; alternatives with rationale PASS; pros/cons PASS; concise/detailed PASS.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
