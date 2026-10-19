# Feature Specification: Dynamic Sections (014b — Syllabi, Examination, Class Levels, Portal Links)

**Feature Branch**: `014b-dynamic-sections`
**Created**: 2026-10-19
**Status**: Draft
**Input**: User description: Feature Brief — 014b-dynamic-sections, recorded verbatim in `history/prompts/014b-dynamic-sections/`. Four parts of the public site become admin-managed: Syllabi and Examination (Academics tab), Class Levels (Admission tab, which also feeds the registration form's class list) and the footer's Portal Links (Site-wide tab).

**Depends on**: 014 slice 1 (Settings by page: tabs, panels, per-panel permission, compare-and-set saves, `settings_saved` audit line, revalidation). Slice 1 must be merged before this is built. Also 011 (the `settings` and `pages` permissions, the access matrix), 013 (registration form, "Classes open for admission"), 018 (Academics page), 020 (Admission page) and 001 (site shell footer).
**Replaces**: "Slice 2" in the 014 brief, plus footer portal links (new).
**Followed by**: 014 slice 3 (editable page text).

## Findings from the current code *(recorded 2026-10-19)*

- **Academics** (018) has three sections: Academic Overview, Teachers' Training and Hifz-e-Quran. Syllabi and Examinations were removed in 018. The old `/academics/syllabi` and `/academics/examinations` URLs redirect to `/academics`.
- **Admission** (020) has two sections: Admission Procedure and Uniform. Class Levels was skipped until the client confirms it, and `/admission/class-levels` redirects permanently to `/admission`.
- **The page-section list** (one list per page) drives the header dropdown, site search and the page itself, so a section is added to or left out of the menu in one place.
- **"Classes open for admission"** is today a list of typed class names. It is stored in the admission settings record and shown as panel 3 of the Admission tab, under the **Settings** permission (014 slice 1, Q2).
- **Footer Portal Links**: six fixed entries in the site-shell content file, each pointing to a `/portal/<slug>` "available soon" page served by one dynamic route.
- **Other links to `/portal/...`**: none in the application code. The Resources page has no Mobile Apps section that links to a portal page. The only other references are in the end-to-end suite (`e2e/page-sections.spec.ts`, which walks footer `/portal/` links and visits `/portal/lms-app`). These tests must be updated.

## Clarifications

### Session 2026-10-19

- Q: Do class names the migration cannot match still appear in the registration form? → A: Yes. They stay in the form after the ticked levels until an admin links or removes each one, so the migration never changes what visitors can choose.
- Q: What happens when a checklist save names a level deleted in the meantime? → A: The save is refused as a conflict. The admin reloads, sees the current levels and the warning, and ticks again.
- Q: When does the "pending client confirmation" notice clear? → A: Only through an explicit "Mark as confirmed by client" action, taken by an admin with the panel's permission and recorded in the audit log. Ordinary saves leave the notice in place.
- Q: Can visitors link to a single syllabus level? → A: Yes, in tab form. Each level tab has its own link (e.g. `/academics#syllabi-class-4`) that opens that level. Choosing a tab updates the address without adding a history entry, and `#syllabi` still opens the first level.
- Q: (plan, after comparing the reference) The reference Syllabi page has prose (the Play Group tab's general admission information, the Fee paragraph, some Class 6–8 Science text) and extra sub-sub-headings that a bullets-only shape cannot hold. How should the data and the seed handle that? → A: Each topic group gets an optional plain-text intro (paragraphs) shown above its bullets. Prose is seeded verbatim into intros, each extra sub-heading becomes its own group heading, and Play Group is seeded as it appears. The seed report lists every adaptation (e.g. a numbered list seeded as bullets).
- Q: (plan) The reference shows Examination as stacked headings and paragraphs, but the brief asks for cards. Which one? → A: Cards in a grid, as in the brief. This is a recorded deviation from the reference (see Deviations from the reference).

### Deviations from the reference *(Constitution I)*

- **Examination** is shown as cards in a grid (1 column on phones, 2 from tablet) instead of the reference's full-width stacked blocks. Approved by the user on 2026-10-19.
- **Syllabi on phones** use a labelled level picker. The reference's phone layout shows no level control at all (only the first tab's content). This comes from the brief.
- **Syllabi heading**: the section's h2 is "Syllabi" (the menu label, as for every other section), not the reference's "Admission Syllabi for Dar-e-Arqam Schools".

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Manage the footer Portal Links (Priority: P1)

An admin with the **Settings** permission opens Settings → Site-wide, finds a "Portal links" panel, and adds, edits, reorders or removes links (label + web address). On save, every public page's footer shows the links in that order. Each link opens the external site in a new tab. Unsafe addresses are refused, and a plain `http://` address is accepted with a warning.

**Why this priority**: The footer appears on every page, and today all six links lead to "available soon" placeholders. This is the smallest slice. It replaces dead ends with working links and retires a whole route.

**Independent Test**: As a Settings user, save three links (one `http://`), then load any public page. The footer column lists the three links in order, each opening in a new tab with a name that says it is external. Remove all links, and the column disappears while the other columns reflow. Visit `/portal/lms-app` and you land on `/`.

**Acceptance Scenarios**:

1. **Given** a Settings user on the Site-wide tab, **When** they add a link "LMS App" → `https://lms.example.org` and save, **Then** the save succeeds, the unsaved-changes marker clears, an audit entry names the user and the panel, and the public footer shows the link.
2. **Given** the panel, **When** an admin enters `javascript:alert(1)`, `data:text/html,…`, `/portal/x`, `www.example.org` or `https//broken`, **Then** the field shows an error and the panel cannot be saved. The server refuses the same input if it is sent directly.
3. **Given** the panel, **When** an admin enters `http://203.0.113.5/login`, **Then** the field is accepted and shows the warning "Visitors' browsers will mark this site as not secure."
4. **Given** a valid address, **When** the admin presses "Test link", **Then** the address opens in a new tab and the panel keeps its unsaved state.
5. **Given** saved links, **When** a visitor views the footer, **Then** each link opens in a new tab, cannot reach back to the opening page, and is announced by assistive technology as opening an external site.
6. **Given** no links are saved, **When** a visitor views any page, **Then** the Portal Links column and its heading are absent and the remaining columns fill the space at every checked width.
7. **Given** any old placeholder URL `/portal/<anything>`, **When** it is requested, **Then** it redirects permanently to `/`.
8. **Given** two admins editing the panel, **When** the second saves after the first, **Then** the second save is refused as a conflict, as in slice 1, and nothing is overwritten.

---

### User Story 2 - Manage Class Levels and choose which are open for admission (Priority: P1)

An admin with the **Pages** permission edits the Class Levels table in Settings → Admission: the age reference date (default 31 July) and rows of class level + age rule. Visitors see the table at `/admission#class-levels`. An admin with the **Settings** permission then ticks which of those levels are open for admission. The registration form's class dropdown lists exactly the ticked levels, in table order.

**Why this priority**: Class Levels is the client's main missing data, and linking it to registration removes a second, typed list that could drift from the public table.

**Independent Test**: As a Pages user, add three levels and save. `/admission#class-levels` shows the table with the header "Age on 31 July". As a Settings user, tick two levels and save. The registration form's dropdown lists those two in table order. Submit a registration, rename one level, and the earlier registration still shows the old name.

**Acceptance Scenarios**:

1. **Given** a Pages user, **When** they add, edit, reorder or remove rows and change the reference date to 1 April, then save, **Then** the public table updates and its age column header reads "Age on 1 April".
2. **Given** the public table, **When** viewed on a phone (375 px), **Then** each level shows as stacked label/value rows. At 768 px and wider it is a two-column table with column headers.
3. **Given** the "Classes open for admission" panel, **When** a Settings user opens it, **Then** it shows one checkbox per Class Levels row, in table order, and saving stores the ticked levels.
4. **Given** ticked levels, **When** a visitor opens the registration form during the admission window, **Then** the class dropdown lists exactly the ticked levels by their current names, in Class Levels order.
5. **Given** no level is ticked, **When** a visitor opens the registration form, **Then** the form shows the Closed message (existing 013 rule).
6. **Given** a ticked level that a Pages user then deletes, **When** a Settings user next opens the Admission tab, **Then** the level no longer appears in the checklist or the form, and the Admission tab shows a warning naming the removed level.
7. **Given** a ticked level that is renamed, **When** the form is next loaded, **Then** the dropdown shows the new name, and registrations submitted earlier keep the class name they were submitted with.
8. **Given** a registration submitted with a class that has since been unticked, renamed or deleted, **When** an admin views it, **Then** the stored class name is unchanged.
9. **Given** a Pages-only user, **When** they view the classes checklist, **Then** it is read-only (slice 1 rule). **Given** a Settings-only user, **When** they view the Class Levels panel, **Then** it is read-only.

---

### User Story 3 - Move existing typed class names onto Class Levels (Priority: P1, part of Story 2's release)

Existing installations have typed class names in "Classes open for admission". A migration matches each typed name to a Class Levels row by name, ignoring case. A dry run reports what would match and what would not. Unmatched names are never dropped silently. They stay listed in the Admission tab as "not linked" until an admin resolves each one.

**Why this priority**: Without it, switching to the checklist could silently close or change the registration form.

**Independent Test**: With typed names "Playgroup", "class 1" and "Grade 9", and Class Levels rows "PlayGroup" and "Class 1", run the dry run. It reports two matches and one unmatched ("Grade 9") and writes nothing. Run it for real. The checklist shows the two rows ticked, and the Admission tab lists "Grade 9" as not linked.

**Acceptance Scenarios**:

1. **Given** typed names and Class Levels rows, **When** the migration runs without its confirm flag, **Then** it prints matched and unmatched names and changes nothing.
2. **Given** the confirm flag, **When** it runs, **Then** matched names become ticked levels, unmatched names are kept as "not linked", and running it again changes nothing.
3. **Given** "not linked" names, **When** an admin with Settings opens the Admission tab, **Then** each one is listed with a way to link it to an existing level or remove it. The list disappears when none remain.
4. **Given** "not linked" names still exist, **When** a visitor opens the registration form, **Then** those names still appear in the dropdown, after the ticked levels, so the migration does not change what visitors can choose.

---

### User Story 4 - Manage and publish the Syllabi (Priority: P2)

An admin with the **Pages** permission edits the syllabi in Settings → Academics: levels (e.g. Play Group … Class 8), each with subjects, each subject with groups (optional sub-heading, optional intro paragraphs, topics one per line). Visitors see `/academics#syllabi`: one tab per level (a level picker on phones), with subject headings, group sub-headings and bulleted topics.

**Why this priority**: High value and the most content, but it depends on client confirmation that the reference syllabi apply. The seed script makes it ready to publish once confirmed.

**Independent Test**: Run the seed script dry, then with `--confirm`. All 11 reference levels appear in the editor. Open one level, add a topic, and save. `/academics#syllabi` shows the first level selected. Arrow keys move between level tabs, and the edited level shows the new topic.

**Acceptance Scenarios**:

1. **Given** the Academics tab, **When** a Pages user adds, renames, reorders (up/down buttons, usable by keyboard) or removes levels and subjects, then saves, **Then** the public section reflects the change in order.
2. **Given** a level or subject that contains topics, **When** the admin removes it, **Then** a confirmation states how many topics will be lost, and cancelling keeps everything. **Given** a group with topics or an intro, **When** the admin removes it, **Then** a confirmation is asked first. An empty group is removed at once.
3. **Given** a group's topics box, **When** the admin types lines with surrounding spaces and blank lines, **Then** the saved topics are the trimmed, non-blank lines, in order.
4. **Given** the editor, **When** the admin opens a level, **Then** any other open level closes. Only one level's subjects are expanded at a time.
5. **Given** an input that exceeds a limit (21st level, 11th subject, 21st group, 101st topic, 201-character topic), **When** entered or submitted, **Then** it is refused with a message naming the limit, on the client and on the server.
6. **Given** the public page at 1024 px, **When** a visitor uses Left/Right/Home/End on the level tabs, **Then** focus and selection move between tabs per the ARIA tabs pattern, and only the selected level's panel is shown.
7. **Given** the public page at 375 px, **When** a visitor views the section, **Then** a labelled level picker replaces the tab row, and choosing a level shows its content.
8. **Given** a visitor following `/academics#syllabi`, **When** the page loads, **Then** it scrolls to the section with the first level selected.
10. **Given** a visitor following `/academics#syllabi-class-4`, **When** the page loads, **Then** the Class 4 tab is selected. **When** they then pick Class 5, **Then** the address becomes `/academics#syllabi-class-5`, and the browser's Back button leaves the page instead of returning to Class 4.
11. **Given** a link to a level that has since been renamed or removed, **When** followed, **Then** the section opens with the first level selected.
9. **Given** the panel, **When** the admin follows "Preview", **Then** `/academics#syllabi` opens.

---

### User Story 5 - Manage and publish Examination (Priority: P2)

An admin with the **Pages** permission edits Examination blocks in Settings → Academics (heading + body of plain paragraphs). Visitors see `/academics#examination` as cards in a grid: one column on phones, two from tablet.

**Why this priority**: Small and self-contained. Like Syllabi, it waits on client confirmation of the reference text.

**Independent Test**: Seed the four reference blocks, edit one body to add a paragraph, and save. `/academics#examination` shows four cards, two per row at 768 px and one per row at 375 px, with the new paragraph.

**Acceptance Scenarios**:

1. **Given** the Academics tab, **When** a Pages user adds, edits, reorders or removes blocks and saves, **Then** the public cards match in content and order.
2. **Given** a body containing text separated by a blank line, **When** published, **Then** each part shows as its own paragraph, and single line breaks do not start a new paragraph.
3. **Given** limits (20 blocks, heading 120 characters, body 3000 characters), **When** exceeded, **Then** the input is refused on client and server.
4. **Given** a body containing `<b>` or `<script>` text, **When** published, **Then** it appears as literal text and is never interpreted as markup.

---

### User Story 6 - Seed initial content safely (Priority: P3)

The developer runs one-time seed scripts for Syllabi, Examination and Portal Links that copy the reference site's content verbatim, marked pending client confirmation. Each is a dry run by default, writes only with `--confirm`, and refuses to overwrite existing content.

**Why this priority**: Saves the client re-typing hundreds of topics, but runs only when the user decides.

**Independent Test**: Run each script without flags: it prints what it would write and the database is unchanged. Run with `--confirm`: content appears in the panel with a "pending client confirmation" notice. Run again with `--confirm`: it refuses and changes nothing.

**Acceptance Scenarios**:

1. **Given** empty content, **When** a seed script runs without `--confirm`, **Then** it prints a summary (counts and items) and writes nothing.
2. **Given** empty content, **When** run with `--confirm`, **Then** the content is written and marked pending client confirmation.
3. **Given** any existing content for that section (even one item), **When** run with or without `--confirm`, **Then** it reports the content exists, writes nothing and exits with a failure status.
4. **Given** seeded content marked pending, **When** an admin opens the panel, **Then** a notice says the content was copied from the reference site and awaits client confirmation. The notice stays through ordinary saves and clears only when an admin with the panel's permission uses "Mark as confirmed by client", which writes an audit entry. Visitors never see it.
5. **Given** the Portal Links seed, **When** written, **Then** "Student Login" (a plain `http://` IP address) shows the not-secure warning in the panel.

---

### Edge Cases

- **Empty sections**: Syllabi with no levels, Examination with no blocks, or Class Levels with no rows are not rendered on the public page, and their header dropdown and search entries are absent. The same goes for a level with no subjects. A level that has subjects but no topics is still shown.
- **Deep link to a hidden section**: `/academics#syllabi` while Syllabi is empty loads the page at the top with no error.
- **Legacy URLs**: `/academics/syllabi`, `/academics/examinations` and `/admission/class-levels` redirect to their new anchors when the section has content, and to the page top otherwise (assumption, see below).
- **Concurrent edits** on any of the four panels are refused as a conflict. The admin keeps their unsaved input and can reload.
- **Class Levels edited while the checklist is open**: a checklist save that refers to a level deleted in the meantime is refused as a conflict, and nothing is written. The admin reloads and sees the current levels and the removed-level warning.
- **Duplicate names**: two Class Levels rows with the same name (ignoring case) are refused, so the checklist and migration stay unambiguous. Duplicate syllabus level or subject names are allowed, with an inline warning that does not block saving.
- **Whitespace-only input** for a required field (level name, subject name, block heading, link label, URL, class level name, age rule) is treated as empty and refused.
- **Reference date**: only valid day-month dates are accepted (29 February is allowed; 31 April is refused).
- **URL edge cases**: uppercase schemes (`HTTPS://`) are accepted and normalised. Leading and trailing spaces are trimmed. Addresses with embedded credentials (`https://user:pass@host`) are refused. Any scheme other than http or https is refused.
- **Very large syllabi**: the editor stays usable with the full reference content (11 levels, several hundred topics).
- **Permission removed mid-session**: a save after the user lost the permission is refused with the slice 1 "not allowed" outcome, and nothing is written.
- **Recovering a removed item**: it is re-entered from the change record (FR-007; quickstart runbook). This feature adds no restore button.

## Requirements *(mandatory)*

### Functional Requirements

**Common to all four panels**

- **FR-001**: Each section MUST be a panel in the stated tab (Syllabi and Examination in Academics; Class Levels in Admission; Portal Links in Site-wide), following slice 1's panel pattern: its own save, an unsaved-changes marker, a refusal on version conflict, an audit entry naming user, panel and time on each successful save, and refresh of the affected public pages.
- **FR-002**: Syllabi, Examination and Class Levels MUST require the **Pages** permission to edit. Portal Links MUST require **Settings**. Every read-for-edit and every save MUST be checked on the server. A panel the user can see but not edit is read-only (slice 1 rule).
- **FR-003**: Validation rules MUST be identical on client and server, from one shared definition. Every text field has a maximum length, and all content is plain text. Markup in input is stored and shown literally, never interpreted.
- **FR-004**: The access matrix MUST gain, for each panel's read-for-edit, save and (where present) "Mark as confirmed by client" action, rows for no session (redirect/401), wrong permission (403) and right permission (success).
- **FR-005**: A public section (or the footer column) with no content MUST NOT be rendered, and its header dropdown and search entries MUST be absent. They appear once content exists. (The footer column: see FR-045.)
- **FR-006**: The admin panels and the affected public pages MUST pass automated accessibility checks (axe) with no violations. Public layouts MUST be checked at 375, 640, 768, 1024 and 1440 px wide (640 px is the reference theme's own mobile-menu breakpoint, `research/design-tokens.md`), with no horizontal scrolling and no overlapping content. "No overlapping content" means no two visible text blocks or controls in a section have intersecting bounding boxes.
- **FR-007**: Removing any item (syllabus level, subject or group; examination block; class level; portal link) is part of a normal panel save. There is no separate permanent delete. A save that removes items MUST write a durable change record naming the user, the panel, the time and each removed item's full previous value, so a wrong removal can be recovered by re-entering it.

**Syllabi**

- **FR-010**: Syllabi MUST be stored as ordered levels → ordered subjects → ordered groups (optional heading, optional intro of plain paragraphs, ordered topics). A group MUST have an intro or at least one topic.
- **FR-011**: Admins MUST be able to add, rename, reorder (up/down controls operable by keyboard) and remove levels and subjects, and add, edit, reorder and remove groups.
- **FR-012**: Removing a level or subject MUST ask for confirmation stating how many topics will be lost. Removing a group that has topics or an intro MUST also ask for confirmation.
- **FR-013**: A group's topics MUST be edited as one text box, one topic per line. Lines are trimmed, and blank lines are ignored.
- **FR-014**: The editor MUST show at most one level expanded at a time.
- **FR-015**: Limits: 20 levels; 10 subjects per level; 20 groups per subject; 100 topics per group; 200 characters per topic; level and subject names 60 characters; group heading 120 characters; group intro 1500 characters. The whole syllabus is capped at 3,000 topics in total, so a full set of limits can never exceed what one stored record can hold.
- **FR-016**: The panel MUST link to `/academics#syllabi`.
- **FR-017**: The public section MUST show level tabs following the ARIA tabs pattern (arrow keys, Home/End) at tablet width and above, and a labelled level picker on phones. Each level shows subject headings, group sub-headings and intro paragraphs (when present) and bulleted topics. On arrival via `#syllabi` the first level is selected. Each level MUST have its own link, `#syllabi-<level-slug>` (from the level name; a repeated slug gets `-2`, `-3`, … in level order), which scrolls to the section with that level selected. Choosing a level by tab or picker MUST update the address to that level's link without adding a browser history entry. An unknown level link falls back to the first level.

**Examination**

- **FR-020**: Examination MUST be stored as ordered blocks of heading + body. The body is paragraphs separated by a blank line.
- **FR-021**: Admins MUST be able to add, edit, reorder and remove blocks. Limits: 20 blocks, heading 120 characters, body 3000 characters.
- **FR-022**: The public section MUST show each block as a card (heading + paragraphs) in a grid: one column below tablet width, two columns from tablet width.

**Class Levels and registration**

- **FR-030**: Class Levels MUST store an age reference date (day and month, default 31 July) and ordered rows of name + age rule. Limits: 30 rows, name 60 characters, age rule 80 characters. Names MUST be unique, compared ignoring case and surrounding or repeated spaces. A duplicate blocks the save with a clear message naming the row ("Another class level is already called 'Class 1'. Class names must be unique, because registration matches classes by name.").
- **FR-031**: The public section MUST be a table with column headers "Class level" and "Age on <reference date>" (e.g. "Age on 31 July"), marked up so assistive technology associates each cell with its column. On phones each row shows as stacked label/value pairs.
- **FR-032**: "Classes open for admission" MUST become a checklist of the Class Levels rows, in table order, still under the **Settings** permission. It stores references to the levels. A snapshot of each ticked level's name is kept only to name a level that was later removed. The form always shows current names.
- **FR-033**: The registration form's class dropdown MUST list the ticked levels by their current names, in Class Levels order, followed by any "not linked" names (FR-036). With nothing ticked and nothing unlinked, the form shows the Closed message.
- **FR-034**: Each registration MUST keep storing the chosen class name as text at the time of submission. Renaming, unticking or deleting a level MUST NOT change existing registrations. The server MUST accept a submitted class only if it is currently offered.
- **FR-035**: A ticked level that is deleted MUST drop out of the checklist and the form, and the Admission tab MUST show a warning naming it until an admin with Settings acknowledges it by saving the checklist.
- **FR-036**: A migration MUST match existing typed class names to Class Levels rows by name, ignoring case and surrounding spaces. It is a dry run by default and writes only with a confirm flag. It reports matched and unmatched names, keeps unmatched names as "not linked", and is safe to run again. The Admission tab MUST list "not linked" names, with actions to link each to a level or remove it.
- **FR-037**: 013's unit and end-to-end tests MUST be updated to the checklist model.

**Portal Links**

- **FR-040**: Portal Links MUST be stored as ordered label + URL pairs. Limits: 12 links, label 40 characters, URL 2048 characters.
- **FR-041**: A URL MUST be absolute with scheme `https` or `http` and a host. `javascript:`, `data:`, any other scheme, relative, scheme-less, credential-bearing and malformed addresses are refused.
- **FR-042**: An `http://` URL MUST be accepted with the visible warning "Visitors' browsers will mark this site as not secure."
- **FR-043**: The panel MUST offer a "Test link" control that opens a valid URL in a new tab without affecting unsaved changes.
- **FR-044**: The footer column MUST list the links in saved order. Each opens in a new tab with no access back to the opening page and no referrer, and has an accessible name that says it opens an external site.
- **FR-045**: With no links, the column (heading included) MUST be hidden and the remaining footer columns reflow.
- **FR-046**: The `/portal/<slug>` placeholder pages MUST be retired. Every `/portal/...` URL redirects permanently to `/`. No link in the site may point to a `/portal/...` URL. The end-to-end tests that walk or visit `/portal/` links MUST be updated.

**Seed scripts**

- **FR-050**: One-time seed scripts MUST exist for Syllabi, Examination and Portal Links, carrying the reference text verbatim (Portal Links: the six labels and the reference URLs). Structural changes (e.g. numbered lists as bullets, extra sub-headings as groups, Clarification Q5) are listed in the seed's report.
- **FR-051**: Each MUST be a dry run by default, write only with `--confirm`, refuse to write (with a failure status) if the section already has any content, and mark written content as pending client confirmation.
- **FR-052**: Content marked pending MUST show an admin-only notice in its panel. Ordinary saves MUST NOT clear it. The panel MUST offer a "Mark as confirmed by client" action, under the panel's permission and checked on the server, that clears the flag and writes an audit entry naming the user and the panel. Seeded content MUST appear on the public site within one minute (the public cache's normal refresh), since a script cannot refresh a running site directly.

### Key Entities

- **Syllabus**: ordered Levels (name). Each has ordered Subjects (name), each with ordered Topic Groups (optional heading, optional intro paragraphs, ordered topic lines). One record for the whole section, plus version, last-saved-by/at and a pending-confirmation flag.
- **Examination**: ordered Blocks (heading, body). One record, plus version, last-saved metadata and a pending flag.
- **Class Levels**: age reference date (day-month) and ordered Levels (stable id, name, age rule). One record, plus version and last-saved metadata. Levels keep their id when renamed or reordered.
- **Classes open for admission** (existing admission record, changed): a list of Class Level ids that are open, plus a list of "not linked" legacy names and a list of recently removed ticked levels awaiting acknowledgement.
- **Portal Links**: ordered Links (label, URL). One record, plus version, last-saved metadata and a pending flag.
- **Registration** (013, unchanged): keeps the class name as text.
- **Settings change record** (new): group, panel, acting user, time, and the removed items (path, label, full previous value). Written on every save that removes items.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can add a portal link, a class level or an examination block and see it on the public site in under 2 minutes, with no developer involvement.
- **SC-002**: With the full reference syllabi seeded (11 levels, several hundred topics), opening a level, editing a topic and saving each respond within 1 second on a mid-range laptop. Typing in a topics box has no visible lag.
- **SC-003**: 100% of the access-matrix rows for the four panels (no session, wrong permission, right permission, for read and save) pass.
- **SC-004**: 0 accessibility violations from automated checks on the four admin panels and on `/academics`, `/admission` and a page showing the footer, and 0 horizontal-scroll or overlap defects at 375, 640, 768, 1024 and 1440 px.
- **SC-005**: 0 links on the public site point to `/portal/...`, and 100% of the six old placeholder URLs redirect permanently to `/`.
- **SC-006**: 100% of the unsafe URL forms listed in FR-041 are refused, by both the panel and a direct server request.
- **SC-007**: After the class-levels migration, every previously typed class name is either linked to a level or listed as "not linked". 0 names are lost, and 0 existing registrations change.
- **SC-008**: Running each seed script twice with `--confirm` leaves the content identical to after the first run.

## Assumptions

- **Section placement**: Syllabi and Examination sit on `/academics` after Academic Overview and before Teachers' Training, matching the reference site's order. Class Levels sits on `/admission` after Admission Procedure and before Uniform. Each is added to the page-section list (menu and search) only while it has content.
- **Legacy redirects**: `/academics/syllabi`, `/academics/examinations` and `/admission/class-levels` are repointed to `/academics#syllabi`, `/academics#examination` and `/admission#class-levels`. With the section empty, the anchor simply does not match and the page opens at the top.
- **Limits not stated in the brief** (level/subject names 60 characters, group heading 120, URL 2048) are chosen to match the brief's other limits.
- **Audit entries** reuse slice 1's `settings_saved` line, naming the new panel. The classes migration and seed scripts log their own lines naming the script and counts.
- **Seed content source**: the reference pages are read once, by the developer, when the seed data is prepared. Nothing at runtime depends on the reference site.
- **Footer accessible name** uses visually hidden text such as "(opens external site in a new tab)" appended to the label.

## Out of Scope

- Editable text for the rest of the pages (014 slice 3).
- File or PDF uploads for syllabi, or any attachment.
- Rich text or markup in any field.
- Per-campus variants of any section.
- Running the seed scripts or the migration against production. The user decides when.

## Open Questions for the Client *(do not block building)*

1. Syllabi: do the reference syllabi apply to Metroville campus? Any classes above Class 8?
2. Examination: confirm the reference text applies.
3. Class Levels: the levels offered and the age rule for each.
4. Portal links: the correct URLs for this campus, and whether Student Login has an `https://` address.
