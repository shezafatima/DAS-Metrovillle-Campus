---
id: 0002
title: Separate account page lockout counter
stage: spec
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: spec revision
labels: ["admin", "account", "lockout", "rate-limit"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/spec.md
 - specs/010-admin-account/checklists/requirements.md
tests:
 - none (spec stage)
---

## Prompt

Change the shared lockout: keep a separate counter for the Account
page's current-password check, so failing it does not block login,
and failed logins do not block a password change. Same limit and
message style as login, counted per admin account.

## Response snapshot

Replaced the shared-counter design in spec.md:
- US1 scenario 13 now describes 5 failures in 15 minutes per account, followed by a 15-minute block.
- New scenario 14 covers login and password change blocking independently of each other.
- The Lockout scope edge case was rewritten.
- FR-010 now specifies a separate per-account counter that persists across restarts; new FR-010a says the two counters never cross.
- Key entity changed to a new "Password-change failure record".
- SC-006 was updated to cover independence both ways.
- Checklist notes updated.

"Same limit" was read as login's 5-in-15-minutes threshold, keyed per account rather than per source. This was flagged to the user.

## Outcome

- ✅ Impact: Lockout for password change is decoupled from login
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: 002 has two login limits (5/source, 20/account), so "same limit, per account" is ambiguous. Chose 5 and surfaced it.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
