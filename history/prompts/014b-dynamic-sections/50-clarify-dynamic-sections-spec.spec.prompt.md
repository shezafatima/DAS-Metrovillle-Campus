---
id: 50
title: Clarify dynamic sections spec
stage: spec
date: 2026-10-19
surface: agent
model: claude-opus-5-5
feature: 014b-dynamic-sections
branch: 014b-dynamic-sections
user: shezafatima
command: /sp.clarify
labels: ["clarify","class-levels","registration","seed-scripts","syllabi"]
links:
  spec: specs/014b-dynamic-sections/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/014b-dynamic-sections/spec.md
 - history/prompts/014b-dynamic-sections/50-clarify-dynamic-sections-spec.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

/sp.clarify (no arguments)

Answers given during the session, verbatim:
- Q1: "yes"
- Q2: "yes"
- Q3: "yes"
- Q4: "it will be in tab form", then, after a disambiguation question, "a"

## Response snapshot

Asked 4 questions and recorded them under Clarifications → Session 2026-10-19:
1. Unmatched (not linked) class names stay in the registration form after the ticked levels until resolved (A).
2. A checklist save that names a level deleted in the meantime is refused as a conflict (A). Edge Cases updated, and the "or drops" alternative removed.
3. The "pending client confirmation" notice clears only via an explicit, logged "Mark as confirmed by client" action (B). Story 6 scenario 4, FR-052 and FR-004 (access-matrix rows for the action) updated, and the old assumption removed.
4. Each syllabus level tab has its own link `#syllabi-<level-slug>`. Choosing a tab replaces the address without adding a history entry, and unknown links fall back to the first level (A). FR-017 and Story 4 scenarios 10–11 added.

## Outcome

- ✅ Impact: All high-impact ambiguities resolved; spec ready for /sp.plan.
- 🧪 Tests: none
- 📁 Files: spec.md
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: "it will be in tab form" fitted both options, so one disambiguation question was asked before integrating.

## Evaluation notes (flywheel)

- Failure modes observed: The first Edit of the spec missed because of a line-wrapped anchor; a shorter anchor was used.
- Graders run and results (PASS/FAIL): post-write scan (no stale alternatives, 4 Q bullets) PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
