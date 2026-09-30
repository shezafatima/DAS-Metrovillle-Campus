# Feature Specification: Gallery Albums

**Feature Branch**: `007-gallery-albums`
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Feature Brief — Gallery Albums. Replaces the flat photo gallery built in Settings (005) with albums, capped at 6 albums and 8 photos each." (full brief recorded in `history/prompts/007-gallery-albums/`)

**References**: `docs/prd.md` §5.6, §6.5 · Constitution III (Roles & Access), V (upload verification), VI (Data Integrity, soft delete), VIII (Content), XI (three access cases per admin route) · Feature 005 (Settings: the Photo gallery group this replaces, media rules, save and conflict patterns) · Feature 011 (shared permission check, `settings` key, right-hand panel) · Feature 002 (admin form, dialog, toast patterns)

## Overview

Settings (005) holds the photo gallery as one flat list of images. This feature replaces it with **albums**: the admin groups photos into a small number of titled albums, and visitors browse album covers on the Resources page and open an album to see its photos.

| | Limit this phase |
|---|---|
| Albums in the gallery | 6 |
| Photos in one album | 8 |
| Image types | JPG, PNG, WebP, up to 5 MB each |

The caps are fixed. They are enforced in the admin screens **and** on the server, so no direct request can exceed them, even when two admins act at the same moment.

The flat gallery's existing photos move into an album named "Gallery" when this feature ships (spilling into "Gallery 2" and so on when there are more than 8, up to the 6-album cap).

## Clarifications

### Decisions taken from the brief and existing features (no question needed)

- "Recoverable" deletion follows the 005 precedent: an album or photo is soft-deleted (hidden from the admin list and the site, kept in storage), with no restore screen in this feature; a developer restores if needed.
- **Documented deviation from the reference**: the reference's Photo Gallery address is `/resources/photo-gallery`. This feature serves the gallery as the `#photo-gallery` section of `/resources` (owner's decision, Session 2026-09-30) and permanently redirects `/resources/photo-gallery` to `/resources#photo-gallery`, so old links still land on the gallery.
- Gallery albums are managed inside the Settings area under the same **settings** permission as the rest of Settings; no new permission key is added.
- Album and photo changes save immediately per action (create, rename, reorder, upload, delete), not through the group-level Save button used by other Settings groups, because uploads, caps and cover rules must be decided at the moment of each action. Each action shows the 002 toast on success or failure.
- The public gallery lives on the Resources page's Photo Gallery section, which the Home page's "Photo/Videos" icon link also reaches.

### Session 2026-09-30

- Q: Where is the public gallery delivered before feature 016? → A: This feature replaces the `/resources` placeholder with a minimal Resources page holding only the Photo Gallery section, anchored `#photo-gallery`. Feature 016 **extends** that page by adding the Downloads (`#downloads`) and Our Books (`#our-books`) sections around the existing gallery section; it does not replace the page or rebuild the gallery section.
- Q: What happens to old flat-gallery photos beyond the first 8? → A: Overflow goes into further albums "Gallery 2", "Gallery 3" and so on, 8 photos each, within the 6-album cap. If the old gallery needs more than 6 albums (more than 48 photos), the first 48, in their existing order, are migrated and the rest are discarded: no overflow storage is kept. The migration reports how many photos were not migrated.
- Q: How do visitors open an album? → A: Each album has its own page at `/resources/gallery/<album>` showing its photos in a grid; choosing a photo opens a full-screen viewer; the browser back button returns from the album page to the Resources gallery section.
- Q: Can a photo be moved to another album? → A: No. Moving is not offered; the admin deletes the photo and uploads it to the other album.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Admin manages albums (Priority: P1)

The Settings gallery section lists albums instead of loose photos. The admin creates an album with a title, an optional short description and an optional date; reorders albums; renames them; and deletes them (after confirmation). At six albums the create button is disabled with a message.

**Why this priority**: Albums are the structure everything else hangs on.

**Independent Test**: Create three albums, reorder the third to first, rename one, delete one (confirm); reload and confirm the list matches. Create albums up to six, confirm the seventh is refused in the screen and by a direct server request.

**Acceptance Scenarios**:

1. **Given** the gallery section, **When** the admin enters a title (and optionally a description and date) and creates the album, **Then** it appears at the end of the list with zero photos.
2. **Given** two or more albums, **When** the admin reorders them (drag, or up/down controls operable by keyboard), **Then** the new order is stored and used on the public site.
3. **Given** an album, **When** the admin renames it or edits its description or date, **Then** the change is stored.
4. **Given** an album, **When** the admin deletes it, **Then** they confirm first; afterwards the album and its photos disappear from the admin list and the public site and its slot is free again.
5. **Given** six albums exist, **When** the admin views the section, **Then** the create button is disabled with the message "The gallery is limited to 6 albums. Delete an album to create a new one."
6. **Given** six albums exist, **When** a create request is sent directly to the server (including a second create arriving at the same moment as another), **Then** it is refused, and never more than six albums exist.

---

### User Story 2 - Admin manages photos in an album (Priority: P1)

The admin opens an album to upload photos (several at once), caption them, reorder them, choose the cover and delete photos. An album holds at most eight photos.

**Why this priority**: Without photos, albums are empty shells; the cap rules are the feature's main risk.

**Independent Test**: Upload five photos at once, caption one, move the last to first, delete one (confirm), choose another as cover; then upload six more and confirm exactly the three that fit are kept and the other three are refused with a clear message.

**Acceptance Scenarios**:

1. **Given** an open album, **When** the admin chooses several valid images at once, **Then** each uploads with its own progress and all appear after the existing photos, in the order chosen.
2. **Given** an album with room for N more photos, **When** the admin selects more than N valid files, **Then** the first N (in selection order) are kept, the rest are refused, and a message says how many were added and how many were refused because the album is full.
3. **Given** a selection where some files are invalid (wrong type or over 5 MB), **When** it uploads, **Then** valid files are added and each invalid file is listed with its reason.
4. **Given** an album with eight photos, **When** the admin views it, **Then** the upload control is disabled with "This album is full (8 photos). Delete a photo to add another."
5. **Given** an album with photos, **When** the admin edits a caption (max 150), reorders photos (drag or up/down) or deletes one (after confirmation), **Then** the change is stored.
6. **Given** an album whose first photo has not been overridden, **When** it is shown, **Then** the first photo is the cover. **When** the admin chooses another photo as cover, **Then** that photo is the cover until the cover is changed again or that photo is deleted.
7. **Given** the cover photo is deleted, **When** the album is shown, **Then** the next photo (the first remaining in order) becomes the cover; an album with no photos has no cover.
8. **Given** an album with eight photos, **When** upload requests are sent directly to the server, including two admins uploading at the same moment, **Then** the album never holds more than eight photos.
9. **Given** an upload fails part-way, **When** the admin looks at the album, **Then** all previously stored photos are untouched.

---

### User Story 3 - Existing photos move into one album (Priority: P1)

When this feature ships, photos already in the old flat gallery are moved into an album named "Gallery" so nothing is lost. The old flat list is no longer shown.

**Why this priority**: Shipping without this would silently drop client content.

**Independent Test**: With a seeded flat gallery of five captioned photos, release the feature; confirm one album "Gallery" holds the same five photos, in the same order, with the same captions, and that the admin and public gallery show them. With an empty flat gallery, confirm no "Gallery" album is created.

**Acceptance Scenarios**:

1. **Given** a flat gallery of up to 8 photos, **When** the feature ships, **Then** one album named "Gallery" contains those photos in their existing order with their captions, and the first is the cover.
2. **Given** an empty flat gallery, **When** the feature ships, **Then** no album is created.
3. **Given** a flat gallery with 9 to 48 photos, **When** the feature ships, **Then** they fill "Gallery", "Gallery 2", "Gallery 3" and so on, 8 per album, in their existing order with their captions, each album's first photo being its cover.
4. **Given** a flat gallery with more than 48 photos, **When** the feature ships, **Then** the first 48 in order are migrated into six albums, the rest are not migrated and are not kept anywhere, and the migration reports how many were not migrated.
5. **Given** photos the admin had soft-deleted in the old gallery, **When** the feature ships, **Then** they stay deleted and are not moved into the album.
6. **Given** the migration has already run, **When** it is run again, **Then** nothing is duplicated.

---

### User Story 4 - Visitors browse the gallery (Priority: P1)

The Resources page's Photo Gallery section shows album covers in a grid, each with its title and photo count, in the admin's order. Choosing an album opens that album's own page, showing its photos in a grid; choosing a photo opens a full-screen viewer where visitors move between photos and close it. It works by keyboard and touch.

**Why this priority**: This is what the client's audience sees.

**Independent Test**: With two albums (one empty), open the Resources page; confirm one cover card with title and count, open it, move forward and back through photos by keyboard and by swipe, close with Escape and with the close button, and confirm focus returns to the album card.

**Acceptance Scenarios**:

1. **Given** albums with photos, **When** a visitor opens the Photo Gallery section, **Then** each album shows its cover, title and photo count, in the admin's order.
2. **Given** an album card, **When** the visitor chooses it (click, tap, or Enter on keyboard), **Then** the album's own page opens at `/resources/gallery/<album>`, showing its title, description and date where set, and its photos in a grid in the admin's order, with captions where set; the browser back button returns to the Resources gallery section.
3. **Given** an album page, **When** the visitor chooses a photo, **Then** a full-screen viewer opens on that photo; **When** they press the left/right arrow keys, use the previous/next controls or swipe, **Then** the photo changes; **When** they press Escape or choose the close control, **Then** the viewer closes and focus returns to the photo they opened.
4. **Given** the gallery has no albums, or only albums with no photos, **When** the visitor opens Resources, **Then** the Photo Gallery section is hidden entirely, with no empty grid or heading left behind.
5. **Given** an album with no photos among others, **When** the grid renders, **Then** that album is not shown and the count on others is unaffected.
6. **Given** the gallery cannot be loaded, **When** Resources renders, **Then** the rest of the page still renders and the Photo Gallery section is hidden.

---

### User Story 5 - Access, media rules and performance (Priority: P2)

Only users with the settings permission can manage albums and photos. Uploaded images are checked, compressed and resized. Photos load as the visitor scrolls.

**Why this priority**: Security and media rules protect the site but sit behind the core flows.

**Independent Test**: Call every gallery admin route with no session, with a signed-in user lacking the settings permission, and with the permission; upload a renamed non-image and an oversized file; open a gallery page and confirm photos below the fold load only as they approach view.

**Acceptance Scenarios**:

1. **Given** no session, **When** any gallery admin page or request is used, **Then** pages redirect to login and actions return "not signed in" with no data and no change.
2. **Given** a signed-in user without the settings permission, **When** any gallery admin page or request is used, **Then** they are refused with no data and no change is made.
3. **Given** a user with the settings permission (or a main admin), **When** they use the gallery admin, **Then** it works.
4. **Given** an upload, **When** the file is not really a JPG, PNG or WebP (even if renamed) or is over 5 MB, **Then** it is refused with "Images must be JPG, PNG or WebP, up to 5 MB."
5. **Given** an accepted image, **When** it is stored, **Then** it is compressed and resized so visitors receive a size suited to their screen.
6. **Given** an album or viewer with many images, **When** the visitor scrolls, **Then** images outside the view are loaded as they approach it, not all at once.

---

### Edge Cases

- Deleting an album removes its photos from the site and frees its slot for a new album.
- Deleting the cover photo promotes the next photo to cover (User Story 2).
- Long album titles (up to the limit) and Urdu titles, descriptions and captions display correctly, wrapping without breaking cards, the viewer or admin rows, and right-to-left text reads correctly.
- An upload that fails leaves the album's other photos untouched; a failed file never leaves a broken or half-stored photo in the list.
- Two admins uploading at once, or two creating albums at once, can never push an album past 8 photos or the gallery past 6 albums; the losing request gets the "full" message and stores nothing beyond the cap.
- Two admins editing the same album's details at once: the later save is refused if the album changed since it was opened, with the 005 message "This was changed by someone else. Reload to see their changes." and the admin's edits stay on screen.
- An album with no description or date shows neither, with no empty gaps.
- Visiting an album page's address after the album was deleted or emptied shows the standard not-found page, never an empty album.
- A single album, a single photo in an album, and exactly 8 photos each render correctly in the grid and viewer (previous/next hidden or disabled when there is nothing to move to).
- Deleting the last remaining album leaves a valid empty gallery; the public section hides.
- A photo without a caption gets no caption text; alt text falls back to the album title plus its position.
- Reordering with the keyboard alone is possible for albums and photos.

## Requirements *(mandatory)*

### Functional Requirements

**Access and security**

- **FR-001**: Every gallery admin page and action MUST use the shared permission check from 011 with the **settings** key: no session → login redirect for pages, and actions return "not signed in" (`unauthorized`) with no data and no change; signed in without the permission → pages redirect to the overview with the no-access message, and actions return "forbidden" with no data and no change. Hiding controls is presentation only.
- **FR-002**: Every gallery request that changes data MUST be accepted only from the admin panel's own origin, like 005, 010 and 011.
- **FR-003**: Reading the gallery for the public site MUST NOT require a session and MUST return only what the site displays: non-deleted albums that hold at least one non-deleted photo, in order, with their non-deleted photos.
- **FR-004**: Every gallery change (album created, renamed, reordered, deleted; photo added, captioned, reordered, cover changed, deleted) MUST be recorded with who and when in the security events log format of 002, with no content beyond the action and the album name.

**Albums**

- **FR-005**: An album MUST have a title (required, max 80), an optional short description (max 300) and an optional date.
- **FR-006**: The gallery MUST hold at most **6** albums (not counting deleted ones). The server MUST refuse any request that would create a seventh, including concurrent requests, with "The gallery is limited to 6 albums. Delete an album to create a new one."
- **FR-007**: At six albums the create control MUST be disabled and show that message; it MUST become enabled again as soon as an album is deleted.
- **FR-008**: The admin MUST be able to reorder albums by drag and by up/down controls operable with the keyboard, rename albums, and edit description and date.
- **FR-009**: Deleting an album MUST ask for confirmation and MUST be a soft delete that hides the album and all its photos from the admin list and the public site and frees its slot.
- **FR-010**: Album order set by the admin MUST be the order on the public site.

**Photos**

- **FR-011**: An album MUST hold at most **8** photos (not counting deleted ones). The server MUST refuse any photo that would exceed eight, including concurrent uploads, with "This album is full (8 photos). Delete a photo to add another."
- **FR-012**: The admin MUST be able to upload several images in one selection. When the selection exceeds the remaining space, the images that fit (in selection order) MUST be kept and the rest refused with a message stating how many were added and how many were refused for lack of space.
- **FR-013**: Each photo MUST have an optional caption (max 150). The admin MUST be able to edit captions, reorder photos (drag and up/down) and delete photos.
- **FR-014**: Deleting a photo MUST ask for confirmation and MUST be a soft delete.
- **FR-015**: An album's cover MUST be its first photo unless the admin has chosen another photo as cover. When the cover photo is deleted, the first remaining photo MUST become the cover. An album with no photos MUST have no cover.
- **FR-016**: An upload that fails MUST leave all other photos in the album unchanged and MUST NOT leave a broken photo entry.
- **FR-017**: Image uploads MUST be JPG, PNG or WebP and at most 5 MB each, verified from the file's real content, not its name or declared type (Constitution V), refused otherwise with "Images must be JPG, PNG or WebP, up to 5 MB." No video upload MUST be possible.
- **FR-018**: Accepted images MUST be compressed and resized on upload and delivered to visitors in sizes suited to their screen; they are public media stored with the public media service used by news and Settings images.

**Migration**

- **FR-019**: When this feature ships, the non-deleted photos of the old flat gallery MUST be moved into an album named "Gallery", in their existing order with their captions, with the first as cover. If the flat gallery is empty, no album is created.
- **FR-020**: Photos soft-deleted in the old flat gallery MUST stay deleted and MUST NOT be moved.
- **FR-021**: The migration MUST be safe to run more than once, creating no duplicates.
- **FR-022**: After migration the old flat gallery list MUST no longer be shown or editable in Settings.
- **FR-023**: When the old flat gallery holds more than eight photos, the migration MUST place the overflow in further albums named "Gallery 2", "Gallery 3" and so on, 8 photos each in existing order, never exceeding the 6-album cap. Photos beyond the first 48 MUST NOT be migrated and MUST NOT be kept in any overflow storage. The migration MUST report how many photos were not migrated (zero when all were).

**Admin screens**

- **FR-024**: The Settings gallery section MUST list albums (cover, title, photo count, date if set) with create, reorder, rename and delete; choosing an album MUST open its own admin screen for photo management. Creating an album and editing its details MUST use the 011 right-hand panel (full width on phones); both follow 002 patterns.
- **FR-025**: Album and photo actions MUST save at the moment of the action, show progress for uploads and a 002 toast for success or failure, and MUST NOT depend on or be blocked by unsaved edits in other Settings groups.
- **FR-026**: A change to an album's details MUST be refused, storing nothing, if the album was changed by anyone since the admin opened it, with "This was changed by someone else. Reload to see their changes."; the admin's edits stay on screen.
- **FR-027**: Every gallery admin screen MUST work without horizontal scrolling or overlapping controls at 375, 768, 1024 and 1440px.

**Public gallery**

- **FR-028**: The Resources Photo Gallery section MUST show album covers in a grid, each with its title and photo count, in the admin's order, with the album description and date where set. Until feature 016, `/resources` MUST be a minimal page containing only this section, reachable at `#photo-gallery`. Feature 016 extends the page by adding the Downloads (`#downloads`) and Our Books (`#our-books`) sections around this section; the gallery section, its anchor and its behaviour MUST remain unchanged by that work.
- **FR-029**: Each album with photos MUST have its own page at `/resources/gallery/<album>` showing its title, description and date where set, and its photos in a grid in the admin's order, with a link back to the Resources gallery section. The album's address MUST stay the same when the album is renamed. Choosing a photo MUST open a full-screen viewer with previous/next, close, the photo's caption when set, and a position indicator (for example "3 of 8").
- **FR-030**: The viewer MUST work by keyboard (arrow keys to move, Escape to close, focus kept inside while open and returned to the chosen photo on close) and by touch (swipe between photos, tap to close).
- **FR-031**: The Photo Gallery section MUST be hidden entirely when there are no albums with photos; albums with no photos MUST NOT be shown. An album page for an album that does not exist, is deleted, or has no photos MUST show the site's standard not-found page.
- **FR-032**: Photos MUST load as the visitor scrolls (images outside the view are loaded as they approach it), and every image MUST have alt text (the caption when set, otherwise the album title and position).
- **FR-033**: If the gallery cannot be read, the page MUST still render with the Photo Gallery section hidden, never an error page.
- **FR-034**: The public gallery MUST work without horizontal scrolling or clipped images at 375, 768, 1024 and 1440px, with long and Urdu titles wrapping correctly.

**Caps and tests**

- **FR-035**: The 6-album and 8-photo caps MUST hold when the server is called directly, bypassing the admin screens, including under simultaneous requests.
- **FR-036**: Every gallery admin route MUST have three passing tests: no session, missing settings permission, correct permission (Constitution XI).

### Key Entities

- **Album**: a titled group of photos — title, optional description, optional date, position, cover photo, deleted marker, last-changed marker.
- **Album photo**: an image in an album — image reference, optional caption, position, deleted marker.
- **Image reference**: a stored public image with its dimensions and format (as in 005).
- **Gallery**: the ordered set of at most six albums shown on Resources; replaces 005's flat Photo gallery group.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Creating a seventh album is refused 100% of the time, both through the admin screen and by direct server request, and the gallery never holds more than six albums.
- **SC-002**: Adding a ninth photo to an album is refused 100% of the time, including when two uploads arrive at the same moment; no album ever holds more than eight photos.
- **SC-003**: When a selection exceeds an album's remaining space, exactly the photos that fit are kept and the admin is told how many were refused.
- **SC-004**: After release, the first 48 non-deleted photos from the old gallery appear in the "Gallery" albums with their captions and order, and the migration reports exactly how many, if any, were not migrated.
- **SC-005**: An admin can create an album, upload five photos and set a cover in under 3 minutes.
- **SC-006**: A visitor can open an album from the Resources page, open a photo and reach the last photo using only the keyboard, and using only touch, then close the viewer, and return to the Resources gallery with the browser back button.
- **SC-007**: A gallery with no albums or no photos leaves no visible heading, gap or empty grid on the Resources page.
- **SC-008**: Every gallery admin route refuses no-session and missing-permission callers and serves permitted callers, proven by tests.
- **SC-009**: The admin gallery and the public gallery show no horizontal scrolling or overlapping content at 375, 768, 1024 and 1440px, including with Urdu and maximum-length titles.
- **SC-010**: Rejected files are refused with a clear reason in 100% of cases, and a failed upload never changes an album's other photos.

## Assumptions

- The 005 starting gallery is empty, so on a fresh install the migration creates nothing; the migration matters for any content the client has already added, and more than 48 photos is not expected.
- The client has not supplied a gallery date format; the album date is shown as a plain date (for example "12 March 2026") and is optional.
- Slot counting excludes soft-deleted albums and photos, so deleting always frees space.
- The photo count on a card counts only non-deleted photos.
- The reference Photo Gallery page (`screenshots/das.edu.pk_resources_photo-gallery_.png`, `…_(iPad Pro).png`, `…_(Moto G Power).png`) shows the page frame only: a page banner titled "Photo Gallery" over a camera photograph with the breadcrumb "Home » Resources » Photo Gallery". Its gallery module fails to render ("Module cannot be rendered…"), so there is no reference for the album grid, album page body or viewer. The page banner and breadcrumb MUST match the reference (Constitution I). The grid, album cards and viewer follow the design tokens and the site's dialog patterns. Until the client supplies the banner photograph, the banner uses its standard solid background, marked as placeholder content (001 precedent).
- Deleted albums and photos are recoverable only within a retention limit (50 deleted albums and 200 deleted photos in total, oldest removed first, the same approach as 005). Beyond that limit the oldest deleted items and their images are permanently removed.

## Dependencies

- Feature 005 (Settings): the gallery group being replaced, the media upload rules and the conflict/toast patterns.
- Feature 011: the shared permission check and the settings key.
- Feature 002: admin form, dialog and toast patterns, the security events log.
- Feature 016 (Resources, later): extends the Resources page this feature creates by adding the Downloads (`#downloads`) and Our Books (`#our-books`) sections around the existing Photo Gallery section, rather than replacing the page.
- Feature 006 (Home): its "Photo/Videos" icon link targets this section.

## Out of Scope

- Videos in albums.
- Nested albums or tags.
- Downloading photos from the public site.
- Raising the caps (fixed at 6 albums and 8 photos this phase).
- Moving a photo from one album to another (delete and re-upload instead).
- A restore screen for deleted albums or photos.
- The rest of the Resources page — the Downloads (`#downloads`) and Our Books (`#our-books`) sections and its careers call-to-action — which feature 016 adds around this feature's gallery section.
