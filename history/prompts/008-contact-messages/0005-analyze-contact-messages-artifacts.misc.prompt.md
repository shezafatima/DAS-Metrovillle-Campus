---
id: 0005
title: Analyze contact messages artifacts
stage: misc
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.analyze
labels: ["analyze", "consistency", "constitution", "contact", "messages"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - history/prompts/008-contact-messages/0005-analyze-contact-messages-artifacts.misc.prompt.md
tests:
 - none (read-only analysis)
---

## Prompt

/sp.analyze (no additional input)

## Response snapshot

A read-only analysis of spec.md, plan.md and tasks.md against the constitution.

Coverage: all 32 functional requirements have at least one task (100%). 10 of 11 success criteria have tests; SC-007 (inbox search under 1 s) has no measuring task.

Findings: 1 CRITICAL, 4 HIGH, 5 MEDIUM, 4 LOW.

- **CRITICAL**
  - C1: The spec's reference deviations (single campus, a real map in place of the blank capture, no reCAPTCHA, details above the form, the added Phone and Subject fields) are documented but were never approved. Constitution I says conflicts MUST be flagged and asked about, and Governance says a spec that breaks a rule must say so and get approval.
- **HIGH**
  - C2: Whether a keyless Google Maps iframe counts as a "new service provider" under Constitution II was decided by the plan's own reading, without asking the user.
  - I1: T002's unanchored `contact-.*` regex would also pull the existing 001 `e2e/contact-and-social.spec.ts` into the `forms` project.
  - U1: `MessageStatusControl`'s local `saved` state would not follow the `router.refresh()` from `MarkReadOnOpen`, so T049 test 1 would fail.
  - U2: T031, T063 and T064 describe "each test uses `test.use`", but Playwright only allows `test.use` at file or describe level.
- **MEDIUM**
  - The data model and T021 name the collection `throttle`; the real collection is `throttles`.
  - The phone `href` differs between the footer (`tel:` with the raw value) and T058 (digits only).
  - No task measures SC-007.
  - T034's "`max-w-[…]` token-based" wording is ambiguous.
  - The lifted-helper count is five in some places and six in others.
- **LOW**: see the report.

Verified in the codebase: Next's `base-server.js` sets `x-forwarded-for` with `??=`, so a header the client sends is passed through. The XFF test isolation therefore works, and the spoofing risk is real. The Throttle model has no explicit collection name, so Mongoose names it `throttles`.

No files were modified.

## Outcome

- ✅ Impact: Found 1 constitution gate and 3 defects that would cause tests to fail, before implementation.
- 🧪 Tests: none (read-only).
- 📁 Files: this PHR only.
- 🔁 Next prompts: approve the deviations and the map-provider reading, then apply the remediation edits and run /sp.implement.
- 🧠 Reflection: Checking the Next.js source for the XFF behaviour turned an assumption in the plan into a verified fact.

## Evaluation notes (flywheel)

- Failure modes observed: none in the analysis itself. The defects found originated in /sp.plan and /sp.tasks.
- Graders run and results (PASS/FAIL): coverage 32/32 functional requirements PASS; constitution gate FAIL (C1)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): in /sp.specify, ask for approval of reference deviations in the same session instead of only documenting them.
