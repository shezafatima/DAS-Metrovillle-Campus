---
id: 37
title: Analyze remediation D1 C1 I3
stage: misc
date: 2026-10-15
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: remediation of /sp.analyze findings
labels: ["remediation", "analyze", "privacy-notice", "adr", "e2e"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: history/adr/0012-student-registration-data-handling.md
  pr: null
files:
 - specs/013-student-registration/tasks.md
 - specs/013-student-registration/spec.md
 - specs/013-student-registration/plan.md
 - history/adr/0012-student-registration-data-handling.md
 - history/prompts/013-student-registration/37-analyze-remediation-d1-c1-i3.misc.prompt.md
tests:
 - none
---

## Prompt

D1: add the US7 end-to-end test now.

C1: use this privacy notice wording, marked pending client approval
(release gate stays on until the client approves it):
"The information you provide on this form, including your child's
health details and the details of any student you name as a
reference, is used only to process this admission registration. It
can be seen only by the school's administration and is never shared
with third parties or published. We keep registrations for 12 months
after submission, after which they are deleted automatically. Deleted
records are permanently removed within 30 days. You will not receive
an email or SMS; please note the reference number shown after you
submit."

C2, I1, I2, A1, T1, P1, U1: suggest concrete edits, show them before
applying.

I3: ADR-0012 approved, mark it Accepted.

## Response snapshot

Applied:
- D1: new T084 [US7] `e2e/registration-retention.spec.ts`, with a `clearSweepThrottle()` helper over the Throttle collection; sweep triggered by visiting the admin list; checks on removal, the Deleted view, restore, manual delete, and the notice months plus the 30-day sentence. T084–T094 were renumbered to T085–T095 by a script, and the parallel note was updated.
- C1: replaced the spec's draft notice with the owner's wording, still pending client approval (the release gate stays on); "12 months" is rendered from the configured retention.
- I3: ADR-0012 marked Accepted (2026-10-15), with references in plan.md and tasks.md updated.

Proposed, not applied, with exact text:
- C2: a 503 on rate-limit or Settings failure.
- I1: SC-005 rewording.
- I2: no-reference-page assumption plus a 640px check.
- A1: "exactly 8".
- T1: "Registration History".
- P1: cross-reference.
- U1: TZ via Vitest `process.env.TZ` as in 020; E2E uses UTC `e2e-now` instants.

## Outcome

- ✅ Impact: The critical finding is resolved; the notice wording is set; the ADR is accepted.
- 🧪 Tests: none run.
- 📁 Files: tasks.md, spec.md, plan.md, ADR-0012, this PHR.
- 🔁 Next prompts: approve the C2/I1/I2/A1/T1/P1/U1 edits; /sp.implement.
- 🧠 Reflection: 020 tested TZ independence in Vitest, not E2E; T040's TZ instruction would have pointed at a mechanism that doesn't exist.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): n/a
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
