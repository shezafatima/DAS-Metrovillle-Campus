# Feature Specification: Careers — Application Form with CV Upload and Admin Applications

**Feature Branch**: `012-careers`
**Created**: 2026-10-02
**Status**: Draft
**Input**: User description: "Feature Brief — 012 Careers. A public careers page with a job application form including a CV upload, and the admin section that receives applications. Replaces the signup feature (004)." (full brief recorded in `history/prompts/012-careers/0001-specify-careers.spec.prompt.md`)

**References**: PRD §5.9, §6.7, §8 · Constitution III (Roles & Access), IV (Security), V (Personal Data), VI (Data Integrity), XI (Testing) · ADR-0008 (30-day reapply window on email or phone; supersedes ADR-0003 and ADR-0006) · ADR-0004 (private document storage) · Features 004 (form, admin list, CSV export to reuse), 008 (public form patterns), 009 (notifications), 011 (careers permission)

## Clarifications

### Session 2026-10-02

- Q: Repeat applicant matched on both email and phone, or either? → A: Either field independently (ADR-0006, carried into ADR-0008).
- Q: Who may delete an application (and so let someone reapply)? → A: Main admin only; content managers with the careers permission can view, search, download and export, but see no delete control and the delete route refuses them.
- Q: What retention period applies to applications? → A: One configurable period, defaulting to 12 months from the applied date until the client confirms; applications past it are deleted automatically together with their CVs.
- Q: Maximum CV size, given the chosen document store (Vercel Blob) and hosting's 4.5 MB request limit? → A: 4 MB (changed from the brief's 5 MB) so the CV can pass through the server, be checked, and only then be stored.
- Q: How long must a person wait before applying again? → A: 30 days from their last non-deleted application, matched on email or phone (owner, 2026-10-02; PRD v0.4, answers Open Question 5; ADR-0008 supersedes the permanent one-per-person rule). Reapplying after 30 days creates a new, separate record and the earlier one is kept (client confirmation pending). A main-admin delete still lets someone reapply sooner.
- Q: Retire only the public signup form, or all of signup? → A: All of it, as the brief says: public form, admin list, export, routes, tests and the `signups` collection (owner, 2026-10-02). Not migrated; back it up before dropping it.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor applies with a CV (Priority: P1)

A job seeker opens /careers, reads a short introduction, fills in name, email, phone and qualification, attaches their CV as a PDF, reads the privacy notice, ticks the consent box and submits. They see a clear confirmation that their application was received. No email is sent.

**Why this priority**: This is the whole public purpose of the feature; without it there is nothing for admins to receive.

**Independent Test**: Visit /careers, submit a valid application with a small genuine PDF, and confirm the confirmation message appears and one application exists.

**Acceptance Scenarios**:

1. **Given** a visitor on /careers, **When** the page loads, **Then** they see the introduction text, the privacy notice, the consent tickbox and a form with name, email, phone, qualification and CV fields laid out on one consistent grid in the reference form styling.
2. **Given** all fields valid, a genuine PDF of 4 MB or less, and consent ticked, **When** the visitor submits, **Then** the application is saved, a clear confirmation replaces the form, and no email is sent.
3. **Given** any field is missing or invalid (including consent unticked), **When** the visitor submits, **Then** a message appears next to each invalid field, the typed values stay in place, and nothing is saved.
4. **Given** the visitor attaches a file whose name ends in `.pdf` but whose content is not a PDF, **When** they submit, **Then** the CV field shows a message that the file must be a PDF and nothing is saved.
5. **Given** the visitor attaches a PDF larger than 4 MB, **When** they submit, **Then** the CV field shows a message stating the 4 MB limit and nothing is saved.
6. **Given** a name or qualification written in Urdu, **When** the visitor submits, **Then** it is accepted and later displayed correctly to admins.
7. **Given** the upload or the document store fails, **When** the visitor submits, **Then** nothing is saved, they are told to try again, and their typed details remain in the form (only the file needs re-attaching if the browser cleared it).

---

### User Story 2 - One application per person per 30 days (Priority: P1)

A person who applied within the last 30 days tries again. Their attempt is refused with a clear message giving the date they may apply again. The stored application is never changed. After 30 days they can apply again with no admin action, or sooner if the main admin deletes their application.

**Why this priority**: Required by PRD §5.9 (v0.4) and ADR-0008; protects admins from repeat or overwritten applications mid-review.

**Independent Test**: Apply once, then attempt to apply again with the same email and a different phone, then with the same phone and a different email; confirm both are refused with the reapply date and the original is unchanged. Then backdate the original by 30 days and confirm a new application is accepted.

**Acceptance Scenarios**:

1. **Given** a non-deleted application made within the last 30 days, **When** someone submits again with the same email, **Then** the attempt is refused with a message giving the date they may apply again, and the existing application (details and CV) is unchanged.
2. **Given** the same, **When** someone submits again with the same phone, **Then** the attempt is refused in the same way.
3. **Given** two submissions sharing an email or a phone arrive at the same moment, **When** both are processed, **Then** exactly one application exists, and the other submitter sees the refusal.
4. **Given** the refusal message is shown, **When** the submitter reads it, **Then** it does not reveal which field matched, does not show any stored details, and reads identically whether the match was on email or phone; it does show the date they may apply again.
5. **Given** an application has been deleted by the main admin, **When** the same person applies again (even within 30 days), **Then** a brand-new application is created with the new CV; nothing from the deleted one is restored.
6. **Given** a refused attempt included a CV, **When** the refusal happens, **Then** no new CV file remains in storage.
7. **Given** a person's last application was made 30 or more calendar days ago (Pakistan time), **When** they apply again, **Then** a new, separate application is created and the earlier one is kept unchanged; both appear in the admin list, newest first.

---

### User Story 3 - CV files stay private (Priority: P1)

Every CV is held in the private document store, never on the public media service, under a stored name that cannot be guessed from the applicant's data or filename. A CV reaches an admin only as a download through a route that checks their session and careers permission.

**Why this priority**: Constitution V and PRD §8 make a reachable CV a data-protection failure, not a bug.

**Independent Test**: Request a CV download with no session, then as a content manager without the careers permission, then as a permitted admin; only the last succeeds, and as a download.

**Acceptance Scenarios**:

1. **Given** no admin session, **When** the CV download route for an application is requested, **Then** access is refused and no file bytes are returned.
2. **Given** an admin without the careers permission, **When** they request the download, **Then** access is refused.
3. **Given** an admin with the careers permission, **When** they request the download, **Then** the file is delivered as a download (not displayed inline) with a safe, generated download name.
4. **Given** an application's name, email, phone, qualification, applied date, ID and original filename, **When** the stored file's name and location are examined, **Then** neither can be derived from any of those values.
5. **Given** the admin panel, **When** viewing an application, **Then** the CV is never previewed or embedded — only a download action is offered.
6. **Given** the stored file's location, **When** it is requested directly without going through the download route, **Then** it is not retrievable.

---

### User Story 4 - Admin handles applications (Priority: P1)

An admin with the careers permission opens Applications, sees applications newest first, searches by name, email or phone, opens one to see details, downloads the CV, and exports the current filtered list as CSV. The main admin can also delete an application after confirmation (which also removes its CV).

**Why this priority**: Applications have no value until staff can read and act on them (PRD §6.7).

**Independent Test**: Seed applications, sign in as a permitted admin, search, open one, download its CV, export CSV, delete one and confirm its CV file is gone.

**Acceptance Scenarios**:

1. **Given** applications exist, **When** a permitted admin opens Applications, **Then** they see name, email, phone, qualification and applied date, newest first, paginated.
2. **Given** a search term, **When** applied, **Then** only applications whose name, email or phone match are listed, and pagination reflects the filtered set.
3. **Given** an application in the list, **When** opened, **Then** its full details and a CV download action are shown.
4. **Given** the main admin uses the delete action, **When** they confirm, **Then** the application disappears from the list and export, its stored CV is removed, and its email/phone may apply again. Cancelling the confirmation changes nothing.
5. **Given** a filtered list, **When** CSV export is used, **Then** the file contains exactly the filtered applications (all pages, not just the visible one) with the listed columns and no file content or file locations, and opens in Excel with Urdu text intact.
6. **Given** each careers admin page and route, **When** accessed with no session, without the careers permission, and with it, **Then** they are refused, refused, and allowed respectively.
8. **Given** a content manager with the careers permission, **When** they view the list or an application, **Then** no delete control is shown, and a direct request to the delete route is refused with the application unchanged.
7. **Given** the admin overview and notifications (009), **When** new applications arrive, **Then** counts and indicators that previously reflected signups now reflect applications, for admins with the careers permission only.

---

### User Story 5 - Entry points (Priority: P2)

A visitor can reach /careers from a Careers link in the site shell's top bar and in the footer, and from the home page's existing Join Now button.

**Why this priority**: The page must be discoverable, but the form works without these links.

**Independent Test**: From any public page, follow the top-bar and footer Careers links and the home Join Now button; each lands on /careers.

**Acceptance Scenarios**:

1. **Given** any public page at any of the four widths, **When** the visitor uses the top-bar Careers link, **Then** they reach /careers (on mobile, wherever the top-bar links appear in the mobile layout).
2. **Given** any public page, **When** the visitor uses the footer Careers link, **Then** they reach /careers.
3. **Given** the main menu, **When** viewed, **Then** it is unchanged at eight items (Careers is not added to it).

---

### User Story 6 - Abuse protection (Priority: P2)

Bots and repeated submitters cannot flood applications or fill the document store.

**Why this priority**: Constitution IV requires it for every public form; uploads add a storage-cost risk.

**Independent Test**: Exceed the submission limit and the upload limit from one visitor and confirm further attempts are refused with a try-later message; fill the hidden trap field and confirm nothing is saved.

**Acceptance Scenarios**:

1. **Given** a visitor exceeds the per-visitor submission limit, **When** they submit again, **Then** they see a try-later message and nothing is saved.
2. **Given** a visitor exceeds the separate per-visitor upload limit, **When** they attempt another upload, **Then** it is refused before any file is stored.
3. **Given** the hidden spam-trap field is filled, **When** the form is submitted, **Then** nothing is saved or stored, and the response looks like an ordinary success.
4. **Given** any refused or failed attempt, **When** the form re-displays, **Then** the typed details are kept.

---

### User Story 7 - Retire the old signup (Priority: P3)

The signup collection, its admin screen, its public form and its routes are removed now that applications replace them. Signup test data is not migrated. The skipped signup E2E tests are replaced by careers tests.

**Why this priority**: Clean-up; careers works whether or not signup code still exists, but leaving it creates a second, unused personal-data store.

**Independent Test**: Confirm the signup admin screen, routes and form no longer exist, the admin menu shows Applications instead of Signups, and no signup E2E tests remain.

**Acceptance Scenarios**:

1. **Given** the admin menu, **When** viewed by a permitted admin, **Then** it shows Applications (careers) and no Signups entry; the former signup admin URLs and API routes no longer respond with signup data.
2. **Given** the old signup data, **When** the feature ships, **Then** it is not migrated into applications, and the signup collection is removed.
3. **Given** the test suite, **When** run, **Then** signup E2E and access tests are gone and careers tests cover the equivalent ground.
4. **Given** the permission label for `careers` in user management, **When** viewed, **Then** it no longer mentions Signups.

---

### Edge Cases

- Urdu (and mixed Urdu/English) names and qualifications are accepted, stored, listed, searched and exported correctly.
- A renamed non-PDF (e.g. an image or executable with a `.pdf` extension, or a file reporting a PDF type) is rejected based on its content.
- An empty (0-byte) file or a file over 4 MB is rejected with a message; the 4 MB limit is stated in the message.
- More than one file is attached → the submission is refused with "Attach one PDF only." and nothing is stored; the field allows one file.
- An earlier upload from the same email or phone crashed part-way (an unfinished record younger than an hour) → the visitor is asked to try again shortly, not told to wait 30 days.
- Email differing only by letter case or surrounding spaces, or phone written in a different but equivalent format, counts as the same person.
- Two submissions sharing an email or phone arriving at the same moment produce one application (serialised by a database-enforced lock, ADR-0008) and no orphan CV file.
- The window counts calendar days in Pakistan time: an application on day D blocks through D + 29; on D + 30 the person may apply again. The refusal names that date.
- If email matches one recent application and phone matches a different, later one, the later application decides the reapply date.
- If the application cannot be saved after the CV was stored (or vice versa), no orphan file or file-less application remains.
- The document store is unavailable → the application is not saved, the applicant is told to try again, typed details are kept.
- An admin downloads a CV for an application deleted by another admin moments earlier → the download is refused with a not-found message.
- Applications older than the retention period (default 12 months) are deleted automatically together with their CV files; an application one day inside the period is kept (FR-031).
- Deleting an application whose CV file is already missing from storage still completes the delete.
- A CSV export with no matches produces a file with headers only.
- Values beginning with `=`, `+`, `-` or `@` in exported fields cannot run as spreadsheet formulas when opened in Excel.

## Requirements *(mandatory)*

### Functional Requirements

**Public page and form**

- **FR-001**: The site MUST provide a public page at /careers showing introduction text (static content this phase, held in a content file so it can become editable in 014) followed by the application form.
- **FR-002**: The form MUST collect name, email, phone, qualification and one CV file; all are required.
- **FR-003**: The form MUST show a privacy notice and a consent tickbox using client-supplied wording; submission MUST be refused until consent is ticked. Until the client supplies the wording, placeholder copy is used and visibly flagged as placeholder in content.
- **FR-004**: Validation rules MUST be identical on the visitor's side and the server's side; the server is authoritative.
- **FR-005**: Invalid entries MUST show a message next to the affected field; nothing is saved or stored until every field is valid.
- **FR-006**: On success the form MUST be replaced by a clear confirmation message; no email is sent to anyone.
- **FR-007**: Any refusal or failure (validation, within-window refusal, rate limit, storage failure) MUST keep the visitor's typed details in the form.
- **FR-008**: The form layout MUST follow the reference site's form styling, with labels and fields aligned on one consistent grid, using only named design tokens, and MUST work at 375, 768, 1024 and 1440px.
- **FR-009**: Names and qualifications in Urdu MUST be accepted and stored without alteration.

**One application per person per 30 days (ADR-0008)**

- **FR-010**: A submission MUST be refused when a non-deleted application with the same email **or** the same phone was made within the reapply window: `CAREERS_REAPPLY_WINDOW_DAYS` = 30 calendar days in Pakistan time, one named constant. Email is compared case- and space-insensitively; phone is compared in one canonical format.
- **FR-011**: Concurrent submissions sharing an email or a phone MUST NOT both pass the window check. The check and insert MUST run while holding a per-identity lock whose exclusivity is enforced by the database (a unique key); a bare check-then-insert is not allowed (Constitution VI, v3.0.0).
- **FR-012**: A refused attempt MUST never merge into, update or restore the existing application or its CV.
- **FR-013**: The refusal message MUST state that the person applied recently and give the date they may apply again, without naming which field matched and without showing any stored details, and MUST read the same whether the match was on email or phone.
- **FR-014**: Soft-deleted applications MUST NOT count toward the window, so after the main admin deletes an application the person may apply again at once. After the window, a new submission MUST create a new, separate application and leave the earlier one unchanged (client confirmation pending).

**CV handling and privacy**

- **FR-015**: The CV MUST be a single PDF of at most 4 MB, and MUST NOT be empty.
- **FR-016**: The server MUST verify the file's actual content is a PDF; the extension and the reported file type alone MUST NOT be trusted.
- **FR-017**: CVs MUST be stored only in the private document store (ADR-0004), never on the public media service, with no public URL.
- **FR-018**: Each stored CV's name and location MUST be randomly generated and MUST NOT be derived from the uploaded filename, the application's ID, or any applicant data.
- **FR-019**: A CV MUST reach an admin only through a download route that checks their session and the careers permission on every request, and MUST be delivered as a download (attachment), never inline.
- **FR-020**: The admin panel MUST NOT preview or embed CVs.
- **FR-021**: If storing the CV or saving the application fails, the system MUST leave neither an orphan file nor a file-less application, and MUST tell the applicant to try again.
- **FR-022**: Upload attempts MUST be rate limited per visitor separately from form submissions, and refused attempts MUST NOT leave files in storage.

**Admin**

- **FR-023**: The admin MUST provide an Applications list showing name, email, phone, qualification and applied date, newest first, paginated, excluding deleted applications.
- **FR-024**: The list MUST support searching by name, email or phone, including Urdu text.
- **FR-025**: An admin MUST be able to open an application to see its details and download its CV.
- **FR-026**: Only the main admin MAY delete an application; content managers (even with the careers permission) MUST NOT see a delete control and MUST be refused by the delete route on the server. Deleting MUST require confirmation, MUST be a soft delete of the application record, and MUST remove the stored CV file.
- **FR-027**: CSV export MUST contain the current filtered list (all matching rows, not only the current page), without file content or file locations, MUST open correctly in Excel with Urdu text intact, and MUST neutralise spreadsheet-formula injection.
- **FR-028**: Every careers admin page and route (list, detail, download, delete, export) MUST be gated on the server by the careers permission (011), and each MUST have tests for no session, missing permission and correct permission. The delete route is additionally main-admin only: its "missing permission" case is a content manager holding the careers permission, and its "correct permission" case is the main admin.
- **FR-029**: Admin overview counts and notifications (009) that currently report signups MUST report career applications instead, visible only to admins with the careers permission.

**Entry points and abuse protection**

- **FR-030**: A Careers link MUST appear in the site shell's top bar and in the footer; the main menu stays unchanged. The home page's Join Now button continues to link to /careers.
- **FR-031**: Applications whose applied date is older than the retention period MUST be deleted automatically together with their CV files, without admin action. The period is a single configuration value (not an admin screen this phase), defaulting to 12 months until the client confirms; changing it MUST NOT require a code change. Soft-deleted applications past the period are removed in the same way.
- **FR-032**: Form submissions MUST be rate limited per visitor and protected by a hidden spam-trap field, as on the other public forms (008); a filled trap saves nothing and returns an ordinary-looking success.

**Retiring signup**

- **FR-033**: The signup collection, its public form, admin screen, API routes, notifications wiring, access-inventory entries and tests MUST be removed; signup data is not migrated.
- **FR-034**: The skipped signup E2E tests MUST be replaced by careers E2E tests; the `careers` permission label MUST no longer mention Signups.

### Key Entities

- **Career Application**: one person's application — name, email (normalised), phone (normalised), qualification, consent given (with time), applied date, deleted marker, and a reference to its stored CV. At most one per person within any 30-day window (see FR-010); a person may have several over time.
- **Stored CV**: a private file in the document store, referenced only by its application; random, unguessable name and location; holds a PDF of at most 4 MB; removed when its application is deleted or expires.
- **Careers Permission**: the existing `careers` grant from 011 that controls admin access to applications and CVs (list, detail, download, export). Deleting is reserved to the main admin.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can complete and submit an application, including attaching a CV, in under 3 minutes.
- **SC-002**: 100% of attempts matching a non-deleted application from the last 30 days are refused with the correct reapply date, and in 100% of cases the original application and CV are unchanged; 100% of attempts after the window succeed.
- **SC-003**: 0 CV files are retrievable without a signed-in admin holding the careers permission, verified for no session, missing permission and direct-location requests.
- **SC-004**: 100% of non-PDF files (including renamed ones) and files over 4 MB are rejected, with a field-level message, and none are stored.
- **SC-005**: Concurrent submissions sharing an email or phone always produce exactly one application.
- **SC-006**: 100% of careers admin pages and routes pass all three access tests (no session, missing permission, correct permission).
- **SC-007**: After an application is deleted, its CV is no longer in storage and the same person can apply again successfully.
- **SC-008**: An exported CSV with Urdu names opens in Excel with every character displayed correctly.
- **SC-009**: The public page and admin screens display without horizontal scrolling or overlapping content at 375, 768, 1024 and 1440px.
- **SC-010**: E2E tests cover: apply successfully; reapply with same email and with same phone, both refused with the reapply date; reapply after the 30-day window succeeds (backdated record); non-PDF and oversized file refused; application visible in admin list; CV downloaded; delete (as main admin) removes the file and allows reapplying.
- **SC-011**: No application or CV older than the configured retention period remains after the automatic clean-up runs.

## Assumptions

- The private document store is Vercel Blob in private mode (owner's choice, 2026-10-02). The 4 MB CV limit follows from hosting's 4.5 MB request size limit (see Clarifications).
- Rate-limit thresholds follow the existing public forms for submissions; upload attempts get their own, stricter per-visitor limit, with exact numbers set during planning.
- The download filename is generated (e.g. based on the applicant's name and date, sanitised) and is independent of the stored name; it is not the original uploaded filename.
- Introduction copy is static content in this phase; making it editable belongs to 014-page-content.
- The detail view is a separate screen or panel within the Applications section; "search and filter" in PRD §6.7 is satisfied by text search this phase.
- Signup data is test data only; removing it loses nothing the client needs.
- Visitors are identified for rate limiting the same way as on the other public forms.
- Phone accepts a Pakistani mobile number with the same rule and message as the existing public forms ("Enter a Pakistani mobile number, e.g. 03001234567."), stored in one canonical form.
- Qualification is free text (Urdu allowed, as the brief's edge cases require), with a sensible maximum length set in planning; it is not a fixed list.

## Dependencies

- 011 roles and users — the `careers` permission and server-side access helpers.
- 009 notifications and admin overview — currently wired to signups; must move to applications.
- 008 contact form — public form patterns (rate limit, spam trap, field errors).
- 004 signup — admin list, search, pagination and CSV export patterns to reuse before removal.
- 001 site shell — top bar and footer for the Careers links.
- A provisioned private document store with credentials in environment variables.

## Out of Scope

- Emailing applicants or admins.
- Job listings, vacancies or per-position applications.
- Application status tracking (shortlisted, rejected).
- Previewing CVs in the browser.
- Editing applications.
- Editable careers introduction text (014).
