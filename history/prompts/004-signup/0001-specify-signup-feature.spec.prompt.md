---
id: 0001
title: Specify signup feature
stage: spec
date: 2026-09-22
surface: agent
model: claude-opus-5
feature: 004-signup
branch: 004-signup
user: shezafatima
command: /sp.specify
labels: ["signup", "lead-capture", "admin", "spec"]
links:
  spec: specs/004-signup/spec.md
  ticket: null
  adr: null
  pr: null
files:
 - specs/004-signup/spec.md
 - specs/004-signup/checklists/requirements.md
tests:
 - none (specification only)
---

## Prompt

Feature Brief — 004 Signup

A lead-capture form used on the Home and Resources pages, plus the admin list of collected signups.

References
docs/prd.md §5.1 (Signup section), §5.6, §6.5, §7
screenshots/<home signup section files> (TODO: replace with actual filenames)
research/design-tokens.md
Public form protection and soft delete from 002
Admin UI patterns from 002
User Stories
P1 — Visitor signs up
The form asks for name, email and phone. All three are required.
Heading and supporting text come from the page's content, with marked placeholder text until the client supplies it.
On success the visitor sees a thank-you message and the form clears.
Invalid entries show a clear message next to the field; nothing is saved until all fields are valid.
Phone accepts Pakistani mobile numbers in common formats (03XXXXXXXXX, 0300-XXXXXXX, +92 3XX XXXXXXX, 92 3XX XXXXXXX).
A short note under the form says how the details will be used (text supplied by the client).
Layout and styling match the reference.
P1 — One record per person
Emails are matched regardless of capital letters or extra spaces.
A repeat signup with the same email updates that person's name and phone instead of creating a second record.
The first signup date is kept; the latest signup date is updated.
The visitor sees the same thank-you message whether they are new or returning, so the form never reveals who has signed up.
The pages each person signed up from are recorded (Home, Resources).
P1 — Admin views signups
Table of signups, most recent first: name, email, phone, pages signed up from, first and latest signup dates.
Search by name, email or phone; filter by page.
Paginated, 20 per page.
Phone and email are clickable (call and email).
P2 — Admin deletes a signup
Delete asks for confirmation and is recoverable (soft delete).
If a deleted person signs up again, their record is restored and updated, not duplicated.
P2 — Spam and abuse protection
Repeated submissions from the same visitor in a short time are blocked with a friendly "please try again shortly" message.
Automated submissions caught by the hidden spam trap are silently ignored while showing the normal thank-you message.
P3 — Export
Admin downloads the current filtered list as a CSV file that opens correctly in Excel, including Urdu names.
(Remove this story if the client declines CSV export; see PRD open question 6.)
Placement
The form is one reusable section, used by Home (006) and Resources (009).
Until those pages are built, it appears on the Home placeholder page so it can be tested end to end.
Edge Cases
Urdu names are accepted and displayed correctly.
Leading/trailing spaces are removed from every field.
Two submissions with the same email at the same moment still result in one record.
If the service is unavailable, the visitor sees a friendly error and their typed details stay in the form.
Very long names are rejected past a sensible limit.
Out of Scope
Sending emails or SMS to signups.
Lead status tracking (contacted, enrolled, etc.).
Editing signups from the admin.
Newsletter sending.
Acceptance
E2E tests: sign up; sign up again with the same email in different capitals and confirm one updated record; submit invalid data and see errors; see the signup in the admin list; search and filter; delete and restore by signing up again; export CSV (if kept).
Tests prove the admin signup routes reject unauthorized requests.
Tests prove the response is identical for new and repeat emails.
Form matches the reference at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch `004-signup` and wrote `specs/004-signup/spec.md` from the
brief, PRD §5.1/§5.6/§6.5/§7 and the desktop home screenshot (signup
band: navy background, centred heading with yellow number, three white
inputs in a row, red Signup button). Resolved the screenshot TODO:
`screenshots/das.edu.pk_.png` is the only capture reaching the section;
phone/tablet captures are cut off at 16384px, so a narrow-width layout
is stated in Assumptions.

Six user stories (visitor signs up; one record per person; admin views;
admin deletes; spam protection; CSV export as conditional P3), 28
functional requirements grouped by public form / records / admin list /
protection / export, key entities (Signup, Signup Page), deviations from
reference, assumptions (placeholder copy, phone canonical form
`03XXXXXXXXX`, 100-char name limit, 002 rate-limit defaults, overview
count deferred to 011), out of scope, and 10 success criteria. No
[NEEDS CLARIFICATION] markers; two open points (CSV export, narrow
layout) recorded as assumptions. Quality checklist written with all
items passing.

## Outcome

- ✅ Impact: Spec ready for `/sp.clarify` or `/sp.plan`.
- 🧪 Tests: none (specification only).
- 📁 Files: specs/004-signup/spec.md, specs/004-signup/checklists/requirements.md
- 🔁 Next prompts: `/sp.clarify` (confirm CSV export, narrow layout, phone canonical form), then `/sp.plan`.
- 🧠 Reflection: Branch was cut from `003-news` with its uncommitted work still in the tree; commit or stash 003 before implementing 004.

## Evaluation notes (flywheel)

- Failure modes observed: none.
- Graders run and results (PASS/FAIL): spec quality checklist PASS (16/16).
- Prompt variant (if applicable): n/a
- Next experiment (smallest change to try): n/a
