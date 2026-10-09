# Feature Brief — 011 Roles and Users

> The full feature is specified in `specs/011-roles-and-users/spec.md` (revised 2026-09-29 for the right-hand user panel and the shared password input). This file keeps the acceptance items carried over from 010.

> Stub. The full brief is still to be written from `docs/prd.md` §6.1–6.2.
> Only the acceptance items already committed to by earlier features are recorded here.

## Acceptance

### Carried over from 010 Admin Account

The account actions from 010 are **Change password** and **Sign out other devices**. They were planned before roles existed, so their tests could only cover "no session" and "correct session" (see `specs/010-admin-account/plan.md`, Constitution Check III/XI). This feature MUST add the missing **wrong-role** case to complete the three-case access matrix (Constitution XI).

The account actions are self-service. Every role may change its own password and sign out its own other devices. For these actions, "wrong role" therefore means **a user acting outside their own account**. The tests MUST prove:

- A content manager with **no section grants** can open the Account page, change **their own** password and sign out **their own** other devices.
- A content manager's password change leaves the **main admin's** password unchanged. The main admin's old password still logs in, and every main admin session stays signed in.
- A content manager's "Sign out other devices" leaves **every main admin session** signed in. The reverse also holds: the main admin's action leaves the content manager's sessions signed in.
- The account actions accept no user id or email input. A request carrying one (e.g. a crafted form field) is ignored, and only the caller's own account is affected.
- The Account-page lockout counter is per account. A content manager reaching 5 wrong current-password attempts blocks only the content manager's password change, not the main admin's.
- The raw Better Auth mutation routes closed in 010 (`/change-password`, `/revoke-other-sessions`, `/update-user`, …) still return 404 for every role.
