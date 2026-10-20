# Feature Specification: Admission Page — Admission Procedure, Admission Window and Uniform

**Feature Branch**: `020-admission`
**Created**: 2026-10-14
**Revised**: 2026-10-14 (brief revision 2: admin-controlled admission window)
**Status**: Ready for planning (all clarifications answered)
**Input**: User description: Feature Brief — 020-admission (both revisions recorded verbatim in `history/prompts/020-admission/`). Finish the public Admission page at /admission as one page with two anchored sections, Admission Procedure and Uniform. Admins set an admission window (dates, announcement, closed message) in Settings; the public page shows the window's state and switches by itself at midnight Pakistan time. An "Apply Now" button appears only when the window is open and the registration form exists (hidden until 013). Class Levels is removed for now. Uniform groups are flip cards using the home page's coverflow component.

**Depends on**: navigation sections conversion; 005 settings (typed field-group engine, Settings permission, save logging); 006 home (coverflow flip cards); 017/018/019 patterns (content files, release gate, hidden-when-empty, local images)
**Followed by**: 013-student-registration (builds /admission/register, removes the "form exists" constant, reuses the window to refuse submissions outside the dates)
**Feeds into**: 014-page-content (Admission tab in Settings)

## Findings from the current site and the reference *(recorded 2026-10-14)*

- **Current /admission**: three placeholder sections (Admission Procedure, Class Levels, Uniform), each reading "This section hasn't been built yet…". The Admission Procedure section holds **no real procedure text**, so the text must come from the reference.
- **Reference procedure page**: `https://das.edu.pk/admission/admission-procedure/` returns **HTTP 404**. The reference site's own Admission menu links to `https://das.edu.pk/admission/` (the procedure), `/admission/class-levels/` and `/admission/uniform/`. The procedure text lives at `https://das.edu.pk/admission/`. See Clarification Q1.
- **Reference uniform page**: `https://das.edu.pk/admission/uniform/` is reachable (published 12 December 2019). Its text is recorded verbatim under *Reference Content*.
- **Settings engine (005)**: today's field types are text, long text, number, URL, image, video, yes/no, group and list. There is **no date field** and **no rule comparing two fields of a group** (cross-field rules exist only inside lists). The Admission group needs both; this feature adds them to the engine (see Dependencies).
- **Settings saves**: every save already records the editor and version on the stored group and writes a `settings_saved` log line (who, which group, when); access is limited to users with the Settings permission. The Admission group inherits all of this.
- **Public settings reads** are cached for up to 60 seconds and refreshed on save. Whether admissions are open must therefore be decided at the time of each request from the stored dates, never cached as an "open"/"closed" answer.
- **Uniform photos**: the folder is `public/images/uniform/` (untracked) with four files. Their names match the image files on the reference uniform page, and the reference shows each one under a specific group:

  | Project file | Reference placement | Group |
  |---|---|---|
  | `kids-boys-uniform.png` | under Kids Uniform, beside Boys | Kids – Boys |
  | `kids-girls-uniform.png` | under Kids Uniform, beside Girls | Kids – Girls |
  | `boys-uniform.png` | under Senior Students' Uniform, beside Boys | Senior – Boys |
  | `girls-uniform.png` | under Senior Students' Uniform, beside Girls | Senior – Girls |
  | `hifz-uniform.png` (added by the requester 2026-10-14; not on the reference) | — | Hifz – Boys. It shows a white shalwar qamiz, white cap, black shoes and white socks — no waist coat or blazer and white (not black) socks, unlike the list; on the client review list. White clothes on a transparent background, so every photo sits on a light grey panel (`--color-home-flip-front`) |
  | — | none on the reference | Hifz – Girls: no photo (card not shown, see V8) |

  The requester confirmed this matching. **Visual check (each image opened, 2026-10-14):** all four are flat-lay product photos of clothing only — **no children or students appear**, so apparent age cannot be checked. Checked against the item lists instead:
  - `kids-boys-uniform.png`: white shirt with green-check collar, cuffs and pocket; grey-green trousers; green blazer with crest; black lace-up shoes; black socks. Matches Kids – Boys.
  - `kids-girls-uniform.png`: green-check frock with white collar; white shalwar; white scarf with yellow edge; green blazer; black strap shoes; black socks. Matches Kids – Girls.
  - `boys-uniform.png`: the same set of garments as `kids-boys-uniform.png` (the item lists for Kids – Boys and Senior – Boys are also identical). Consistent, but nothing in the photo shows it is a senior size.
  - `girls-uniform.png`: **white** long qamiz with green-check collar, cuffs and trim; white shalwar; white scarf with yellow edge; green blazer; black strap shoes; black socks. Matches Senior – Girls, except the reference text says "Green Check Qamiz" while the photo shows a white qamiz with green-check trim (the same way "Green Check Shirt" is shown as a white shirt with check trim). Text stays verbatim; alt text describes what is visible. Added to the client review list.

  Alt text describes the visible garments, not the reference's wording, where they differ.
- **Links to removed sections**: the only reference to `#class-levels` / `/admission/class-levels` outside the page itself is in the navigation content (the Admission dropdown, which also feeds the mobile menu and the redirect list) and the existing E2E sections test. No other page links to it. The home "Admission Procedure" card already links to `/admission#admission-procedure` and stays valid.

## Deviations from the reference *(Constitution I — approved via the 020 brief and clarifications)*

Reference screenshots: `screenshots/das.edu.pk_admission_*.png` (procedure), `screenshots/das.edu.pk_admission_uniform_*.png` (uniform); desktop, iPad Pro, Moto G Power.

| # | Reference | This feature | Source |
|---|---|---|---|
| V1 | Separate pages /admission/ and /admission/uniform/, each with its own banner title and breadcrumb | One page /admission, h1 "Admission", two anchored sections | ADR-0009; brief "Page structure" |
| V2 | Each procedure step is a full-width band: centred step heading, centred intro line, a decorative icon (steps 3, 4), alternating white / grey wave backgrounds | Steps sit inside one section; the step heading and intro line stay centred as on the reference; icons and wave bands are not reproduced | Brief (two sections, one h2 each) |
| V3 | A red "next step" button closes each step ("Registration", "Admission Test", "Admission Formalities", "Success") | Not shown (on one page they would only jump a few lines; "Success" targets the omitted ending) | Clarification Q1 |
| V4 | Eligibility age table (empty on the reference); "4. Success" band; "Join Over 500,000 Students" contact form | Not shown | Clarification Q1 |
| V5 | No admission-window notice | Banner while open, quiet note while closed | Brief revision 2 |
| V6 | No Apply button (the reference's "Apply Below!" points at a contact form) | "Apply Now" → /admission/register, hidden until 013 | Brief "Apply button" |
| V7 | Uniform: a centred category heading, then a Boys card (#ddffff, corners 40/0/40/0) and a Girls card (#ffeeee, corners 0/40/0/40) listing the items, photos beside them | Five flip cards in a coverflow (see V8); the front shows the photo (or an icon) with the category label and Boys/Girls; the back lists the items on the theme navy (`bg-primary`), consistent with the home coverflow. The reference's cyan/pink card colours are not used: they are not theme colours, and colour-coding boys/girls is not wanted — the Boys/Girls text identifies each card | Brief "UI — reuse the existing animated card component"; requester 2026-10-14 |
| V8 | Hifz Students’ Uniform has a Girls group (five items, no photo) | Not shown: five cards instead of six | Requester 2026-10-14: the Hifz girls' card is not shown |

## Clarifications

### Session 2026-10-14

- Q1: The given procedure URL is 404; should the procedure text come from `https://das.edu.pk/admission/`, and which parts? → A: Use `https://das.edu.pk/admission/`, sections 1–4 (Eligibility, Register for Admission Test, Admission Test, Admission Formalities including Note and Rules of Payment) word for word. Leave out the empty age table, the red next-step buttons ("Registration", "Admission Test", "Admission Formalities", "Success"; deviation V3) and the promotional ending ("4. Success", "Apply Below!", "Join Over 500,000 Students…"). "Age criteria per class" is added to the client review list.
- Photo matching → Confirmed by the requester; each image was opened and checked (see *Findings*). Hifz cards use the icon front (superseded: the requester then supplied a Hifz boys' photo; the Hifz girls' card is not shown, V8).
- Q2: What form should the Apply button's switch take? → Answered by brief revision 2: `isAdmissionApplyOpen()` is true only when the admin-set admission window is open AND a "registration form exists" constant in the admission content file is on (default off; 013 removes it).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read how to apply (Priority: P1)

A parent opens Admission from the menu (desktop dropdown or mobile menu) and reads the admission procedure: eligibility, how to register for the admission test, what the test involves, the admission formalities and documents to bring.

**Why this priority**: The procedure is the main reason parents visit the Admission page.

**Independent Test**: Open /admission and /admission#admission-procedure; the procedure is shown in full, word for word as the reference, with steps and document lists as real lists.

**Acceptance Scenarios**:

1. **Given** a visitor on any page, **When** they choose Admission → Admission Procedure in the desktop dropdown or the mobile menu, **Then** /admission opens scrolled to the Admission Procedure section with its heading fully visible below the fixed header.
2. **Given** the procedure text, **When** it is compared with the reference, **Then** every heading, sentence and list item matches word for word, and numbered steps appear as an ordered list and document lists as a list.

---

### User Story 2 - Admin opens and closes admissions (Priority: P1)

A user with the Settings permission opens Settings → Admission, sets "Opens on" and "Closes on", an optional announcement and an optional closed message, and saves. The screen tells them in words what the public currently sees: "Open now until 31 March 2027", "Opens on 1 January 2027", or "Closed".

**Why this priority**: Lets the school announce admissions without a developer, and is the window 013 relies on.

**Independent Test**: As a Settings user, save each combination of dates and check the status line; as a user without the Settings permission, confirm the group cannot be saved; check the save is logged.

**Acceptance Scenarios**:

1. **Given** a user with the Settings permission, **When** they save Opens on 1 January 2027 and Closes on 31 March 2027 on 14 October 2026, **Then** the save succeeds, the status reads "Opens on 1 January 2027", and the save is logged with who, which group and when.
2. **Given** Closes on is earlier than Opens on, **When** they save, **Then** the save is refused with a message on the Closes on field and nothing is stored.
3. **Given** either date is empty, **When** they save, **Then** the save succeeds and the status reads "Closed".
4. **Given** today (Pakistan time) is between the dates inclusive, **When** the screen loads, **Then** the status reads "Open now until [Closes on]".
5. **Given** today is after Closes on, **When** the screen loads, **Then** the status reads "Closed".
6. **Given** an announcement or closed message longer than 160 characters, **When** they save, **Then** the save is refused with a length message on that field.
7. **Given** a user without the Settings permission, **When** they try to save the Admission group, **Then** it is refused, nothing is stored, and the refusal is logged (as for other Settings groups).

---

### User Story 3 - Parents see whether admissions are open (Priority: P1)

A parent visiting /admission sees, at the top of the Admission Procedure section, a highlighted banner while admissions are open ("Admissions are now open for … — Applications close on 31 March 2027"), or a quiet note with the closed message while closed.

**Why this priority**: The single most important fact for a parent in admission season.

**Independent Test**: With dates around "now", load /admission before the start, on the first day, on the last day and after the end (Pakistan time) and check banner / note / nothing.

**Acceptance Scenarios**:

1. **Given** the window is open and an announcement is set, **When** /admission loads, **Then** a highlighted banner above the procedure shows the announcement and "Applications close on [Closes on]".
2. **Given** the window is open and no announcement is set, **When** /admission loads, **Then** the banner shows "Applications close on [Closes on]" only.
3. **Given** the window is closed (before start, after end, or a date empty) and a closed message is set, **When** /admission loads, **Then** a quiet note with the closed message appears above the procedure and no banner.
4. **Given** the window is closed and no closed message is set, **When** /admission loads, **Then** nothing is shown above the procedure.
5. **Given** Closes on is 31 March 2027, **When** the page is requested at 23:59 on 31 March Pakistan time, **Then** it shows open; **When** requested at 00:00 on 1 April Pakistan time, **Then** it shows closed — with no save and no redeploy in between.
6. **Given** Opens on is 1 January 2027, **When** the page is requested at 23:59 on 31 December 2026 Pakistan time, **Then** it shows closed; at 00:00 on 1 January it shows open.

---

### User Story 4 - See the uniform for each group (Priority: P1)

A parent wants to know what uniform their child needs. They open Admission → Uniform and browse five cards (Kids – Boys, Kids – Girls, Hifz – Boys, Senior – Boys, Senior – Girls; the Hifz girls' card is not shown, deviation V8). Each front shows the uniform photo and group name; flipping a card shows the group name and its item list.

**Why this priority**: The uniform list is the other thing parents need before the school year; it is the page's second section.

**Independent Test**: Open /admission#uniform; five cards in reference order; flip each by hover, tap and keyboard; every back shows the exact items as a list; every front shows its photo, and a group without one would show a plain front with an icon, never an empty image box.

**Acceptance Scenarios**:

1. **Given** a desktop visitor, **When** they hover the centre card, **Then** it flips to show the group name and its five items as a list; moving away turns it back.
2. **Given** a touch visitor, **When** they tap the centre card, **Then** it flips and stays flipped until tapped again, a tap lands outside, or Escape is pressed; a horizontal swipe changes the card instead and never also flips it.
3. **Given** a keyboard user, **When** they Tab to the carousel and use the arrow keys, **Then** the centre card changes and focus follows it; focusing the centre card reveals its back; Enter/Space flips it.
4. **Given** the carousel is auto-advancing, **When** any card is flipped, or the pointer is over the carousel, or keyboard focus is inside it, **Then** auto-advance pauses, and resumes when none of these holds.
5. **Given** the visitor prefers reduced motion, **When** the page loads, **Then** the cards never auto-advance and flipping cross-fades instead of rotating.
6. **Given** a group with no photo (none today; the icon front stays for future groups), **When** its front is shown, **Then** it shows the group name and a neutral uniform icon on a plain card, never an empty or broken image.

---

### User Story 5 - Old links and the menu still work (Priority: P2)

A visitor who follows an old link (bookmark, search result) to /admission/class-levels, /admission/uniform or /admission/admission-procedure lands on the right place of the new page. The Admission dropdown lists exactly Admission Procedure and Uniform.

**Why this priority**: Prevents dead links once Class Levels is removed.

**Independent Test**: Request each old URL and check the final address; open the dropdown and mobile menu and count the entries.

**Acceptance Scenarios**:

1. **Given** the old URL /admission/class-levels, **When** it is requested, **Then** it permanently redirects to /admission (top of the page).
2. **Given** /admission/admission-procedure and /admission/uniform, **When** requested, **Then** they permanently redirect to /admission#admission-procedure and /admission#uniform.
3. **Given** the desktop dropdown and the mobile menu, **When** opened, **Then** they list exactly "Admission Procedure" then "Uniform", and no Class Levels entry exists anywhere on the site.

---

### User Story 6 - Apply button ready for registration (Priority: P3)

When 013 builds the registration form and the window is open, a prominent "Apply Now" button appears below the procedure, linking to /admission/register. Until 013, an open window shows the banner but no button.

**Why this priority**: No visible value now; it prepares the single hook 013 needs.

**Independent Test**: With the "form exists" constant off, the button is absent whether the window is open or closed. With it on (test setting only), the button appears only while the window is open.

**Acceptance Scenarios**:

1. **Given** the "form exists" constant is off (the shipped value) and the window is open, **When** /admission renders, **Then** the banner shows and there is no "Apply Now" element.
2. **Given** the constant is on and the window is open, **When** /admission renders, **Then** exactly one "Apply Now" link to /admission/register appears directly below the procedure in the primary button style.
3. **Given** the constant is on and the window is closed, **When** /admission renders, **Then** there is no "Apply Now" element and nothing in its place.
4. **Given** the page, **When** it decides whether to show the button, **Then** it asks only `isAdmissionApplyOpen()`, which itself reads the window state and the constant.

---

### Edge Cases

- **Opens on and Closes on the same day**: valid; open for that whole day (Pakistan time).
- **Visitor or server in another time zone**: the open/closed decision always uses the calendar day in Asia/Karachi, never the visitor's or server's local time.
- **Dates saved but cache not yet refreshed**: a save refreshes the stored dates immediately (as for other Settings groups); the open/closed decision is never cached across midnight.
- **Settings store unreachable**: the page falls back the way other Settings groups do (last read value, else defaults). The defaults have empty dates, so the fallback state is "closed" — never wrongly "open".
- **Closed message or announcement with only spaces**: treated as not set.
- **Item list taller than the card back at small widths (375 px)**: the back's text must stay fully readable (no clipped items, no text smaller than the body size); the card may grow or the list scroll within the back, but nothing is cut off.
- **Hifz – Girls**: not shown (deviation V8). Its text stays in the verbatim source file so it can return unchanged.
- **Photo fails to load**: the card front still shows the group name (it is text, not part of the image).
- **Fragment for an id that no longer exists** (`/admission#class-levels`): the page loads at the top; no error.
- **Home page**: the four quick-access cards must look and behave exactly as before, including the "Read More" link on each back.
- **Tab hidden**: auto-advance stops while the browser tab is hidden (same as home).

## Requirements *(mandatory)*

### Functional Requirements

**Page structure and navigation**

- **FR-001**: /admission MUST have exactly one h1 ("Admission") and exactly two sections, in this order: Admission Procedure (anchor `admission-procedure`, unchanged) and Uniform (anchor `uniform`), each with its own h2.
- **FR-002**: The Admission dropdown and the mobile menu MUST list exactly these two anchors, in this order. Class Levels MUST be removed from the menu and the page.
- **FR-003**: Old addresses MUST permanently redirect as follows (report in the implementation summary):

  | Old address | New address |
  |---|---|
  | /admission/admission-procedure | /admission#admission-procedure |
  | /admission/uniform | /admission#uniform |
  | /admission/class-levels | /admission |

- **FR-004**: Any link elsewhere on the site that targets a removed section MUST be repointed (current finding: none besides the menu entry and the sections test), and the implementation summary MUST list what was checked.
- **FR-005**: Both sections MUST use the site's existing section heading component with its existing variants, alternate section backgrounds, and a scroll offset (as a design token) so an anchored heading is never hidden behind the fixed header.

**Section 1 — Admission Procedure**

- **FR-006**: The section MUST show the reference procedure text word for word (sections 1–4 as recorded under *Reference Content*), and the content file MUST record the source URL `https://das.edu.pk/admission/`. The implementer MUST NOT write or reword procedure text, including the reference's own grammar.
- **FR-007**: Numbered steps in the reference MUST be shown as an ordered list (or numbered step cards) and lists of items (documents, received items, rules) as lists, keeping the exact wording.

**Admission window (Settings)**

- **FR-008**: Settings MUST gain an "Admission" group, built with the existing typed field-group engine, with these fields:

  | Field | Type | Rules |
  |---|---|---|
  | Opens on | date | optional |
  | Closes on | date | optional; must be on or after Opens on |
  | Announcement | single-line text | optional; at most 160 characters |
  | Closed message | single-line text | optional; at most 160 characters |

- **FR-009**: A save where both dates are set and Closes on is before Opens on MUST be refused with a message on Closes on, and nothing stored. The same check MUST apply in the browser form and on the server.
- **FR-010**: Only users with the Settings permission MUST be able to save the group; every save MUST be logged (who, which group, when) and every refused attempt logged, exactly as for other Settings groups.
- **FR-011**: Dates are whole calendar days in Pakistan time (Asia/Karachi). The window is **open** from 00:00 on Opens on through 23:59:59 on Closes on, inclusive. If either date is empty, the window is **closed**.
- **FR-012**: The Settings screen MUST show the current state in words, using the day-month-year style with the month spelled out:
  - open now: "Open now until [Closes on]" (e.g. "Open now until 31 March 2027")
  - both dates set and today before Opens on: "Opens on [Opens on]" (e.g. "Opens on 1 January 2027")
  - otherwise (a date empty, or after Closes on): "Closed"
- **FR-013**: There MUST be one function that decides whether the window is open at a given moment, used by the public page, the Settings status line and `isAdmissionApplyOpen()`, so that 013 can reuse it to refuse submissions outside the dates.

**Public banner**

- **FR-014**: When the window is open, the Admission Procedure section MUST show, above the procedure text, a highlighted announcement banner containing the Announcement (if set) and "Applications close on [Closes on]".
- **FR-015**: When the window is closed, the section MUST show the Closed message as a quiet note above the procedure if it is set, and nothing otherwise.
- **FR-016**: The banner MUST switch on and off by itself at midnight Pakistan time without anyone saving or redeploying. The open/closed decision MUST be made at request time from the stored dates and the current time; the page MUST NOT serve a cached open/closed state. (The stored dates themselves may be cached as other Settings are, because every save refreshes them.)

**Apply button**

- **FR-017**: A prominent "Apply Now" link to /admission/register, in the site's primary button style, MUST be placed directly below the procedure and shown only when `isAdmissionApplyOpen()` returns true.
- **FR-018**: `isAdmissionApplyOpen()` MUST return true only when BOTH the window is open (FR-013) AND the "registration form exists" constant in the admission content file is on. The constant MUST ship off. No other condition on the page may affect the button.
- **FR-019**: When the button is hidden, nothing MUST be rendered in its place (no "coming soon", no empty space).
- **FR-020**: /admission/register, the registration form and server-side refusal of submissions MUST NOT be built in this feature.

**Section 2 — Uniform**

- **FR-021**: The section MUST show five groups in reference order — Kids – Boys, Kids – Girls, Hifz – Boys, Senior – Boys, Senior – Girls (the Hifz girls' group is left out, deviation V8) — with category headings and item text copied word for word from the reference (see *Reference Content*), including items combined on one line ("White Scarf & Green Blazer"). No extra items, notes, prices or ordering information.
- **FR-022**: The content file MUST record the source URL `https://das.edu.pk/admission/uniform/`.
- **FR-023**: Photos MUST be served from the site itself (copied to `public/images/admission/uniform/` with clear names, optimised for the web); nothing may load from das.edu.pk.
- **FR-024**: Every photo MUST have alt text describing the uniform shown (e.g. "Kids boys' uniform: green check shirt, light green pants and green blazer").
- **FR-025**: Each group MUST be one card of the home page's coverflow flip-card component, extended rather than copied. Front: the photo (or the uniform icon), the category as a small label (e.g. "Kids Uniform") and the gender ("Boys"/"Girls") as the main text. Back: the same label and main text, then the items as a real bulleted list, on the theme navy. The card's heading reads in full as "{category} – {gender}" (e.g. "Kids Uniform – Boys"), so it makes sense on its own to screen readers. Category and gender text are exactly as on the reference. A uniform card back has no link.
- **FR-026**: The card's flip control MUST remain a button (not a link) whether or not the back holds a link.
- **FR-027**: The uniform cards MUST behave like the home cards: hover flips on desktop, tap flips on touch, swipe changes the card, arrow keys move between cards, auto-advance pauses while any card is flipped, on hover and on keyboard focus, and never runs under reduced motion or with the tab hidden.
- **FR-028**: A group with no photo MUST show its name and a neutral uniform icon on a plain card front using existing colour tokens; never an empty image box.
- **FR-029**: The home page quick-access cards MUST look and behave exactly as before; the existing home coverflow tests MUST pass unchanged.

**Content, editing and design**

- **FR-030**: The page's content MUST live in typed content files under the admission content folder, shaped so the 014 Admission tab can edit it later; uniform entries are shaped `{ id, category, gender, items: string[], image?: { src, alt } }`. The "registration form exists" constant lives in the same folder.
- **FR-031**: All text copied from the reference MUST be marked as pending client confirmation in the content files.
- **FR-032**: Theme colours and fonts MUST NOT change; any new size or spacing value MUST be added as a design token. The banner and quiet note use existing colour tokens.
- **FR-033**: At 375, 768, 1024 and 1440 px wide, and at the reference site's breakpoints (480, 640, 782, 1280 px, and either side of the 1024 px menu collapse), the page MUST have no sideways scroll and every card back's text and the banner MUST be fully readable.
- **FR-034**: The page MUST pass an automated accessibility scan with no violations, with the window both open and closed.

### Key Entities

- **Admission window (Settings group "Admission")**: Opens on (date, optional), Closes on (date, optional, ≥ Opens on), Announcement (≤160 chars, optional), Closed message (≤160 chars, optional); stored with version and last editor like other Settings groups. Derived state at a moment in time: open / not yet open / closed.
- **Registration form exists**: a yes/no constant in the admission content file, shipped off; removed by 013.
- **Admission procedure content**: headings, paragraphs, ordered steps and item lists copied from the reference; source URL; "pending client confirmation" marker.
- **Uniform group**: id; category (Kids Uniform, Hifz Students' Uniform, Senior Students' Uniform); gender (Boys, Girls); items (ordered list of text lines); optional image (site-local path and descriptive alt text). Source URL and pending-confirmation marker apply to the whole list.

## Reference Content *(verbatim, pending client confirmation)*

### Uniform

Source: `https://das.edu.pk/admission/uniform/` (published 2019-12-12). Apostrophes are the reference's typographic `’`.

| Category | Gender | Items (one per line, in order) |
|---|---|---|
| Kids Uniform | Boys | Green Check Shirt · Light Green Pants · Green Blazer · Black Shoes · Black Socks |
| Kids Uniform | Girls | Green Check Frock · White Shalwar · White Scarf & Green Blazer · Black Shoes · Black Socks |
| Hifz Students’ Uniform | Boys | White Shalwar Qamiz · Black Waist Coat · Green blazer · Black Shoes · Black Socks |
| Hifz Students’ Uniform | Girls | White Shalwar Qamiz · White Dopatta or · White Scarf or Veil · Black Shoes · Black Socks |
| Senior Students’ Uniform | Boys | Green Check Shirt · Light Green Pants · Green Blazer · Black Shoes · Black Socks |
| Senior Students’ Uniform | Girls | Green Check Qamiz · White Shalwar · Green Blazer & White Scarf · Black Shoes · Black Socks |

Casing is kept as on the reference (note "Green blazer" in Hifz – Boys is lower-case there).

### Admission procedure

Source: `https://das.edu.pk/admission/` (page dated 2019-11-08; the brief's `/admission/admission-procedure/` returns 404). Typographic characters are kept: `’` in "child’s", en dash `–` in "Nursery – PREP" and "three subjects – English…".

Left out (per Q1): the empty Eligibility age table, the red next-step buttons ("Registration", "Admission Test", "Admission Formalities", "Success"; deviation V3), and everything from "4. Success" onward.

**1. Eligibility**

Interested for your child admission in Dar-e-Arqam School, please check age for required level

**2. Register for Admission Test**

Parents wishing to admit a child should first register for admission test

- Register for an admission test by completing the admission form at the school office and taking an appointment card for the test and interview.
- Registration does not in any way confirm or guarantee admission. It is subject to getting through an admission test/ interview and availability of the seat.
- The class for which a child is tested is determined according to the child’s age as of 31st July (28th/29th February in case of Balochistan).

**3. Admission Test**

Our assessment process is combined with tests in written by child and interview of parents

*Nursery – PREP*

An informal individual assessment test is taken combined with an interview with both the parents. Generally, the reading level of a child, the vocabulary and concepts of colours and numbers are assessed. In addition, the confidence of the child, the level of spoken English and motor skills are taken into consideration.

*Class-I Onward*

- Application for Grade-1 onward are tested in three subjects – English, Urdu and Mathematics.
- The passing percentage is 50%. Duration of each paper is approximately 30 minutes.
- For the written test, the child should come properly equipped with a pencil, eraser, sharpener and ruler.
- The papers are not set from any specific textbooks or syllabus but are of a general nature designed to test the aptitude of the child in the basic subjects.
- The test paper is not shown to anyone and only marks are communicated to the parents / guardians.
- A candidate caught cheating during the admission test will be rejected.

The list displaying names of selected candidates will be put up on the notice board of the concerned branch on the date given by the school.

In all cases, merit is the sole criterion for admission. The decision of the school cannot be challenged in any way and will be final.

**4. Admission Formalities**

Parents are bound to fulfill all admission formalities.

1. Parents fill in the admission form and pay the registration fees after which they receive:
   - Relevant Fee structure slip
   - Appointment card with testing date & time on it
   - Registration receipt
   - Prospectus purchase cash receipt
   - Admission and fee payment information
   - Prospectus & newsletter (if any)
2. The documents to be attached with the Admission Form include:
   - A photocopy of Provisional Certificate and Character Certificate from last institution attended
   - 2 recent passport size photographs
   - Attested photocopy of Birth Certificate
   - Report card from last school
3. Test and interview with both the parents on the specified date
4. Result is finalised within a week of the test & displayed on the notice board. Parents are informed about further formalities.
5. Parents are given the admission fee bill, payable by a certain due date in a specific bank as mentioned on the fee bill
6. The following fees are payable:

   | | | |
   |---|---|---|
   | A | Registration Fee | Non-refundable |
   | B | Admission Fee | Non-refundable |
   | C | Security Fee | Refundable |
   | D | Tuition Fee | Payable every two months |
   | E | Computer Fee | Payable every two months |

7. On receipt of paid fee bill, parents are given:
   - Admission Order (original)
   - Book List
   - Uniform List

*Note*

- Fee is subject to annual review.
- Family packages are available in selected schools.
- Application forms are available at the school office and should be filled in the school.

*Rules of Payment* (an ordered list on the reference)

1. Fees are charged for all twelve months of the year and are payable every month.
2. Parents have the option to pay the fee for the whole year as a lump sum.
3. The fees payable for the period of the summer vacation are paid in advance and prior to closure.
4. Once the fee bill has been issued, payment is made directly to the bank where the school operates its account. Parents must pay the fees by the date specified on the fee bill.
5. Fees paid after the due date is subject to a flat surcharge as specified on the fee bill.
6. If the tuition fee has not been paid by the end of the second month, the student is automatically withdrawn.

Structure notes: steps 1–7 of Admission Formalities are numbered paragraphs on the reference and become an ordered list (FR-007), each keeping its sub-list. The fee list is a table on the reference and stays a table. "Tuition Fee — Payable every two months" conflicts with Rules of Payment 1 ("payable every month") on the reference itself; it is kept verbatim and added to the client review list.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: From any page, a visitor reaches either Admission section in 2 selections (menu → entry) on desktop and mobile, and the section heading is fully visible on arrival.
- **SC-002**: 100% of procedure and uniform text matches the reference word for word (automated comparison of every item).
- **SC-003**: All 3 old Admission addresses land on the mapped destination; 0 broken links to Class Levels remain.
- **SC-004**: An admin sets up an admission window (dates, announcement, closed message) in under 2 minutes without developer help, and the status line states the correct public state.
- **SC-005**: The public state is correct for every tested moment: before start, first minute of the first day, last minute of the last day, first minute after the end, and with either date empty — all in Pakistan time — with 0 saves or redeploys between them.
- **SC-006**: 100% of invalid saves (Closes on before Opens on, text over 160 characters, no Settings permission) are refused with nothing stored; 100% of saves are logged.
- **SC-007**: With the "form exists" constant off, 0 "Apply Now" elements appear in any window state; with it on, exactly 1 appears, and only while open.
- **SC-008**: All 5 uniform cards can be flipped by hover, tap and keyboard, and each back shows its 5 items; 0 cards show an empty image area.
- **SC-009**: Auto-advance pauses within one interval whenever a card is flipped, hovered or focused, and never runs under reduced motion.
- **SC-010**: 0 sideways scroll and 0 clipped text at 375, 768, 1024 and 1440 px.
- **SC-011**: 0 accessibility violations on /admission (window open and closed); 0 regressions in the existing home coverflow tests and Settings tests.

## Assumptions

- The Settings engine is extended with a date field type and a group-level "on or after" rule between two date fields; the existing groups are unaffected.
- The Admission Settings group starts with all four fields empty, so admissions show as closed until an admin sets dates.
- "Highlighted" banner and "quiet" note use existing colour tokens (e.g. a brand-accent background for the banner, muted text for the note); exact styling is a design decision in the plan.
- Dates on the public page and in the status line use the same written style ("31 March 2027").
- The flip-card component is the home "quick access" coverflow (section after the hero); extending it means adding an optional link-free back with a list, and an optional image/icon front, without changing the home output.
- Five cards loop like the home carousel (it loops for three or more cards).
- Each card's heading is "{category} – {gender}"; the dash is only for screen readers, and visually the category is a small label above the gender (requester's choice, analysis H1 option a).
- Photos are optimised for the web (resized and compressed; transparent PNGs keep transparency) and keep the same uniform as the original.

## Out of Scope

- The registration form and page /admission/register, and server-side refusal of submissions outside the window (013).
- Class Levels content (later feature).
- Admin editing of Admission page content — procedure text and uniform lists (014-page-content).

## Open Questions for the Client *(do not block this feature)*

- Do the uniform lists still apply to the Metroville campus? (The reference page dates from 2019.)
- Are there Hifz uniform photos?
- Does the admission procedure text apply to this campus?
- Age criteria per class (the reference's Eligibility table is empty; parents will look for it).
- Fees: is tuition payable every month or every two months? (The reference says both.)
- Senior girls: is the qamiz green check, or white with green-check trim as in the photo?
- Class Levels content, when ready.
