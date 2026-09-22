# Feature Specification: Signup

**Feature Branch**: `004-signup`
**Created**: 2026-09-22
**Status**: Draft
**Input**: User description: "Feature Brief — 004 Signup: A lead-capture form used on the Home and Resources pages, plus the admin list of collected signups. References: docs/prd.md §5.1 (Signup section), §5.6, §6.5, §7; screenshots (home signup section); research/design-tokens.md; public form protection and soft delete from 002; admin UI patterns from 002. User stories: P1 visitor signs up (name, email, phone all required; heading and supporting text from the page's content with marked placeholder text until the client supplies it; thank-you message and cleared form on success; clear per-field messages for invalid entries and nothing saved until all fields are valid; phone accepts Pakistani mobile numbers in common formats 03XXXXXXXXX, 0300-XXXXXXX, +92 3XX XXXXXXX, 92 3XX XXXXXXX; a short client-supplied note under the form on how details are used; layout and styling match the reference). P1 one record per person (emails matched regardless of capitals or extra spaces; a repeat signup updates name and phone instead of creating a second record; first signup date kept, latest updated; same thank-you for new and returning so the form never reveals who has signed up; the pages each person signed up from are recorded — Home, Resources). P1 admin views signups (table most recent first: name, email, phone, pages, first and latest dates; search by name, email or phone; filter by page; 20 per page; phone and email clickable). P2 admin deletes a signup (confirmation; soft delete; a deleted person signing up again restores and updates the record). P2 spam and abuse protection (repeated submissions from the same visitor blocked with a friendly 'please try again shortly'; hidden spam trap silently ignored while showing the normal thank-you). P3 export (CSV of the current filtered list that opens correctly in Excel including Urdu names; remove if the client declines — PRD open question 6). Placement: one reusable section used by Home (006) and Resources (009); until then on the Home placeholder page for end-to-end testing. Edge cases: Urdu names accepted and displayed; leading/trailing spaces removed; two same-email submissions at the same moment still yield one record; if the service is unavailable the visitor sees a friendly error and their typed details stay; very long names rejected past a sensible limit. Out of scope: sending emails or SMS to signups; lead status tracking; editing signups from the admin; newsletter sending. Acceptance: E2E tests for sign up, repeat with different capitals yielding one updated record, invalid data showing errors, signup visible in admin list, search and filter, delete and restore by signing up again, CSV export if kept; tests prove admin signup routes reject unauthorized requests; tests prove the response is identical for new and repeat emails; form matches the reference at 375, 768, 1024 and 1440px."

## Clarifications

### Session 2026-09-22

- Q: Keep CSV export in this feature or drop it pending PRD open
  question 6? → A: Keep it (P3) as specified; it is part of this
  feature's definition of done.
- Q: Layout at phone and tablet widths, given no reference reaches
  the section? → A: 375px: single column (heading, supporting line,
  Name, Email, Phone, button, note). 768px: three fields in one row,
  button full-width below, centred. Desktop row layout from 1024px.
- Q: Accept only Pakistani mobiles, or also landlines / foreign
  numbers? → A: Pakistani mobiles only; landlines and foreign numbers
  are rejected with a format message. Shown to the admin as
  `03XXXXXXXXX` (stored as `+923XXXXXXXXX` per `docs/architecture.md`;
  settled in planning).
- Q: Wire the admin overview "Signups" card to a real count here, or
  leave it to 011-admin-overview? → A: Wire it here: the card shows
  the count of non-deleted signups.

## Reference Material

- `docs/prd.md` §5.1 (Home signup section), §5.6 (Resources reuses the
  same signup), §6.5 (admin signups), §7 (Signup data: one record per
  email, repeat submission updates it, records the page it came from),
  §11 open question 6 (CSV export).
- Reference screenshots (resolving the brief's TODO):
  - Home, desktop, signup section near the foot of the page:
    `screenshots/das.edu.pk_.png` (section sits between the four
    icon quick-links and the partners logo strip).
  - Home, tablet and phone: `screenshots/das.edu.pk_(iPad Pro).png` and
    `screenshots/das.edu.pk_(Moto G Power).png` — both captures are
    cut off before the signup section, so no phone or tablet reference
    exists for it. Narrow-width layout is specified in Assumptions.
- `research/design-tokens.md` for colours, fonts and spacing.
- Building blocks delivered in 002: admin layout and `Signups` sidebar
  entry (currently a placeholder page), protected admin routes, data
  table, confirmation dialog, toasts, soft delete, public-form
  protection (rate limiting plus hidden spam-trap field).

What the reference shows (desktop): a full-width dark navy band. A
centred bold heading "Join Over 300,000 Students Enjoying Dar-e-Arqam
School Now" with the number in yellow, a centred supporting line
"Become Part of Dar-e-Arqam Schools to Further Your Career.", then one
row of three equal white inputs with placeholder labels "Name",
"Email", "Phone" and a red "Signup" button at the right end of the
row. There is no usage note under the form on the reference; the brief
adds one.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor signs up (Priority: P1)

A visitor scrolls to the signup section on the Home page (later also
on Resources), reads the heading and supporting line, types their
name, email and phone, and presses Signup. If anything is missing or
malformed, a short message appears next to the affected field and
nothing is saved. When all three are valid, the visitor sees a
thank-you message in place of the form and the fields are cleared. A
short note under the form explains how the details will be used.

**Why this priority**: Capturing leads is the whole purpose of the
feature; without a working form there is nothing for the admin to see.

**Independent Test**: Open the Home page, submit the form with valid
details and see the thank-you; submit with each field blank or
malformed and see the matching field message with nothing stored.

**Acceptance Scenarios**:

1. **Given** the visitor is on a page that includes the signup
   section, **When** the section is displayed, **Then** it shows the
   heading, supporting line, three fields labelled Name, Email and
   Phone, a Signup button and the usage note, laid out per the
   reference.
2. **Given** valid name, email and phone, **When** the visitor presses
   Signup, **Then** a thank-you message appears, the three fields are
   emptied, and one signup record exists with those details and the
   page it came from.
3. **Given** any field is empty (including whitespace only), **When**
   the visitor presses Signup, **Then** a message names that field as
   required next to it, the other entries are kept, and nothing is
   saved.
4. **Given** an email that is not a valid address, **When** the
   visitor presses Signup, **Then** a message next to the email field
   says the address is not valid and nothing is saved.
5. **Given** a phone typed as `03001234567`, `0300-1234567`,
   `+92 300 1234567` or `92 300 1234567`, **When** the visitor presses
   Signup, **Then** each is accepted as the same Pakistani mobile
   number.
6. **Given** a phone that is not a Pakistani mobile number (for
   example a landline, too few digits, or letters), **When** the
   visitor presses Signup, **Then** a message next to the phone field
   explains the expected format and nothing is saved.
7. **Given** the visitor has typed details and the service cannot
   accept submissions, **When** they press Signup, **Then** a friendly
   error message appears, the typed details remain in the fields, and
   the visitor can try again.
8. **Given** the client has not yet supplied the heading, supporting
   line or usage note, **When** the section is displayed, **Then** the
   placeholder wording is marked as placeholder in the content file
   and on the rendered element (a `data-placeholder` attribute), in the
   same way as other placeholder copy on the site — there is no
   visible badge, so the public page looks like the reference.
9. **Given** the visitor is on a phone (375px), tablet (768px) or
   desktop (1024px, 1440px), **When** they view the section, **Then**
   the layout follows the reference (desktop) or the narrow-width
   layout in Assumptions, with no horizontal scrolling and all fields
   and the button reachable by keyboard.

---

### User Story 2 - One record per person (Priority: P1)

Each email address maps to exactly one signup record. A repeat signup
with the same email — in any capitalisation and with any surrounding
spaces — updates that person's name and phone, keeps the date they
first signed up, sets the latest signup date to now, and adds the
page they signed up from to the record's list of pages. The visitor
sees the identical thank-you whether they are new or returning.

**Why this priority**: Duplicate records make the admin list
misleading and inflate counts; the PRD defines the data model as one
record per email.

**Independent Test**: Sign up as `Ali@Example.com`, then again as
`  ali@example.com ` with a different name and phone from another
page; confirm one record with the new name and phone, the original
first date, an updated latest date, and both pages listed.

**Acceptance Scenarios**:

1. **Given** no record for `ali@example.com`, **When** a signup arrives
   with `Ali@Example.COM`, **Then** one record is created and its
   stored email is `ali@example.com`.
2. **Given** a record for `ali@example.com` with name "Ali" and phone
   A, **When** a signup arrives with ` ALI@example.com `, name "Ali
   Khan" and phone B, **Then** the same record now has name "Ali Khan"
   and phone B, its first signup date is unchanged, its latest signup
   date is the time of the second submission, and no second record
   exists.
3. **Given** a record created from Home, **When** the same email signs
   up from Resources, **Then** the record lists both Home and
   Resources as pages; signing up again from Home does not list Home
   twice.
4. **Given** one new and one returning email, **When** each submits
   valid details, **Then** the response is the same for both: the same
   on-screen message, the same status code, and the same response
   body and headers as far as the browser can observe.
5. **Given** two submissions with the same email arrive at the same
   moment, **When** both are processed, **Then** exactly one record
   exists afterwards and both visitors see the thank-you.

---

### User Story 3 - Admin views signups (Priority: P1)

The admin opens Signups in the admin area and sees a table of everyone
who has signed up, most recent first, with name, email, phone, the
pages they signed up from, and their first and latest signup dates.
They can search by name, email or phone, narrow to one page (Home or
Resources), and move through the list twenty rows at a time. Emails
and phones are links that open the mail app or start a call.

**Why this priority**: The collected leads are only useful if the
school can see and contact them; this is the admin's daily use of the
feature.

**Independent Test**: With a few dozen signups seeded across both
pages, the admin can find a specific person by part of their name,
email or phone, narrow to Resources only, page through the results,
and click an email or phone to open the mail or phone app.

**Acceptance Scenarios**:

1. **Given** signups exist, **When** the admin opens Signups, **Then**
   rows are ordered by latest signup date, newest first, and each row
   shows name, email, phone, pages, first signup date and latest
   signup date.
2. **Given** the admin types part of a name, email or phone into the
   search box, **When** results update, **Then** only matching rows
   are shown (case-insensitive; Urdu names match; a phone search
   matches regardless of how the digits were originally typed).
3. **Given** the admin selects the "Resources" page filter, **When**
   results update, **Then** only people who signed up from Resources
   (possibly among other pages) are shown; "All" shows everyone.
4. **Given** more than twenty rows match, **When** the admin moves to
   the next page, **Then** the next twenty appear and the current
   search and filter are kept.
5. **Given** a row, **When** the admin clicks the email, **Then** the
   mail app opens addressed to that email; **When** they click the
   phone, **Then** the device offers to call that number.
6. **Given** no signups exist, or none match the search and filter,
   **When** the list is shown, **Then** a friendly empty state
   explains this within the normal admin layout.
7. **Given** a record with an Urdu name, **When** it is shown in the
   table, **Then** the name reads right-to-left in the site's Urdu
   font without disturbing the row layout.
8. **Given** no admin session, **When** anyone requests the Signups
   screen or any signup data or action, **Then** the request is
   refused using the 002 protection.
9. **Given** three non-deleted signups and one deleted one, **When**
   the admin opens the overview, **Then** the "Signups" card shows 3.

---

### User Story 4 - Admin deletes a signup (Priority: P2)

The admin removes a person from the list. A dialog asks for
confirmation first. The record is hidden, not destroyed. If that
person signs up again later, their existing record comes back into
the list — updated with the new name, phone, page and latest date —
rather than a fresh duplicate being created.

**Why this priority**: Needed for housekeeping (test entries, requests
to be removed), but the list is usable without it.

**Independent Test**: Delete a seeded signup after confirming, see it
leave the table, sign up again with the same email, and see the single
restored record reappear with updated details and its original first
signup date.

**Acceptance Scenarios**:

1. **Given** the admin clicks Delete on a row, **When** the dialog
   appears and they confirm, **Then** the row disappears, a
   confirmation message appears, and the record is excluded from the
   list, search, filter and export.
2. **Given** the admin clicks Delete and then cancels, **When** the
   dialog closes, **Then** nothing changes.
3. **Given** a deleted record for `ali@example.com`, **When** a signup
   with that email arrives, **Then** the record is restored (visible
   again) with the new name, phone and page added, the original first
   signup date kept and the latest signup date updated; no second
   record exists.
4. **Given** a deleted record, **When** the admin searches for it,
   **Then** it is not found.

---

### User Story 5 - Spam and abuse protection (Priority: P2)

The form uses the 002 public-form protection. A visitor who submits
too many times in a short window is asked to try again shortly, with
their typed details kept. Automated submissions that fill the hidden
spam-trap field are discarded without being stored, while the
submitter sees the ordinary thank-you so bots learn nothing.

**Why this priority**: Prevents the signup list from filling with junk
once the site is public; the form works without it during testing.

**Independent Test**: Submit valid details six times in quick
succession from one source and see the sixth refused with the "try
again shortly" message; submit once with the hidden field filled and
see the thank-you but no new record.

**Acceptance Scenarios**:

1. **Given** a visitor has submitted the maximum allowed times within
   the window, **When** they submit again, **Then** they see a
   friendly "please try again shortly" message, their typed details
   stay in the form, and nothing is saved.
2. **Given** the window has passed, **When** the same visitor submits,
   **Then** the submission is accepted normally.
3. **Given** a submission with the hidden spam-trap field filled in,
   **When** it is processed, **Then** no record is created or updated
   and the response is identical to a successful signup.
4. **Given** a genuine visitor, **When** they fill the form normally,
   **Then** the hidden field is never visible, focusable or announced
   by assistive technology, so they cannot trip it by accident.

---

### User Story 6 - Export (Priority: P3)

The admin downloads the signups currently shown by the active search
and filter (all pages of results, not just the visible twenty) as a
CSV file. Opening the file in Excel shows one row per person with the
same columns as the table, and Urdu names display correctly.

**Why this priority**: Convenient for sharing leads with staff; the
list is complete without it, so it is built after the P1 and P2
stories. Confirmed in scope (PRD open question 6 resolved: keep).

**Independent Test**: With a search or filter applied, click Export,
open the downloaded file in Excel, and confirm the rows match the
filtered list and an Urdu name reads correctly.

**Acceptance Scenarios**:

1. **Given** the admin has a search and page filter applied, **When**
   they click Export, **Then** a CSV downloads containing every
   matching record (across all result pages) with columns name, email,
   phone, pages, first signup date, latest signup date, ordered as the
   table.
2. **Given** a record with an Urdu name and a name containing a comma
   or quotation mark, **When** the CSV is opened in Excel, **Then** the
   Urdu name reads correctly and the punctuated name stays in one
   cell.
3. **Given** no admin session, **When** the export is requested,
   **Then** it is refused.
4. **Given** no records match, **When** the admin exports, **Then** the
   file contains only the header row.

---

### Edge Cases

- Urdu names (and names mixing Urdu and English) are accepted, stored
  unchanged, and shown with the correct direction and font in the
  admin table and the export.
- Leading and trailing spaces are removed from every field before
  validation and storage; a field that is only spaces counts as empty.
- Repeated internal spaces in a name are collapsed to one.
- Two submissions for the same email arriving at the same moment
  produce exactly one record.
- Names longer than 100 characters are rejected with a message stating
  the limit; emails longer than 254 characters are rejected as invalid.
- Emails with capitals or surrounding spaces match the same record;
  the stored email is lower case and trimmed.
- The same person submits a phone in a different format on a repeat
  signup: the record keeps one canonical form of the number (see
  Assumptions), so the admin search finds it whichever way it was
  typed.
- The service is unavailable or the submission fails part-way: the
  visitor sees a friendly error and their typed details remain.
- A visitor submits, sees the thank-you, and wants to sign up someone
  else: the section offers a way to show the empty form again.
- A record is deleted while the admin has an older list page open:
  acting on that row again shows a clear "no longer available"
  message rather than an error.
- A record whose email was captured from a page name not in the known
  set (Home, Resources) cannot be created: the page is validated and
  unknown values are rejected.

## Requirements *(mandatory)*

### Functional Requirements

**Public form**

- **FR-001**: The signup section MUST be one reusable section that
  any public page can include by naming the page it sits on (Home or
  Resources). It MUST appear on the Home placeholder page in this
  feature so it can be tested end to end, and be ready for 006 (Home)
  and 009 (Resources) to place without changes.
- **FR-002**: The section MUST show a heading, a supporting line, three
  fields (Name, Email, Phone), a Signup button and a short usage note.
  Heading, supporting line and usage note MUST come from the page's
  content definitions, defaulting to the reference wording marked as
  placeholder until the client supplies final copy, in the same style
  used for other placeholder copy on the site.
- **FR-003**: All three fields MUST be required. Every field MUST be
  trimmed of leading and trailing spaces before validation; a field
  that is empty after trimming MUST be reported as required.
- **FR-004**: Name MUST accept any script including Urdu, MUST be
  between 1 and 100 characters after trimming, and MUST have repeated
  internal spaces collapsed to one.
- **FR-005**: Email MUST be a syntactically valid address of at most
  254 characters and MUST be stored lower-cased and trimmed.
- **FR-006**: Phone MUST accept Pakistani mobile numbers in at least
  these forms: `03XXXXXXXXX`, `0300-XXXXXXX`, `+92 3XX XXXXXXX`,
  `92 3XX XXXXXXX` (spaces and hyphens between digit groups allowed),
  MUST reject anything that is not an eleven-digit `03…` Pakistani
  mobile number in one of these forms (landlines and non-Pakistani
  numbers are rejected with a message explaining the expected format),
  and MUST normalise every accepted form to one canonical number so
  the admin sees `03XXXXXXXXX` however it was typed.
- **FR-007**: Validation messages MUST appear next to the field they
  concern, MUST name the problem in plain words, and nothing MUST be
  saved until every field is valid. Correcting a field MUST clear its
  message.
- **FR-008**: On success the section MUST replace the form with a
  thank-you message and clear all three fields; the thank-you MUST be
  identical for new and returning emails and MUST NOT reveal whether
  the email was already known.
- **FR-009**: If the submission cannot be completed (service
  unavailable, unexpected failure), the section MUST show a friendly
  error and keep the visitor's typed details in the fields.
- **FR-010**: The section MUST be usable by keyboard and screen reader:
  every field labelled, messages associated with their field, and the
  thank-you announced when it appears.
- **FR-011**: The section MUST follow the desktop reference for
  layout, colours, spacing and type at 1024 and 1440px, and the
  narrow-width layout in Assumptions at 375 and 768px, using the tokens
  in `research/design-tokens.md`, with no horizontal scrolling.

**Records**

- **FR-012**: Each signup record MUST have: name, email (unique across
  all records including deleted ones, compared lower-cased and
  trimmed), phone, the set of pages signed up from, first signup date,
  latest signup date, and a deletion marker.
- **FR-013**: A submission whose email matches an existing record MUST
  update that record's name and phone, add the page to its set of
  pages (without duplicates), set the latest signup date to now, keep
  the first signup date, and MUST NOT create a second record. A
  submission with a new email MUST create a record with first and
  latest signup dates both set to now.
- **FR-014**: Two submissions for the same email processed at the same
  moment MUST result in exactly one record, with both submissions
  reporting success to their visitors.
- **FR-015**: A submission whose email matches a deleted record MUST
  restore that record (clear the deletion marker) and update it per
  FR-013, keeping its first signup date and previous pages.
- **FR-016**: The page a signup came from MUST be one of the known
  pages (Home, Resources); any other value MUST be rejected.

**Admin list**

- **FR-017**: The admin Signups screen MUST list every non-deleted
  record ordered by latest signup date, newest first, showing name,
  email, phone, pages, first signup date and latest signup date.
- **FR-018**: The admin list MUST support one search box matching name,
  email or phone (case-insensitive; Urdu text; phone digits matched
  regardless of formatting) and a page filter (All, Home, Resources),
  combinable, with search and filter kept when moving between pages.
- **FR-019**: The admin list MUST be paginated with 20 records per
  page.
- **FR-020**: Email MUST be rendered as a mail link and phone as a
  call link in the table.
- **FR-021**: The admin list MUST show a friendly empty state when no
  records exist or none match.
- **FR-022**: Delete MUST ask for confirmation in a dialog, MUST
  soft-delete using the 002 building block, MUST remove the record
  from the list, search, filter and export immediately, and MUST show
  a confirmation message. Deleted records are not shown or restorable
  through the admin screens except via FR-015.
- **FR-023**: Every admin signup screen, data request and action
  (list, search, filter, delete, export) MUST reject requests without a
  valid admin session using the 002 protection.
- **FR-023a**: The admin overview's "Signups" card MUST show the
  current count of non-deleted signup records, replacing the
  placeholder zero from 002.

**Protection**

- **FR-024**: The public submission MUST use the 002 public-form
  protection: submissions beyond the allowed rate from one source
  within the window MUST be refused with a friendly "please try again
  shortly" message and the visitor's typed details kept.
- **FR-025**: A submission with the hidden spam-trap field filled MUST
  be discarded without creating or updating any record, and the
  response MUST be indistinguishable from a successful signup.
- **FR-026**: The hidden spam-trap field MUST NOT be visible,
  focusable or announced to genuine visitors.

**Export**

- **FR-027**: The admin MUST be able to download the records matching
  the current search and filter — all matching records, not only the
  current page — as a CSV file with a header row and the columns name,
  email, phone, pages, first signup date, latest signup date, in table
  order.
- **FR-028**: The CSV MUST open correctly in Excel on Windows with
  Urdu names shown correctly, and values containing commas, quotation
  marks or line breaks MUST stay within one cell.

### Key Entities

- **Signup**: One person who has asked to be contacted. Attributes:
  name, email (unique key), phone (canonical form), pages signed up
  from (set of Home / Resources), first signup date, latest signup
  date, created and updated times, deletion marker (soft delete).
- **Signup Page**: A fixed, known set of pages that can host the
  section — Home and Resources in this feature — used for the record's
  pages, the admin filter and the export.

## Deviations from the Reference

- The reference has no usage note under the form; this feature adds a
  short client-supplied note per the brief.
- The reference shows no validation or thank-you states; this feature
  defines inline field messages, a thank-you state and an error state.
  Because the reference has no error or success colour, two general
  semantic colours are introduced for form states site-wide (reusable
  by the contact form and the admin): error = the reference's CTA red
  (`#F44336`, already used as the admin's destructive colour) and
  success = the reference's accent cyan (`#00BCD4`). Both are existing
  reference palette values; only their use as state colours is new.
  Field messages sit on a white chip under the input so the red stays
  legible on the navy band.

## Assumptions

- Placeholder copy until the client supplies final text: heading "Join
  Over 300,000 Students Enjoying Dar-e-Arqam School Now", supporting
  line "Become Part of Dar-e-Arqam Schools to Further Your Career.",
  and a usage note along the lines of "We will only use these details
  to contact you about admissions and school updates." All three are
  marked as placeholder in the same way as other placeholder copy on
  the site, and the "300,000" figure is static text in this feature
  (Settings-driven numbers arrive in 005).
- Narrow-width layout (no phone or tablet reference exists; confirmed
  in Clarifications): at 375px the heading, supporting line, Name,
  Email, Phone, button and note stack in one column at full width; at
  768px the three fields sit in one row with the button full-width
  below, centred; from 1024px the desktop row layout applies. Colours,
  fonts and spacing follow the desktop reference and the design tokens.
- Phone canonical form (confirmed in Clarifications, storage form
  settled during planning against `docs/architecture.md`): numbers are
  stored in the international form `+923XXXXXXXXX` and shown to the
  admin (table, CSV) as `03XXXXXXXXX`; the call link uses the stored
  international form. Pakistani mobile numbers only; landlines and
  foreign numbers are rejected in this feature.
- Name limit is 100 characters; email limit is 254 characters.
- Rate limit uses the 002 default (5 submissions per source per 10
  minutes) unless tuning is needed.
- Sorting is by latest signup date; ties are broken by most recently
  updated.
- Dates in the admin table and CSV are shown in Pakistan Standard Time
  in an unambiguous day-month-year form with time.
- A returning signup that supplies a different name or phone
  overwrites the previous values; no history of old values is kept.
- The "All" page filter includes people who signed up from any page;
  a specific page filter includes anyone whose set of pages contains
  that page.
- The admin overview card "Signups" (currently a hardcoded 0) is wired
  to the real count in this feature (confirmed in Clarifications);
  011-admin-overview keeps responsibility for the remaining counts.
- The public site continues to show the section with the same content
  delivery and placeholder conventions established in 001.

## Out of Scope

- Sending emails or SMS to signups; newsletter sending.
- Lead status tracking (contacted, enrolled, etc.).
- Editing signups from the admin.
- Admin-side restore of deleted signups or a trash view (restore
  happens only when the person signs up again).
- The final Home (006) and Resources (009) pages; this feature only
  provides the section and places it on the Home placeholder.
- Other admin overview counts (messages, published news) —
  011-admin-overview.
- Consent checkboxes, privacy policy pages or double opt-in.
- Verifying that a phone or email actually belongs to the visitor.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can complete a signup in under 30 seconds on a
  phone using only the on-screen labels, and sees the thank-you
  immediately after pressing Signup.
- **SC-002**: 100% of submissions with a missing or malformed field
  show a message next to that field and store nothing — proven by
  automated tests covering each field and each accepted phone format.
- **SC-003**: Signing up twice with the same email in different
  capitalisation and spacing, from two different pages, yields exactly
  one record with the updated name and phone, the original first
  signup date, an updated latest date and both pages listed — proven
  by an automated test; a concurrent-duplicate test also yields one
  record.
- **SC-004**: The visible response for a new email and a repeat email
  is identical — proven by an automated test comparing both responses.
- **SC-005**: 100% of admin signup screens, data requests and actions
  refuse requests without an admin session — proven by automated tests
  covering each one.
- **SC-006**: In the admin list, finding one person among 100 by name,
  email or phone takes one action and returns results in under 1
  second; the page filter and pagination keep the search intact.
- **SC-007**: Deleting a signup and then signing up again with the
  same email restores the single record — proven by an automated
  end-to-end test.
- **SC-008**: The sixth submission from one source within the window
  is refused with the "try again shortly" message, and a spam-trap
  submission stores nothing while returning the normal thank-you —
  proven by automated tests.
- **SC-009**: The section renders without visual defects and without
  horizontal scrolling at 375, 768, 1024 and 1440px, matching the
  desktop reference at the two larger widths.
- **SC-010**: An exported CSV opened in Excel shows
  every filtered record with Urdu names intact — verified by opening a
  file containing at least one Urdu name and one punctuated name.
