---
id: 0005
title: Partial save reporting and 011 wrong-role
stage: plan
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: plan revision
labels: ["admin", "account", "error-handling", "roles", "testing"]
links:
  spec: specs/010-admin-account/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/010-admin-account/spec.md
 - specs/010-admin-account/plan.md
 - specs/010-admin-account/research.md
 - specs/010-admin-account/data-model.md
 - specs/010-admin-account/contracts/account-actions.md
 - specs/010-admin-account/contracts/profile-menu-ui.md
 - docs/briefs/011-roles-and-users.md
tests:
 - none (plan stage)
---

## Prompt

If the password saved but ending other sessions failed, don't show
"couldn't save". Show that the password was changed but other
devices may still be signed in, with the "Sign out other devices"
button offered. Only show a failure message if the password itself
didn't save.

 Add the missing wrong-role test for the account actions to the
011-roles brief's acceptance criteria, not just a note in this plan.

(Follow-up answer: create a new brief stub file for 011.)

## Response snapshot

- Replaced the all-or-nothing FR-011 with truthful reporting, driven by a saved-check that runs after any unexpected `changePassword` error:
  - verify `newPassword` against the stored hash on the server, then check whether this device's session still exists
  - four outcomes: `unavailable` (not saved), `changed_others_remain` (saved; the Sign out other devices button is offered inline), `changed_signed_out` (saved; this device must log in again), `unconfirmed` (the check failed; never claims nothing changed)
- Updated the spec edge cases, contracts (state type, saved-check steps, copy, tests), UI contract, research §1/§11, data-model log events, and plan risks/decisions.
- Created `docs/briefs/011-roles-and-users.md` as a stub with a "Carried over from 010" acceptance section listing the wrong-role tests. The plan's Constitution Check now links to it.

## Outcome

- ✅ Impact: No false "couldn't save" after a saved password; 011 cannot close without the wrong-role matrix
- 🧪 Tests: none run; saved-check unit tests added to contract obligations
- 📁 Files: 6 spec artifacts updated, 1 brief stub created
- 🔁 Next prompts: /sp.tasks
- 🧠 Reflection: Verifying the hash is exact, whereas timestamps would be heuristic. The session check distinguishes the two partial states without knowing which Better Auth step failed.

## Evaluation notes (flywheel)

- Failure modes observed: One PowerShell call got no verdict from the auto-mode classifier; used Grep instead.
- Graders run and results (PASS/FAIL): Constitution Check still PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
