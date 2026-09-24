---
id: 0006
title: Record deviation approvals
stage: spec
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: remediation of sp.analyze C1
labels: ["clarify", "deviations", "constitution", "contact"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/008-contact-messages/spec.md
 - specs/008-contact-messages/plan.md
 - history/prompts/008-contact-messages/0006-record-deviation-approvals.spec.prompt.md
tests:
 - none
---

## Prompt

C1: Approved with one change.

Approved as documented:
1. Phone and Subject fields added (both are in docs/prd.md §5.8).
2. One campus block instead of two campus emails plus Central
   Office — Metroville is a single campus.
3. Real map instead of the blank area in the screenshot (the
   reference map simply didn't load during capture).
4. No reCAPTCHA — the honeypot and rate limiting from 002/004 cover
   this, and it avoids a third-party dependency on the page.

Not approved as written:
5. Contact details above the form. Keep the reference's side-by-side
   arrangement on desktop (details in one column, form in the other),
   stacking details above the form only at mobile widths, as the
   reference does. If the desktop side-by-side genuinely cannot work
   with a single campus block, show me why before changing it.

Record this under Clarifications, mark 1-4 approved in Deviations,
and update 5 in spec.md and plan.md.

## Response snapshot

- Recorded approvals 1–4 under Clarifications, and marked each one "approved 2026-09-24" in Deviations.
- Did **not** switch item 5 to a side-by-side layout. The instruction assumes the reference is side by side on desktop, but `screenshots/das.edu.pk_contact_.png` (1440) shows four detail columns in a row, then the map, then a full-width yellow form band. The iPad and Moto captures show the same stacked order. The "Write Us" column also says "filling form below".
- Constitution I says conflicts must be flagged and asked about, not resolved by guessing. So item 5 is recorded as pending in the Clarifications, the Deviations and the plan's Constitution Check, and the evidence was shown to the user along with a choice.

## Outcome

- ✅ Impact: C1 is resolved for items 1–4. Item 5 is waiting on the user's decision.
- 🧪 Tests: none.
- 📁 Files: spec.md, plan.md, this PHR.
- 🔁 Next prompts: the user chooses the layout for item 5; then apply that choice and the remaining analyze fixes.
- 🧠 Reflection: The user's instruction rested on a factual claim about the reference that the screenshots contradict. It was surfaced rather than carried out.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
