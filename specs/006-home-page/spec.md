# Feature Specification: Home Page

**Feature Branch**: `006-home-page`
**Created**: 2026-09-30
**Status**: Draft
**Input**: User description: "Feature Brief — 006 Home Page. The public home page, built from the reference and fed by Settings and News." (full brief recorded in `history/prompts/006-home-page/`)

**References**: `docs/prd.md` §5.1 · `research/design-tokens.md` (values) · `screenshots/das.edu.pk_.png` (desktop), `screenshots/das.edu.pk_(iPad Pro).png` (tablet), `screenshots/das.edu.pk_(Moto G Power).png` (mobile) — these replace the brief's placeholder names `home-desktop.png`, `home-tablet.png`, `home-mobile.png` · Constitution I (Fidelity), VII (Design System), VIII (Content), IX (Components), XI (Testing) · Feature 001 (site shell) · Feature 003 (news) · Feature 004 (signup section and its `#signup` anchor) · Feature 005 (Settings: hero slides, stats, home video)

## Overview

The home page is the site's front door. Until now `/` is a placeholder with only the signup band. This feature builds the real page inside the existing site shell, in the reference's section order, using live content where the client already manages it and typed content files where they do not yet:

| Section | Content comes from |
|---|---|
| Hero carousel | Settings — hero slides (5) |
| Quick-access cards (four) | Content file |
| Inspiration | Content file |
| Why Choose — text and video | Content file (text) + Settings (video address) |
| Latest news | News (003) — newest published posts |
| Books carousel | Content file — fixed heading, line, layout and a fixed set of 10 book covers in `public/` |
| Salient features cards | Content file |
| Progress dashboard | Settings — stats (5) |
| Icon quick-links | Content file |
| Careers call-to-action | Content file |
| Partners carousel | Content file |

The reference's **books carousel** is included as a fixed section: its heading, line, layout and a fixed set of 10 book cover images are all hardcoded; the covers are not admin-managed (owner's decision, 2026-10-01). The reference's fifth quick-access card, **Franchise Offer**, is left out, as the brief specifies.

Static sections are typed field groups in the same shape the database will use later, so feature 014 can move any of them to the database without changing the components that show them (Constitution VIII).

## Clarifications

### Decisions taken from the brief and the reference (no question needed)

- The three home screenshots are `das.edu.pk_.png`, `das.edu.pk_(iPad Pro).png` and `das.edu.pk_(Moto G Power).png` (the brief's filenames were placeholders).
- The Careers call-to-action reuses the signup band's headings, wording and styling (feature 004) with a "Join Now" button in place of the input fields, as PRD §5.1 says. The signup band's `#signup` anchor id is kept on it so links to the old anchor still land in the right place.
- Section wording that the client has not supplied stays as marked placeholder content in the content files (001 precedent).

### Session 2026-10-01

- Q: Which section order and heading does the video section follow — the brief's ("Who We Are" third) or the reference's? → A: The reference's (Find Us Nearby has since been removed, see Deviations): the four quick-access cards, the inspiration section, then **"Why Choose Dar-e-Arqam Schools?"** with the video. The brief's different order and name are recorded under Deviations.
- Q: Where do the Photo/Videos, Downloads and Our Books icon links go? → A: To the anchors fixed by 007 on the Resources page: `/resources#photo-gallery`, `/resources#downloads` and `/resources#our-books`. Call/Mail/Chat goes to `/contact`. Until feature 016 adds the Downloads and Our Books sections, those two land at the top of `/resources`.
- Q: Is the books carousel in or out? → A: In. The section (heading "Dar-e-Arqam Books", the line "Books developed with efficient and effective techniques", its blue band and carousel layout) is hardcoded in a content file.
- Q: Are the book covers admin-managed? → A: No (final decision, 2026-10-01). The carousel shows a fixed set of 10 hardcoded cover images, `public/images/home/books/book-01.jpg` … `book-10.jpg`, which the owner adds by hand. This replaces an earlier same-day answer that made the covers admin-managed through a Settings "Books" group; that group is not built.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Hero and page frame (Priority: P1)

A visitor opens the home page and sees the site's header, then a hero carousel of the slides the school manages in Settings. Each slide shows its picture, its heading and its button when they are set. Slides advance on their own after the display time set in Settings. On a phone, each slide shows its mobile picture when it has one.

**Why this priority**: The hero is the first thing every visitor sees, and it is the part the school changes most.

**Independent Test**: In Settings, add two slides (one with a heading and a button, one with a mobile picture), hide a third; open `/` and watch the visible slides appear in order and advance; open `/` at phone width and confirm the mobile picture is used.

**Acceptance Scenarios**:

1. **Given** Settings holds several visible slides, **When** a visitor opens `/`, **Then** the hero shows them in Settings order and advances to the next after the saved display time, looping at the end.
2. **Given** a slide with a heading and a button, **When** it is shown, **Then** the heading and the button (label and link) appear over or beside the picture as in the reference; a slide without them shows the picture alone.
3. **Given** a slide that Settings marks hidden, **When** the page loads, **Then** it never appears.
4. **Given** a slide has a mobile picture, **When** a phone-width visitor sees it, **Then** the mobile picture is used; without one the desktop picture is used on every screen.
5. **Given** a visitor who prefers reduced motion, **When** the hero is shown, **Then** it does not advance by itself and the visitor can still move between slides with the controls.
6. **Given** a hero with more than one slide, **When** a visitor uses the previous/next controls or the position markers, **Then** the hero moves to that slide; with a single slide no controls are shown and nothing advances.
7. **Given** no slides are configured, or Settings cannot be read, **When** the page loads, **Then** the hero shows the school's default slide (never an empty or broken area) and the rest of the page is unaffected.
8. **Given** the page, **When** it renders, **Then** it sits inside the existing header and footer, and the header's top bar and footer social icons still come from Settings (feature 005).

---

### User Story 2 - Sections in reference order (Priority: P1)

Below the hero the page shows the reference's sections, in the reference's order, with its layout and spacing: a yellow "Find Us Nearby" band that links to Campuses, four quick-access cards, the inspiration section, the "Why Choose Dar-e-Arqam Schools?" section with the school's video, latest news, the books carousel, salient features cards, the progress dashboard, icon quick-links, the careers call-to-action and the partners carousel.

**Why this priority**: This is what makes the page the reference's home page rather than a stack of unrelated blocks.

**Independent Test**: Open `/` at 1440px and compare it with `das.edu.pk_.png` section by section (order, spacing, colours, type); repeat at 1024, 768 and 375px against the tablet and mobile screenshots.

**Acceptance Scenarios**:

1. **Given** the page at 1440, 1024, 768 and 375px, **When** it is compared with the matching reference screenshot, **Then** the sections appear in the reference order with the reference's spacing, colours and type values (from `research/design-tokens.md`); any difference is listed in the spec's Deviations.
2. *(Removed 2026-10-07: the "Find Us Nearby" band no longer exists.)*
3. **Given** the four quick-access cards (Admission Procedure, Salient Features, Branch Network, Education Curriculum), **When** the visitor chooses one, **Then** they go to its page (Admission, Salient Features, Campuses, Academics); there is no Franchise card and the remaining four fill the row without a gap.
4. **Given** the "Why Choose Dar-e-Arqam Schools?" section, **When** a home video address is saved in Settings, **Then** the section shows its text and that YouTube video; **When** the address is empty, **Then** the section shows its text alone with no empty frame and no error.
5. **Given** the inspiration section, **When** it is shown, **Then** it displays its heading and supporting line (no logo: removed 2026-10-07).
6. **Given** the fixed book cover images in `public/images/home/books/`, **When** the page renders, **Then** the books carousel shows them in the content file's order under the fixed heading and line, as in the reference; **When** none of the files exist yet, **Then** the whole books section is hidden and no blank space is left.
7. **Given** any section's optional field is missing (an optional line, image or link), **When** the page renders, **Then** the section still looks intact.

---

### User Story 3 - Latest news (Priority: P1)

The page shows the newest published news posts, newest first, each as a card with its cover image, title, date, category and a short excerpt, and a link to the full News page. Urdu posts display correctly. A post without a cover image shows the placeholder used on the News pages. When there are no published posts the whole section is hidden.

**Why this priority**: It is the page's only fast-changing content and the visitor's route into News.

**Independent Test**: Publish a post in the admin and confirm it appears first in Latest News; unpublish or delete all posts and confirm the section disappears without leaving a gap.

**Acceptance Scenarios**:

1. **Given** published posts exist, **When** the page loads, **Then** the newest are shown newest first (up to six), each with cover image, title, date, category and excerpt, and each card links to its post.
2. **Given** a post is published (or unpublished, or deleted) in the admin, **When** a visitor loads the page within one minute, **Then** the section reflects it, with no redeploy.
3. **Given** a post written in Urdu, **When** its card is shown, **Then** its title and excerpt are right-to-left with the Urdu font and the card layout is unbroken.
4. **Given** a post with no cover image, **When** its card is shown, **Then** it uses the same placeholder the News pages use.
5. **Given** no published posts, **When** the page loads, **Then** the Latest News section (heading and grid) is not shown and the sections around it close up.
6. **Given** the section, **When** the visitor chooses its "view all" link, **Then** they go to the News page.
7. **Given** a draft or future-dated post, **When** the page loads, **Then** it never appears (the same visibility rules as the News pages).

---

### User Story 4 - Careers call-to-action (Priority: P1)

Where the reference has its signup band, the page shows the same headings, wording and styling with a "Join Now" button instead of the input fields. The button goes to the Careers page. The wording is fixed content in this phase.

**Why this priority**: It is the page's main call to action (PRD §5.1) and replaces the old signup form.

**Independent Test**: Open `/`, find the band, choose "Join Now", and land on `/careers`.

**Acceptance Scenarios**:

1. **Given** the home page, **When** the band is shown, **Then** it has the reference signup band's heading and supporting line, its colours and type, a "Join Now" button and no input fields.
2. **Given** the band, **When** the visitor chooses "Join Now", **Then** they go to `/careers`.
3. **Given** the band, **When** the anchor `#signup` is used in a link to the home page, **Then** it scrolls to this band.
4. **Given** the page, **When** it is inspected, **Then** no signup form is submitted from the home page any more.

---

### User Story 5 - Progress dashboard (Priority: P2)

A dark banner shows four numbers — students, books, teachers and campuses — taken from Settings. When the banner scrolls into view the numbers count up to their values. Visitors who prefer reduced motion see the final numbers straight away.

**Why this priority**: It completes the reference's look and puts the school's headline figures on the front page; the numbers themselves are useful without the animation.

**Independent Test**: Change a stat in Settings and reload `/`; the dashboard shows the new number. Scroll to it and watch the count-up; repeat with reduced motion turned on.

**Acceptance Scenarios**:

1. **Given** Settings holds the four numbers, **When** the section scrolls into view, **Then** each counts up from zero to its value once.
2. **Given** a stat is changed in Settings, **When** a visitor loads the page within one minute, **Then** the dashboard shows the new value.
3. **Given** a visitor who prefers reduced motion, **When** the section is shown, **Then** the final numbers appear at once with no counting.
4. **Given** a large number (for example 300,000), **When** it is shown, **Then** it displays without breaking the layout, in the reference's format.
5. **Given** Settings cannot be read, **When** the page loads, **Then** the dashboard shows the starting values (300000, 50, 14500, 700) rather than an error.

---

### User Story 6 - Icon quick-links (Priority: P2)

A row of four large icon links: Photo/Videos, Downloads, Our Books and Call/Mail/Chat. The first three lead to the matching part of Resources; the fourth leads to Contact.

**Why this priority**: Shortcuts to the pages people look for most.

**Independent Test**: Choose each of the four and confirm it reaches its destination.

**Acceptance Scenarios**:

1. **Given** the row, **When** the visitor chooses Photo/Videos, Downloads or Our Books, **Then** they reach `/resources#photo-gallery`, `/resources#downloads` or `/resources#our-books`.
2. **Given** the row, **When** the visitor chooses Call/Mail/Chat, **Then** they reach the Contact page.
3. **Given** each link, **When** it is read by a screen reader, **Then** its name says what it does (its label), and its icon is decorative.

---

### User Story 9 - Books carousel (Priority: P2)

Under the fixed heading "Dar-e-Arqam Books" and its line, visitors see the school's books as a carousel on the reference's blue band. The 10 covers are fixed images added to the site by hand; there is no admin screen for them.

**Why this priority**: Part of the reference look and the school's own publications; the rest of the page does not depend on it.

**Independent Test**: Put cover images at `public/images/home/books/book-01.jpg` … `book-10.jpg`, open `/` and confirm they appear in that order under "Dar-e-Arqam Books"; move through them with the arrows and by swipe; remove all the files and confirm the section is gone.

**Acceptance Scenarios**:

1. **Given** the cover files are present, **When** the home page renders, **Then** the covers show in the content file's order (book-01 first) under the fixed heading and line.
2. **Given** covers on the home page, **When** the visitor uses the previous/next arrows or swipes, **Then** the carousel moves; it shows as many covers at once as the reference does at each width, never clipped or distorted.
3. **Given** only some of the 10 files are present, **When** the page renders, **Then** only those covers show, with no broken images or gaps.
4. **Given** none of the files are present, **When** the page renders, **Then** the books section is hidden and the neighbouring sections close up.

---

### User Story 7 - Partners carousel (Priority: P2)

A carousel of partner logos near the bottom of the page. It slides on its own, pauses while the visitor hovers over it, and loops. It works with one logo and with many.

**Why this priority**: Part of the reference look; nothing else depends on it.

**Independent Test**: Watch the carousel advance; hover to pause it; test with a single logo and with many logos.

**Acceptance Scenarios**:

1. **Given** several logos, **When** the page is idle, **Then** the carousel advances by itself and loops; **When** the pointer is over it, **Then** it pauses and resumes when the pointer leaves.
2. **Given** a single logo, **When** the carousel is shown, **Then** the logo is shown still, without sliding or blank slides.
3. **Given** more logos than fit, **When** shown at each screen width, **Then** the number visible per view follows the reference's breakpoints and none is clipped.
4. **Given** a visitor who prefers reduced motion, **When** the carousel is shown, **Then** it does not advance by itself.
5. **Given** each logo, **When** it is shown, **Then** it has a descriptive alternative text (or is marked decorative when it repeats visible text next to it).

---

### User Story 8 - Search and sharing (Priority: P3)

The page has a title, description and preview image so that search engines and social platforms show it properly. Images below the first screen load as the visitor scrolls.

**Why this priority**: Improves discoverability and speed but does not change what the page shows.

**Independent Test**: Read the page's title, description and social-preview tags; load the page and confirm below-the-fold images are not fetched until near the viewport.

**Acceptance Scenarios**:

1. **Given** the home page, **When** its head is inspected, **Then** it has a title, a description, and a social preview image with title and description for sharing.
2. **Given** the page loads, **When** the visitor has not scrolled, **Then** images far below the first screen are not yet downloaded; they load as the visitor approaches them; the hero's first image is not delayed.

---

### Edge Cases

- Long slide headings, long news titles, Urdu text and missing optional fields never break the layout, at any width.
- If Settings cannot be read, the hero shows the default slide, the dashboard shows the starting numbers and the video section shows its text alone; the rest of the page renders normally, never an error page.
- If News cannot be read, the Latest News section is hidden and the page renders the rest.
- If both fail together, every remaining section still renders.
- Hero slide images with very different shapes are cropped to fit the hero, never stretched.
- A slide button whose link is a site path and one whose link is an external address both work; an external one opens as the site's other external links do.
- A hidden or deleted slide never appears, and the last visible slide stays on screen if the others are removed (Settings guarantees at least one).
- The home video address is a YouTube link in any form Settings accepts; a video that cannot load leaves the section's text intact.
- Every image has alternative text, and purely decorative images are marked as decorative so assistive technology skips them.
- The page contains one main landmark (the shell's) and a sensible heading order, so keyboard and screen-reader users can move through it.
- Keyboard users can reach every link, the hero controls and the carousel controls, and can pause any moving content.
- The page is one screen of content at a time on a phone: no horizontal scrolling at 375px.

## Requirements *(mandatory)*

### Functional Requirements

**Page and hero**

- **FR-001**: The home page (`/`) MUST render inside the existing site shell (skip link, header, footer) and replace the current placeholder.
- **FR-002**: The hero MUST show the visible slides from Settings, in Settings order, each with its picture and, when set, its heading and its button (label and link), and MUST advance automatically after the display time saved in Settings, looping.
- **FR-003**: The hero MUST use a slide's mobile picture at phone widths when one is set, and its desktop picture otherwise and on larger screens.
- **FR-004**: When Settings has no visible slide or cannot be read, the hero MUST show the default slide (the starting slide feature 005 defines), never an empty area or an error.
- **FR-005**: The hero MUST NOT advance automatically for visitors who prefer reduced motion, MUST provide previous/next controls and position markers when it has more than one slide, and MUST show no controls and no movement with a single slide. Auto-advance MUST pause while a visitor hovers over or focuses inside the hero.

**Sections**

- **FR-006**: The page MUST show these sections in this order, after the hero, matching the reference layout, spacing, colours and type: Find Us Nearby; the four quick-access cards; the inspiration section; the "Why Choose Dar-e-Arqam Schools?" section with the school video; Latest News; the books carousel; the salient features cards; the progress dashboard; the icon quick-links; the careers call-to-action; the partners carousel. *(Order and name follow the reference screenshot, as decided in Clarifications; the brief's different order is a recorded deviation.)*
- **FR-010**: The "Why Choose Dar-e-Arqam Schools?" section MUST show its text and, when Settings holds a home video address, that video embedded; with no address it MUST show the text alone with no empty frame.
- **FR-011**: The books carousel MUST show the fixed book covers (up to 10, `public/images/home/books/book-01.jpg` … `book-10.jpg`, listed in the content file) in the content file's order, under the fixed heading "Dar-e-Arqam Books" and line "Books developed with efficient and effective techniques", in the reference's blue band and carousel layout. Nothing in it is admin-editable. A listed cover whose file is missing MUST be left out; with none present, the section MUST be hidden with no blank space.
- **FR-012**: The salient features section MUST show its four cards (Personality Development, Teachers Training, Hifz-e-Quran-e-Kareem, Co-Curricular Activities) with their pictures and text, as in the reference.

**Latest news**

- **FR-013**: Latest News MUST show up to six of the newest published posts, newest first, each with cover image, title, date, category and excerpt, linking to the post, and a link to the News page.
- **FR-014**: Latest News MUST use the same visibility rules as the News pages (published, not future-dated, not deleted), so drafts and deleted posts never appear.
- **FR-015**: Urdu posts MUST display right-to-left with the Urdu font in their card; posts without a cover image MUST show the News pages' placeholder.
- **FR-016**: With no published posts, or when News cannot be read, the whole Latest News section MUST be hidden and the neighbouring sections close up.
- **FR-017**: A change to the published posts MUST appear on the home page within one minute, with no redeploy.

**Careers call-to-action**

- **FR-018**: The careers call-to-action MUST use the reference signup band's headings, wording and styling with a "Join Now" button instead of input fields, MUST link to `/careers`, and MUST keep the `#signup` anchor.
- **FR-019**: The call-to-action's wording MUST come from a content file in this phase and MUST NOT be editable in the admin.

**Progress dashboard**

- **FR-020**: The progress dashboard MUST show the four numbers from Settings (students, books, teachers, campuses) and MUST count each up from zero once when the section first comes into view.
- **FR-021**: For visitors who prefer reduced motion, the dashboard MUST show the final numbers immediately.
- **FR-022**: A change to a stat in Settings MUST appear on the home page within one minute; if Settings cannot be read the dashboard MUST show the starting values.

**Icon quick-links**

- **FR-023**: The page MUST show four icon links — Photo/Videos, Downloads, Our Books and Call/Mail/Chat — linking to `/resources#photo-gallery`, `/resources#downloads`, `/resources#our-books` and `/contact` respectively (Clarifications).

**Partners carousel**

- **FR-024**: The partners carousel MUST advance automatically, pause while the pointer hovers or focus is inside it, loop, and work with one logo (shown still) and with many; it MUST NOT advance for visitors who prefer reduced motion.
- **FR-025**: The number of logos visible at once MUST follow the reference's breakpoints, with no logo clipped or distorted.

**Books carousel**

- **FR-036**: The books carousel MUST show as many covers at once as the reference does at each width, move with previous/next arrows and by swipe, never clip or distort a cover, and show no arrows when every cover fits. It MUST NOT move by itself for visitors who prefer reduced motion.

**Content, resilience and quality**

- **FR-026**: Each static section (quick-access cards, inspiration, salient features, careers call-to-action, icon quick-links, partner logos, Find Us Nearby, Why Choose text, the books section's heading and line) MUST be defined as a typed group of fields in a content file, in the shape a database record would take, so a later feature can move any of them to the database without changing the components.
- **FR-027**: If Settings or News cannot be read, the home page MUST still render every other section instead of an error page; a failure in one section MUST NOT stop another from showing.
- **FR-028**: Every image MUST have alternative text; purely decorative images MUST be marked decorative.
- **FR-029**: The page MUST have a title, a description and a social preview (image, title and description).
- **FR-030**: Images below the first screen MUST load as the visitor approaches them; the hero's first picture MUST load without delay.
- **FR-031**: Long headings, Urdu text and missing optional fields MUST NOT break the layout at 375, 768, 1024 and 1440px, and the page MUST NOT scroll sideways at any width.
- **FR-032**: Every design value MUST come from `research/design-tokens.md` through a named token; a value missing from it MUST be extracted and added there first (Constitution VII).
- **FR-033**: Every moving element (hero, dashboard count-up, books carousel, partners carousel) MUST respect the visitor's reduced-motion preference.

### Key Entities

- **Hero slide** (from Settings, feature 005): picture (desktop, optional mobile), alternative text, optional heading, optional button label and link, visible flag, order; plus the display time.
- **Progress figures** (from Settings): students, books, teachers, campuses.
- **Home video** (from Settings): one YouTube address, or empty.
- **News post summary** (from News, feature 003): title, excerpt, category, publish date, language, optional cover image, link.
- **Quick-access card**: title, short text, picture, destination.
- **Inspiration block**: heading, supporting line, logo.
- **Why Choose block**: heading, text (the video comes from Settings).
- **Book cover** (content file, fixed): image file in `public/images/home/books/`, alternative text, order.
- **Books section**: heading, supporting line (content file, fixed).
- **Salient feature card**: title, text, picture.
- **Quick-link**: label, icon, destination.
- **Careers call-to-action**: heading (with highlighted part), supporting line, button label, destination.
- **Partner**: logo, name (alternative text), optional link.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: At 375, 768, 1024 and 1440px the home page matches its reference screenshot section by section (order, spacing, colours, type) with zero unlisted differences; every deviation is listed in this spec.
- **SC-002**: A slide added or hidden in Settings appears on (or disappears from) the home page within 1 minute, with no redeploy, in 100% of tested cases.
- **SC-003**: A stat changed in Settings, and a news post published or unpublished in the admin, appear on the home page within 1 minute in 100% of tested cases.
- **SC-004**: The home page renders every remaining section when there are no slides, when there are no published posts, and when Settings or News cannot be read; 0 error pages in tested cases.
- **SC-005**: A visitor reaches Careers from the home page in one action ("Join Now"), and reaches each of the four icon destinations in one action.
- **SC-006**: 100% of images on the page have alternative text or are marked decorative; the page has one main landmark and no skipped heading levels.
- **SC-007**: With reduced motion on, 0 elements on the page move by themselves.
- **SC-008**: The page never scrolls sideways at 375, 768, 1024 or 1440px, and shows no overlapping or clipped content.
- **SC-009**: The end-to-end journeys pass: hero slides from Settings appear and advance; a stat changed in Settings changes the dashboard; publishing a post makes it appear in Latest News; "Join Now" reaches `/careers`; each icon quick-link reaches its destination.
- **SC-010**: Below-the-fold images are not downloaded until the visitor scrolls near them, in the tested load.
- **SC-011**: Every book cover file present in `public/images/home/books/` (up to 10) appears in the carousel in the content file's order, and the books section is absent when none is present, in 100% of tested cases.

## Assumptions

- The reference's counter animation duration could not be read from the live site (`research/design-tokens.md` "Known extraction gaps"), so the count-up uses a short, smooth duration chosen for readability (about two seconds) and is recorded as a placeholder until the client says otherwise.
- The hero advances at the display time saved in Settings (default 5 seconds), not the reference's 7 seconds, because the school now controls it.
- Latest News shows six posts (the reference shows six cards in two carousel pages); if the reference's card count differs when compared, the reference wins.
- "View all" news links to `/news`.
- The four quick-access cards link to the site's existing navigation pages: Admission Procedure → `/admission/admission-procedure`, Salient Features → `/about/salient-features`, Branch Network → `/campuses`, Education Curriculum → `/academics`. Pages not built yet show the site's placeholder page, as elsewhere.
- `/careers` does not exist until feature 012; until then "Join Now" reaches the site's placeholder page for that address. This is expected and is not a defect of this feature.
- Partner logos are the reference's partner logos (for example Parenting, Nazra & Hifz, Inclusive Education), supplied as image files during implementation; if a logo cannot be obtained a marked placeholder is used and listed.
- Static section wording that is the reference's own is kept verbatim; wording the client has not supplied is a marked placeholder (001 precedent).
- Dates on news cards use the same format as the News pages.
- Search and sharing text is drafted wording pending the client's final copy.

## Dependencies

- Feature 001: site shell (header, footer, navigation pages the cards link to), page placeholder behaviour for unbuilt routes.
- Feature 003: news posts, their visibility rules, cover-image placeholder, card look.
- Feature 004: signup band wording and styling (reused for the careers call-to-action) and the `#signup` anchor.
- Feature 005: hero slides and display time, stats, home video address, contact details for the shell; the starting values it defines for each.
- Feature 007: the Resources page and its `#photo-gallery` anchor (Photo/Videos link); the `#downloads` and `#our-books` anchors arrive with feature 016.
- Feature 012 (later): the Careers page that "Join Now" reaches.
- Feature 016 / Resources (later): the Resources pages the icon links reach.
- Feature 014 (later): moves the static sections to the database.

## Deviations from the Reference

| Deviation | Why |
|---|---|
| The section order and the video section's name follow the reference ("Why Choose Dar-e-Arqam Schools?"), not the brief's list ("Who We Are" third) | Owner's decision, Clarifications 2026-10-01 |
| The Franchise Offer quick-access card is not shown; four cards fill the row | The brief removes it |
| The signup form is replaced by a "Join Now" button | PRD §5.1: careers replaces signup |
| Hero display time comes from Settings, not the reference's fixed 7 seconds | The school controls it |
| Home sections have more top and bottom padding (48px on phones, 80px from 1024px) than the reference's 10–50px | Owner's request (2026-10-01) for sections that breathe |
| Progress dashboard icons are lucide icons matching the reference's Font Awesome ones (address card, open book, standing person, school) | No new icon set (Constitution II) |
| The Books, Latest News and Partners carousels have previous/next buttons; the reference's Swipers show none | Keyboard and screen-reader access (FR-036, FR-024) |
| Partner logos carry descriptive alt text; the reference's are empty | Every image has alternative text (FR-028); names are from the logo file names and are placeholders until the client confirms them |
| The 004 signup form no longer appears on `/` | The careers CTA replaces it (PRD §5.1); the signup E2E specs that used `/` need a new home (see Follow-ups) |

## Out of Scope

- Editing the static sections from the admin (feature 014).
- Managing the book covers from the admin (they are fixed files; owner's decision).
- The Careers page itself (feature 012); the home page only links to it.
- The Campuses, Resources and News pages beyond linking to them.
- Video slides in the hero (feature 005 scope).
- Changing the site shell (header, footer, navigation).
