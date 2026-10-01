---
id: 0003
title: Account scoped lockout block
stage: spec
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: spec revision
labels: ["admin", "account", "lockout", "sessions"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/spec.md
tests:
 - none (spec stage)
---

## Prompt

Keep 5 failures in 15 minutes, per account. Confirm the block is
stored against the account, not the session, so logging out and
back in does not clear it.

## Response snapshot

Confirmed the 5-in-15-minutes per-account limit. Made the account scope explicit in spec.md:
- FR-010: the counter and block are keyed to the account, not to the source or the session. Logout/login, a new device, a password change or "sign out other devices" never clears them.
- New US1 scenario 14: log out, log back in and retry within the block; the attempt is still refused. The former scenario 14 is renumbered to 15.
- The Lockout scope edge case now says only the 15-minute window expiring clears the block.
- The key entity is described as belonging to the account.
- SC-006 now includes fresh-session attempts.

## Outcome

- ✅ Impact: Block cannot be bypassed by re-login
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md
- 🔁 Next prompts: /sp.plan
- 🧠 Reflection: Previous wording excluded only the source address; the session scope needed stating explicitly.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
