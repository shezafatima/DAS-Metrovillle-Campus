---
id: 0001
title: Foundation feature specification
stage: spec
date: 2026-09-17
surface: agent
model: claude-opus-5
feature: 002-foundation
branch: 002-foundation
user: shezafatima
command: /sp.specify
labels: ["spec","foundation","admin-auth","admin-layout","security"]
links:
  spec: specs/002-foundation/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/002-foundation/spec.md
 - specs/002-foundation/checklists/requirements.md
tests:
 - none (specification stage)
---

## Prompt

# Feature Brief — 002 Foundation

Set up the data connection, admin authentication, and the admin area
layout that every later admin feature builds on.

## References
- docs/prd.md §2, §6.1, §6.2
- research/design-tokens.md (brand colors and fonts for the admin)

## User Stories

### P1 — Admin account setup
The developer can create the single admin account without any public
sign-up.
- One command creates the admin from environment values (email and
  password).
- Running it again does not create a second account; it reports that
  the admin exists and changes nothing.
- The same command with an explicit reset option updates the admin's
  password (this is the password-recovery path for this phase).
- It refuses a password shorter than 12 characters.

### P1 — Admin login and logout
- /admin/login accepts email and password.
- Wrong email or wrong password shows the same generic error; it
  never reveals which one was wrong or whether the account exists.
- Successful login goes to /admin. The session survives page reloads.
- Visiting /admin/login while logged in goes straight to /admin.
- Logout ends the session and returns to /admin/login.
- There is no way to register a new account, from the UI or the API.

### P1 — Protected admin area
- Any /admin page (except login) opened without a valid session
  redirects to /admin/login, then returns to the requested page after
  login.
- Any admin API request without a valid session is rejected as
  unauthorized, even if the page-level redirect is bypassed.
- Expired sessions behave the same as no session.

### P2 — Admin layout
- The admin area has its own layout, separate from the public header
  and footer.
- Sidebar: Overview, News, Messages, Signups, Settings; the current
  section is marked active.
- Top bar shows the logged-in admin's email and a logout button.
- On small screens the sidebar collapses into a menu button.
- Overview, News, Messages, Signups and Settings exist as placeholder
  pages until their own features are built.

### P2 — Login abuse protection
- Repeated failed logins are temporarily blocked with a clear
  "too many attempts, try again later" message.
- The block works across server restarts.

### P3 — Shared building blocks for later features
Ready and tested so features 003–007 can reuse them:
- Soft delete: deleted records are hidden from normal queries and can
  be restored.
- Public form protection: request rate limiting and a hidden spam
  trap field.
- A basic health check that reports whether the database is
  reachable, without exposing any details.

## Deviations from the Reference
- The admin area has no das.edu.pk reference. It uses the site's
  brand colors and fonts from research/design-tokens.md with a clean,
  standard dashboard layout.

## Edge Cases
- Database unreachable: login shows a generic "service unavailable"
  message; no stack traces or connection details are shown.
- Missing environment values: the app and the setup command fail
  early with a clear message naming the missing value.
- Admin pages are excluded from search engines and not linked from
  the public site.
- Email is matched case-insensitively at login.

## Out of Scope
- Password reset by email, multiple admins, roles.
- News, messages, signups and settings functionality (features
  003, 004, 007, 010).
- Admin overview counts (feature 010).

## Acceptance
- An e2e test covers login, logout, wrong credentials, redirect when
  logged out, and the blocked-after-repeated-failures case.
- Every admin API route test proves unauthorized requests are
  rejected.
- Tests prove the setup command never creates a second admin.
- Admin layout works at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch `002-foundation` (number 2: highest existing feature was
001; name matches PRD §9 build order) via
`.specify/scripts/powershell/create-new-feature.ps1`.

Wrote `specs/002-foundation/spec.md` with six prioritised user stories
mirroring the brief (P1 account setup, P1 login/logout, P1 protected
area, P2 admin layout, P2 abuse protection, P3 shared building blocks),
each with Given/When/Then acceptance scenarios; ten edge cases; 33
functional requirements grouped by story; four key entities (Admin,
Session, Login attempt record, Soft-deletable record pattern); a
"Deviations from the Reference" section noting the admin area has no
das.edu.pk counterpart so Principle I does not apply while Principle V
(tokens only) still does; nine documented assumptions (7-day idle
session, 5 failures/15 min → 15 min block per source, 5 form
submissions/10 min, public health check, admin-only return destination,
no restore UI, placeholder content, setup reset as sole recovery path,
length-only password rule); out-of-scope list; ten measurable success
criteria.

Zero [NEEDS CLARIFICATION] markers: every open threshold had a
conventional default and none changed scope, so each was recorded as an
assumption instead.

Wrote `specs/002-foundation/checklists/requirements.md`; all 16
validation items pass on the first iteration.

## Outcome

- ✅ Impact: Feature 002 spec ready for `/sp.clarify` or `/sp.plan`; establishes the security and layout contract that features 003, 004, 007 and 010 depend on.
- 🧪 Tests: none run (spec stage); spec defines required e2e, unauthorized-route, idempotent-setup and 4-breakpoint layout tests as acceptance.
- 📁 Files: specs/002-foundation/spec.md, specs/002-foundation/checklists/requirements.md
- 🔁 Next prompts: `/sp.clarify` (optional, to revisit assumed thresholds) then `/sp.plan`
- 🧠 Reflection: The brief was already story-shaped, so the main value added was pinning down the open thresholds as explicit assumptions, adding open-redirect and case-normalisation edge cases, and separating "no reference exists" from "deviating from the reference" for the constitution.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist — PASS (16/16)
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
