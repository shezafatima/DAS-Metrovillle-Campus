---
id: 0003
title: Clarify delete rights and retention
stage: spec
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.clarify
labels: ["clarify","careers","permissions","retention"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0006-career-application-match-either-field.md
  pr: null
files:
 - specs/012-careers/spec.md
 - specs/012-careers/checklists/requirements.md
tests:
 - none
---

## Prompt

/sp.clarify (no arguments)

Answers: Q1 (who may delete) → "yes" (recommended A: main admin only). Q2 (retention) → "yes" (recommended C: configurable, default 12 months).

## Response snapshot

Asked 2 questions. Added `## Clarifications` / `### Session 2026-10-02` (recording the earlier ADR-0006 matching decision plus both answers). Delete: main admin only — updated US2 #5, US4 intro and #4, new US4 #8 (content manager sees no delete control; route refuses), FR-014, FR-026, FR-028 (delete-route access tests), Careers Permission entity. Retention: FR-031 rewritten (single config value, default 12 months, no code change to alter, soft-deleted records purged too), edge case updated, SC-011 added. Added assumptions: Pakistani mobile phone rule as on existing forms; qualification is free text. No NEEDS CLARIFICATION markers remain; checklist all pass.

## Outcome

- ✅ Impact: Spec ready for /sp.plan.
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.plan; client to approve PRD §5.9 amendment and privacy wording
- 🧠 Reflection: Phone and qualification questions avoided by reading existing validation code and the brief's Urdu edge case.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): no placeholders, no contradictions, clarification bullets 1:1 with answers — PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
