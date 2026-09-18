---
id: 0002
title: Clarify session lockout reset logging
stage: misc
date: 2026-09-17
surface: agent
model: claude-opus-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.clarify
labels: ["clarify","foundation","security","sessions","observability"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-foundation/spec.md
tests:
 - none (clarification stage)
---

## Prompt

/sp.clarify (no additional input)

Interactive answers given by the user during the session:
- Q1 (session lifetime): "recommended" (Option B)
- Q2 (block keying): "C"
- Q3 (reset vs live sessions): "A"
- Q4 (security events): "B"

## Response snapshot

Ran `check-prerequisites.ps1 -Json -PathsOnly`; resolved
`specs/002-foundation/spec.md`. Coverage scan found four Partial
categories worth asking about (all others Clear). Asked four
questions sequentially with a recommended option each; all four
answered.

Answers integrated into the spec after each acceptance:

1. Session lifetime → rolling 7-day idle expiry, each visit extends.
   Updated FR-019 and the Assumptions entry.
2. Block keying → dual key: per source address 5 / 15 min and
   per account 20 / 15 min; either triggers a 15-minute block.
   Rewrote User Story 5 scenarios (now 6), FR-027–029, the Login
   attempt record entity, SC-005, and the Assumptions entry.
3. Password reset vs live sessions → reset ends all sessions.
   Added scenario 3a to User Story 1, extended FR-003, updated the
   Session entity.
4. Security events → server log only. Added FR-034 (event list,
   fields, no password/session id, no audit table/screen) and an
   Out of Scope bullet.

Added `## Clarifications` / `### Session 2026-09-17` with one bullet
per answer. Validation: 4 bullets, no duplicates, no remaining
"see Assumptions" forward references, headings intact.

## Outcome

- ✅ Impact: Four security-posture decisions that would otherwise have been settled silently during planning are now explicit and testable in the spec.
- 🧪 Tests: none run; spec now defines both lockout keys, reset-invalidates-sessions, and log-event expectations for later tests.
- 📁 Files: specs/002-foundation/spec.md
- 🔁 Next prompts: `/sp.plan`
- 🧠 Reflection: All four answers matched the recommended option, which suggests the defaults were well-calibrated; the dual-key lockout was the only one where the original spec assumption (source-only) actually changed.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): structural validation — PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
