---
id: 0002
title: ADR match either field
stage: misc
date: 2026-10-02
surface: agent
model: claude-opus-5-5
feature: 012-careers
branch: 012-careers
user: shezafatima
command: /sp.adr
labels: ["adr","careers","identity","uniqueness","privacy"]
links:
  spec: specs/012-careers/spec.md
  ticket: null
  adr: history/adr/0006-career-application-match-either-field.md
  pr: null
files:
 - history/adr/0006-career-application-match-either-field.md
 - history/adr/0003-career-application-one-per-person.md
 - specs/012-careers/spec.md
 - specs/012-careers/checklists/requirements.md
tests:
 - none
---

## Prompt

/sp.adr career-application-match-either-field

## Response snapshot

plan.md does not exist yet; proceeded because the user named the single decision explicitly and it rests on the spec, PRD and ADR-0003 rather than a plan. Created ADR-0006 (Accepted): a repeat applicant is matched on email OR phone, enforced by two partial unique indexes (email, phone) filtered to deletedAt null; one identical refusal whichever index trips; refusal leaves no stored CV; refuse-not-merge and delete-to-reapply carried over from ADR-0003. Alternatives: compound key (ADR-0003), check-then-insert, derived multikey identity field, email-only, field-naming refusal. Marked ADR-0003 identity rule superseded; resolved Q1 in spec FR-010 and US2; checklist now shows 2 open clarifications (Q2 delete rights, Q3 retention). Flagged PRD §5.9 still says "both" and needs a client-approved change-log entry.

## Outcome

- ✅ Impact: Q1 resolved; ADR conflict with ADR-0003 recorded as partial supersession.
- 🧪 Tests: none (documentation)
- 📁 Files: ADR-0006 created; ADR-0003 status, spec.md, checklist updated
- 🔁 Next prompts: answer Q2 and Q3; amend PRD §5.9 (v0.4); /sp.plan
- 🧠 Reflection: workflow precondition (plan.md) bypassed deliberately for an explicitly named decision.

## Evaluation notes (flywheel)

- Failure modes observed: none; over-granularity checked — decision spans data model, API error mapping, storage cleanup and privacy wording
- Graders run and results (PASS/FAIL): clustered PASS; alternatives listed PASS; pros/cons PASS; concise PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
