# Feature Specification: Settings

**Feature Branch**: `005-settings`
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Feature Brief — 005 Settings. Admin-editable site content, organised in groups with fixed fields. Layout never changes; only the content inside it does." (full brief recorded in `history/prompts/005-settings/`)

**References**: `docs/prd.md` §5.1, §5.8, §6.5, §7 · Constitution I (Fidelity), III (Roles & Access), V (upload verification), VI (Data Integrity, soft delete), VIII (Content), XI (three access cases per admin route) · Feature 011 (shared permission check, `settings` permission key, right-hand panel, form patterns) · Feature 002 (admin form, table, dialog and toast patterns) · Features 001 and 008 (current contact and social values) · Reference hero: `screenshots/das.edu.pk_.png` (desktop) and `screenshots/das.edu.pk_(Moto G Power).png` (mobile)

## Overview

> **Superseded in part by 007 Gallery Albums**: the Photo gallery group below was replaced by albums (`specs/007-gallery-albums/`). The gallery is no longer a Settings group; the other four groups are unchanged.

Today the campus phone, email, address, office hours, map link and social links are fixed in the site's content files, and there is nowhere to manage hero slides, stats, the home-page video or the photo gallery. This feature turns the placeholder Settings section into an admin area where a user with the **settings** permission edits that content without a redeploy.

Settings is split into **groups**, each saved on its own:

| Group | Fields | Shown on the site by |
|---|---|---|
| Contact & social | phone, email, address, office timings, map location, social links (Facebook, Instagram, YouTube, TikTok) | Header, footer and Contact page — **this feature** |
| Hero slides | display time; list of slides (desktop image, optional mobile image, alt text, optional heading, optional button label + link, visible/hidden) | Home page — feature 006 |
| Stats | students, books, teachers, campuses | Home page — feature 006 |
| Home video | one YouTube address | Home page — feature 006 |
| Photo gallery | list of images, each with an optional caption | Resources — feature 016 |

**Design principle**: every group is described as a fixed list of typed fields (text, long text, number, URL, image, video address, list of items). The admin form for a group is produced from that description, so adding a field later means adding it to the description, not building a new screen. Layout never changes; only the values inside it do (Constitution VIII).

## Clarifications

### Decisions taken from the brief and existing features (no question needed)

- The home-page video the brief calls "Who We Are" is the single video on the reference home page, shown in its "Why Choose Dar-e-Arqam Schools?" section (PRD §5.1 and §6.5 call it the "Why Choose video"). This feature treats them as the same field and labels it **Home video** in the admin. *Flagged per Constitution I: the brief's section name and position differ from the PRD and the reference screenshot; 006 decides the final section label.*
- Hero slides are image-only in this phase. PRD §5.1 allows "image or video"; video slides are deferred by the brief, which this spec records as an explicit, approved scope reduction.
- The social platforms offered are the four already on the site (Facebook, Instagram, YouTube, TikTok). The brief's "etc." is satisfied by the design principle: another platform is one more field in the group's description.

### Session 2026-09-30

- Q: What is the starting hero slide? → A: One visible starting slide using a plain branded placeholder image with alt text; the client replaces it in Settings.
- Q: What happens when two admins edit the same group? → A: A save is refused if the group changed since the admin opened it, with "This group was changed by someone else. Reload to see their changes."; the admin's edits stay on screen.
- Q: What does "recoverable" delete mean for slides and gallery images? → A: Soft delete only; no restore screen in this feature, and a developer restores if needed.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Settings is permission-gated (Priority: P1)

Only a signed-in user who may use the Settings section — a main admin, or a content manager granted **settings** — can open any Settings page or make any Settings request. Everyone else is kept out the same way as every other section built in 011.

**Why this priority**: Constitution III. Without this, anything below is editable by anyone signed in.

**Independent Test**: As a content manager without "settings", open each Settings page by URL and send each Settings request directly; confirm redirect with the "no access" message and refusal with no data. Repeat signed out and with the permission.

**Acceptance Scenarios**:

1. **Given** a visitor who is not signed in, **When** they open any Settings page, **Then** they are sent to the login page; **When** they send any Settings request, **Then** it is refused as not signed in and returns no data.
2. **Given** a content manager without "settings", **When** they open any Settings page by URL, **Then** they are sent to the overview with "You don't have access to that section."; **When** they send any Settings request (read, save, upload, reorder, delete), **Then** it is refused as forbidden and nothing changes.
3. **Given** a content manager granted "settings", or a main admin, **When** they open Settings, **Then** they see every group and can save them.
4. **Given** a content manager whose "settings" grant is removed while they have a group open, **When** they save, **Then** the save is refused and nothing changes.
5. **Given** the sidebar, **When** a user without "settings" views any admin page, **Then** Settings is not listed (presentation only; items 1–4 are the real control).

---

### User Story 2 - Contact & social details (Priority: P1)

The admin edits the campus phone, email, address, office timings, map location and social links. The header, footer and Contact page read the saved values. On the day this ships, the saved values are exactly today's values, so the live site looks unchanged. A social link left empty hides that icon. The Contact page keeps its current layout; only where its values come from changes.

**Why this priority**: These details appear on every page, and today the address and hours are placeholders the client needs to replace without a developer.

**Independent Test**: Before any edit, compare header, footer and Contact page with the previous release (identical). Change the phone and clear the TikTok link, save, and within a minute see the new phone on the Contact page and no TikTok icon in the header (top bar) or footer.

**Acceptance Scenarios**:

1. **Given** the feature has just been deployed and nobody has saved Settings, **When** a visitor opens any page, **Then** the header, footer and Contact page show exactly the values they showed before the feature (phone, email, address, map link, office hours and the four social links).
2. **Given** the Contact & social group, **When** the admin changes the phone, email, address, office timings and map location and saves, **Then** a success message is shown and, within one minute, the header, footer and Contact page show the new values with no redeploy.
3. **Given** a social link, **When** the admin clears it and saves, **Then** that platform's icon disappears from the header and footer; the remaining icons keep their order and spacing.
4. **Given** an invalid email, a map location or social link that is not a web address, or a required field left empty (phone, email, address), **When** the admin saves, **Then** a specific message appears under each faulty field, nothing is saved and the rest of what they typed stays in the form.
5. **Given** the Contact page after an edit, **When** it is compared with the version before the feature, **Then** only the values differ; headings, columns, icons, map section and form are unchanged.

---

### User Story 3 - Hero slides (Priority: P1)

The admin manages the home-page hero carousel: add, edit, reorder (by dragging or with up/down controls), hide and delete slides. Each slide has a desktop image, an optional separate mobile image and alt text, plus an optional heading and an optional button (label and link). The admin also sets how long each slide is shown before it advances. At least one visible slide must always remain. Slides are images only in this phase.

**Why this priority**: The hero is the first thing every visitor sees; 006 cannot build the home page without it.

**Independent Test**: Add two slides, move the second above the first with the up control, hide one, save; reload Settings and confirm the order and visibility persisted. Then try to hide or delete the only remaining visible slide and confirm it is refused.

**Acceptance Scenarios**:

1. **Given** the Hero slides group, **When** the admin adds a slide, **Then** it is edited in a panel that slides in from the right (the 011 panel pattern) with desktop image, mobile image (optional), alt text, heading (optional), button label and button link (optional) and a visible switch.
2. **Given** a new slide without a desktop image or without alt text, **When** the admin saves the panel, **Then** a field message is shown and the slide is not added.
3. **Given** a button label without a link, or a link without a label, **When** the admin saves the panel, **Then** a field message asks for both or neither.
4. **Given** two or more slides, **When** the admin drags a slide to a new position, or uses its up/down controls, and saves the group, **Then** the saved order is the new order; the up control is disabled on the first slide and the down control on the last.
5. **Given** several visible slides, **When** the admin hides one and saves, **Then** it stays in the admin list, marked hidden, and is not part of the visible set.
6. **Given** exactly one visible slide, **When** the admin tries to hide or delete it, **Then** the control is unavailable with a note "At least one visible slide is required", and a direct request that would leave zero visible slides is refused with the same message and nothing changes.
7. **Given** a slide, **When** the admin deletes it, **Then** they are asked to confirm first; after confirming and saving, the slide leaves the list and is kept as deleted (soft delete), so it can be restored.
8. **Given** the display time field, **When** the admin enters a whole number of seconds from 3 to 15 and saves, **Then** it is stored; anything else is refused with a message stating the range.
9. **Given** a visitor who prefers reduced motion, **When** the hero is shown (006), **Then** slides do not advance on their own; other visitors see them advance after the saved display time.
10. **Given** a slide with a mobile image, **When** a phone-width visitor sees it (006), **Then** the mobile image is shown; without one, the desktop image is shown.

---

### User Story 4 - Stats (Priority: P1)

The admin edits the four numbers of the home-page progress dashboard: students, books, teachers and campuses.

**Why this priority**: Small, but 006 needs these values and they change every year.

**Independent Test**: Change students to 310000, save, reload and see 310000; try -5, 2.5 and "abc" and confirm each is refused.

**Acceptance Scenarios**:

1. **Given** the Stats group, **When** the admin enters whole, non-negative numbers for all four and saves, **Then** a success message is shown and the values are stored.
2. **Given** a negative number, a decimal, text, an empty field or a number above 100,000,000, **When** the admin saves, **Then** a message under that field states that only whole numbers from 0 to 100,000,000 are accepted, and nothing in the group is saved.

---

### User Story 5 - Home video (Priority: P2)

The admin sets the YouTube address of the single video used on the home page, or clears it.

**Why this priority**: Needed by 006, but the home page works without a video.

**Independent Test**: Save a valid YouTube watch address, reload and see it; save a Vimeo address and see it refused; clear the field, save, and confirm the stored value is empty.

**Acceptance Scenarios**:

1. **Given** the Home video group, **When** the admin enters a YouTube address in any common form (watch page, short youtu.be link, embed link or Shorts link) and saves, **Then** it is accepted and stored.
2. **Given** an address that is not a YouTube video (another site, a YouTube channel or playlist page, or malformed text), **When** the admin saves, **Then** it is refused with "Enter a YouTube video address" and the previous value is kept.
3. **Given** a saved video, **When** the admin clears the field and saves, **Then** the stored value is empty and, on the home page (006), the section shows its text without the video and without an empty frame or error.

---

### User Story 6 - Photo gallery (Priority: P2)

The admin uploads images to the photo gallery (several at once), adds or edits captions, reorders images and deletes them.

**Why this priority**: The Resources page (016) depends on it; nothing else does yet.

**Independent Test**: Upload three images at once, add a caption to one, move the third to first, delete the second (confirm), save; reload and confirm two images in the new order with the caption.

**Acceptance Scenarios**:

1. **Given** the Photo gallery group, **When** the admin chooses several valid images at once, **Then** each uploads with its own progress, and all appear in the list, in the order chosen, after the existing images.
2. **Given** a selection where some files are valid and some are not, **When** it is uploaded, **Then** the valid ones are added and each invalid one is listed with the reason (type or size limit); valid ones are not lost.
3. **Given** gallery images, **When** the admin edits captions, reorders (drag or up/down) and saves, **Then** the new captions and order are stored.
4. **Given** an image, **When** the admin deletes it, **Then** they confirm first; after saving it leaves the list and is kept as deleted (soft delete).
5. **Given** a caption longer than the limit, **When** the admin types, **Then** input stops at the limit and a counter shows the remaining characters.

---

### User Story 7 - Saving, publishing and unsaved changes (Priority: P2)

Each group saves on its own, with a clear success or error message. Saved changes reach the live site within a minute without a redeploy. Leaving a group with unsaved changes warns first. If settings cannot be read, the public site still renders.

**Why this priority**: Makes every other story safe to use, but each story is testable without the warning.

**Independent Test**: Edit the phone, try to switch to the Stats group, and confirm the warning; stay, save, then switch without a warning. Simulate settings being unreadable and confirm the home and Contact pages still render with the last saved or starting values.

**Acceptance Scenarios**:

1. **Given** an edited group, **When** the admin saves, **Then** only that group is saved and a success message names it; other groups are untouched.
2. **Given** a save that fails (validation or server error), **When** it returns, **Then** an error message is shown, the admin's edits stay in the form and nothing in that group is partly saved.
3. **Given** unsaved changes in a group, **When** the admin switches to another group, follows any admin link, reloads or closes the tab, **Then** they are warned first and can stay; with no changes, nothing warns.
4. **Given** a saved change, **When** a visitor loads an affected page within one minute of the save, **Then** they see the new value, with no redeploy.
5. **Given** two admins have the same group open and one saves, **When** the other then saves, **Then** the save is refused with "This group was changed by someone else. Reload to see their changes.", nothing is stored, and the second admin's edits stay on screen.
6. **Given** settings cannot be read at the moment a page is built, **When** a visitor loads any public page, **Then** the page renders with the last successfully read values, or with the starting values if none were ever read, and never shows an error page.

---

### Edge Cases

- An upload that fails (network, type, size) does not lose any other unsaved edits in that group; the admin can retry or remove the failed item.
- A file renamed to look like an image (e.g. a PDF saved as `photo.jpg`) is refused because its real content is checked, not its name or declared type.
- An image over 5 MB, or in a format other than JPG, PNG or WebP (e.g. GIF, SVG, HEIC, a video file), is refused with "Images must be JPG, PNG or WebP, up to 5 MB."
- No video file can be uploaded anywhere in Settings; the Home video is an address only.
- Headings, alt text, button labels and captions have maximum lengths (below) so the layout stays intact; longer input cannot be entered or saved.
- A slide with a mobile image but no separate alt text uses the slide's alt text for both.
- Removing an uploaded image from a slide or the gallery before saving leaves no trace in the saved group.
- Deleting all gallery images is allowed; an empty gallery is valid.
- Deleting or hiding slides in one save such that none are visible is refused as a whole, even if each step alone would be allowed.
- A button link may be a site path (starting with `/`) or a full web address; anything else (e.g. `javascript:`) is refused.
- The map location, if changed to something that is not a web address, is refused; the Contact page's embedded map keeps using the address as today.
- A content manager's "settings" grant being removed takes effect on their next request, including a save of a form already open (011 behaviour).

## Requirements *(mandatory)*

### Functional Requirements

**Access**

- **FR-001**: Every Settings page, data request and action MUST use the shared permission check from 011 with the **settings** permission key: no session → not signed in (401) for requests, login redirect for pages; signed in without the permission → forbidden (403) with no data for requests, redirect to the overview with "You don't have access to that section." for pages.
- **FR-002**: Every Settings request that changes data MUST be accepted only from the admin panel's own origin, like 010 and 011's actions.
- **FR-003**: Reading settings for the public site MUST NOT require a session, and MUST return only the values the site displays (no deleted items, no hidden slides, no admin-only data).

**Groups and field definitions**

- **FR-004**: Settings MUST be organised into five groups — Contact & social, Hero slides, Stats, Home video, Photo gallery — each stored as one record (PRD §7).
- **FR-005**: Each group MUST be defined as a fixed list of typed fields, using the types text, long text, number, URL, image, video address and list of items. Each field definition carries its label, whether it is required, and its limits.
- **FR-006**: The admin form for each group MUST be generated from its definition, and the server MUST validate a save against the same definition, so client and server rules cannot drift. Adding a field to a group MUST require only a change to its definition.
- **FR-007**: The admin MUST NOT be able to add, remove or reorder groups or fields, or change a field's type.

**Contact & social**

- **FR-008**: The Contact & social group MUST hold: phone (text, required, max 40), email (required, valid email), address (long text, required, max 300), office timings (text, max 120), map location (URL, a web address), and one optional web address each for Facebook, Instagram, YouTube and TikTok.
- **FR-009**: When no Contact & social record has been saved yet, the stored starting values MUST be exactly the current values from the 001 and 008 content files, so the header, footer and Contact page render identically before and after release.
- **FR-010**: The header (top bar), footer and Contact page MUST read these values from Settings. The Contact page's layout, headings, icons, map section and form MUST NOT change.
- **FR-011**: A social link that is empty MUST hide that platform's icon everywhere it appears; the remaining icons keep their fixed order.

**Hero slides**

- **FR-012**: The Hero slides group MUST hold a display time (whole seconds, 3–15, default 5) and an ordered list of slides. Each slide holds: desktop image (required), mobile image (optional), alt text (required, max 150), heading (optional, max 80), button label (optional, max 30), button link (optional; a site path starting with `/` or a full web address), and visible (yes/no).
- **FR-013**: Button label and button link MUST be given together or not at all.
- **FR-014**: The admin MUST be able to add, edit, reorder (by drag and by up/down controls operable with the keyboard), hide, show and delete slides. Adding and editing a slide MUST use the 011 right-hand panel pattern.
- **FR-015**: The group MUST always have at least one visible, non-deleted slide. The server MUST refuse any save that would leave zero, with "At least one visible slide is required"; the admin MUST NOT be offered hide or delete on the last visible slide.
- **FR-016**: Slides MUST be images only; no video slide type is offered in this phase.
- **FR-017**: Settings MUST provide what the home page (006) needs to show the hero: the visible slides in order, each with its desktop and optional mobile image, and the display time. Auto-advance MUST be off for visitors who prefer reduced motion (delivered in 006; this feature stores the values it depends on).

**Stats**

- **FR-018**: The Stats group MUST hold four required numbers — students, books, teachers, campuses — each a whole number from 0 to 100,000,000. Starting values are the reference site's: 300000, 50, 14500, 700.

**Home video**

- **FR-019**: The Home video group MUST hold one optional YouTube video address. Accepted forms: `youtube.com/watch?v=…`, `youtu.be/…`, `youtube.com/embed/…`, `youtube.com/shorts/…` (with or without `www.`/`m.` and `https://`). Anything else MUST be refused with "Enter a YouTube video address".
- **FR-020**: An empty Home video MUST be valid and MUST mean "no video"; consumers show the section without the video and without an error.

**Photo gallery**

- **FR-021**: The Photo gallery group MUST hold an ordered list of images, each with an optional caption (max 150).
- **FR-022**: The admin MUST be able to upload several images in one selection (up to 20 per selection), edit captions, reorder (drag and up/down) and delete images.

**Media**

- **FR-023**: Image uploads MUST be JPG, PNG or WebP and at most 5 MB each, verified from the file's actual content, not its name or declared type (Constitution V). Anything else MUST be refused with "Images must be JPG, PNG or WebP, up to 5 MB."
- **FR-024**: No video file upload MUST be possible anywhere in Settings.
- **FR-025**: Images MUST be delivered to visitors in sizes and formats suited to their screen, and a slide's mobile image MUST be used for phone-width screens when one is set.
- **FR-026**: Settings images are public media and MUST be stored with the public media service already used for news images (Constitution II).

**Saving and publishing**

- **FR-027**: Each group MUST save independently and atomically: a save stores the whole group or nothing. Success and error MUST be shown with the 002 toast pattern, and field errors under their fields.
- **FR-028**: Within a group, edits (including adding, reordering, hiding and deleting list items) MUST stay unsaved until the admin saves the group; a failed upload or save MUST NOT discard other unsaved edits.
- **FR-029**: Leaving a group, the Settings area or the page with unsaved changes MUST warn first and let the admin stay.
- **FR-030**: A saved change MUST be visible on the live site within one minute, with no redeploy (Constitution VIII).
- **FR-031**: A save MUST be refused, storing nothing, if the group was saved by anyone since the admin loaded it, including when two saves arrive at the same moment. The refusal MUST show "This group was changed by someone else. Reload to see their changes." and MUST keep the admin's unsaved edits on screen. No mixture of two saves is ever stored.
- **FR-032**: If settings cannot be read, the public site MUST render with the last successfully read values or, failing that, the starting values, and MUST NOT show an error page.

**Deletion**

- **FR-033**: Deleting a slide or gallery image MUST ask for confirmation and MUST be a soft delete: the item is hidden from the admin list and the site but kept so it can be restored.

**Records and layout**

- **FR-034**: Every successful group save MUST record who saved which group and when, in the security events log format of 002 (no field values beyond the group name).
- **FR-035**: Every Settings screen, including the slide panel, MUST work without horizontal scrolling or overlapping controls at 375, 768, 1024 and 1440px, and follow the admin form, table, dialog and toast patterns of 002 and the panel pattern of 011 (full width on phones).

### Key Entities

- **Settings group**: one record per group (contact, hero, stats, video, gallery), holding that group's field values, when it was last saved and by whom.
- **Field definition**: the fixed description of one field in a group — key, label, type (text, long text, number, URL, image, video address, list of items), required or optional, and limits (max length, number range, accepted formats).
- **Hero slide**: an item in the hero list — desktop image, optional mobile image, alt text, optional heading, optional button label + link, visible flag, position, deleted marker.
- **Gallery image**: an item in the gallery list — image, optional caption, position, deleted marker.
- **Image reference**: a stored public image with its dimensions and format, used by slides and gallery images.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Immediately after release, with no edits, the header, footer and Contact page are visually and textually identical to the previous release at 375, 768, 1024 and 1440px.
- **SC-002**: An admin can change the campus phone number and see it on the live Contact page in under 2 minutes end to end, with no developer involved.
- **SC-003**: 100% of saved changes appear on the live site within one minute of saving, in tested cases.
- **SC-004**: 100% of Settings routes have three passing access tests: no session, missing settings permission, correct permission.
- **SC-005**: 100% of tested oversized (over 5 MB) and wrong-type uploads, including renamed files, are refused with the stated limit message.
- **SC-006**: 0 tested paths (admin controls or direct requests) leave the hero with zero visible slides.
- **SC-007**: The end-to-end journeys pass: edit contact details and see them on the Contact page and in the header and footer social icons; add two slides, reorder them, hide one; update stats; set and clear the video address; upload, reorder and delete gallery images.
- **SC-008**: 0 public pages show an error page when settings cannot be read, in tested failure cases.
- **SC-009**: Adding a new field to an existing group requires changing only that group's definition; demonstrated by a test that adds a field to a definition and sees it in the generated form and in server validation.

## Assumptions

- The Settings section's permission key is **settings**, already defined and grantable in 011.
- The starting hero slide is one visible slide using a plain branded placeholder image with descriptive alt text, so the "at least one visible slide" rule holds from day one. The placeholder is added to the media store during setup and is replaced by the client in Settings.
- The starting Home video is empty until the client supplies the address; the starting gallery is empty.
- Starting stats are the reference home page's values: 300000 students, 50 books, 14500 teachers, 700 campuses.
- The address, map link and office hours in the content files are placeholders (001/008); after release the client replaces them through Settings. The starting phone is also a placeholder.
- The header's top bar shows portal links and the social icons; the footer shows the copyright line and the social icons; the phone, email, address, hours and map appear on the Contact page. "Header and footer contact details" therefore means the social links in the top bar and footer, plus every value on the Contact page. The stored field "office timings" is the existing `officeHours` value.
- "Recoverable" means soft-deleted items are kept and can be restored by a developer or a later restore feature; this feature adds no restore screen.
- One minute to go live is acceptable for the client (brief); instant updates are not required.
- Settings changes are logged as security events (who, which group, when); a full field-level change history is not required in this phase.

## Dependencies

- Feature 011: shared permission check, **settings** key, right-hand panel, form and password patterns, sidebar filtering.
- Feature 002: admin shell, form/table/dialog/toast patterns, sessions, security events log.
- Feature 003: the public media service and upload flow used for news images, reused for Settings images.
- Features 001 and 008: current contact values, header/footer and Contact page, and the single seam through which the Contact page reads contact details.
- Feature 006 consumes hero, stats and video; feature 016 consumes the gallery.

## Out of Scope

- Editing page text for About, Academics, Admission and other pages (feature 014).
- Adding, removing or reordering page sections or settings groups.
- Showing the hero, stats and video on the home page (feature 006) and the gallery on Resources (feature 016). Exception: the header, footer and Contact page switch to Settings in this feature.
- Video slides and uploading video files.
- A restore screen for deleted slides or gallery images.
- Multiple sites or clients.
