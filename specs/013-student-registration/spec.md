# Feature Specification: Student Registration — Admission Form, Window Enforcement and Main-Admin Registrations

**Feature Branch**: `013-student-registration`
**Created**: 2026-10-14
**Status**: Draft
**Input**: User description: "Feature Brief — 013-student-registration. Parents submit a student registration form at /admission/register. Only the main admin can see submissions. The form is open only during the admission window set in Settings." (full brief recorded in `history/prompts/013-student-registration/30-specify-student-registration.spec.prompt.md`)

**References**: Constitution III (Roles & Access), IV (Security), V (Personal Data), VI (Data Integrity), XI (Testing) · ADR-0011 (admission window evaluation) · Features 020 (admission window, `isAdmissionApplyOpen()`, Settings → Admission), 012 (careers: rate limit, spam trap, retention sweep, release gate, admin list/detail/CSV), 011 (roles: main admin vs content manager), 009 (notifications), 008 (public form patterns), 005 (Settings engine, existing `list` field type)

**Sensitivity**: This feature stores personal data about children, including health information. Every requirement below that restricts who sees what is a data-protection requirement, not a convenience.

## Clarifications

### Session 2026-10-14

- Q: When is a soft-deleted registration permanently removed? → A: 30 days after it was deleted (option B). Within those 30 days the main admin can restore it. The privacy notice says deleted records are permanently removed within 30 days.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Parent registers a child while admissions are open (Priority: P1)

A parent opens /admission/register during the admission window, fills in the student's, parents' and contact details, the class applied for, mother tongue, vaccination and any medical history, optionally a reference student and remarks, reads the privacy notice, ticks the consent box and submits. The form clears and an on-screen confirmation shows a short reference number and tells them to keep it. No email or SMS is sent.

**Why this priority**: It is the whole public purpose of the feature; without it there is nothing for the school to receive.

**Independent Test**: With the window open and at least one class listed, submit a valid registration and confirm the confirmation with a reference number appears, the form is empty, and exactly one registration exists.

**Acceptance Scenarios**:

1. **Given** the window is open and the class list is not empty, **When** a parent opens /admission/register, **Then** the form shows grouped sections — Student, Parents, Contact & address, Health, Reference, Remarks — followed by the privacy notice, the consent tickbox and the submit button.
2. **Given** every required field is valid and consent is ticked, **When** the parent submits, **Then** the registration is saved with the server's submission date and time (Pakistan time), the form clears, and a confirmation shows a reference number and asks the parent to keep it.
3. **Given** any field is missing or invalid (including consent unticked), **When** the parent submits, **Then** a message appears next to each invalid field, every typed value stays in place, and nothing is saved.
4. **Given** a student name (or any other name) written in Urdu, **When** submitted, **Then** it is accepted, stored unchanged and later shown correctly to the main admin.
5. **Given** the class dropdown, **When** opened, **Then** it lists exactly the classes in Settings → Admission → "Classes open for admission", in the same order.
6. **Given** the confirmation is shown, **When** the parent checks their email or phone, **Then** nothing has been sent to them.

---

### User Story 2 - Form and server respect the admission window (Priority: P1)

Outside the window, the page shows the school's closed message instead of a form, and the server refuses any submission — even one posted directly without the page. The Apply Now button on /admission appears exactly when the window is open.

**Why this priority**: The school only accepts registrations during the dates it sets; a submission outside them is a broken promise to the parent and extra work for staff.

**Independent Test**: Set the window to past dates, future dates and today; check the page, a direct submission and the Apply Now button in each state, with the test machine's time zone set to a zone other than Pakistan's.

**Acceptance Scenarios**:

1. **Given** the window is closed (not yet open, ended, or a date empty) and a closed message is set, **When** /admission/register loads, **Then** it shows the closed message and no form.
2. **Given** the window is closed and no closed message is set, **When** the page loads, **Then** it shows a default line ("Admissions are currently closed.") and no form.
3. **Given** the window is closed, **When** a submission is posted directly to the server, **Then** it is refused as forbidden with a clear "Admissions are closed" message and nothing is saved.
4. **Given** the parent opened the form while the window was open and it closed before they submitted, **When** they submit, **Then** the submission is refused with the closed message and their typed values stay in the form.
5. **Given** Opens on is today in Pakistan, **When** a submission arrives at 00:00 Pakistan time, **Then** it is accepted; one second earlier it is refused. **Given** Closes on is today, **When** a submission arrives at 23:59:59 Pakistan time, **Then** it is accepted; at 00:00 the next day it is refused. Results are the same whatever the server's own time zone.
6. **Given** the window is open, **When** /admission renders, **Then** exactly one Apply Now link to /admission/register appears below the procedure; **Given** it is closed, **Then** none appears.

---

### User Story 3 - Main admin handles registrations (Priority: P1)

The main admin opens Registrations, sees submissions newest first with a likely-duplicate flag where relevant, searches by student, father or mother name, filters by class, opens one to see every field with health information in its own clearly marked block, sets a status, deletes a registration after confirmation, and exports the current filtered list as CSV.

**Why this priority**: Registrations are worthless until the school can read and act on them.

**Independent Test**: Seed registrations, sign in as the main admin, search, filter, open one, change its status, export CSV, delete one, restore it from the Deleted view, and confirm each result.

**Acceptance Scenarios**:

1. **Given** registrations exist, **When** the main admin opens Registrations, **Then** they see reference number, student name, class, father's name, one mobile (father's, or mother's if the father's is empty), submitted date and a likely-duplicate flag, newest first, paginated, excluding deleted ones.
2. **Given** a search term, **When** applied, **Then** only registrations whose student, father or mother name matches are listed (Urdu included), and pagination reflects the filtered set.
3. **Given** a class filter, **When** applied, **Then** only registrations for that class name are listed; the filter offers every class name present in stored registrations, so classes since removed from Settings can still be filtered.
4. **Given** a registration, **When** opened, **Then** every field is shown, and vaccination status and medical history appear together in a separately headed, visually distinct Health block.
5. **Given** a registration, **When** the main admin changes its status (New, Contacted, Admitted, Not admitted), **Then** the new status shows in the detail view and the change is recorded with who changed it, when, and the old and new status.
6. **Given** the delete action, **When** the main admin confirms, **Then** the registration disappears from the list, search, counts and export; cancelling changes nothing.
7. **Given** a filtered list, **When** CSV export is used, **Then** the file contains every matching registration (all pages) with every field, opens in Excel with Urdu intact, neutralises formula injection, and the export is recorded with who, when and how many rows.
8. **Given** new registrations arrive, **When** the main admin views the admin panel, **Then** the sidebar indicator, bell entries and Overview count reflect them; previews show only the reference number and class, never names, phones or health details.

---

### User Story 4 - Content managers never see registrations (Priority: P1)

A content manager — whatever permissions they hold — cannot see the Registrations section, its pages, its routes, its counts or its notifications. This is enforced by the server on every page and route; hiding the menu item is presentation only.

**Why this priority**: Children's personal and health data must be limited to the main admin (brief §6, Constitution III and V).

**Independent Test**: For every registration page and route, request it with no session, as a content manager holding every permission, and as the main admin; only the last succeeds. Check that a content manager's sidebar, bell and Overview show nothing about registrations.

**Acceptance Scenarios**:

1. **Given** no session, **When** any registration page or route is requested, **Then** pages redirect to sign-in and routes are refused, with no registration data returned.
2. **Given** a content manager holding every permission, **When** they request any registration admin page (including the Deleted view), **Then** they receive not-found; **When** they call any registration route (list, detail, status, delete, restore, export), **Then** it is refused as forbidden and nothing changes.
3. **Given** a content manager, **When** they view the sidebar, bell and Overview, **Then** there is no Registrations item, no registration count and no registration notification.
4. **Given** the main admin, **When** they request the same pages and routes, **Then** they succeed.

---

### User Story 5 - Settings: classes open for admission (Priority: P2)

A user with the Settings permission edits "Classes open for admission" in Settings → Admission — an ordered list of class names — and the public form's dropdown follows it. If the window is open but the list is empty, the Settings screen warns them and the public page shows the closed message rather than a form with no classes.

**Why this priority**: The form cannot be used without classes, but the list is a small extension of the Settings group built in 020.

**Independent Test**: Add, reorder and remove class names, save, and check the dropdown; empty the list with the window open and check the warning and the public page.

**Acceptance Scenarios**:

1. **Given** Settings → Admission, **When** the user adds "Playgroup", "Nursery", "Class 1" and saves, **Then** the public dropdown shows those three in that order.
2. **Given** the list, **When** the user reorders or removes a class and saves, **Then** the dropdown follows, and registrations already stored keep the class name they were submitted with.
3. **Given** the window is open and the list is empty, **When** the Settings screen shows, **Then** it displays a warning that the public form is hidden until at least one class is added; **And** /admission/register shows the closed message with no form; **And** the server refuses submissions as when closed.
4. **Given** an empty or whitespace-only class name, or a duplicate name (ignoring case and spaces), **When** the user saves, **Then** the save is refused with a message on that entry.
5. **Given** a submission naming a class not in the current list (e.g. the list changed while the form was open, or a crafted request), **When** it reaches the server, **Then** it is refused with a message on the class field asking the parent to choose again, and other values are kept.

---

### User Story 6 - Abuse protection and likely-duplicate flag (Priority: P2)

Bots and repeat submitters cannot flood registrations. Siblings sharing a parent's phone and email are never blocked; instead, a registration that repeats an existing student (same student name, date of birth and father's mobile) is flagged as a likely duplicate for the main admin.

**Why this priority**: Constitution IV requires abuse protection on every public form; the flag saves staff from processing the same child twice without blocking genuine siblings.

**Independent Test**: Submit six registrations from one visitor within ten minutes; fill the trap field; submit two siblings with the same parents; submit the same child twice.

**Acceptance Scenarios**:

1. **Given** a visitor has submitted 5 registrations in the last 10 minutes, **When** they submit a sixth, **Then** they see a try-later message, nothing is saved, and their typed values are kept.
2. **Given** the hidden spam-trap field is filled, **When** the form is submitted, **Then** nothing is saved and the response looks like an ordinary success (with a reference number that matches no record).
3. **Given** two siblings with the same parents, email and phones but different names or dates of birth, **When** both are submitted, **Then** both are saved and neither is flagged.
4. **Given** a non-deleted registration exists for a student, **When** another registration arrives with the same student name, date of birth and father's mobile, **Then** both are saved and every registration in that matching set shows the likely-duplicate flag in the admin list.
5. **Given** one registration of a flagged pair is deleted, **When** the list is viewed, **Then** the remaining one is no longer flagged.

---

### User Story 7 - Retention, manual deletion and release gate (Priority: P2)

Registrations are deleted automatically once the retention period (12 months by default) has passed. The main admin can delete any registration sooner; a deleted registration is permanently removed 30 days after deletion and can be restored until then. A production build cannot ship while the privacy notice is unapproved or the retention period is unset.

**Why this priority**: Constitution V requires retention-based deletion and an approved notice for any form collecting personal data.

**Independent Test**: Backdate registrations beyond and inside the retention period, and deletions beyond and inside 30 days, run the sweep, and check which remain; restore one deleted inside 30 days; build for production with the notice unapproved and with the period unset, and confirm both fail.

**Acceptance Scenarios**:

1. **Given** a registration submitted longer ago than the retention period, **When** the automatic sweep runs, **Then** it is permanently removed; a registration one day inside the period is kept.
2. **Given** the main admin deleted a registration less than 30 days ago, **When** the sweep runs, **Then** it is kept (still hidden from the normal list); **Given** it was deleted 30 or more days ago, **When** the sweep runs, **Then** it is permanently removed together with its status history.
3. **Given** a registration deleted less than 30 days ago, **When** the main admin opens the Deleted view and restores it after confirmation, **Then** it returns to the list, search, export and duplicate checks with its original details, reference number and status, and the restore is recorded with who and when.
4. **Given** a registration deleted 30 or more days ago (or past the retention period), **When** the main admin looks for it, **Then** it no longer exists and cannot be restored.
5. **Given** the privacy notice is marked pending client approval, **When** a production build runs, **Then** it fails with a message naming the notice.
6. **Given** the retention period is not set for production, **When** a production build runs, **Then** it fails with a message naming the setting.
7. **Given** the privacy notice, **When** displayed, **Then** the retention period it states matches the configured period, and it states that deleted records are permanently removed within 30 days.

---

### User Story 8 - Accessible, responsive form (Priority: P3)

The form works and reads well on phones, tablets and desktops, matches the contact and careers forms, and passes an automated accessibility scan.

**Why this priority**: Required by the design and accessibility principles, but the feature works without perfect layout.

**Independent Test**: View the form at 375, 768, 1024 and 1440px, and run the accessibility scan with the window open and closed.

**Acceptance Scenarios**:

1. **Given** a phone width (375px), **When** the form shows, **Then** fields are in one column with no horizontal scrolling.
2. **Given** tablet width (768px) and above, **When** the form shows, **Then** fields within each section sit in two columns; long text areas span the full width.
3. **Given** a field error, **When** shown, **Then** it uses the same sans-serif error text as the contact and careers forms (no serif error text) and is linked to its field for screen readers.
4. **Given** the page with the window open and closed, **When** scanned, **Then** there are no accessibility violations.

---

### Edge Cases

- **Age boundary**: a child who turns 2 on the submission date (Pakistan time) is accepted; one who turns 2 the next day is refused. A child aged 18 years and 364 days is accepted; one who turns 19 on the submission date is refused. A 29 February birthday counts as reached on 1 March in non-leap years. A future date of birth is refused.
- **Mobiles**: both mobiles empty → one message ("Enter at least one parent's mobile number.") shown on both mobile fields. Either mobile alone is accepted. Any mobile entered must be valid even when the other is valid.
- **Phone formats**: 03001234567, 3001234567, +92 300 1234567, 0092-300-1234567 and similar all normalise to +923001234567; landlines and non-Pakistani numbers are refused with the shared message.
- **Email**: surrounding spaces and capitals are removed before saving (`Ali@Example.COM ` → `ali@example.com`). Shared emails across siblings are allowed.
- **Mother tongue "Other"**: choosing Other makes a text field required (2–50 characters); choosing any other option hides and clears it, and any value sent for it is discarded.
- **Reference group**: all three empty → accepted; one or two filled → each empty one shows "Fill in all three reference fields, or leave them all empty."; spaces-only counts as empty.
- **Text clean-up**: all text is trimmed and runs of spaces/newlines inside single-line fields collapse to one space; text areas keep line breaks but collapse runs of spaces; anything that looks like HTML is stored as plain text and shown escaped, never rendered.
- **Length limits** are counted after clean-up, and messages state the limit.
- **Window closes mid-fill**: refusal with the closed message; values kept (US2 scenario 4).
- **Class removed mid-fill**: refusal on the class field; values kept (US5 scenario 5).
- **Window open but class list empty**: page and server behave as closed (US5 scenario 3).
- **Reference number collision**: the system never issues the same reference number to two registrations; numbers do not reveal how many registrations exist or the order they were made in.
- **Rate limit store unavailable**: the submission is refused with a try-again message rather than accepted unthrottled; values kept.
- **Save fails** (database unavailable): nothing saved, parent told to try again, values kept, no partial record.
- **Content manager guesses an ID or reference**: still not-found / forbidden; the response does not reveal whether that registration exists.
- **Main admin opens a registration deleted moments earlier** (or swept): not-found.
- **CSV with no matches**: header row only, still logged with zero rows.
- **CSV values starting with `=`, `+`, `-` or `@`** cannot run as formulas in Excel.
- **Status change on a deleted registration**: refused with not-found.
- **Deleted near the end of retention**: a registration deleted 11 months 20 days after submission is permanently removed at 12 months, not 30 days after deletion (the earlier date wins), and cannot be restored after that.
- **Restore after the 30 days but before the sweep has run**: refused as not restorable; the record is treated as already gone and the next sweep removes it.
- **Restoring creates a duplicate pair**: if the same child was registered again while the first was deleted, both show the likely-duplicate flag after the restore.
- **Two admins act at once** (one restores while the sweep removes it): the record ends up either restored or removed, never half of each.
- **Errors and logs**: a failed submission's server log records only the failure category and, if saved, the registration id — never names, phones, email, address, dates of birth, health or reference details.

## Requirements *(mandatory)*

### Functional Requirements

**Public form (/admission/register)**

- **FR-001**: The site MUST provide a public page at /admission/register that shows the registration form only while registration is open (FR-020).
- **FR-002**: The form MUST collect these fields, with these rules (all text is cleaned per FR-005 before the rule is checked):

  | Field | Input | Rule |
  |---|---|---|
  | Student name | text | required, 2–100 characters, Urdu letters allowed |
  | Father's name | text | required, 2–100 characters, Urdu allowed |
  | Mother's name | text | required, 2–100 characters, Urdu allowed |
  | Email address | email | required, valid email, stored lower-case |
  | Date of birth | date | required; student aged 2 to 18 (whole years) on the submission date in Pakistan time |
  | Mobile (father) | phone | optional on its own; Pakistani mobile, stored as +923XXXXXXXXX |
  | Mobile (mother) | phone | optional on its own; same rule |
  | — | — | at least one of the two mobiles is required |
  | Address | text area | required, 10–300 characters |
  | Emergency contact name | text | required, 2–100 characters |
  | Emergency contact phone | phone | required; same mobile rule |
  | Admission for class | select | required; one of the classes in Settings (FR-024) |
  | Mother tongue | select | required; Urdu, English, Sindhi, Punjabi, Pashto, Balochi, Saraiki, Other |
  | Mother tongue (other) | text | required only when Other is chosen, 2–50 characters; discarded otherwise |
  | Vaccinated | Yes / No | required |
  | Any medical history | text area | optional, at most 1000 characters; helper text "Allergies, conditions or medication the school should know about" |
  | Reference — name, class, relation | 3 texts | optional group; if any is filled all three are required; each 2–100 characters; class is free text |
  | Remarks | text area | optional, at most 1000 characters |
  | Consent | tickbox | required |

- **FR-003**: The submission date and time MUST be set by the server at the moment of saving (Pakistan time for display and age calculation); the form MUST NOT have a date input for it, and any submission date sent by the browser MUST be ignored.
- **FR-004**: The same validation rules MUST apply in the browser and on the server, from one shared definition; the server is authoritative.
- **FR-005**: All text MUST be trimmed; runs of whitespace in single-line fields MUST collapse to one space; text areas keep line breaks but collapse runs of spaces; HTML MUST NOT be stored or rendered — any markup is kept as plain text and shown escaped.
- **FR-006**: Each invalid field MUST show its message next to it, linked to the field for assistive technology; every typed value MUST survive every refusal or failure (validation, closed window, unknown class, rate limit, save failure).
- **FR-007**: Mobile numbers (both parents and the emergency contact) MUST be validated and normalised by the one shared Pakistani-mobile helper already used by the other public forms, with its existing message.
- **FR-008**: The form MUST be grouped into labelled sections: Student, Parents, Contact & address, Health, Reference, Remarks. Fields within a section MUST be in one column below tablet width and two columns from tablet width (768px) upward; text areas span the full width.
- **FR-009**: The form MUST reuse the shared form components and styling of the contact and careers forms, using only named design tokens. Field error text MUST use the sans-serif body font (fixing the serif error-text issue in the shared component if still present, so all forms benefit).
- **FR-010**: The page MUST pass an automated accessibility scan with no violations, with the window open and closed, and MUST work without horizontal scrolling at 375, 768, 1024 and 1440px.

**Privacy notice, consent and confirmation**

- **FR-011**: A short privacy notice MUST appear directly above the consent tickbox and submit button. It MUST state: what is collected (student, parent and contact details, health information, and details of any referenced student); that only school administration can see it; how long it is kept (the configured retention period, FR-030); that deleted records are permanently removed within 30 days; and that no email or SMS will be sent. Draft wording is in "Draft Privacy Notice" below and is marked pending client approval.
- **FR-012**: Submission MUST be refused until the consent tickbox is ticked; the time consent was given MUST be stored with the registration.
- **FR-013**: On success, the form MUST clear and a confirmation MUST show the registration's reference number and tell the parent to keep it. No email or SMS is sent to anyone.
- **FR-014**: Each registration MUST get a reference number that is short enough to read out over the phone (exactly 8 characters, using letters and digits that are not easily confused, e.g. no 0/O or 1/I), randomly generated, never sequential, and unique among all registrations.

**Admission window enforcement**

- **FR-015**: The page and the submission route MUST both decide openness with the single window function from 020 (ADR-0011): open from 00:00 on Opens on to 23:59:59 on Closes on, Pakistan time, inclusive; closed if either date is empty.
- **FR-016**: When registration is not open, the page MUST show the closed message from Settings, or the default line "Admissions are currently closed." if none is set, and MUST NOT render the form (the condition is FR-020).
- **FR-017**: When registration is not open, the server MUST refuse every submission as forbidden with the message "Admissions are closed. Please check the Admission page for dates." and save nothing, including submissions posted directly without the page (the condition is FR-020).
- **FR-018**: The "registration form exists" constant from 020 MUST be removed, so `isAdmissionApplyOpen()` depends on registration being open alone; the Apply Now link on /admission#admission-procedure MUST show exactly when it is open.
- **FR-019**: Window-boundary behaviour MUST be tested with the test environment's time zone set to a zone other than Pakistan's, as in 020.
- **FR-020**: "Registration is open" means the window is open (FR-015) AND the class list (FR-024) has at least one class. This single condition MUST drive the page (FR-016), the server refusal (FR-017) and the Apply Now link (FR-018).

**Settings → Admission: classes**

- **FR-021**: The Admission Settings group MUST gain "Classes open for admission": an ordered list of class names, each 1–50 characters, at most 30 entries, no duplicates (ignoring case and spaces), editable by users with the Settings permission using the existing Settings list field type.
- **FR-022**: When the window is open and the list is empty, the Settings screen MUST show a warning that the registration form is hidden until a class is added.
- **FR-023**: The list's default (before any save) MUST be empty.
- **FR-024**: The form's class dropdown MUST show exactly the saved list, in order. The server MUST refuse a class name not in the current list with a message on the class field.
- **FR-025**: The registration MUST store the chosen class name as text, so later edits to the list do not change past registrations.

**Abuse protection and duplicates**

- **FR-026**: Submissions MUST be rate limited to 5 per 10 minutes per visitor (identified as on the other public forms), with counts held in the database; over the limit, the parent sees a try-later message and nothing is saved.
- **FR-027**: The form MUST include a hidden spam-trap field, as on careers; when filled, nothing is saved and the response looks like an ordinary success.
- **FR-028**: Write rule (Constitution VI): registrations have no natural key and MUST NOT be refused or merged for sharing a parent's email or phone — each valid submission creates a new record. A registration MUST be flagged "likely duplicate" in the admin list while at least one other non-deleted registration has the same student name (compared after clean-up, ignoring letter case), the same date of birth and the same father's mobile. Registrations with no father's mobile are never flagged.

**Retention and deletion**

- **FR-029**: The main admin MUST be able to delete any registration after a confirmation step; deletion is a soft delete, recording when and by whom, that hides it from the list, search, counts, notifications, duplicate checks and export immediately.
- **FR-029a**: For 30 days after deletion, the main admin MUST be able to see deleted registrations in a separate Deleted view (reference number, student name, class, deleted date, and days left before permanent removal) and restore one after confirmation. A restored registration returns unchanged — same details, reference number and status — and the restore is recorded with who and when in its history. The Deleted view and restore route follow the same main-admin-only rule as every other registration page and route (FR-033).
- **FR-030**: Registrations MUST be permanently removed automatically, using the same opportunistic sweep pattern as careers (no admin action and no scheduled job required), at the earlier of: (a) the retention period after submission — a single configuration value in months, defaulting to 12 outside production; or (b) 30 days after deletion, for deleted registrations — a single named constant. Permanent removal also removes the registration's status and restore history. A permanently removed registration cannot be restored.
- **FR-031**: A production build MUST fail while the privacy notice is marked pending approval or the retention period is not explicitly set for production, naming which is missing (extending the careers release gate).

**Admin — Registrations (main admin only)**

- **FR-032**: The admin panel MUST provide a Registrations section at /admin/registrations, visible and usable only by the main admin.
- **FR-033**: Every registration admin page and route MUST check on the server that the requester is the main admin: no session → sign-in (pages) or refused (routes); content manager (any permissions) → not-found for pages and forbidden for routes, with no data returned and nothing changed. Hiding the menu item is presentation only. Each page and route MUST have access-matrix test rows for no session, content manager with every permission, and main admin.
- **FR-034**: The list MUST show reference number, student name, class, father's name, one mobile (father's, else mother's), submitted date and the likely-duplicate flag; newest first; paginated; excluding deleted registrations.
- **FR-035**: The list MUST support search by student, father or mother name (Urdu included, partial matches, case-insensitive for Latin letters) and a filter by class; search and filter combine.
- **FR-036**: The detail page MUST show every stored field, the submitted date and time in Pakistan time, the reference number and the status; vaccination and medical history MUST appear in a separately headed, visually distinct "Health information" block.
- **FR-037**: The main admin MUST be able to set the status to New, Contacted, Admitted or Not admitted (new registrations start as New). Each change MUST be recorded with who, when, old status and new status, and the history shown on the detail page.
- **FR-038**: CSV export MUST contain every registration matching the current search and filter (all pages), with every field including status, health and reference details; MUST open in Excel with Urdu intact; MUST neutralise formula injection; and MUST be recorded with who exported, when, and how many rows. The export record MUST NOT contain any registration content.
- **FR-039**: Notifications (009) — the sidebar indicator, bell entries and Overview count for new registrations — MUST be shown to the main admin only, using the same "new since" rule 009 uses for other items. Notification text MUST contain only the reference number and class, never names, phones, email, health or reference details.

**Data protection**

- **FR-040**: Registrations MUST be stored in their own collection and MUST NOT be returned, counted or hinted at by any public page or route; the only public response about a registration is the reference number on its own confirmation.
- **FR-041**: Health information (vaccination, medical history) and the referenced student's details MUST appear only in the admin detail view and the CSV export — never in the list, notifications, Overview, logs, error messages or any response to the public.
- **FR-042**: Server logs and error reports for this feature MUST identify a registration only by its id; they MUST NOT contain names, email, phones, address, date of birth, health or reference details, or the submitted form body.
- **FR-043**: No field-level encryption is applied in this phase; the database's at-rest encryption is relied on. This decision MUST be recorded in an ADR together with the write rule (FR-028).

### Key Entities

- **Student Registration**: one submission — reference number; submitted at (server time); student name; father's name; mother's name; email (lower-case); date of birth; father's mobile and mother's mobile (normalised, at least one); address; emergency contact name and phone; class name (text, as chosen); mother tongue and, if Other, its text; vaccinated (yes/no); medical history; reference student name, class and relation (all or none); remarks; consent time; status; deleted marker (when and by whom). Health fields and reference fields are the most sensitive.
- **Registration History**: each status change, deletion and restore, with who, when, and old/new status; stored with its registration and removed with it.
- **Registration Export Record**: who exported, when, and how many rows; no registration content.
- **Classes Open for Admission**: an ordered list of class names in Settings → Admission, stored with the group's version and last editor like other Settings.
- **Submission Rate Counter**: per-visitor submission counts in the existing database throttle store; no registration content.

## Draft Privacy Notice *(pending client approval — blocks production)*

Owner-supplied wording (2026-10-15). It stays pending client approval, so the release gate keeps blocking production until the client approves it. "12 months" is rendered from the configured retention period (FR-030), so the notice always matches the setting; with the default it reads exactly as below.

> The information you provide on this form, including your child's health details and the details of any student you name as a reference, is used only to process this admission registration. It can be seen only by the school's administration. It is never sold or shared with anyone else, apart from the service providers that host this website and its database on the school's behalf. We keep registrations for 12 months after submission, after which they are deleted automatically. Deleted records are permanently removed within 30 days, although backup copies may be kept for a short time before they are overwritten. You will not receive an email or SMS; please note the reference number shown after you submit.
>
> ☐ I am the parent or guardian of this student and agree to the school using this information as described above.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A parent can complete and submit the form in under 6 minutes on a phone.
- **SC-002**: 100% of submissions outside the window, or with an empty class list, are refused — on the page and by direct submission — and 100% of valid submissions inside the window are saved, verified at both window boundaries with a non-Pakistan test time zone.
- **SC-003**: The Apply Now link appears on /admission in 100% of open states and 0% of closed states.
- **SC-004**: 100% of registration admin pages and routes pass all three access rows (no session, content manager with every permission, main admin); a content manager sees 0 registration menu items, counts or notifications.
- **SC-005**: 0 occurrences of names, phones, email, address, date of birth, health or reference details in server logs, notifications, error messages or public responses in server log lines captured by the route and mutation test suites, and in every public response body and notification payload checked by the E2E suite (searched for distinctive seeded values).
- **SC-006**: Every validation rule in FR-002 has an E2E case showing its message next to the right field with all typed values kept.
- **SC-007**: 0 registrations older than the retention period, and 0 registrations deleted 30 or more days ago, remain after the sweep runs; 100% of registrations deleted less than 30 days ago can be restored unchanged; 100% of production builds fail while the notice is pending or the period unset.
- **SC-008**: The 6th submission from one visitor within 10 minutes is refused 100% of the time; filled spam-trap submissions save 0 records.
- **SC-009**: Siblings sharing parents' details are never refused or flagged; the same child submitted twice is flagged in 100% of cases.
- **SC-010**: An exported CSV with Urdu names opens in Excel with every character correct, and every export produces exactly one export record with the right row count.
- **SC-011**: 0 accessibility violations and 0 horizontal scrolling on the form at 375, 768, 1024 and 1440px.
- **SC-012**: E2E tests cover: happy path; every validation rule; window closed, open and both boundaries; empty class list; rate limit; honeypot; access matrix; status change; delete; restore within 30 days; permanent removal after 30 days; CSV; duplicate flag; layout at four widths; accessibility scan.

## Assumptions

- The Settings engine already has a `list` field type (used by hero slides), so "Classes open for admission" reuses it; no new field type and no field-type ADR are needed.
- "Main admin" is the 011 main-admin role. No permission can grant a content manager access to registrations, even the Settings or careers permission.
- Content managers with the Settings permission can edit the class list (it is not personal data), as with the rest of Settings → Admission.
- Pages answer not-found to content managers (so the section's existence is not revealed); routes answer forbidden, matching the brief's "403/404".
- "Aged 2–18" means whole years completed on the submission date, 2 through 18 inclusive.
- The retention period counts from the submission date; outside production it defaults to 12 months; production must set it explicitly (release gate).
- The reference student's class is free text (it is the student's current class, not one of the admission classes).
- "Likely duplicate" is computed when the list is shown, so it updates when either registration is deleted.
- Notifications use 009's existing "new since last seen" behaviour; "new" there is unrelated to the New status.
- Search and filter apply to non-deleted registrations only; the class filter options come from stored registrations.
- The confirmation's reference number is shown once on screen; there is no public lookup by reference number.
- Draft wording (privacy notice, closed default line, messages) is in English this phase, like the other public forms.
- The reference site has no registration page. /admission/register uses the reference Admission banner and the contact/careers form styling as its source; any new value is extracted into `research/design-tokens.md` first.

## Dependencies

- 020 admission — window function, Settings → Admission group, `isAdmissionApplyOpen()`, the "form exists" constant to remove, the Apply Now link.
- 012 careers — rate-limit store, spam trap, retention sweep, release gate, admin list/detail/CSV patterns.
- 011 roles — main-admin check and access-matrix tests.
- 009 notifications — sidebar indicator, bell and Overview count.
- 008 contact — shared form components and the Pakistani-mobile helper.
- 005 settings — Settings engine and `list` field type.

## Out of Scope

- Document uploads (birth certificate, photos).
- Email or SMS to parents or admins.
- Online fee payment and admission-test scheduling.
- A public "check my registration" lookup.
- Editing a registration's submitted details from the admin panel.
- Field-level encryption (recorded in the ADR; FR-043).
- Urdu translation of the form's labels.

## Open Questions for the Client

1. Approve the privacy notice wording (release gate).
2. Confirm 12-month retention (release gate).
3. Confirm the mother-tongue options.
4. Confirm the status labels: New / Contacted / Admitted / Not admitted.
5. Provide the list of classes to open for the first admission window.
