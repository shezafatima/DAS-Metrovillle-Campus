---
id: 38
title: Apply analyze remediation edits
stage: misc
date: 2026-10-15
surface: agent
model: claude-opus-5-5
feature: 013-student-registration
branch: 013-student-registration
user: shezafatima
command: remediation of /sp.analyze findings
labels: ["remediation", "privacy-notice", "spec", "tasks"]
links:
  spec: specs/013-student-registration/spec.md
  ticket: null
  adr: history/adr/0012-student-registration-data-handling.md
  pr: null
files:
 - specs/013-student-registration/spec.md
 - specs/013-student-registration/tasks.md
 - specs/013-student-registration/contracts/public-registration-api.md
 - history/prompts/013-student-registration/38-apply-analyze-remediation-edits.misc.prompt.md
tests:
 - none
---

## Prompt

Apply C2, I1, I2, A1, T1, P1 and U1 as proposed.

C1: replace the notice with this wording, still pending client
approval:
"The information you provide on this form, including your child's
health details and the details of any student you name as a
reference, is used only to process this admission registration. It
can be seen only by the school's administration. It is never sold or
shared with anyone else, apart from the service providers that host
this website and its database on the school's behalf. We keep
registrations for 12 months after submission, after which they are
deleted automatically. Deleted records are permanently removed within
30 days, although backup copies may be kept for a short time before
they are overwritten. You will not receive an email or SMS; please
note the reference number shown after you submit."
Keep the retention period read from the setting, as you described.

## Response snapshot

Applied exactly as proposed:
- C1: the spec's draft notice replaced with the new wording, still pending approval; the months stay rendered from the setting.
- C2: T029 try/503; T027 case for a throwing `checkRateLimit`; T033 maps any 5xx; the contract gains a 503 line.
- I1: SC-005 reworded.
- I2: no-reference-page assumption; T085 adds 640px.
- A1: FR-014 "exactly 8".
- T1: Status Change → Registration History.
- P1: FR-016/017 cross-reference FR-020.
- U1: T040 uses UTC `e2e-now` instants plus the browser `timezoneId`; T020 adds a `process.env.TZ` swap case.

A grep confirmed no stale wording remains.

## Outcome

- ✅ Impact: All /sp.analyze findings addressed; ready for /sp.implement.
- 🧪 Tests: none.
- 📁 Files: spec.md, tasks.md, public-registration-api.md, this PHR.
- 🔁 Next prompts: commit 020 separately (owner's choice); /sp.implement.
- 🧠 Reflection: The new notice wording resolves ADR-0012's backup caveat and the third-party claim.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): stale-wording grep — PASS.
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
