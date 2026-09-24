---
id: 0002
title: Clarify contact messages spec
stage: spec
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.clarify
labels: ["clarify", "contact", "messages", "admin-inbox", "settings"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/spec.md
 - specs/008-contact-messages/checklists/requirements.md
 - history/prompts/008-contact-messages/0002-clarify-contact-messages-spec.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.clarify (no additional input)

Answers given during the session:
- Q1 (how an opened message is shown): A
- Q2 (map location source): A
- Q3 (overview Messages card): A

## Response snapshot

Asked 3 questions, one at a time, and recorded each answer under `## Clarifications` → `### Session 2026-09-24`:
1. Detail view → a separate page per message, with a back link that restores search, filter and page. FR-017 and US2 scenario 6 were updated.
2. Map → one ordinary Google Maps link stored in the contact details, with the embedded map built from the address. FR-024, FR-025 and the Contact Details entity were updated.
3. Overview Messages card → wired here: the total of non-deleted messages, with the new count highlighted. The Assumptions bullet was updated to match.
Stopped at 3 questions because the remaining gaps were low impact: office timings stay as placeholder copy. The checklist notes were updated.

## Outcome

- ✅ Impact: Detail-page routing, the contact-details shape and the overview scope are settled before planning.
- 🧪 Tests: none; the E2E scope in SC-004 is unchanged.
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: The map-link question matters for 005 too, because it fixes the shape of the Settings contact group's map value.

## Evaluation notes (flywheel)

- Failure modes observed: an Edit anchor failed once because the clarification bullet wrapped differently from the anchor text; retried with the correct text.
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
