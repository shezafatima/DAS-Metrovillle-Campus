---
id: 0001
title: Specify contact and messages
stage: spec
date: 2026-09-24
surface: agent
model: claude-opus-5-5
feature: 008-contact-messages
branch: 008-contact-messages
user: shezafatima
command: /sp.specify
labels: ["spec", "contact", "messages", "admin-inbox", "public-form"]
links:
  spec: specs/008-contact-messages/spec.md
  ticket: null
  adr: history/adr/0001-signup-upsert-and-restore.md
  pr: null
files:
 - specs/008-contact-messages/spec.md
 - specs/008-contact-messages/checklists/requirements.md
 - history/prompts/008-contact-messages/0001-specify-contact-and-messages.spec.prompt.md
tests:
 - none (specification stage)
---

## Prompt

Feature Brief — 008 Contact & Messages

The public contact form plus the admin inbox for the enquiries it collects.

References
docs/prd.md §5.8, §6.4, §7
screenshots/<contact page files> (TODO: replace with actual filenames)
research/design-tokens.md
Public form protection, soft delete and shared form/table patterns from 002 and 004
ADR signup-upsert-and-restore: that rule does NOT apply here. Each message is a separate record, even from the same person.
User Stories
P1 — Visitor sends an enquiry
Fields: name, email, phone, subject, message. All required except phone.
Success shows a clear thank-you message and clears the form.
Invalid entries show messages next to the field; nothing is saved until all fields are valid.
Phone accepts the same Pakistani formats as the signup form.
The same person can send several different messages; each is kept separately.
Layout and styling match the reference.
P1 — Admin reads messages
Inbox listing, newest first: name, subject, a short preview of the message, status and date.
Unread (new) messages stand out from read ones.
Opening a message shows the full details and marks it as read.
The sender's email and phone are clickable, so the admin can reply by email, call or WhatsApp.
Search by name, email or subject; filter by status.
Paginated, 20 per page.
P1 — Admin tracks status
Status is new, read or responded.
Opening a message changes new to read automatically.
The admin can mark a message as responded, and can set it back to new or read.
The status change is saved immediately with a clear confirmation.
P2 — Admin deletes a message
Delete asks for confirmation and is recoverable (soft delete).
Deleted messages disappear from the inbox and its counts.
P2 — Contact page details
The page shows campus address, phone, email, map and timings alongside the form, matching the reference.
These values come from Settings (feature 005). Until Settings exists, they come from a content file in the same shape, so the switch is a change of source only.
P2 — Spam and abuse protection
The hidden spam trap and rate limiting work as on the signup form, with the normal thank-you message shown either way.
A message longer than a sensible maximum is rejected with a clear message.
P3 — New message indicator
The admin sidebar shows how many messages are new.
The count updates after messages are read or deleted.
Edge Cases
Urdu names, subjects and message text are accepted and displayed correctly in the inbox and detail view.
Very long messages display fully without breaking the layout, with line breaks preserved.
Messages from an address with no phone number still display correctly.
If the service is unavailable, the visitor sees a friendly error and their typed message stays in the form.
Message text is displayed as plain text; any HTML or script in it is never executed.
Out of Scope
Email or SMS notifications when a message arrives (the admin checks the panel).
Replying from inside the admin panel.
File attachments.
Auto-replies to the sender.
Acceptance
E2E tests: send a message; see it as new in the inbox; open it and confirm it becomes read; mark it responded; search and filter; delete it and confirm it disappears; send two messages from the same email and confirm both are kept.
Tests prove every admin message route rejects unauthorized requests.
Tests prove message text containing HTML is displayed safely.
Contact page matches the reference at 375, 768, 1024 and 1440px.

## Response snapshot

Created branch `008-contact-messages` (number taken from the brief and PRD §9 build order) and wrote `specs/008-contact-messages/spec.md`: 7 prioritised user stories (send enquiry, read inbox, track status, delete, contact details, spam protection, new-message indicator), 32 functional requirements, 11 success criteria. The screenshot TODO is resolved to the `das.edu.pk_contact_*` files. Deviations recorded: Phone and Subject fields added to the reference's Name/Email/Message form; single campus address and email; details sit above the form as in the reference; a real map replaces the blank capture; no reCAPTCHA. Defaults recorded in Assumptions: limits 100/254/150/5,000; the 002 rate limit with its own allowance; overview Messages card wired here following the 004 precedent. No [NEEDS CLARIFICATION] markers. The checklist passes.

## Outcome

- ✅ Impact: Spec ready for /sp.clarify or /sp.plan.
- 🧪 Tests: none (spec stage); acceptance tests defined in SC-002–SC-011.
- 📁 Files: spec.md, checklists/requirements.md, this PHR.
- 🔁 Next prompts: /sp.clarify (office timings, overview card ownership) or /sp.plan.
- 🧠 Reflection: The reference form has only three fields, and its layout puts the details above the form rather than "alongside" it. Both conflicts are recorded as deviations and not left open.

## Evaluation notes (flywheel)

- Failure modes observed: none
- Graders run and results (PASS/FAIL): spec quality checklist PASS
- Prompt variant (if applicable): none
- Next experiment (smallest change to try): none
