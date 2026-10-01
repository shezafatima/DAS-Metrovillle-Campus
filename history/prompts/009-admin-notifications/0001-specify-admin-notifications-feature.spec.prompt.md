---
id: 0001
title: Specify admin notifications feature
stage: spec
date: 2026-09-26
surface: agent
model: claude-sonnet-5
feature: 009-admin-notifications
branch: 009-admin-notifications
user: s2636309@gmail.com
command: /sp.specify
labels: [admin, notifications, spec]
links:
  spec: specs/009-admin-notifications/spec.md
  ticket: null
  adr: null
  pr: null
files:
  - specs/009-admin-notifications/spec.md
  - specs/009-admin-notifications/checklists/requirements.md
tests:
  - none (spec stage; no tests run or added)
---

## Prompt

Feature Brief — 009 Admin Notifications

Unread indicators in the admin panel for new messages and new signups, updating while the admin is logged in.

References
docs/prd.md §6
Existing sidebar badge for new messages (feature 008)
Admin layout and UI patterns from 002

User Stories

P1 — Bell in the header
A bell icon sits in the admin top bar on every admin page.
It shows a dot when anything is new, and the total count when known.
Clicking it opens a panel listing the newest items, most recent first, mixing messages and signups: who it is from, a short description (subject for a message, email for a signup), and how long ago it arrived.
New items stand out from ones already seen.
Choosing an item goes straight to it (the message detail, or the Signups list) and closes the panel.
The panel shows at most the 10 newest items, with a link to see all messages and all signups.
"Mark all as read" clears everything: messages become read and signups count as seen.
An empty panel says there is nothing new.
The panel closes on Escape, on clicking outside, and after choosing an item; it can be opened and used by keyboard.

P1 — Unread indicator in the sidebar
Messages and Signups each show an indicator when something new has arrived: a count when the number is known, otherwise a dot.
The sidebar and the bell always agree, because both use the same counts.
The indicator is visible whether the sidebar is expanded or collapsed to icons.
No indicator is shown when there is nothing new.

P1 — What counts as new
Messages: any message with status "new" (as already built).
Signups: any signup created since the admin last opened the Signups page.
Opening the section clears its indicator; for messages, the count falls as each one is read.
The "last opened" moment is remembered per admin across devices and sessions.

P2 — Updating without reloading
While the admin is logged in, indicators refresh automatically about once a minute, without reloading the page.
They also refresh immediately after the admin reads, deletes or changes the status of a message, or deletes a signup.
Checking pauses while the browser tab is in the background and resumes when it returns.

P2 — Overview page
The Overview cards for Messages and Signups show the same new counts, using the same source, so the numbers always agree with the sidebar.

P3 — Page title indicator
When something is new, the browser tab title is prefixed with the total count, so the admin notices while working in another tab.

Edge Cases
A signup whose record is updated by a repeat submission counts as new again, since the admin should see the updated details.
Deleted messages and signups are never counted.
If the count cannot be loaded, the previous value stays and no error is shown.
Counts above 99 display as "99+".
The indicator and bell never appear on the login page.
The panel stays usable on a phone, opening full width rather than as a narrow dropdown.
An item deleted in another tab disappears from the panel on the next refresh instead of leading to a missing page.

Out of Scope
Email, SMS or browser push notifications.
A record of past alerts once they have been read (the panel lists current items only).
Live updates pushed from the server (checking on a timer is enough).
Sounds.
Notifications for anything other than messages and signups.

Acceptance
E2E tests: submit a contact message and a signup, confirm the bell and both sidebar indicators appear, open the panel and confirm both items are listed, choose one and confirm it opens the right place, use "mark all as read" and confirm everything clears.
Tests prove deleted records are not counted.
Tests prove the count endpoint rejects unauthorized requests.
Indicators display correctly with the sidebar expanded and collapsed, at 375, 768, 1024 and 1440px.

## Response snapshot

Ran `/sp.specify` for this brief. Checked all three number sources
(remote branches, local branches, `specs/`) — highest existing was 008,
none used the `admin-notifications` short name — and created branch
`009-admin-notifications` via `create-new-feature.ps1 -Number 9
-ShortName "admin-notifications"`, which also scaffolded
`specs/009-admin-notifications/spec.md` and this prompts directory.

Before writing the spec, read 008-contact-messages (spec + data-model)
for the existing message "new/read/responded" status and its sidebar
badge/Overview card wiring, 004-signup's data model for how a repeat
submission updates `lastSignupAt` (the basis for "counts as new
again"), and 002-foundation's data model for the constraint that the
admin `user` collection is auth-owned with exactly one admin today —
which shaped the "Admin Notification State" key entity (a per-admin
identifier is still stored even though only one admin exists). Also
read the current sidebar/top-bar/overview components
(`app-sidebar.tsx`, `admin-top-bar.tsx`, admin `page.tsx`,
`stat-card.tsx`) to ground the spec in real, existing UI seams rather
than assuming implementation details.

Wrote `spec.md` with 6 prioritised user stories (bell, sidebar
indicator, what-counts-as-new, live updates, Overview, page title),
matching Given/When/Then acceptance scenarios per story, edge cases,
30 functional requirements, 2 key entities, an Assumptions section
resolving the brief's few ambiguous UX points (e.g. when the bell shows
a dot vs. a number; that "mark all as read" only ever moves "new"
messages to "read", never touching "responded" ones) without needing
any [NEEDS CLARIFICATION] markers, Dependencies on 002/004/008, Out of
Scope, and 10 measurable Success Criteria. Generated and validated
`checklists/requirements.md` — all items pass on the first iteration.

## Outcome

- ✅ Impact: `specs/009-admin-notifications/spec.md` and its quality
  checklist are ready for `/sp.clarify` (optional, given zero
  [NEEDS CLARIFICATION] markers) or directly for `/sp.plan`.
- 🧪 Tests: None run or added at this stage; spec defines the E2E,
  unauthorized-access and viewport acceptance tests planning must cover.
- 📁 Files: `specs/009-admin-notifications/spec.md` (new),
  `specs/009-admin-notifications/checklists/requirements.md` (new).
- 🔁 Next prompts: `/sp.plan` for 009-admin-notifications (and
  optionally `/sp.clarify` first, though no open questions remain).
- 🧠 Reflection: The brief was precise enough that no clarification
  round was needed; the main judgment calls were the "Admin
  Notification State" entity's shape (given the single-admin, auth-owned
  `user` collection constraint from 002) and what "mark all as read"
  does to messages already beyond "new" — both resolved via Assumptions
  and cross-checked against 002/004/008 rather than guessed.

## Evaluation notes (flywheel)

- Failure modes observed: None.
- Graders run and results (PASS/FAIL): Manual checklist self-review —
  PASS on all Content Quality, Requirement Completeness and Feature
  Readiness items on the first pass.
- Prompt variant (if applicable): N/A.
- Next experiment (smallest change to try): N/A.
