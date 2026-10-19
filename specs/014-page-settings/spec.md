# Feature Specification: Settings by Page (014, slice 1 — structure only)

**Feature Branch**: `014-page-settings`
**Created**: 2026-10-17
**Status**: Ready for planning (all clarifications answered)
**Input**: User description: Feature Brief — 014-page-settings (three slices), recorded verbatim in `history/prompts/014-page-settings/`. This spec covers **slice 1 only**: reorganise the admin Settings area into one tab per public page, each tab showing that page's existing settings as collapsible panels in page order, with per-tab permissions. No new editable content.

**Depends on**: 005 Settings engine (field groups, per-group save with version check, `settings_saved` log line, unsaved-changes guard); 007 gallery albums (single-document compare-and-set, ADR-0005); 011 roles and permissions (the `settings` and `pages` keys, the 403 outcome, the access inventory); 006, 017–020 and 013 (the public pages and their section ids)
**Followed by**: 014 slice 2 (Syllabi, Examination, Class Levels; classes checklist) and 014 slice 3 (editable page text). Each gets its own spec, plan and build.

## Findings from the current code *(recorded 2026-10-17)*

- **Settings today** is one area at `/admin/settings`, which redirects to `/admin/settings/contact`. A row of pill links (which wraps on narrow screens) leads to one page per group. Every page and action checks the **Settings** permission.
- **The `pages` permission ("Page content")** exists since 011 but **no admin page or action uses it yet**. This slice is its first user.
- **Settings groups** (the registry) are `contact`, `hero`, `stats`, `video`, `admission`. The **photo gallery** is not a group since 007: it is an album list with its own album pages and actions, still under the Settings permission. There is **no separate "books" setting**: the "Books" number is one of the four stats, and the home Books section's covers and text come from a content file.
- **Saves**: each group saves on its own, refuses a save made against an older version ("conflict"), records who saved and when on the stored record, and writes a `settings_saved` log line naming the user and group. Gallery album changes use compare-and-set on one document (ADR-0005).
- **The admission group is one stored record** holding the window dates (`opensOn`, `closesOn`), the announcement, the closed message and the "classes open for admission" list (013). Its admin page also shows the current window status and warns when the window is open with no class listed.
- **Public anchors**: `/admission#admission-procedure` and `/resources#photo-gallery` exist. The home page's Hero, "Why Choose" (video) and Progress Dashboard (stats) sections have **no URL fragment id** yet, only test ids.

### Inventory: every current Settings group and its proposed tab

This is the report the brief asks for before anything moves.

| Current admin URL | Group / area | Fields | Proposed tab | Panel (in page order) | "View on site" | Permission |
|---|---|---|---|---|---|---|
| `/admin/settings/contact` | `contact` | phone, email, address, office timings, map link, social links (Facebook, Instagram, YouTube, TikTok) | **Site-wide** | Contact & social | `/contact` | Settings |
| `/admin/settings/hero` | `hero` | seconds per slide, slides | **Home** | 1. Hero slides | `/#hero` | Pages |
| `/admin/settings/video` | `video` | YouTube address | **Home** | 2. Why Choose video | `/#why-choose` | Pages |
| `/admin/settings/stats` | `stats` | students, books, teachers, campuses | **Home** | 3. Progress dashboard (stats) | `/#progress-dashboard` | Pages |
| `/admin/settings/admission` | `admission` (dates) | opens on, closes on | **Admission** | 1. Admission window | `/admission#admission-procedure` | **Settings** (exception) |
| `/admin/settings/admission` | `admission` (messages) | announcement, closed message | **Admission** | 2. Admission messages | `/admission#admission-procedure` | Pages |
| `/admin/settings/admission` | `admission` (classes) | classes open for admission | **Admission** | 3. Classes open for admission | `/admission/register` | **Settings** (exception, Q2) |
| `/admin/settings/gallery` (+ `/[albumId]`) | gallery albums | albums and photos | **Resources** | Photo gallery | `/resources#photo-gallery` | Pages |
| — | — | — | About, Academics, Careers | none in this slice | — | Pages |

The Admission tab itself opens for **Settings or Pages** (Q1); each panel then enforces its own permission.

## Clarifications

### Session 2026-10-17

- Q1: May a Settings-only user still change the admission window, as today? → A: Yes. The Admission tab opens for users with Settings **or** Pages. Each panel enforces its own permission on the server, and a panel the user cannot edit is shown read-only.
- Q2: Which permission governs "Classes open for admission", given an empty list closes the registration form? → A: **Settings**, like the window dates. Pages-only users see it read-only.
- Q3: What happens to accounts that hold Settings today but not Pages, who would lose Home, Admission messages and gallery editing? → A: Grant **Pages** once to every account that currently holds Settings, recorded in the 011 permission-change log. The grant is idempotent: running it again changes nothing and logs nothing new.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find a page's settings under that page's tab (Priority: P1)

An admin who wants to change something on the home page opens Settings, picks the **Home** tab and sees the home page's settings as panels in the same order as the page: Hero slides, then the Why Choose video, then the stats. Each panel is titled with the public section's name and links to that section on the live site.

**Why this priority**: This is the whole point of the slice: settings are found by the page they change, not by an internal group name.

**Independent Test**: Sign in as the main admin, open each tab, and compare its panels with the inventory table (titles, order, "View on site" targets). Edit and save one panel in each tab and confirm the public page shows the change.

**Acceptance Scenarios**:

1. **Given** the main admin, **When** they open `/admin/settings`, **Then** they land on the first tab they can see (Site-wide) with the tab bar showing Site-wide, Home, Admission and Resources, in that order.
2. **Given** the Home tab, **When** it loads, **Then** it shows three collapsible panels titled Hero slides, Why Choose video and Progress dashboard, in that order, each with a "View on site" link to the matching section of `/`.
3. **Given** a panel, **When** the admin follows its "View on site" link, **Then** the public page opens scrolled to that section.
4. **Given** a panel with valid edits, **When** the admin saves it, **Then** it saves exactly as the same group saved before this feature (same rules, same messages, same stored record), and the public page shows the change within the existing refresh window.
5. **Given** each tab, **When** it loads, **Then** each panel can be collapsed and expanded with the keyboard and announces its state to screen readers.

---

### User Story 2 - Each tab has its own permission (Priority: P1)

A content manager who has only the **Pages** permission sees the page tabs (Home, Admission, Resources) but not Site-wide. One who has only **Settings** sees Site-wide. A tab the user may not open is not shown, and its URL returns a forbidden outcome. The Admission tab opens for either permission. Its window and classes panels stay under Settings because they control whether parents can register, and its messages panel is under Pages. Each user sees the panels they cannot edit read-only.

**Why this priority**: Moving hero, stats, video, admission messages and the gallery from Settings to Pages changes who may edit them; it must be enforced on the server for every page and action, not just hidden in the menu.

**Independent Test**: Run the access suite: for every new tab URL and every save action, three cases pass (no session, missing permission, correct permission). Then try crafted saves of the admission dates and classes as a Pages-only user, and of the admission messages as a Settings-only user, and confirm each is refused and nothing changes.

**Acceptance Scenarios**:

1. **Given** a content manager with Pages only, **When** they open Settings, **Then** the tab bar shows Home, Admission and Resources, and `/admin/settings` takes them to Home.
2. **Given** a content manager with Pages only, **When** they open `/admin/settings/site-wide` directly, **Then** they are sent to `/admin?denied=1` (the 011 forbidden outcome for pages), the refusal is logged, and they see no settings data.
3. **Given** a content manager with Settings only, **When** they open Settings, **Then** the tab bar shows Site-wide and Admission. On the Admission tab, the Admission window and Classes panels are editable, and Admission messages is read-only.
4. **Given** a Pages-only user on the Admission tab, **When** it loads, **Then** the Admission window panel (saved dates and window status) and the Classes panel (saved list) are read-only, each with a short line saying the Settings permission is needed to change it, and neither has a Save button.
5. **Given** a Pages-only user, **When** they send a save that changes the admission dates or the class list by any route (including extra fields added to an allowed panel's save), **Then** neither is changed. A save sent for a panel the user may not edit is refused as forbidden and an `access_denied` line is logged. Fields added to an allowed panel's save are dropped and never stored. The same holds for a Settings-only user sending a save of the admission messages.
6. **Given** a user with neither Settings nor Pages, **When** they open any `/admin/settings/...` URL, **Then** they get the forbidden outcome, and Settings does not appear in their sidebar.
7. **Given** the main admin, **When** they open Settings, **Then** they see every tab that has panels and can edit every panel.

---

### User Story 3 - Old links still work (Priority: P2)

Bookmarks, notification links and docs that point at the old Settings URLs keep working: each redirects to the tab that now holds that group, opened at the right panel.

**Why this priority**: Admins have bookmarked the old pages and the release notes link to them; a broken link costs trust but not data.

**Independent Test**: Request each old URL from the inventory table as the main admin and check where it lands.

**Acceptance Scenarios**:

1. **Given** an old URL (`/admin/settings/contact`, `/hero`, `/video`, `/stats`, `/admission`, `/gallery`), **When** it is opened, **Then** it permanently redirects to the new tab with that panel open and in view (for example `/admin/settings/hero` → `/admin/settings/home#hero`).
2. **Given** an old album URL `/admin/settings/gallery/<albumId>`, **When** it is opened, **Then** it redirects to the same album under the Resources tab.
3. **Given** a user who may not open the destination tab, **When** they follow an old URL, **Then** they get the same forbidden outcome as opening the new URL directly (the redirect reveals nothing extra).

---

### User Story 4 - Never lose unsaved work (Priority: P2)

An admin edits two panels on the Admission tab, saves one, and keeps editing the other. Each panel shows its own "unsaved changes" marker that stays visible while scrolling. If they try to leave the tab (another tab, the sidebar, a link, closing the window) with any panel unsaved, they are warned first.

**Why this priority**: Putting several groups on one screen makes it easy to save one panel and forget another.

**Independent Test**: Edit two panels, save one, and confirm the other keeps its edits and marker; then click another tab and confirm the warning, both choices (stay, leave).

**Acceptance Scenarios**:

1. **Given** a panel with edits, **When** the admin scrolls the tab, **Then** that panel's "unsaved changes" marker stays visible while any part of the panel is on screen, and is also shown on the panel header when collapsed.
2. **Given** two panels with edits, **When** the admin saves one, **Then** the other keeps its edits, its marker and its Save button, and saving it next succeeds — even when both panels belong to the same stored group (the admin's own save does not count as "changed by someone else").
3. **Given** any unsaved panel, **When** the admin clicks another tab, a sidebar link or a "View on site" link, or reloads or closes the page, **Then** they are warned and can stay (edits kept) or leave (edits discarded).
4. **Given** another admin saved the same panel after this admin loaded it, **When** this admin saves, **Then** the save is refused with "changed by someone else, reload", their edits stay on screen, and nothing is overwritten.

---

### User Story 5 - Tab bar works on phones (Priority: P3)

On a narrow screen the tab bar is a single row that scrolls sideways; it never wraps into two rows, and the active tab is scrolled into view.

**Why this priority**: Admins do edit from phones, but the desktop layout is the main use.

**Independent Test**: Open Settings at 320 px and 375 px wide and check the tab bar and that the page itself does not scroll sideways.

**Acceptance Scenarios**:

1. **Given** a 320 px wide screen, **When** Settings loads, **Then** the tab bar is one row, scrolls horizontally on its own, the active tab is fully visible, and the page has no horizontal scroll.
2. **Given** keyboard use, **When** the admin tabs through the bar, **Then** every tab is reachable, the focused tab scrolls into view, and the active tab is announced as the current page.

### Edge Cases

- **Tab with no panels in this slice** (About, Academics, Careers): hidden from the tab bar; its URL returns not found until a later slice gives it panels (see Assumptions).
- **User with no tabs**: Settings is not in their sidebar and `/admin/settings` returns the forbidden outcome rather than redirecting.
- **Same-group panels saved by two admins**: admin A saves Admission messages while admin B has the Classes panel open. B's next save of Classes succeeds and A's messages stay exactly as A saved them; neither overwrites the other. Only a save of the **same panel** that someone else changed since it was loaded is refused as "changed by someone else, reload" (plan research R4).
- **A save that touches only one panel** never changes the stored values of another panel in the same group, even if the browser sends stale values for those fields.
- **The one-time Pages grant runs twice**, or runs after the main admin has already granted Pages by hand: accounts that already hold Pages are untouched and get no new change-log entry. Main admins (who hold every permission by role) and accounts without Settings are untouched.
- **Settings or Pages removed while a tab is open**: the next save is refused as forbidden and the next navigation shows the forbidden outcome (011: takes effect on the next request).
- **Deep link to a panel** (`#hero`) on a collapsed panel opens that panel and scrolls it into view.
- **Gallery album page** reached from the Resources tab keeps the Resources tab active in the bar.
- **The admission status line and the "open with no classes" warning** keep working on the Admission tab, shown on the panels they concern.
- **Settings read fails** (database down):
  - **On Home**, which reads three groups, a panel whose group failed to load shows "This section couldn't be loaded. Reload to try again." with no form, while the tab bar and the other panels still work.
  - **On tabs that read one group** (Site-wide, Admission, Resources), the tab shows the existing admin "unavailable" page with a Retry button.
  - Nothing is saved in either case.

## Requirements *(mandatory)*

### Functional Requirements

**Tabs and routes**

- **FR-001**: Settings MUST have one URL per tab: `/admin/settings/site-wide`, `/home`, `/about`, `/academics`, `/admission`, `/resources`, `/careers`, in that order in the tab bar.
- **FR-002**: `/admin/settings` MUST redirect to the first tab, in bar order, that the user may open and that has panels; with none, it MUST return the forbidden outcome.
- **FR-003**: A tab that has no panels in this slice (About, Academics, Careers) MUST NOT appear in the tab bar, and its URL MUST return not found.
- **FR-004**: Each tab MUST hold exactly the panels listed in the inventory table, in that order, each titled with the public section's name and showing a "View on site" link to the listed address.
- **FR-005**: The home page's Hero, Why Choose and Progress Dashboard sections MUST gain stable URL fragment ids (`hero`, `why-choose`, `progress-dashboard`) so the "View on site" links land on them. No other public change.
- **FR-006**: Each panel MUST be collapsible, keyboard operable and expose its expanded state to assistive technology. Panels open expanded by default; a fragment in the address opens and scrolls to the named panel.
- **FR-007**: The gallery album pages MUST move under the Resources tab (`/admin/settings/resources/gallery/<albumId>`) and keep working as they do today.
- **FR-008**: Every old Settings URL in the inventory, including album URLs, MUST permanently redirect to its new tab and panel. Redirects MUST NOT reveal anything to a user who may not open the destination.

**Saving**

- **FR-009**: Each panel MUST save on its own, with the same validation, messages and stored record as its group has today. No stored value is moved, renamed or reshaped (no data migration). The only addition is an optional per-panel "last saved" marker, written on a panel's next save; records without it read exactly as before.
- **FR-010**: The admission group's three panels MUST each save only their own fields. A panel's save MUST NOT change the stored values of the group's other fields, whatever the request contains.
- **FR-011**: A save made against a stored record that someone else changed since it was loaded MUST be refused with a clear "changed by someone else, reload" message, keeping the admin's edits on screen (compare-and-set, ADR-0005 pattern; existing 005/007 behaviour).
- **FR-012**: An admin's own save of one panel MUST NOT cause a conflict on their next save of a sibling panel of the same group, and MUST NOT discard that sibling panel's unsaved edits.
- **FR-013**: Every save MUST be logged with who saved, which panel (tab and panel name, plus group), and when. The existing `settings_saved` line is extended with the panel; the gallery's existing logging stays.
- **FR-014**: After a save, the affected public page(s) MUST show the change within the existing refresh window (immediately on the next request for per-request pages such as Admission); no stale content beyond it.

**Permissions**

- **FR-015**: The Site-wide tab and its panel MUST require the Settings permission.
- **FR-016**: The Home, About, Academics, Resources and Careers tabs MUST require the Pages permission. The Admission tab MUST open for a user with Settings **or** Pages. This moves hero, video, stats, admission messages and the gallery (pages, album pages, all gallery actions and the image upload signer) from Settings to Pages.
- **FR-017**: Each panel MUST enforce its own permission on the server for saving: Admission window (opens on, closes on) and Classes open for admission require **Settings**; Admission messages (announcement, closed message) requires **Pages**.
- **FR-018**: A panel the user may view but not edit MUST be shown read-only: saved values (and, for the window, its status) visible, no Save button, no editable controls, and a line naming the permission needed to change it.
- **FR-019**: A user who may not open a tab MUST NOT see it in the tab bar. Opening its URL MUST give the 011 forbidden outcome for admin pages: `access_denied` logged, redirect to `/admin?denied=1`, and no settings data. Actions and routes answer `forbidden` (403). A user who may open no tab MUST NOT see Settings in the sidebar.
- **FR-020**: Every tab page, panel save, gallery action and the upload signer MUST check access on the server, with the 011 outcomes: no session → login redirect / `unauthorized`; missing permission → forbidden with `access_denied` logged; correct permission → success.
- **FR-021**: The access inventory and access matrix MUST gain a row for every new tab URL, every redirecting old URL and every changed action, each with the three cases (no session, missing permission, correct permission), plus the Pages-only attempts to save the admission dates and classes and the Settings-only attempt to save the admission messages.
- **FR-022**: A one-time grant MUST add the Pages permission to every account that holds Settings and does not already hold Pages, so no one loses access through the move. Each account changed MUST get one entry in the 011 permission-change log (actor recorded as the system grant, target, "Pages added", time). The grant MUST be idempotent: a second run changes no account and writes no log entry. It MUST NOT touch any other permission, role or account status.
- **FR-022a**: The grant MUST run before, or as part of, releasing the permission move, so there is no window in which a Settings holder has lost Home, Admission messages or gallery access.

**Admin UX**

- **FR-023**: The tab bar MUST stay one row at every width, scroll horizontally on its own when it does not fit, keep the active tab in view, mark the active tab as the current page, and never cause the page to scroll sideways.
- **FR-024**: Each panel MUST show an "unsaved changes" marker while it has unsaved edits; the marker stays visible while the panel is on screen and also shows on the collapsed header.
- **FR-025**: Leaving a tab (another tab, sidebar, any link, reload, close) with any unsaved panel MUST warn first, letting the admin stay with edits kept or leave with them discarded (existing 005 guard, extended to cover all panels on the tab).
- **FR-026**: The Admission tab MUST keep today's window status line (on the Admission window panel) and the "window open but no class listed" warning (on the Classes panel).
- **FR-027**: The admin Settings tabs MUST pass automated accessibility checks (axe) at desktop and phone widths, for each permission combination's view.

### Key Entities

- **Settings tab**: one per public page plus Site-wide. Has a URL slug, a label, an order, a required permission and an ordered list of panels. Defined in one place; no stored data.
- **Settings panel**: a titled, collapsible editor for one existing settings group, or for a named subset of a group's fields (the admission group's three panels), or for the gallery album list. Has a public section name, a "View on site" address, a required permission for viewing and for saving, and saves on its own.
- **Settings group record** (unchanged, 005): the stored value of one group with its version, last editor and save time.
- **Gallery album document** (unchanged, 007).
- **Pages permission grant** (one-time): adds Pages to each account holding Settings; each change is an ordinary 011 permission-change log entry.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: An admin can find and open the setting for any public section from Settings in at most 2 clicks (tab, then panel), and every panel's "View on site" link lands on the matching public section in 100% of checks.
- **SC-002**: 100% of current settings (every field of every group and the gallery) remain editable after the move, with identical stored values before and after, proved by comparing stored records.
- **SC-003**: 100% of new tab URLs, redirecting old URLs and save actions pass the three access cases; 0 routes let a Pages-only user change the admission dates or class list, or a Settings-only user change the admission messages.
- **SC-009**: After the release, 100% of accounts that held Settings before it can still edit everything they could edit before; a second run of the grant changes 0 accounts and writes 0 log entries.
- **SC-004**: 100% of old Settings URLs (including album URLs) land on the right tab and panel.
- **SC-005**: In tests of editing two panels on one tab and saving one, 0 edits are lost in the other panel, and 0 saves overwrite a change made by someone else.
- **SC-006**: At 320 px width the tab bar stays one row and the page has 0 px horizontal overflow.
- **SC-007**: axe reports 0 violations on every Settings tab.
- **SC-008**: 100% of saves produce a log entry naming the user, tab, panel and time.

## Assumptions

- **Empty tabs are hidden**, not shown with "No settings yet": a hidden tab cannot be clicked into an empty page, and a later slice shows it by adding panels. The brief allowed either.
- **Site-wide holds one panel** ("Contact & social") because contact details, social links, office timings and the map link are one stored group today; splitting it is not needed for this slice. Its "View on site" goes to `/contact`.
- **"Books" in the brief's Home row** is the Books number in the stats panel; the Books section's covers and text stay in the content file until slice 3.
- **The admission window panel** means the two dates only. The announcement and closed message are "Admission messages" under Pages, as the brief lists them separately.
- **Panel titles** use the public section names; where a setting is not its own section (the video sits in the "Why Choose" block), the title names the block.
- **The upload signer** follows the panels that use it: hero and gallery images are both Pages, so it moves to Pages.
- **Log format**: the existing log line gains the panel; no separate audit store is added in this slice (Rules for all slices: "every save is logged").
- **No stored settings value changes.** Each settings record may gain one optional field recording who last saved each panel and when, written on that panel's next save. The only other stored change is the one-time Pages grant on user accounts (Q3). The public pages change only by the three new fragment ids.

## Out of Scope

- New editable content of any kind (slices 2 and 3): Syllabi, Examination, Class Levels, the classes checklist, page text.
- Adding, removing or reordering public page sections.
- Changing any group's fields, validation or stored shape.
- Splitting the contact group into several panels.
- Rich text, content versioning beyond the log.

## Open Questions for the Client *(slices 2 and 3; do not block this slice)*

1. Syllabi: do the reference syllabi apply to Metroville campus, and do they go above Class 8?
2. Examination: confirm the reference policy text applies.
3. Class Levels: the levels offered and the age rule for each.
