# Feature Specification: Contact & Messages

**Feature Branch**: `008-contact-messages`
**Created**: 2026-09-24
**Status**: Draft
**Input**: User description: "Feature Brief — 008 Contact & Messages: The public contact form plus the admin inbox for the enquiries it collects. References: docs/prd.md §5.8, §6.4, §7; screenshots (contact page files, TODO: replace with actual filenames); research/design-tokens.md; public form protection, soft delete and shared form/table patterns from 002 and 004; ADR signup-upsert-and-restore does NOT apply — each message is a separate record, even from the same person. User stories: P1 visitor sends an enquiry (name, email, phone, subject, message; all required except phone; thank-you and cleared form on success; per-field messages and nothing saved until valid; phone accepts the same Pakistani formats as signup; same person can send several messages, each kept; layout matches reference). P1 admin reads messages (inbox newest first: name, subject, short preview, status, date; unread stand out; opening shows full details and marks read; email and phone clickable for email, call or WhatsApp; search by name, email or subject; filter by status; 20 per page). P1 admin tracks status (new, read, responded; opening changes new to read; admin can mark responded and set back to new or read; saved immediately with clear confirmation). P2 admin deletes a message (confirmation; soft delete; disappears from inbox and counts). P2 contact page details (campus address, phone, email, map and timings alongside the form matching the reference; values from Settings (005), until then from a content file in the same shape so the switch is a change of source only). P2 spam and abuse protection (hidden spam trap and rate limiting as on signup with the normal thank-you either way; overlong message rejected with a clear message). P3 new message indicator (admin sidebar shows count of new messages; updates after read or delete). Edge cases: Urdu names, subjects and text accepted and displayed correctly; very long messages display fully with line breaks preserved; no-phone messages display correctly; service unavailable shows friendly error and keeps typed message; message text shown as plain text, HTML or script never executed. Out of scope: email/SMS notifications, replying from the admin panel, attachments, auto-replies. Acceptance: E2E tests for send; see as new; open and becomes read; mark responded; search and filter; delete and disappears; two messages from the same email both kept; tests prove every admin message route rejects unauthorized requests; tests prove HTML message text is displayed safely; contact page matches the reference at 375, 768, 1024 and 1440px."

## Clarifications

### Session 2026-09-24

- Q: How should an opened message be shown? → A: A separate detail
  page per message (its own address), with a back link to the inbox
  that keeps the search, filter and page number.
- Q: Where should the map's location come from? → A: One ordinary
  Google Maps link is stored in the contact details (used for the
  "open in maps" link); the embedded map is built from the campus
  address.
- Q: Wire the admin overview Messages card to real counts here, or
  leave it to 011? → A: Wire it here: the card shows the count of
  non-deleted messages with the new count as its highlight.
- Q: Approve the documented deviations from the reference
  (Constitution I, sp.analyze C1)? → A: Approved: (1) Phone and Subject
  fields added (PRD §5.8); (2) one campus block instead of two emails
  plus Central Office — Metroville is a single campus; (3) a real map
  instead of the blank capture — the reference map did not load during
  capture; (4) no reCAPTCHA — the 002/004 spam trap and rate limit
  cover it and avoid a third-party dependency on the page. Not
  approved as written: (5) details above the form — the user asked
  for details and form side by side on desktop, stacking only at
  mobile widths, "as the reference does". The reference screenshots
  show the details and map above a full-width form band at desktop,
  tablet and phone widths, so the evidence was shown to the user
  before anything was changed (resolved in the next entry).
- Q: Item 5 — follow the reference (details and map above a
  full-width form at every width) or use a side-by-side desktop layout
  as a deviation? → A: Follow the reference. No deviation is needed;
  items 1–4 stay approved.
- Q: Is the Google Maps embed approved (Constitution II, sp.analyze
  C2)? → A: Yes, as part of approved item 3 (real map).
- Q: How should the map load? → A: Load the map only when it scrolls
  into view, and reserve its space so nothing on the page moves while
  it loads.

## Reference Material

- `docs/prd.md` §5.8 (Contact: address, phone, email, map; form with
  name, email, phone, subject, message; success message), §6.4
  (Messages inbox: newest first; status new/read/responded; filter by
  status; soft delete), §6.6 (Settings: contact details used by the
  Contact page), §7 (Message: contact form submission with status).
- Reference screenshots (resolving the brief's TODO):
  - Desktop: `screenshots/das.edu.pk_contact_.png`
  - Tablet: `screenshots/das.edu.pk_contact_(iPad Pro).png` and
    `screenshots/das.edu.pk_contact_(iPad Pro) (1).png`
  - Phone: `screenshots/das.edu.pk_contact_(Moto G Power).png` and
    `screenshots/das.edu.pk_contact_(Moto G Power) (1).png`
- `research/design-tokens.md` — the contact page entry (one form, two
  shadowed columns) and the general form-state colours added in 004
  (`--color-error`, `--color-success`).
- Building blocks from 002 and 004: public-form protection (per-form
  rate limit plus hidden spam-trap field), soft delete, admin layout
  with a `Messages` sidebar entry and a new-messages badge slot
  (currently always 0), admin overview "Messages" card with a
  new-messages highlight (currently hardcoded 0), data table,
  confirmation dialog, toasts, Pakistani mobile phone validation and
  canonical form, field-message and thank-you patterns.
- `history/adr/0001-signup-upsert-and-restore.md` — explicitly **not**
  applied: messages are append-only; every submission is its own
  record.

What the reference shows (desktop, 1440px): the site shell, then a
page banner titled "Contact" with a "Home » Contact" breadcrumb. Below
it, four equal columns, each with an illustration, an uppercase
heading, a letter-spaced bold subtitle and plain text:

1. **BY PHONE** — "Monday to Saturday / 9am to 6pm PST", then the
   phone number.
2. **BY EMAIL** — "Write email on any of the following addresses",
   then the email address(es).
3. **VISIT US** — "Visit us in person and meet our representative",
   then the address (plus a "Central Office" address on the reference).
4. **WRITE US** — "Write us an inquiry by filling form below", then a
   "Click this link to view inquiry form" link.

Then a large centred navy heading "Locate Us on Google Maps" above a
tall map area (blank in the capture — the embed did not render), then
a full-width pale-yellow band holding the form: Name and Email side by
side, a large "Your Message" box at full width, and a full-width red
"Send" button. On tablet (768px) and phone (375px) the four columns
stack into one centred column in the same order; on phone the Name and
Email inputs also stack.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor sends an enquiry (Priority: P1)

A visitor opens the Contact page, fills in their name, email, an
optional phone number, a subject and their message, and presses Send.
If anything is missing or malformed, a short message appears next to
the affected field and nothing is saved. When everything is valid, a
clear thank-you message appears and the form is cleared. The same
person can come back and send another, different message; each one is
kept as its own record.

**Why this priority**: Receiving enquiries is the purpose of the
feature; without it the inbox has nothing to show.

**Independent Test**: Open /contact, submit valid details and see the
thank-you; submit with each required field blank or malformed and see
the matching field message with nothing stored; send two messages from
the same email and confirm two records exist.

**Acceptance Scenarios**:

1. **Given** the visitor opens the Contact page, **When** it is
   displayed, **Then** the form shows fields labelled Name, Email,
   Phone (marked optional), Subject and Message, and a Send button,
   laid out per the reference (see Deviations for the two added
   fields).
2. **Given** valid name, email, subject and message and an empty
   phone, **When** the visitor presses Send, **Then** a thank-you
   message appears, every field is emptied, and one new message record
   exists with status "new" and no phone.
3. **Given** any required field is empty (including whitespace only),
   **When** the visitor presses Send, **Then** a message next to that
   field names it as required, the other entries are kept, and nothing
   is saved.
4. **Given** an email that is not a valid address, **When** the
   visitor presses Send, **Then** a message next to the email field
   says the address is not valid and nothing is saved.
5. **Given** a phone typed as `03001234567`, `0300-1234567`,
   `+92 300 1234567` or `92 300 1234567`, **When** the visitor presses
   Send, **Then** each is accepted as the same Pakistani mobile number.
6. **Given** a phone that is filled in but is not a Pakistani mobile
   number, **When** the visitor presses Send, **Then** a message next
   to the phone field explains the expected format and nothing is
   saved.
7. **Given** a message record already exists for `ali@example.com`,
   **When** a second, different message arrives from
   `ALI@example.com`, **Then** a second, separate record is created and
   the first is unchanged.
8. **Given** the visitor has typed a message and the service cannot
   accept submissions, **When** they press Send, **Then** a friendly
   error message appears, everything they typed stays in the form, and
   they can try again.
9. **Given** the visitor has seen the thank-you, **When** they want to
   send another message, **Then** the page offers a way to show the
   empty form again.

---

### User Story 2 - Admin reads messages (Priority: P1)

The admin opens Messages and sees an inbox, newest first. Each row
shows the sender's name, the subject, a short preview of the message,
its status and the date received; new (unread) messages stand out.
The admin can search by name, email or subject, narrow the list by
status, and page through twenty at a time. Opening a message shows the
full details — name, email, phone (if any), subject, full message and
date — and marks it as read. The email opens the mail app, the phone
starts a call, and a WhatsApp link opens a chat with that number.

**Why this priority**: Enquiries are only useful if staff can find,
read and answer them; this is the admin's daily use of the feature.

**Independent Test**: With a few dozen messages seeded across all
statuses, the admin finds one by part of the sender's name, email or
subject, filters to "New", pages through results, opens a message to
see its full text, and clicks the email, phone and WhatsApp links.

**Acceptance Scenarios**:

1. **Given** messages exist, **When** the admin opens Messages,
   **Then** rows are ordered by date received, newest first, and each
   row shows name, subject, a short one-line preview of the message,
   status and date received.
2. **Given** a mix of new and read messages, **When** the list is
   shown, **Then** new messages are visually distinct (bolder text and
   a "New" status marker) in a way that does not rely on colour alone.
3. **Given** the admin types part of a name, email or subject into the
   search box, **When** results update, **Then** only matching rows are
   shown (case-insensitive; Urdu text matches).
4. **Given** the admin selects a status filter (All, New, Read,
   Responded), **When** results update, **Then** only messages with
   that status are shown; search and filter combine.
5. **Given** more than twenty rows match, **When** the admin moves to
   the next page, **Then** the next twenty appear and the current
   search and filter are kept.
6. **Given** a message, **When** the admin opens it, **Then** its own
   detail page shows the full name, email, phone (or a clear "not
   provided"), subject, date received, status and the complete message
   text; the back link returns to the inbox with the same search,
   filter and page.
7. **Given** a message with a phone number, **When** the admin clicks
   the email, **Then** the mail app opens addressed to the sender with
   the subject pre-filled as a reply; **When** they click the phone,
   **Then** the device offers to call it; **When** they click
   WhatsApp, **Then** a WhatsApp chat with that number opens in a new
   tab.
8. **Given** a message with no phone, **When** it is opened, **Then**
   no call or WhatsApp link is shown and the layout is otherwise
   unchanged.
9. **Given** no messages exist, or none match, **When** the list is
   shown, **Then** a friendly empty state explains this within the
   normal admin layout.
10. **Given** no admin session, **When** anyone requests the Messages
    screen, a message's detail, or any message data or action, **Then**
    the request is refused using the 002 protection.

---

### User Story 3 - Admin tracks status (Priority: P1)

Every message is new, read or responded. Opening a new message makes
it read automatically. Once the admin has replied (outside the panel),
they mark the message as responded; they can also set it back to new
or read. Each change is saved straight away and confirmed on screen.

**Why this priority**: Status is how staff know which enquiries still
need a reply; without it the inbox cannot be worked through.

**Independent Test**: Open a new message and see its status become
read; mark it responded and see a confirmation; set it back to new and
see it listed as new again.

**Acceptance Scenarios**:

1. **Given** a message with status new, **When** the admin opens it,
   **Then** its status becomes read, and returning to the inbox shows
   it as read.
2. **Given** a message with status read or responded, **When** the
   admin opens it, **Then** its status is unchanged.
3. **Given** an open message, **When** the admin chooses
   "Mark as responded", **Then** the status is saved as responded
   immediately and a confirmation message appears.
4. **Given** a read or responded message, **When** the admin sets it
   back to new or read, **Then** the new status is saved immediately
   and confirmed; a message set back to new remains new until it is
   opened again later.
5. **Given** the status change cannot be saved, **When** the admin
   makes the change, **Then** an error message appears and the
   displayed status stays at its previous value.

---

### User Story 4 - Admin deletes a message (Priority: P2)

The admin removes a message (spam, test entries, duplicates). A dialog
asks for confirmation. The message is hidden, not destroyed, and no
longer appears in the inbox, search, filters or counts.

**Why this priority**: Housekeeping; the inbox is usable without it.

**Independent Test**: Delete a seeded message after confirming, see it
leave the inbox and the counts drop, and confirm the record still
exists marked as deleted.

**Acceptance Scenarios**:

1. **Given** the admin clicks Delete on a message (from the list or
   the detail view), **When** they confirm, **Then** the message
   disappears from the inbox, a confirmation message appears, and the
   new-messages count and overview counts no longer include it.
2. **Given** the admin clicks Delete and then cancels, **When** the
   dialog closes, **Then** nothing changes.
3. **Given** a deleted message, **When** the admin searches or filters
   for it, or opens its old address, **Then** it is not shown (the
   detail view shows a clear "no longer available" message).
4. **Given** a message is deleted, **When** the stored data is
   inspected, **Then** the record still exists with a deletion marker
   and can be recovered by a developer.

---

### User Story 5 - Contact page details (Priority: P2)

Around the form, the Contact page shows the campus phone and office
timings, email, address and a map, with a link down to the form,
matching the reference. These values come from one source shaped like
the Settings contact group; until Settings (005) exists, that source is
a content file, so moving to Settings changes only where the values are
read from.

**Why this priority**: Many visitors only need the phone number or
location; the form works without these details.

**Independent Test**: Open /contact and confirm the four detail
columns, map heading and map show the values from the content file;
change a value in the content file and see it reflected on the page.

**Acceptance Scenarios**:

1. **Given** the Contact page, **When** it is displayed, **Then** it
   shows the banner and breadcrumb, then four columns — By Phone
   (timings and phone), By Email (email), Visit Us (address) and Write
   Us (link to the form) — then the "Locate Us on Google Maps" heading
   and a map of the campus, then the form band, laid out per the
   reference at each width.
2. **Given** the phone and email, **When** the visitor taps them,
   **Then** the phone starts a call and the email opens the mail app.
3. **Given** the visitor clicks the Write Us link, **When** the page
   responds, **Then** it moves to the form and places focus in the
   first field.
4. **Given** the map cannot load, **When** the page is displayed,
   **Then** the map area shows the address with a link that opens the
   location in a maps app, and the rest of the page is unaffected.
5. **Given** a value in the contact-details source changes, **When**
   the page is next displayed, **Then** the new value appears, with the
   same values used by the site header and footer.
6. **Given** a value the client has not yet supplied, **When** it is
   displayed, **Then** it is marked as placeholder in the same way as
   other placeholder copy on the site.
7. **Given** the visitor opens the page and the map area is below the
   visible part of the screen, **When** the page loads, **Then** the
   map is not requested, and its space is already reserved; **When**
   they scroll the map area into view, **Then** the map loads inside
   that space without moving the heading above it or the form below
   it.

---

### User Story 6 - Spam and abuse protection (Priority: P2)

The form uses the same protection as the signup form. A visitor who
sends too many messages in a short window is asked to try again
shortly, with everything they typed kept. Automated submissions that
fill the hidden spam trap are discarded without being stored while
the submitter sees the ordinary thank-you. Messages longer than the
maximum are rejected with a clear message stating the limit.

**Why this priority**: Keeps the inbox free of junk once the site is
public; the form works without it during testing.

**Independent Test**: Send valid messages six times in quick
succession from one source and see the sixth refused; submit once with
the hidden field filled and see the thank-you but no new record; submit
a message over the limit and see the length message.

**Acceptance Scenarios**:

1. **Given** a visitor has sent the maximum allowed messages within
   the window, **When** they send again, **Then** they see a friendly
   "please try again shortly" message, their typed entries stay in the
   form, and nothing is saved.
2. **Given** the window has passed, **When** the same visitor sends,
   **Then** the message is accepted normally.
3. **Given** a submission with the hidden spam-trap field filled,
   **When** it is processed, **Then** no record is created and the
   response is identical to a successful send.
4. **Given** a message longer than the maximum, **When** the visitor
   presses Send, **Then** a message next to the message field states
   the limit, their text is kept, and nothing is saved; the character
   counter (FR-006) shows how close they are to the limit.
5. **Given** a genuine visitor, **When** they fill the form normally,
   **Then** the hidden field is never visible, focusable or announced
   by assistive technology.
6. **Given** the contact form and the signup form, **When** a visitor
   uses both, **Then** each form has its own rate-limit allowance, so
   signing up does not use up the contact form's allowance.

---

### User Story 7 - New message indicator (Priority: P3)

The admin sidebar's Messages item shows how many messages are new, so
staff can see at a glance that enquiries are waiting. The admin
overview's Messages card shows the total and highlights the new count.
Both update after messages are read, set back to new or deleted.

**Why this priority**: Convenience; the inbox itself already shows
which messages are new.

**Independent Test**: With three new messages, see "3" on the sidebar;
open one and see "2"; delete another and see "1".

**Acceptance Scenarios**:

1. **Given** three new, non-deleted messages, **When** any admin screen
   is shown, **Then** the Messages sidebar item shows 3.
2. **Given** no new messages, **When** any admin screen is shown,
   **Then** no count is shown on the sidebar item.
3. **Given** the admin opens a new message, sets a message back to
   new, or deletes a new message, **When** the next admin screen is
   shown (including the one the action lands on), **Then** the count
   reflects the change.
4. **Given** five non-deleted messages of which two are new, **When**
   the admin opens the overview, **Then** the Messages card shows 5
   with a highlight of 2.

---

### Edge Cases

- Urdu (and mixed Urdu/English) names, subjects and message text are
  accepted, stored unchanged, and shown with the correct direction and
  the site's Urdu font in the inbox row, preview and detail view.
- Very long messages display in full in the detail view, wrapping long
  words and links without horizontal scrolling, with the visitor's
  line breaks preserved; the inbox preview is a single line, cut off
  with an ellipsis.
- Messages without a phone display normally; the phone slot reads "not
  provided" and no call or WhatsApp link appears.
- Message text, subject and name containing HTML or script (e.g.
  `<script>alert(1)</script>`, `<b>bold</b>`, `<img onerror=…>`) are
  shown exactly as typed, as plain text, in the inbox and detail view;
  nothing is executed or rendered as markup.
- Leading and trailing spaces are removed from every field; a field
  that is only spaces counts as empty; internal line breaks in the
  message are kept.
- The same email sends two identical messages seconds apart: both are
  kept (subject to the rate limit); there is no duplicate merging.
- The service is unavailable or the send fails part-way: the visitor
  sees a friendly error and everything typed remains.
- A message is deleted while the admin has an older inbox page or its
  detail open: acting on it again shows a clear "no longer available"
  message rather than an error.
- Two admins (or two tabs) change the status of the same message:
  the last change saved wins and the screen shows the saved status.
- A message is opened and marked read, but the admin had filtered the
  inbox to "New": returning to the list no longer shows it under that
  filter.

## Requirements *(mandatory)*

### Functional Requirements

**Public form**

- **FR-001**: The Contact page MUST show a form with Name, Email,
  Phone, Subject and Message fields and a Send button. Name, Email,
  Subject and Message MUST be required; Phone MUST be optional and
  labelled as such.
- **FR-002**: Every field MUST be trimmed of leading and trailing
  spaces before validation; a required field empty after trimming MUST
  be reported as required. Line breaks inside the message MUST be kept.
- **FR-003**: Name MUST accept any script including Urdu and be 1–100
  characters. Email MUST be a valid address of at most 254 characters
  and MUST be stored lower-cased and trimmed. Subject MUST accept any
  script and be 1–150 characters. Message MUST accept any script and be
  1–5,000 characters.
- **FR-004**: Phone, when filled in, MUST follow exactly the signup
  rule from 004: Pakistani mobile numbers in the forms `03XXXXXXXXX`,
  `0300-XXXXXXX`, `+92 3XX XXXXXXX`, `92 3XX XXXXXXX` are accepted and
  normalised to one canonical number; anything else is rejected with a
  message explaining the expected format.
- **FR-005**: Validation messages MUST appear next to the field they
  concern, name the problem in plain words (including the limit when a
  length is exceeded), and nothing MUST be saved until every field is
  valid. Correcting a field MUST clear its message.
- **FR-006**: The Message field MUST show a character counter against
  the 5,000-character limit.
- **FR-007**: On success the page MUST show a clear thank-you message
  in place of the form and clear every field, and MUST offer a way to
  show the empty form again.
- **FR-008**: If the send cannot be completed, the page MUST show a
  friendly error and keep everything the visitor typed.
- **FR-009**: The form MUST be usable by keyboard and screen reader:
  every field labelled, messages associated with their field, and the
  thank-you and errors announced when they appear.

**Records**

- **FR-010**: Every valid submission MUST create a new, separate
  message record — including repeat or identical submissions from the
  same email. Existing records MUST never be updated, merged or
  restored by a public submission.
- **FR-011**: Each message record MUST have: name, email, phone
  (optional, canonical form), subject, message text, status, date
  received, date of last status change, and a deletion marker.
- **FR-012**: A new message MUST start with status "new". Status MUST
  be one of new, read or responded.

**Admin inbox**

- **FR-013**: The admin Messages screen MUST list every non-deleted
  message ordered by date received, newest first, showing name,
  subject, a one-line preview of the message (about the first 100
  characters, ending in an ellipsis when cut), status and date
  received.
- **FR-014**: New messages MUST be visually distinct from read and
  responded ones by more than colour alone (e.g. weight plus a
  labelled status).
- **FR-015**: The inbox MUST support one search box matching name,
  email or subject (case-insensitive, Urdu text supported) and a
  status filter (All, New, Read, Responded), combinable, with search
  and filter kept when moving between pages.
- **FR-016**: The inbox MUST be paginated with 20 messages per page
  and MUST show a friendly empty state when nothing exists or matches.
- **FR-017**: Opening a message MUST go to its own detail page (one
  address per message) showing name, email, phone (or "not provided"),
  subject, date received, status and the full message text with line
  breaks preserved and long content wrapped within the layout. The
  page MUST have a back link to the inbox that restores the search,
  filter and page number the admin came from. Deleting from the
  detail page MUST return the admin to the inbox.
- **FR-018**: In the detail view the email MUST be a mail link (with
  the subject pre-filled as a reply), and when a phone is present it
  MUST be both a call link and a WhatsApp link that opens in a new tab.
  In the inbox list, the sender's email MUST also be reachable (via
  the detail view is sufficient).
- **FR-019**: Name, email, subject and message text MUST always be
  displayed as plain text; any HTML or script within them MUST be shown
  literally and never rendered or executed, in every admin view.

**Status**

- **FR-020**: Opening a message whose status is new MUST change it to
  read; opening a read or responded message MUST NOT change its status.
- **FR-021**: The admin MUST be able to set any message's status to
  new, read or responded from the detail view. Each change MUST be
  saved immediately (no separate save step) and confirmed with an
  on-screen message; if saving fails, an error MUST be shown and the
  previous status kept on screen.

**Delete**

- **FR-022**: Delete MUST be available from the inbox row and the
  detail view, MUST ask for confirmation in a dialog, MUST soft-delete
  using the 002 building block, and MUST confirm with an on-screen
  message. Deleted messages MUST be excluded from the inbox, search,
  filters, detail view and all counts. No admin restore screen is
  provided; recovery is by a developer.

**Contact details**

- **FR-023**: The Contact page MUST show, per the reference: By Phone
  (office timings and phone), By Email (email), Visit Us (address), and
  Write Us (a link that moves to the form and focuses its first field),
  followed by a "Locate Us on Google Maps" heading and an embedded map
  of the campus.
- **FR-024**: Phone and email on the Contact page MUST be call and
  mail links. The embedded map MUST be built from the campus address.
  An "open in maps" link using the stored Google Maps link MUST
  accompany the map, and if the map cannot load, the map area MUST
  show the address with that link.
- **FR-024a**: The map MUST NOT be requested until its area scrolls
  into view; before that, no request to the map provider is made. The
  map area MUST keep a fixed, reserved size (from the design tokens)
  from the first render, so loading the map moves nothing else on the
  page.
- **FR-025**: Phone, email, address, Google Maps link and office timings
  MUST come from a single contact-details source whose shape matches
  the Settings (005) "Contact & social" group. Until 005 exists, that
  source MUST be the site's content file (the same values the header
  and footer already use, extended with the Google Maps link and
  timings), so
  switching to Settings changes only where the values are read from.
  Values not yet supplied by the client MUST be marked as placeholder
  in the site's usual way.
- **FR-026**: The Contact page MUST follow the reference layout,
  colours, spacing and type at 375, 768, 1024 and 1440px using
  `research/design-tokens.md`, with no horizontal scrolling. The two
  fields the reference lacks (Phone, Subject) MUST use the same input
  styling as Name and Email.

**Protection**

- **FR-027**: The public submission MUST use the 002 public-form
  protection with its own allowance separate from the signup form:
  submissions beyond the allowed rate from one source within the window
  MUST be refused with a friendly "please try again shortly" message,
  keeping the typed entries.
- **FR-028**: A submission with the hidden spam-trap field filled MUST
  be discarded without creating a record, and the response MUST be
  indistinguishable from a successful send. The hidden field MUST NOT
  be visible, focusable or announced to genuine visitors.
- **FR-029**: A message longer than 5,000 characters MUST be rejected
  on the server as well as in the browser, with a message stating the
  limit.

**Access and counts**

- **FR-030**: Every admin message screen, data request and action
  (list, search, filter, detail, status change, delete, counts) MUST
  reject requests without a valid admin session using the 002
  protection.
- **FR-031**: The admin sidebar's Messages item MUST show the number
  of non-deleted messages with status new, hidden when zero, and
  reflect status changes and deletions on the next admin screen shown.
- **FR-032**: The admin overview's Messages card MUST show the count
  of non-deleted messages with the new count as its highlight,
  replacing the placeholder zeros from 002.

### Key Entities

- **Message**: One enquiry sent through the contact form. Attributes:
  name, email, phone (optional, canonical Pakistani mobile), subject,
  message text, status (new / read / responded), date received, date
  of last status change, created and updated times, deletion marker
  (soft delete). Append-only from the public side: never merged by
  email; many messages may share one email.
- **Message Status**: The fixed set new, read, responded, used for the
  row marker, the inbox filter and the counts.
- **Contact Details**: The campus's public contact values — phone,
  email, address, Google Maps link (an ordinary share link, not embed
  code), office timings — in the shape of the
  Settings "Contact & social" group. Read by the Contact page, header
  and footer. Sourced from the content file until 005, then from
  Settings.

## Deviations from the Reference

- **Added fields** *(approved 2026-09-24)*: the reference form has
  only Name, Email and Message. Per PRD §5.8 and the brief, this
  feature adds Phone (optional) and Subject. Desktop and tablet layout:
  Name | Email on the first row, Phone | Subject on the second row,
  Message full width, Send full width. Phone: all fields stacked in one
  column, as the reference stacks Name and Email.
- **Single campus** *(approved 2026-09-24)*: the reference lists two
  emails and a separate "Central Office" address for the whole school
  network; this site shows the one Metroville campus email and address
  from the contact-details source. The Visit Us column shows one
  address.
- **Details position relative to the form** *(not a deviation —
  confirmed 2026-09-24)*: the brief says details sit "alongside the
  form", but the reference screenshots place the four detail columns
  and the map *above* a full-width form band at every width. The
  reference layout is followed, as confirmed in Clarifications.
- **Map** *(approved 2026-09-24)*: the reference's map area is blank in
  every capture (the embed did not load). This feature shows a real
  embedded map of the campus location in the same area and
  proportions, with the fallback in FR-024. The Google Maps embed is
  approved as part of this item.
- **States**: the reference shows no validation, thank-you, error or
  character-counter states; these use the 004 form-state colours
  (`--color-error` = CTA red, `--color-success` = accent cyan) and the
  field-message pattern from 004.
- **No reCAPTCHA** *(approved 2026-09-24)*: the reference shows a
  reCAPTCHA badge; spam protection here is the 002 spam trap plus rate
  limit, and no badge is shown, avoiding a third-party dependency on
  the page.

## Assumptions

- Length limits: name 100, email 254, subject 150, message 5,000
  characters (a few paragraphs is ample for an enquiry; long enough to
  never block a genuine visitor).
- Rate limit uses the 002 default (5 submissions per source per 10
  minutes), as a separate allowance from the signup form.
- Phone is stored in the same canonical international form as signups
  (`+923XXXXXXXXX`) and shown to the admin as `03XXXXXXXXX`; the call
  and WhatsApp links use the international form.
- The inbox preview is roughly the first 100 characters of the message
  on one line, with line breaks shown as spaces.
- Dates are shown in Pakistan Standard Time, day-month-year with time;
  ties in ordering are broken by most recently created.
- Setting a message back to "new" does not re-trigger the automatic
  change to "read" until the admin opens it again on a later visit.
- Office timings default to the reference wording ("Monday to
  Saturday, 9am to 6pm PST") marked as placeholder until the client
  confirms Metroville's hours; phone, email and address keep their
  current placeholder values from 001 until supplied.
- The illustrations and column subtitles on the reference are static
  page copy (not Settings values) and are reproduced as-is.
- Sidebar and overview counts refresh when the next admin screen is
  rendered; live push updates are not needed.
- The overview Messages card is wired here (confirmed in
  Clarifications), following the 004 precedent for the Signups card;
  the remaining overview count (published news) stays with
  011-admin-overview.
- "Recoverable" means the record is kept with a deletion marker and can
  be recovered by a developer; there is no admin trash or restore
  screen, matching 004.

## Dependencies

- 002-foundation: admin session protection, soft delete, public-form
  protection, admin layout, sidebar badge slot, overview card, toasts,
  confirmation dialog, data table.
- 004-signup: phone validation and canonical form, form-state colours,
  field-message and thank-you patterns, rate-limit test setup.
- 005-settings (not yet built): future source of contact details. This
  feature must not depend on it being present.

## Out of Scope

- Email or SMS notifications when a message arrives.
- Replying to messages from inside the admin panel.
- File attachments.
- Auto-replies to the sender.
- An admin trash view or restore button for deleted messages.
- Editing a message's content from the admin.
- Bulk actions (bulk mark as read, bulk delete).
- Exporting messages.
- Building Settings (005) or its admin screen.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can send an enquiry in under 2 minutes on a
  phone using only the on-screen labels, and sees the thank-you
  immediately after pressing Send.
- **SC-002**: 100% of submissions with a missing or malformed required
  field, a malformed phone, or an over-length value show a message next
  to that field and store nothing — proven by automated tests covering
  each field and each accepted phone format.
- **SC-003**: Two messages sent from the same email (in different
  capitalisation) result in two separate records, both visible in the
  inbox — proven by an automated end-to-end test.
- **SC-004**: An automated end-to-end test covers the full admin cycle:
  a sent message appears as new in the inbox; opening it makes it read;
  marking it responded is saved and confirmed; search and status
  filter find it; deleting it removes it from the inbox and the new
  count.
- **SC-005**: 100% of admin message screens, data requests and actions
  refuse requests without an admin session — proven by automated tests
  covering each one.
- **SC-006**: A message whose name, subject and text contain HTML and
  script is displayed literally in the inbox and detail view with no
  script executed and no markup rendered — proven by an automated test.
- **SC-007**: In an inbox of 200 messages, the admin finds one by name,
  email or subject in a single search action with results in under 1
  second; filter and pagination keep the search intact.
- **SC-008**: The sixth submission from one source within the window is
  refused with the "try again shortly" message, and a spam-trap
  submission stores nothing while returning the normal thank-you —
  proven by automated tests.
- **SC-009**: A 5,000-character Urdu message with line breaks displays
  in full in the detail view with line breaks intact, correct
  direction, and no horizontal scrolling at 375px and 1440px.
- **SC-010**: The Contact page renders without visual defects and
  without horizontal scrolling at 375, 768, 1024 and 1440px, matching
  the reference screenshots except for the documented deviations.
- **SC-011**: The sidebar new-message count equals the number of
  non-deleted new messages after each open, status change and delete —
  proven by an automated test.
- **SC-012**: Opening the Contact page at 1440px makes no request to
  the map provider until the map area is scrolled into view, and the
  map loading causes no layout shift (the positions of the map area
  and the form band are unchanged, and no layout-shift is recorded) —
  proven by an automated test.
