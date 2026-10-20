# Feature Specification: Academics Page

**Feature Branch**: `018-academics`
**Created**: 2026-10-12
**Status**: Draft
**Input**: Feature brief "018-academics" (owner, 2026-10-12). Depends on the navigation sections conversion and 017-about (patterns: typed content files, placeholder-in-development / hidden-in-production, release check). Feeds into 014-page-content (Academics tab in Settings).

## Source Content

| Section | Brief named | Actual source | Confirmed |
|---|---|---|---|
| Academic Overview | `academic-excellence.docx` | `das-text/Academic Excellence .docx` (capital letters, space instead of hyphen, extra space before `.docx`) | Owner, 2026-10-12 |
| Teachers' Training | reference page | <https://das.edu.pk/academics/teachers-training/>, matching the saved screenshot `screenshots/das.edu.pk_academics_teachers-training_.png` and the live HTML fetched 2026-10-12 | Live page reached |
| Hifz-e-Quran | `hifz-e-quran.docx` | `das-text/HIFZ-UL-QURAN.docx` ("UL" instead of "E") | Owner, 2026-10-12 |

### English text to use (verbatim)

**Academic Overview** (from `Academic Excellence .docx`)

- Heading: "Academic Excellence"
- Subheading: "Building Strong Foundations for Lifelong Learning"
- Paragraph 1: "We believe that quality education begins with strong foundations. Our teaching approach encourages students to think critically, explore new ideas, and apply their knowledge with confidence."
- Paragraph 2: "By combining modern teaching methodologies, activity-based learning, continuous assessment, and individual attention, we create an engaging learning environment where every student has the opportunity to succeed."
- Paragraph 3: "Our classrooms inspire curiosity, creativity, collaboration, and confidence, preparing students not only for examinations but also for lifelong learning."

**Teachers' Training** (from the reference page)

- Intro paragraph: "Dar-e-Arqam Foundation is working hard to improve and innovate new ways of assisting teaching faculty for knowledge-based learning and enhancing their own personal capacity through comprehensive resources. Here are just some of the resources that we currently have and are continuing to expand each day:"
- Bulleted list of 19 items, in this order: School leadership; Managing schools (administrative staff); Managing classrooms (teaching faculty); Achieving goals for higher classroom excellence; Improving student grades; School improvement programs; Teacher / Student assessment manuals; Literacy development; Strategic planning for schools; Guides for school staff development; Learning through technology; Guides for professional development of teachers; Teacher training manuals; School law cases and concepts; Curriculum planning guides; Educational philosophy; Tips and new innovative ideas for fresh teachers; Theory and practices of training teaching faculty; Tips for lecturers.

**Hifz-e-Quran** (from `HIFZ-UL-QURAN.docx`, English part)

- Heading: "HIFZ-UL-QURAN PROGRAM"
- Subheading: "A Meaningful Step Towards a Beautiful World & a Better Hereafter"
- Paragraph: "At Dar-e-Arqam Schools, developing a strong connection with the Qur’an and nurturing its understanding and memorization are given fundamental importance. After Grade 3, students have the option to enroll in the Hifz-ul-Quran Program."
- Subheading: "Admission Based on Aptitude"
- Paragraph: "Before admission, the student undergoes a 15-day observation period to assess their aptitude, interest, memory and suitability for Hifz. Admission is decided based on this assessment."
- Subheading: "Hifz Alongside Academic Education"
- Paragraph: "Students in the Hifz Program continue their core academic education alongside Qur’an memorization."
- Added sentence (translated from the Urdu at the owner's request, **pending client approval**, see T1): "This continuity in education ensures that, after completing the memorization of the Qur’an, the student can successfully continue their academic education."

### Urdu text left out (not displayed, not stored)

| Source | Urdu text left out |
|---|---|
| `Academic Excellence .docx` | Heading "تعلیمی معیار", subheading "مضبوط بنیاد، روشن مستقبل", and three paragraphs (the Urdu version of the section) |
| `HIFZ-UL-QURAN.docx` | Heading "شعبۂ حفظ القرآن", subheading "دارِ ارقم اسکول کے وژن کا اہم حصہ", three subheadings with their paragraphs (the Urdu version of the section), a dotted divider line and the closing tagline "خوبصورت دنیا۔۔۔۔ بہترین آخرت" |
| Teachers' Training page | None |

### Findings for client approval

Nothing below has been changed silently. Each item stays as the source has it unless noted, until the client decides.

| # | Where | Finding | Default until decided |
|---|---|---|---|
| T1 | Hifz-e-Quran | The English omits a sentence that the Urdu has ("یہ تعلیمی تسلسل اس بات کو یقینی بناتا ہے..."). | The owner asked for it to be translated and added. It's marked pending client approval. |
| T2 | Academic Overview | A line, "Curiosity with Purpose", sits alone at the end of the file, after the Urdu, and fits neither language version. | Not shown. Reported. |
| T3 | Academic Overview | The document heading is "Academic Excellence", but the brief's section and menu label is "Academic Overview". | The menu uses "Academic Overview" and the section heading uses "Academic Excellence", following 017's FR-005 pattern. |
| T4 | Hifz-e-Quran | The document heading is "HIFZ-UL-QURAN PROGRAM", in capitals. The menu, anchor and existing site wording use "Hifz-e-Quran". The body text uses "Hifz-ul-Quran Program". | The menu uses "Hifz-e-Quran". The heading is stored and displayed exactly as written, "HIFZ-UL-QURAN PROGRAM", with no case change in content or CSS. If the client picks title case, only the stored string changes. |
| T5 | Hifz-e-Quran | The spelling switches between "Qur’an" (with apostrophe) and "Quran" (in "Hifz-ul-Quran"). | Kept as written. |
| T6 | Teachers' Training | "new innovative ideas" is redundant, and "fresh teachers" is unusual wording ("new teachers" is more common). | Kept as written. |
| T7 | Teachers' Training | The text describes the Dar-e-Arqam Foundation network-wide, not the Metroville Campus specifically. | Kept as written. Reported because it may not fit a campus site. |

### Deviation from the Reference Site

Constitution I requires this note. The reference (das.edu.pk) has separate Academics sub-pages. Its Teachers' Training page is text only: banner, intro and list, with no photos or video. This feature intentionally differs, as the owner's brief directs:

- One /academics page with anchored sections, following the navigation sections conversion.
- A Teachers' Training photo collage and video, and a Hifz-e-Quran video, which the reference does not have.
- Syllabi and Examination removed.

The text itself follows the reference and the client's documents word for word (FR-007).

## Clarifications

### Session 2026-10-12

- Q: The source file names differ from the brief. Which files are meant? → A: `Academic Excellence .docx` and `HIFZ-UL-QURAN.docx` (owner).
- Q: The English Hifz text omits a sentence that the Urdu has. How should it be handled? → A: Translate it into English, add it and mark it pending client approval (owner).
- Q: What should production show for the Academic Overview image before the real photo arrives? → A: A neutral, non-photographic branded placeholder graphic, as 017's Our Story does. The two-column layout is kept (owner).
- Q: What does the page's top-level heading (H1) say? → A: "Academics", marked pending client approval because it isn't from a document (follows 017's "About Us").
- Q: How are Teachers' Training's text, photo collage and video arranged? → A: From tablet width up, the text and list sit in one column with the collage beside them, and the video runs full width below both. On phones they stack: text → photos → video.
- Q: Until the client decides T4, how is the Hifz-e-Quran heading shown? → A: Stored and displayed exactly as written, "HIFZ-UL-QURAN PROGRAM", with no case change in content or styling.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Read about the school's academics on one page (Priority: P1)

A parent opens /academics. Below one page title they see three sections in order: Academic Overview, Teachers' Training and Hifz-e-Quran. Each section uses the school's own English wording. Each one looks different from its neighbours and reads well on a phone, a tablet and a desktop.

**Why this priority**: The page's whole purpose is the text. It has value even before any video or photo exists.

**Independent Test**: Open /academics at 375, 768, 1024 and 1440 px. Confirm the one title, the three section headings in order, the text matching the sources word for word, no Urdu text, and no sideways scroll.

**Acceptance Scenarios**:

1. **Given** /academics, **When** it loads, **Then** it has exactly one top-level heading and three second-level section headings, in the order Academic Overview, Teachers' Training, Hifz-e-Quran, with anchors `academic-overview`, `teachers-training` and `hifz-e-quran`.
2. **Given** the Academic Overview section, **When** it is viewed on a desktop, **Then** the text sits in one column and an image in the other. On a phone they stack with the text first.
3. **Given** the Teachers' Training section, **When** it is viewed, **Then** the intro paragraph is followed by the 19 items as a bulleted list, in source order.
4. **Given** the Hifz-e-Quran section, **When** it is viewed, **Then** the heading, subheading, both sub-sections and their paragraphs appear in document order.
5. **Given** any width from 375 to 1440 px, **When** the page is viewed, **Then** there is no horizontal page scroll, and body text is no wider than a comfortable reading width (about 60–75 characters per line on desktop).

---

### User Story 2 - Jump to a section from the menu (Priority: P1)

A visitor opens the Academics dropdown (desktop) or the Academics group (mobile menu) and sees exactly Academic Overview, Teachers' Training and Hifz-e-Quran. Choosing one scrolls to that section with its heading fully visible below the fixed header.

**Why this priority**: The menu is how most visitors reach these sections. Syllabi and Examination entries would lead nowhere.

**Independent Test**: At desktop and phone widths, open the menu, choose each entry in turn, and check the URL hash and that the heading is visible.

**Acceptance Scenarios**:

1. **Given** the desktop header, **When** the Academics dropdown opens, **Then** it lists exactly the three entries above, in order, and neither Syllabi nor Examination(s).
2. **Given** the mobile menu, **When** the Academics group opens, **Then** it lists the same three entries in the same order.
3. **Given** any entry, **When** it is chosen, **Then** the URL becomes `/academics#<anchor>` and the section heading is fully visible below the fixed header.
4. **Given** site search, **When** a visitor searches "syllabi" or "examination", **Then** no Academics anchor result appears for them.

---

### User Story 3 - Old Academics addresses still work (Priority: P2)

Someone follows an old link or bookmark to a former Academics address and lands on the nearest part of the new page.

**Why this priority**: The old addresses are on the reference site and in search engines. Broken links lose visitors.

**Independent Test**: Request each old address and check its permanent redirect target.

**Acceptance Scenarios**: Each old address MUST redirect permanently as follows.

| Old address | New destination | Reason |
|---|---|---|
| `/academics/academics-overview` | `/academics#academic-overview` | The section's id changes from `academics-overview` to `academic-overview` |
| `/academics/syllabi` | `/academics` | Section removed for now |
| `/academics/examinations` | `/academics` | Section removed for now |
| `/academics/teachers-training` | `/academics#teachers-training` | Unchanged |
| `/hifz-e-quran` | `/academics#hifz-e-quran` | Unchanged |

1. **Given** each old address in the table, **When** it is requested, **Then** the visitor gets a permanent redirect to its destination.
2. **Given** any other `/academics/<unknown>` address, **When** it is requested, **Then** the not-found page is shown.

---

### User Story 4 - Watch the training and Hifz videos without slowing the page (Priority: P2)

A visitor sees a poster with a play button in Teachers' Training (YouTube) and in Hifz-e-Quran (Instagram). Nothing from YouTube or Instagram loads until they click. After the click the player loads in the same 16:9 frame.

**Why this priority**: Videos add value, but they are optional. Their URLs are still to come from the client.

**Independent Test**: Load /academics with network monitoring. Confirm there are no requests to YouTube, Instagram or their content hosts. Click each poster, confirm the player loads only then, and confirm the frame stays 16:9.

**Acceptance Scenarios**:

1. **Given** a video with a URL, **When** the page loads, **Then** a local poster image and a labelled play button show in a 16:9 frame, and no request goes to any YouTube or Instagram host.
2. **Given** that poster, **When** the visitor clicks or presses Enter/Space on the play button, **Then** the provider's player loads in the same frame.
3. **Given** a video entry with no URL, **When** the page loads, **Then** that video block is not rendered at all: no poster, no empty frame.
4. **Given** the page, **When** it loads, **Then** no video plays until the visitor asks.
5. **Given** the Hifz video uses Instagram, **When** the player loads, **Then** it appears inside the same 16:9 frame. Screenshots at each width are given to the owner, who decides whether to switch to the school's YouTube channel (see Edge Cases).

---

### User Story 5 - Teachers' Training photo collage (Priority: P3)

Beside the training text (tablet and up), 2–3 training photos appear in an overlapping or staggered collage in the site's style. In development, clearly marked placeholder tiles stand in until real photos are added. The live site shows no photo block until real photos exist.

**Why this priority**: The photos don't exist yet. What matters is that placeholders never reach the live site.

**Independent Test**: Run in development with no photos and confirm labelled placeholder tiles. Build for production with no photos and confirm there is no photo block. Add 2, then 3, sample photos to content and confirm the collage works with each count in both modes.

**Acceptance Scenarios**:

1. **Given** no photos in a production build, **When** /academics is viewed, **Then** no photo block, placeholder tile or placeholder text exists.
2. **Given** no photos in development, **When** /academics is viewed, **Then** placeholder tiles visibly marked as placeholders are shown in the collage layout.
3. **Given** 2 photos, or 3 photos, **When** viewed at each of the four widths, **Then** the collage is balanced, nothing overflows or overlaps text, and on phones the photos are still recognisable (stacked or lightly offset).
4. **Given** any photo, **When** it is shown, **Then** it has meaningful alt text supplied by the owner.

---

### Edge Cases

- **Old in-page fragments** (`/academics#syllabi`, `/academics#examinations`, `/academics#academics-overview`): a server can't redirect a fragment, so these land at the top of /academics. That's acceptable. No on-site link may use them (FR-004).
- **Instagram's embed frame**: Instagram's player has its own header and caption and is not natively 16:9. It is fitted into the 16:9 frame, and screenshots at all four widths go to the owner. If it looks poor, the owner may switch the entry to the school's YouTube channel. That is a content change only (FR-016).
- **Invalid or unsupported video URL** (for example, not a recognisable YouTube or Instagram post or reel address): the content check rejects it and the build fails, so it never reaches the live site. As a second guard, the renderer treats an unparsable URL as no URL and hides the block. 014's database source relies on this guard.
- **Video fails to load after click** (provider down, video removed): the frame keeps its 16:9 size and the provider's own error shows. The layout doesn't jump.
- **One photo only**: below the minimum of 2. In production, the photo block is shown as a single framed photo rather than a collage. In development, the missing tiles are filled with placeholders.
- **More than 3 photos**: the content check rejects a 4th photo and the build fails (014's editor will refuse it). As a second guard, the view shows only the first 3.
- **Missing or failed image** (overview image, poster or photo): the frame keeps its size and its background shows. The layout doesn't jump.
- **Both videos and the photos absent in production**: each section still shows its text. No empty containers remain.

## Requirements *(mandatory)*

### Page and navigation

- **FR-001**: /academics MUST be a single page with exactly one top-level heading, "Academics" (not from a document, so marked pending client approval as in FR-010), and these sections in order, each with a second-level heading and a stable anchor: Academic Overview (`academic-overview`), Teachers' Training (`teachers-training`), Hifz-e-Quran (`hifz-e-quran`).
- **FR-002**: The Academics dropdown (desktop), the Academics group (mobile menu) and site search MUST list exactly these three entries in this order. They MUST come from the same single definition as the page's sections.
- **FR-003**: Syllabi and Examination MUST be removed from the menu, search and page. Their old addresses MUST redirect to /academics. Restoring them later means adding a section component and its `pageSections` entry. The existing sections are not redesigned, and sections stay fixed layout (Constitution VIII).
- **FR-004**: No menu entry, on-site link or test may point at a removed Academics anchor (`syllabi`, `examinations`, `academics-overview`). Known references to update: the site-search E2E test, which looks up "syllabi" → `/academics#syllabi`, and the page-sections E2E tests, which list the old anchors and click to `#examinations`. No content link elsewhere points at a removed anchor: the home page's Education Curriculum card links to `/academics`, which stays valid.
- **FR-005**: Old Academics addresses MUST permanently redirect as in the US3 table. Other `/academics/...` addresses MUST give the not-found page.
- **FR-006**: Every section MUST be offset by the shared scroll-margin-top token, so its heading is fully visible below the fixed header at all four widths when reached by anchor.

### Text

- **FR-007**: All displayed text MUST be the sources' English wording exactly, as listed under Source Content: no rewording, shortening, summarising or "improving". Paragraph breaks, headings, list items and their order MUST be kept. Only client-approved fixes and the owner-requested T1 addition may differ.
- **FR-008**: No Urdu text may appear on the page or be stored in the Academics content. What was left out is listed under Source Content.
- **FR-009**: The menu label for each section MUST be the brief's label. The section heading MUST be the source's heading (T3, T4) until the client decides otherwise. Source subheadings MUST appear with their section headings in the existing heading pattern.
- **FR-010**: Text that is placeholder, translated (T1) or otherwise not yet approved MUST be marked "pending client approval" in the content source, using the project's existing convention.
- **FR-011**: The Teachers' Training content MUST record its source URL (<https://das.edu.pk/academics/teachers-training/>) and the date it was copied.

### Sections

- **FR-012 (Academic Overview)**: Two columns from tablet width up: text on one side, an image on the other. On phones they stack, text first. The image is a local placeholder until the client supplies a photo, and is replaceable through content only. No stock or random photos may be used: the 017 release check applies. Until the real photo arrives, every mode (production included) shows a neutral, non-photographic branded placeholder graphic, as 017's Our Story does, so the two-column layout is kept. This graphic is not a "placeholder photo" in the sense of SC-005.
- **FR-013 (Teachers' Training text and video)**: The intro paragraph and the 19-item bulleted list, then (when a URL is set) a YouTube video in the shared click-to-load video block. With no URL, the video block MUST NOT render. Layout: from tablet width up, the text and list take one column and the photo collage (FR-014) the other. The video runs full width below both. On phones the order is text → photos → video. When the photo block is absent, the text column spans the row, and its line length stays capped (FR-026).
- **FR-014 (Teachers' Training photos)**: 2–3 photos from `public/images/academics/teachers-training/`, presented in an overlapping or staggered collage within the existing theme. It MUST work with both 2 and 3 photos. Each photo MUST have owner-supplied alt text. In development with no photos, clearly labelled placeholder tiles appear. In production with no photos, the photo block MUST NOT exist (the same rule as 017's management team).
- **FR-015 (Hifz-e-Quran)**: The heading, subheadings and text as listed, then (when a URL is set) one video in a 16:9 frame from an Instagram URL, using the same click-to-load video block. With no URL, the video block MUST NOT render. The poster is a local placeholder until the client supplies one.

### Video block (shared)

- **FR-016**: There MUST be one click-to-load video block, used by the home page's Why Choose section and both Academics videos. It supports YouTube and Instagram sources. A second video component MUST NOT be built. Switching an entry's provider MUST be a content change only.
- **FR-017**: Before the visitor clicks, the block MUST show a local poster image and a labelled, keyboard-operable play button. It MUST NOT make any request to YouTube, Instagram or their content or script hosts. That includes Instagram's embed script and YouTube's thumbnail host: on Academics, the poster is the entry's local poster, or a local placeholder when none is set.
- **FR-018**: After the click, the provider's player MUST load in the same 16:9 frame. The privacy-enhanced YouTube player MUST be used for YouTube. Nothing plays on page load. Playback starts only in response to the visitor's click.
- **FR-019**: The home page's existing Why Choose video MUST keep working as it does today (same appearance and click-to-load behaviour) after the block is extended.

### Content source and future editing

- **FR-020**: Each section's content MUST live in a typed content source under `src/content/academics/`, shaped exactly as the Academics tab in Settings (014-page-content) will edit it. 014 can then switch the source to the database without changing how the sections are displayed.
- **FR-021**: Every video entry MUST use one shape: provider (`youtube` or `instagram`), URL, optional poster image and title. The title is used as the player's accessible name.
- **FR-022**: Adding, removing or replacing photos, videos, posters or the overview image MUST be a content change only.

### Design

- **FR-023**: Existing theme colours and fonts only. No new colours or fonts. Any new size or spacing values (for example the collage offsets) MUST be added as design tokens, not hard-coded.
- **FR-024**: Section headings MUST use the existing section-heading component and its existing variants.
- **FR-025**: Neighbouring sections MUST alternate backgrounds using existing tokens.
- **FR-026**: At 375, 768, 1024 and 1440 px: no horizontal scroll, clean stacking, readable line lengths, and videos that keep 16:9.
- **FR-027**: The page MUST pass an automated accessibility (axe) scan with no violations.

### Key Entities

- **Academics section**: an id (anchor), a menu label, a heading, an optional subheading, and the body (paragraphs, sub-sections and/or a list). Optionally it has an approval note.
- **Video entry**: provider (YouTube or Instagram), URL, optional local poster and title. When the URL is absent the block is hidden.
- **Training photo**: a local image path, alt text, width and height. Its order is its position in the list. 0–3 per section, with 2–3 expected.
- **Overview image**: a local image path, alt text, width and height. A placeholder until supplied.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: /academics shows exactly 3 sections in the stated order. All 3 menu entries (desktop and mobile) land on their section with the heading fully visible, at all 4 widths.
- **SC-002**: 100% of displayed text matches the English sources word for word, apart from approved fixes and the marked T1 addition. 0 Urdu characters appear on the page.
- **SC-003**: All 5 old addresses in the US3 table redirect permanently to their stated destinations.
- **SC-004**: 0 requests go to YouTube or Instagram hosts before a visitor clicks play. Each video loads within one click and keeps a 16:9 frame at all 4 widths.
- **SC-005**: With no video URL set, 0 video blocks render. With no photos, a production build shows 0 photo blocks and 0 placeholder images or labels.
- **SC-006**: 0 accessibility violations in the automated scan of /academics.
- **SC-007**: 0 horizontal-scroll cases at 375, 768, 1024 and 1440 px.
- **SC-008**: The home page's Why Choose video behaves the same as before the change.

## Assumptions

- The click-to-load block keeps its existing behaviour: the player starts playing once loaded after the visitor's click. "No autoplay" means nothing plays on page load.
- The home page's Why Choose video may keep YouTube's own thumbnail as its poster (current behaviour). The no-third-party-before-click rule is enforced on /academics, which always uses a local poster or a local placeholder.
- Instagram posts and reels are embedded through Instagram's own embed page, loaded only after the click.
- The Teachers' Training heading uses the site's existing label, "Teachers' Training", which matches the reference page's heading.
- The video URLs, photos, alt text and poster are requested from the owner during implementation, when each section is reached, as the brief asks.

## Dependencies

- Navigation sections conversion (single section definition drives the menu, search and redirects).
- 017-about patterns: typed content files, placeholder-in-development / hidden-in-production, the release check that blocks stock photos in a production build.
- 014-page-content will later make this content editable. Out of scope here.

## Out of Scope

- Syllabi and Examination sections (later feature).
- Tilawat reels strip (dropped).
- Admin editing of Academics content (014-page-content).
- Changing the home page Why Choose video's poster source.

## Open Questions for the Client

1. Teachers' Training video URL.
2. 2–3 training photos, with a short description of each for alt text.
3. Hifz-e-Quran video URL, and a poster image for it.
4. Academic Overview photo.
5. Approval of findings T1–T7 (including the translated T1 sentence), and of the page title "Academics".
