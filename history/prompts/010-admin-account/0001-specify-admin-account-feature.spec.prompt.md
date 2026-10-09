---
id: 0001
title: Specify admin account feature
stage: spec
date: 2026-09-28
surface: agent
model: claude-opus-5-5
feature: 010-admin-account
branch: 010-admin-account
user: shezafatima
command: /sp.specify
labels: ["admin", "account", "password", "sessions", "profile-menu"]
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

Feature Brief — 010 Admin Account

Lets the admin change their own password from inside the panel, instead of needing the setup script.

The login email is fixed and can only be changed by running the setup script. No email or display name editing in this feature.

References
Feature 002 (login, sessions, seed script, lockout)
Admin UI patterns from 002
Decision from 002: a password reset ends all existing sessions
User Stories
P1 — Change password
A profile control sits in the admin top bar, to the left of the notification bell, showing the admin's initial or avatar.
Clicking it opens a menu with the admin's email, an Account link and Logout (replacing the current plain logout button).
The Account link opens the Account page, where the password is changed.
The admin enters their current password, then the new password twice.
The current password must be correct; a wrong one shows a clear error and changes nothing.
The new password must be at least 12 characters and different from the current one.
The two new-password entries must match.
On success: a confirmation message, the admin stays logged in on this device, and every other session is signed out.
Repeated wrong current-password attempts are blocked the same way as repeated failed logins.
P2 — Session visibility
The Account page says when the password was last changed.
A button signs out all other devices without changing the password.
Edge Cases
Password fields are never pre-filled, logged, or sent back to the browser.
The profile menu closes on Escape, on clicking outside and after choosing an item, and works by keyboard.
On phones the profile control shows without crowding the bell or the menu button.
Password managers can still fill and save the fields normally.
Leaving the page with unsaved details warns first.
If the change fails (service unavailable), nothing is changed and the admin stays logged in.
The setup script still works as the recovery path if the password is forgotten; this feature does not replace it.
Constraints
The setup script is run manually only. It must never be wired into the build, deploy, postinstall, or any startup code.
The setup script remains the recovery path if the password is forgotten.
Out of Scope
Changing the login email or display name.
Password reset by email (no email service this phase).
Two-factor authentication.
Multiple admin accounts, roles or invitations.
Profile photos.
Acceptance
E2E tests: change the password, confirm login works with the new one and fails with the old one; wrong current password is rejected; mismatched new passwords are rejected; a short password is rejected; a second logged-in session is signed out after a password change; sign out other devices works on its own.
One e2e test per user story is enough; keep the suite small.
Tests prove the account routes reject unauthorized requests.
Tests prove passwords never appear in responses or logs.
Account page and profile menu work at 375, 768, 1024 and 1440px.
Logout still works from its new place in the profile menu.

## Response snapshot

Created branch 010-admin-account (from 009-admin-notifications HEAD; the uncommitted 009 working-tree changes carried over) and wrote specs/010-admin-account/spec.md. The spec has 2 user stories (P1 change password via the profile menu and Account page, 13 scenarios; P2 last-changed date and sign out other devices, 4 scenarios), 20 FRs, 8 SCs, edge cases, assumptions and out of scope. No clarification markers. Defaults: lockout counters are shared with login, the initial comes from the email, sign-out-others asks for confirmation, and the sidebar-footer logout is removed. The quality checklist passes.

## Outcome

- ✅ Impact: Spec ready for /sp.clarify or /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.clarify (optional), /sp.plan
- 🧠 Reflection: 002 spec supplied the lockout thresholds, the log format and the rule that a reset ends sessions, so the feature stays consistent without asking questions.

## Evaluation notes (flywheel)

- Failure modes observed: Glob timed out on history/ and .specify/; used PowerShell ls instead.
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
