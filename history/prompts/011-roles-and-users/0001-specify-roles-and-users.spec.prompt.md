---
id: 0001
title: Specify roles and users
stage: spec
date: 2026-09-29
surface: agent
model: claude-opus-5-5
feature: 011-roles-and-users
branch: 011-roles-and-users
user: shezafatima
command: /sp.specify
labels: ["roles", "permissions", "user-management", "auth", "audit"]
links:
  spec: specs/011-roles-and-users/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/011-roles-and-users/spec.md
 - specs/011-roles-and-users/checklists/requirements.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 011 Roles & Users

Two roles with per-section permissions, user management for the main admin, and permission checks applied across every admin feature built so far.

References
docs/prd.md §2, §6.1, §6.2
Constitution §3 (Roles & Access), §11 (three tests per admin route)
ADR role-permissions-model
Features 002 (auth, sessions, lockout) and 010 (password change)
Roles
Main admin: everything, including user management and student registrations. Created by the seed script.
Content manager: only the sections the main admin has granted.

Permission keys, one per admin section: news, messages, careers, settings, pages. Registrations and users are main-admin only and are never grantable. New sections add a key without changing how permissions work.

User Stories
P1 — Main admin creates a content manager
A Users page, visible only to the main admin.
Create an account with an email and ticked permissions.
A temporary password is generated and shown once, with a copy button, so the admin can pass it on.
The account cannot log in anywhere else until its password is changed.
P1 — First login forces a new password
Logging in with a temporary password leads straight to a "set your password" page.
No other admin page or action works until it is set.
The same password rules as feature 010 apply.
After setting it, the user lands on the admin overview.
A temporary password that is never used expires after 7 days; the main admin can issue a new one.
P1 — Permissions are enforced everywhere
Every admin page, route and action checks the signed-in user's permission on the server, not just in the interface.
A content manager reaching a section they lack: pages redirect to the admin overview with a clear message; API requests are refused.
The sidebar, overview cards and notification bell show only sections the user may use.
A content manager can never see student registrations, user management, or another user's account.
No user can change their own permissions or role.
Permission changes take effect on the next request, without the user logging out and back in.
P2 — Managing users
List of users: email, role, permissions, status, last login.
Edit a user's permissions.
Disable a user: they cannot log in and their sessions end immediately. Re-enable restores access.
Reset a user's password: issues a new temporary password and ends their sessions.
Delete a user (soft delete).
The main admin cannot disable, delete or demote themselves, and the last main admin can never be removed.
P2 — Record of changes
Account and permission changes are recorded: who did it, to whom, what changed, and when.
The main admin can view this list, newest first.
P2 — Existing features gain checks
News, messages, signups/careers, settings and notification counts all check permissions.
The account actions from 010 gain the wrong-role test that feature could not have.
Edge Cases
A user disabled or deleted while logged in loses access on their next request.
A content manager with no permissions at all sees only the overview and their own account page.
Two browsers open as the same user: a permission change applies to both.
Temporary passwords are never shown again after creation and never appear in logs, records or emails.
Users are matched by email in lowercase; the same email cannot be used twice.
Out of Scope
More than two roles, or custom roles.
Invitations or password resets by email (no email service).
Two-factor authentication.
Permissions on individual records (a manager with news access can edit every news post).
Acceptance
Every admin route has three passing tests: no session, wrong role or missing permission, and correct permission.
E2E tests: create a content manager, log in with the temporary password, set a new one, confirm only permitted sections appear, confirm a forbidden URL is refused, change permissions and see the effect without re-login, disable the user and confirm they lose access.
Tests prove a content manager can never reach registrations, users or another user's account, by page or by API.
Tests prove no user can raise their own permissions.
Users pages work at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch `011-roles-and-users` (from 010-admin-account HEAD; 010's uncommitted working-tree changes carried over) and wrote `specs/011-roles-and-users/spec.md`: 6 user stories (3×P1: create content manager, forced first-login password, enforcement everywhere; 3×P2: managing users, change record, existing features gain checks incl. 010 carried-over wrong-role cases), 35 FRs, 9 success criteria, edge cases, assumptions, dependencies, out of scope. No clarification markers. Assumptions made: Signups section maps to `careers` key; main admin may create/promote/demote other main admins; creating with a deleted account's email restores it; disabled/deleted logins show 002's generic failure; change record kept indefinitely. Quality checklist all pass. Noted that ADR "role-permissions-model" does not exist yet.

## Outcome

- ✅ Impact: Spec ready for /sp.clarify or /sp.plan
- 🧪 Tests: none (spec stage)
- 📁 Files: spec.md, checklists/requirements.md
- 🔁 Next prompts: /sp.clarify (confirm assumptions) or /sp.plan; /sp.adr role-permissions-model during plan
- 🧠 Reflection: Brief was detailed enough to avoid clarification markers; key risks sit in the assumptions list.

## Evaluation notes (flywheel)

- Failure modes observed: referenced ADR missing from history/adr
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): null
- Next experiment (smallest change to try): null
