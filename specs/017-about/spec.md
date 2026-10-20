# Feature Specification: About Page — Five Anchored Sections from the Client's Documents

**Feature Branch**: `017-about`
**Created**: 2026-10-09
**Status**: Draft
**Input**: User description: "Feature Brief — 017-about. Build the public About page at /about as one page with five anchored sections, using the client's own text from the supplied Word documents." (full brief recorded in `history/prompts/017-about/0001-specify-about-page.spec.prompt.md`)

**References**: Navigation sections conversion (public-layout-redesign: one page per menu entry, sections reached by anchor, old sub-routes redirected) · 005-settings (public media upload pattern) · 006-home-page (section heading patterns, alternating section backgrounds) · Feeds 014-page-content (About tab in Settings)

## Source Content Findings

The brief names four files in `docs/content-source/about/`. That folder does not exist. The client's text is in `das-text/` (committed), one Word file per brochure page. The matching files are:

| Section | Brief's file name | Actual file | Contents |
|---|---|---|---|
| Our Story | our-story.docx | `das-text/ourstory.docx` (was `Page 4.docx`) | English heading, subheading, 3 paragraphs; Urdu heading, subheading, 3 paragraphs |
| Vision & Mission | vision-mission.docx | `das-text/vision&mission.docx` (was `page 2.docx`) | English heading, subheading, Vision (tagline + 1 paragraph), Mission (1 paragraph); Urdu Vision (heading, an Arabic Qur'anic phrase, 1 paragraph), Urdu Mission (heading, 1 paragraph) |
| Core Values | core-values.docx | `das-text/corevalues.docx` (was `Page 3.docx`) | English heading, subheading, intro, **6 values** each with a one-line description; the same in Urdu |
| Messages | messages.docx | `das-text/messaes.docx` (was `Page 1.docx`) | An unattributed "Welcome Note" (2 paragraphs), then **3 messages**: Khairullah Aziz (Director – Academic & Training), Ijaz Afzal (Director Administration & Finance), Faiza Zeeshan (Principal). English only. |

The owner renamed the files on 2026-10-09; the contents are identical (same git blobs). This spec still calls them by their brochure page numbers ("Page 1" to "Page 4"). `Why Metroville Campus.docx` (was Page 5, already on the home page), `Academic Excellence .docx` (was Page 6) and `HIFZ-UL-QURAN.docx` (was Page 6 A) belong to other pages and are not used here.

None of the four files contains images, tables or Word list formatting. Headings are plain bold paragraphs. The only true heading style is on Page 1's closing tagline.

**Items that do not fit their section** (not shown on the page unless the client says otherwise):

1. Each file ends with a brochure tagline that is not part of the section text: "Where Intelligence Meets Character" (Page 1), "Excellence Rooted in Values" (page 2), "Creating Thinkers with Integrity" (Page 3), "Knowledge That Inspires" (Page 4).
2. Page 1 begins with "(Page No 1)", a brochure page marker.
3. Page 1's "Welcome Note" has no name, designation or photo, so it does not fit the message shape. It is left out (see Clarifications).
4. The Urdu Vision line "فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً" is Arabic (Qur'an 2:201), not Urdu. It is stored marked as Arabic. It is not displayed in this feature.
5. Some English and Urdu versions say different things. They are not translations of each other. For example, the English Respect value says "faith, family, teachers, and society" while the Urdu says "Allah, parents, teachers and society". The English Vision tagline is "Excellence in this World and the Hereafter" while the Urdu has the Qur'anic phrase. These are reported, not changed.

**Possible typos and inconsistencies for client approval** (left exactly as written until approved):

| # | File | As written | Possible fix |
|---|---|---|---|
| T1 | Page 1 | "Director – Academic & Training" vs "Director Administration & Finance" | Use the same pattern for both, e.g. "Director – Administration & Finance" |
| T2 | Page 1 | Ijaz Afzal's name and designation are on one line, split only by a manual line break | Shown as separate name and designation (structure only, wording unchanged) |
| T3 | Page 3 (Urdu) | "ذمہ داری" followed by a stray tab | Trailing whitespace removed (not a wording change) |
| T4 | Pages 3 and 4 (Urdu) | "طلبا" (Page 3) vs "طلبہ" (Pages 2, 4) | Use one spelling throughout |
| T5 | Page 4 (Urdu) | "سائٹ ٹاون" | "سائٹ ٹاؤن" (usual spelling of "Town") |
| T6 | Pages 2 and 3 | Document headings are "Our Vision & Mission" and "Our Core Values"; the brief's menu labels are "Vision & Mission" and "Core Values" | Menu uses the brief's labels and section headings use the document's wording (see FR-005) |

T2 and T3 are formatting only and are applied. T1, T4 and T5 change wording and wait for client approval.

## Deviation from the Reference Site (Constitution I)

das.edu.pk's About is four sub-pages: `/about/overview/` (1 h1, 7 h2, 8 paragraphs), `/about/salent-features/`, `/about/management/` (a directory-style listing) and messages (research/design-tokens.md, "Page structure"). This feature deliberately does not reproduce them:

- **Sections**: replaced by the client's five sections (Our Story, Vision & Mission, Core Values, Our Management Team, Messages), as directed by the owner's brief.
- **Content**: the client's own documents, not the reference site's text.
- **Layout**: there is no reference screenshot for any of the five sections. The layout is composed from the home page's existing patterns (SectionHeading, alternating bands, the navy band) and tokens. New values are added as About tokens first (see research/design-tokens.md "About page (017 about — no matching reference page)").
- **Breakpoints**: there is no reference layout to check at the reference site's own breakpoints, so that part of Constitution XI does not apply to the section bodies. The shared header and menu are unchanged and keep their existing tests. The page is checked at 375, 768, 1024 and 1440 px.

Approved by: owner (brief 017-about, 2026-10-09).

## Clarifications

### Session 2026-10-09

- Q: Where are the source documents? → A (assumed from the file contents, not asked): In `das-text/` under brochure page names (see the table above). During implementation, copies are placed in `docs/content-source/about/` under the brief's file names, so the brief and the repository agree. The originals stay where they are.
- Q: How should the Urdu versions be shown? → A: English only for now (owner, 2026-10-09). The Urdu text (and the Arabic Qur'anic phrase) is stored in the content source, correctly marked for language and direction, but is not displayed. Showing it later is a content and display decision for a future change.
- Q: Where does Page 1's unattributed "Welcome Note" go? → A: Left out (owner, 2026-10-09). It is not shown and not stored in the About content. It is reported for the client to place later.
- Q: When should "Read more" collapse a message? → A: Don't apply it (owner, 2026-10-09). Every message is shown in full, with no toggle. This **removes the brief's Read more requirement**, along with its acceptance check and its E2E test.

### Session 2026-10-10 (from /sp.analyze)

- Q: What happens when there are no messages? → A: The same rule as the management team (owner, 2026-10-10). An empty Messages section is hidden, and its entry is removed from the About dropdown, mobile menu and search. Unlike the team, there are no placeholders in development.
- Q: How is SC-008 checked? → A: The owner approves adding `@axe-core/playwright` as a dev dependency (2026-10-10). An automated accessibility scan of /about runs in the E2E specs.

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visitor reads who the school is (Priority: P1)

A parent opens /about. Below one page title they see, in order: Our Story, Vision & Mission, Core Values, Our Management Team (only when there are real members) and Messages. The text is the school's own English wording from its brochure (see FR-020). Each section is visually distinct from its neighbours. The page reads well on a phone, a tablet and a desktop.

**Why this priority**: This is the reason the page exists. Without the client's text on the page, the rest of the feature has nothing to show.

**Independent Test**: Open /about and compare each section's text with the source documents, word for word.

**Acceptance Scenarios**:

1. **Given** a visitor on /about, **When** the page loads, **Then** there is exactly one top-level page heading and the sections appear in this order: Our Story, Vision & Mission, Core Values, (Our Management Team), Messages. Each section has its own second-level heading.
2. **Given** the source documents, **When** each section's text is compared with its document, **Then** the wording, paragraph breaks and order match exactly. The only differences are fixes the client has approved and the reported formatting-only cleanups (T2, T3).
3. **Given** the page, **When** it is viewed, **Then** no Urdu text, Welcome Note, brochure tagline or page marker appears.
4. **Given** the Vision & Mission section, **When** it is viewed on a desktop, **Then** Vision and Mission are two clearly separate side-by-side panels, each with a decorative icon, using only the site's existing navy and yellow colours. It is the most visually prominent section on the page. **When** viewed on a phone, **Then** the panels stack into one column.
5. **Given** the Core Values section, **When** it is viewed, **Then** all 6 values appear as tiles with a decorative icon, the value name and its one-line description, in 1 column on phones, 2 on tablets and 3 on desktops.
6. **Given** the Our Story section on a desktop, **When** it is viewed, **Then** the text sits in a column of comfortable reading width with a replaceable supporting image beside it. On a phone, the image sits above or below the text, never squeezed beside it.

---

### User Story 2 - Visitor jumps to a section from the menu (Priority: P1)

A visitor opens the About dropdown in the header (or the About group in the mobile menu) and picks "Core Values". They land on /about with the Core Values heading fully visible below the fixed header.

**Why this priority**: The site's navigation has already moved to anchored sections. The About menu must point at the new sections, otherwise its links land on headings that no longer exist.

**Independent Test**: From any page, choose each About menu entry on desktop and on mobile, and confirm the right heading is visible and not covered by the header.

**Acceptance Scenarios**:

1. **Given** any page, **When** the visitor opens the About dropdown, **Then** it lists Our Story, Vision & Mission, Core Values, Our Management Team, Messages in that order. Our Management Team is listed only when the section is shown. Careers is not in this dropdown.
2. **Given** the visitor chooses an About entry (desktop dropdown or mobile menu), **When** /about loads or scrolls, **Then** the matching section's heading is in view and not hidden under the fixed header.
3. **Given** a visitor opens /about#messages directly, **When** the page loads, **Then** the Messages heading is in view and not hidden under the header.

---

### User Story 3 - Old About links still work (Priority: P2)

Someone follows an old bookmark or search result such as /about/overview. They are permanently redirected to the nearest new section of /about.

**Why this priority**: It protects existing links and search rankings. It matters less than the page itself.

**Independent Test**: Request each old About URL and check the permanent redirect target.

**Acceptance Scenarios**:

1. **Given** each old About URL in the mapping below, **When** it is requested, **Then** the response is a permanent redirect to the stated target.

   | Old URL | New target | Reason |
   |---|---|---|
   | /about/overview | /about#our-story | The overview of the school is its story |
   | /about/salient-features | /about | No new section matches. Salient features (Hifz, training, sports) belong to Academics and the home page |
   | /about/management | /about#management-team | Same content |
   | /about/messages | /about#messages | Same content |

2. **Given** /about/anything-else, **When** it is requested, **Then** the visitor gets the site's normal not-found page, as before.
3. **Given** the home page's "Salient Features" quick-access card currently links to /about#salient-features, **When** this feature ships, **Then** that link points to /about, so no on-site link targets an anchor that no longer exists.

---

### User Story 4 - Visitor reads a leader's message (Priority: P2)

A parent scrolls to Messages and sees each leader's photo (or a neutral placeholder), name, designation and full message.

**Why this priority**: The messages are the leaders' personal voice. They matter less than the story, vision and values.

**Independent Test**: Open /about#messages and compare the three messages with Page 1, and check that the photo side alternates on desktop.

**Acceptance Scenarios**:

1. **Given** the Messages section, **When** it is viewed, **Then** each of the 3 messages shows a photo or neutral placeholder, the name, the designation and the full message text, in the document's order. There is no Read more toggle.
2. **Given** more than one message on a desktop, **When** they are viewed, **Then** the photo alternates sides (left, right, left). On phones the photo always sits above the text.
3. **Given** a message has no photo yet, **When** it is shown, **Then** the shared neutral silhouette placeholder is used in the same frame size and shape a real photo would have.

---

### User Story 5 - Management team appears only with real data (Priority: P3)

While the client has not supplied the team, a developer sees clearly labelled placeholder cards ("Name", "Designation", "Short description", silhouette image) so the layout can be reviewed. The live site shows no team section and no team menu entry until real members exist. Once members are added, the section and its menu entry appear without any code change.

**Why this priority**: The data does not exist yet. The rule that matters is the guarantee that placeholders never reach the live site.

**Independent Test**: Build the site the way it is built for the live site, with no members, and confirm /about has no team section and the About dropdown has no team entry. Run it in development and confirm placeholder cards appear and are marked as placeholders. Add one sample member to the content and confirm the section and menu entry appear in both modes.

**Acceptance Scenarios**:

1. **Given** no members and a live (production) build, **When** /about and the About menu are viewed, **Then** neither the Our Management Team section nor its menu entry exists, and no placeholder text or silhouette appears anywhere on the site.
2. **Given** no members in local development, **When** /about is viewed, **Then** placeholder cards appear. Each is visibly labelled as a placeholder and uses "Name", "Designation", "Short description" and the silhouette image. No real or invented names, roles or photos appear.
3. **Given** one or more real members in the content, **When** /about is viewed in any mode, **Then** the section and its menu entry appear, showing only the real members in their stated order.
4. **Given** member photos of different original sizes, **When** they are shown, **Then** every photo appears in the same fixed-ratio, rounded frame, cropped consistently and never stretched.

---

### Edge Cases

- **Management team hidden but /about#management-team requested** (old redirect or shared link): the page opens at the top, with no error and no broken layout.
- **No messages** (future editing, 014): the Messages section is hidden and its entry is removed from the About dropdown, mobile menu and search, the same rule as an empty team. There are no development placeholders for messages.
- **Only one message**: no alternation. The photo sits on the default side.
- **A much longer message added later** (via 014): shown in full. Collapsing long messages would be a future change.
- **Very long word or name** at 375 px: wraps inside its card with no sideways scroll.
- **Missing or failed image**: the frame keeps its size and the placeholder (or the empty frame's background) shows. The layout does not jump.
- **Number of core values changes later** (via 014): the grid stays balanced. A number of values that divides by 3 uses 3 columns on desktop; any other number uses 4. A single trailing tile is never stretched across the full width.
- **Section content empty in future editing** (014): a section with no text at all is not shown and its menu entry is removed. In this feature the management team and Messages do this; the rule is stated so 014 can rely on it for the other sections.
- **Urdu name in a team member or message** (supplied later): it is shown marked as Urdu and right-to-left within its card, without breaking the card layout.

## Requirements *(mandatory)*

### Functional Requirements

**Page and navigation**

- **FR-001**: /about MUST be a single page with exactly one top-level heading and these sections in this order, each with its own second-level heading and stable anchor: Our Story (`our-story`), Vision & Mission (`vision-mission`), Core Values (`core-values`), Our Management Team (`management-team`), Messages (`messages`).
- **FR-002**: The About dropdown (desktop) and the About group (mobile menu) MUST list the same sections, in the same order, with the labels above, and MUST come from the same single definition as the page's sections. Careers MUST NOT be in it.
- **FR-003**: The previous About sections (Overview, Salient Features, Management, Messages) MUST be replaced. No section, menu entry or on-site link may refer to an About anchor that no longer exists (this includes the home page's Salient Features card, US3-3).
- **FR-004**: Old About URLs MUST permanently redirect as in the US3 mapping table. Other /about/... paths MUST still give the not-found page.
- **FR-005**: The menu label for each section MUST be the brief's label. The section's heading text MUST be the document's own heading (for example "Our Vision & Mission", "Our Core Values", "Our Story") until the client says otherwise (T6). Each document's subheading (for example "Building a Legacy of Excellence Since 2021") MUST be shown with its section heading in the home page's existing heading pattern.
- **FR-006**: Every section MUST be offset so that, when reached by anchor, its heading is fully visible below the fixed header at all four widths.

**Content fidelity**

- **FR-007**: All text MUST be the documents' wording exactly: no rewording, shortening, summarising or "improving". Paragraph breaks and order MUST be kept. Only client-approved fixes and the formatting-only cleanups T2 and T3 may differ.
- **FR-008**: Urdu text in the content source MUST record its language (Urdu); the Qur'anic phrase MUST be recorded as Arabic. Direction is derived from the language (both right-to-left) and is not stored separately. Any Urdu or Arabic text that is displayed MUST carry that language and direction.
- **FR-009**: The brochure taglines and the "(Page No 1)" marker MUST NOT appear on the page (Findings 1 and 2), unless the client asks for them.
- **FR-010**: Text that is placeholder, or that differs from the document because of an unapproved change, MUST be marked "pending client approval" in the content source. The project's existing convention for this marking is used.

**Sections**

- **FR-011 (Our Story)**: The story text MUST sit in a column of comfortable reading width (about 60–75 characters per line on desktop). A supporting image MAY sit beside it on desktop. It uses an existing site placeholder image, is replaceable without a code change, and stacks with the text on smaller screens.
- **FR-012 (Vision & Mission)**: Vision and Mission MUST be two distinct panels, side by side from tablet width (768 px) up and stacked on phones. Each panel has a decorative icon, its heading, the document's tagline (Vision only) and its text. This section MUST be the visual highlight of the page, using only the existing navy and yellow colour tokens and existing fonts.
- **FR-013 (Core Values)**: Each value MUST be a tile with a decorative icon chosen to fit the value, the value name and its description. The grid MUST be 1 column on phones and 2 on tablets. On desktop it MUST be 3 columns when the number of values divides by 3, and 4 columns otherwise. The current content has 6 values, so desktop shows 3 columns in 2 rows. The intro paragraph MUST appear above the tiles.
- **FR-014 (Management Team)**: Each member card MUST show a photo in a fixed-ratio, rounded, consistently cropped frame, then the name, designation and short description. Members MUST appear in their stated order.
- **FR-015 (Team visibility)**: With zero members, the section and its menu entry MUST NOT exist in any production build. In local development only, clearly labelled placeholder cards MUST appear ("Name", "Designation", "Short description", neutral silhouette). No invented names, roles or descriptions and no photos of real people may appear anywhere.
- **FR-016 (Messages)**: Each message MUST show a photo (see FR-019), name, designation and message text, in the document's order. On desktop, the photo side MUST alternate between consecutive messages.
- **FR-016a (Messages visibility)**: With zero messages, the Messages section and its menu and search entries MUST NOT exist, in every mode. No message placeholders are shown.
- **FR-017 (Full messages)**: Every message MUST be shown in full, with no Read more or collapse toggle (owner's decision; this replaces the brief's Read more requirement).
- **FR-018**: The message text MUST keep the document's quotation marks as written.
- **FR-019 (Photos)**: All member and message photos MUST be replaceable through content only. They come from the site's public media store when supplied, and the neutral silhouette is used until then. Our Story's supporting image is replaceable the same way. Team and message photos share one frame and one neutral silhouette placeholder.

**Language and Welcome Note**

- **FR-020 (Urdu versions)**: The page MUST show English only. The Urdu versions of Our Story, Vision & Mission and Core Values MUST be stored word for word in each section's content source, with their language marked, but MUST NOT be displayed.
- **FR-021 (Welcome Note)**: Page 1's Welcome Note MUST NOT be shown or stored in the About content. It is listed in the report for the client.

**Content source and future editing**

- **FR-022**: Each section's content MUST live in its own typed content source under `src/content/about/`, one shape per section. The shapes MUST be exactly what the About tab in Settings (014-page-content) will edit, so 014 can switch the source to the database without changing how the sections are displayed.
- **FR-023**: Adding, removing or reordering members, messages or values MUST be a content change only, never a display change.

**Design and layout**

- **FR-024**: Existing theme colours and fonts only. No new colours or fonts.
- **FR-025**: Section headings MUST use the home page's existing section-heading pattern and variants.
- **FR-026**: Neighbouring sections MUST have alternating backgrounds from existing tokens, so each section is visually distinct.
- **FR-027**: At 375, 768, 1024 and 1440 px wide, there MUST be no sideways scrolling, every grid and panel MUST stack cleanly, and body text line length MUST stay readable.
- **FR-028**: All icons MUST be decorative and hidden from assistive technology. Photos MUST have meaningful alternative text (the person's name). Placeholder silhouettes MUST have empty alternative text.

### Key Entities *(content shapes, mirrored by 014's About tab)*

- **About page content**: the page heading plus the five sections below. Each section's content carries its heading and subheading. Anchor ids and menu labels are fixed page layout, not content (Constitution VIII). Each content source also records an approval status ("approved" or "pending client approval") alongside the content, not inside it, so it is never part of what an editor changes.
- **Our Story**: heading, subheading, ordered English paragraphs, optional Urdu block (heading, subheading, paragraphs), optional supporting image (source, alternative text).
- **Vision & Mission**: heading, subheading. A Vision panel (heading, tagline, text) and a Mission panel (heading, text), each with an optional Urdu counterpart. The Urdu Vision line is marked as Arabic.
- **Core Value**: name, description, icon key (from a fixed list of allowed icons, so the database can store it), optional Urdu name and description. The section adds an intro paragraph and optional Urdu intro.
- **Team Member**: name, designation, short description, photo (optional; silhouette when absent), display order. The list may be empty.
- **Message**: name, designation, message text (ordered paragraphs), photo (optional; silhouette when absent), display order. The list may be empty (the section is then hidden).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 100% of the shown text matches the source documents word for word, except client-approved fixes and the formatting-only cleanups T2 and T3. Checked by an automated comparison against the extracted document text.
- **SC-002**: Each About menu entry (5, fewer when the team or Messages is hidden) lands on its section with the heading fully visible, on desktop and on mobile.
- **SC-003**: All 4 old About URLs return a permanent redirect to their mapped target. No on-site link points to a missing About anchor.
- **SC-004**: At 375, 768, 1024 and 1440 px, the page has zero sideways scroll and the section order is unchanged.
- **SC-005**: 100% of each message's text is visible on first load, with no interaction and with scripts disabled.
- **SC-006**: A production build with no team members shows zero placeholder text or images on any page.
- **SC-007**: A content editor can add a team member, change a message photo or reorder values by editing content only, with no change to how sections are displayed.
- **SC-008**: An automated accessibility scan of /about (axe, WCAG 2 A and AA rules) reports no serious or critical violations, both with the development placeholders shown and with the production rule applied.

## Assumptions

- `das-text/ourstory.docx`, `vision&mission.docx`, `corevalues.docx` and `messaes.docx` (renamed from Page 4, 2, 3, 1) are the brief's our-story, vision-mission, core-values and messages documents.
- "Production" means any deployed build (live and preview deployments). Placeholder team cards appear only when running locally in development.
- The neutral silhouette and Our Story's placeholder come from images already in the project, or from a generic, non-photographic silhouette. Never a photo of a real person.
- Icons come from the icon set the site already uses.
- The page heading (h1) is "About Us". It is not in the documents, so it is marked pending client approval.
- Pending-approval marking follows the existing convention in `src/content/home.ts` (a "PENDING CLIENT APPROVAL" comment), plus a status field on each section so 014 can show it.

## Dependencies

- Navigation sections conversion (public-layout-redesign): single definition of page sections, menu anchors, redirects, the scroll-offset token.
- 005-settings: public media pattern used later for team and message photos.
- 006-home-page: section heading component, alternating section background tokens, the Salient Features quick-access card whose link changes.
- 014-page-content: consumes the content shapes defined here.

## Out of Scope

- Admin editing of About content (014-page-content).
- Real management team data (supplied later by the client).
- Academics and Admission pages, including Page 6 / Page 6 A content.
- Applying any wording fix the client has not approved.
- Displaying the Urdu versions (stored only).
- A Read more / collapse toggle for messages (removed by the owner, 2026-10-09).
- Page 1's Welcome Note.

## Open Questions for the Client

1. Management team: who is listed, their designations, photos and short descriptions.
2. Photos of Khairullah Aziz, Ijaz Afzal and Faiza Zeeshan for Messages.
3. Approval of fixes T1, T4 and T5, and of the heading wording in T6.
4. A photo for Our Story, if wanted.
5. Whether the brochure taglines (Finding 1) should appear anywhere on the site.
6. Whether the English and Urdu differences (Finding 5) are intended.
7. The page's main heading ("About Us").
8. Where, if anywhere, the Welcome Note from Page 1 should appear.
9. Whether and when the Urdu versions should be shown on the site.
