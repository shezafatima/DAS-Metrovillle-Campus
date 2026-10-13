---
id: 0002
title: Clarify dead-link card note
stage: spec
date: 2026-10-12
surface: agent
model: claude-opus-5-5
feature: 019-resources
branch: 019-resources
user: shezafatima
command: /sp.specify (clarification answer)
labels: ["resources", "spec", "clarification", "mobile-apps"]
links:
  spec: specs/019-resources/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/019-resources/spec.md
 - specs/019-resources/checklists/requirements.md
 - history/prompts/019-resources/0002-clarify-dead-link-card-note.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

A. Show a short muted note, "Not available at the moment", on cards
whose download link is dead, marked pending client approval. Add the
dead links to the client review list so they can supply working ones
before launch.

## Response snapshot

Resolved FR-016: dead-link cards (currently Scarlet Math, Scarlet Urdu and LMS App) show the muted note "Not available at the moment" in place of a button, pending client approval. Added a Clarifications session, updated US1 scenario 5, the "all links dead" edge case, R4, a new finding R6 (the note is new wording), FR-023 (each dead link listed with a request for a working replacement before launch), SC-004, SC-010 and Open Question 4. The checklist now passes on every item.

## Outcome

- ✅ Impact: Spec has no open markers and is ready for /sp.plan.
- 🧪 Tests: none (specification stage)
- 📁 Files: spec.md, checklists/requirements.md, this PHR
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: The answer added new visible wording, so it was recorded as finding R6 for client approval.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist — PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
