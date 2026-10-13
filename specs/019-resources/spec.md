# Feature Specification: Resources Page

**Feature Branch**: `019-resources`
**Created**: 2026-10-12
**Status**: Draft
**Input**: Feature brief "019-resources" (owner, 2026-10-12). Depends on the navigation sections conversion, 007-gallery-albums and the 017/018 patterns (typed content files, release check, hidden-when-empty). Feeds into 014-page-content (Resources tab in Settings).

## Pre-build Findings

The brief asked for these checks before anything is built. All were run on 2026-10-12.

### Current /resources page

| Check | Result |
|---|---|
| Sections on the page today | Two: Photo Gallery (`#photo-gallery`, from 007) and a Mobile Apps placeholder (`#mobile-apps`) with "Our mobile apps are coming soon." and a link to the LMS App placeholder page. |
| Downloads and Our Books sections | **Never built.** Feature 016 planned them, but they exist only as code comments on the Resources page and the gallery section. Nothing to remove except those comments. |
| Links to `#downloads` or `#our-books` | **None** anywhere in the site, its content or its tests. The home quick-access cards now point to `/admission#admission-procedure`, `/about`, `/contact` and `/academics`, so they no longer use either anchor. No repointing is needed. |
| Old address `/resources/our-books` | Already redirects permanently to `/resources`, which stays valid. Kept as is. |
| Other sections (for example a careers call-to-action) | None. |
| Settings → Books and the home books strip | Not touched (FR-004). |

### Reference page

Source: <https://das.edu.pk/resources/scarlet-mobile-apps/>. Reached on 2026-10-12 (HTTP 200). The page was last modified 2022-06-06.

**Heading (verbatim)**: "Scarlet Series Mobile Applications"

**Body (verbatim, one paragraph)**: "Scarlet series applications are interactive educational game applications to cover the subject areas of Mathematics, Knowledge and Understanding of the World, Urdu and English concepts to establish a foundation of knowledge for our children. These applications feature multiple interactive and fun learning games, each designed to teach a specific concept. The content specifically chosen for ECE children helps to develop their literacy and numeracy skills and encourages their curiosity. All of the games include voiced instructions, so our young children will find it easy to learn and play for making something in the real rather than the virtual world. Kindly click on the following links to download the three Applications."

**Photo**: "Scarlet Series for Playgroup" (alt and title on the reference), 744 × 1280 JPEG, 174 KB, at `https://das.edu.pk/wp-content/uploads/2019/11/WhatsApp-Image-2019-11-13-at-10.16.16-AM.jpeg`. It is reachable and will be downloaded once into `public/images/resources/`.

**Per-app labels**: The reference has none. Each app is shown only as a download-button image ("English App Download", "Math App Download", "Urdu App Download"). The cards therefore show the name only (FR-013).

### Download links

| App | Reference link | Works? | File type | Store listing |
|---|---|---|---|---|
| Scarlet English | `https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing` | **Yes** (HTTP 200) | Android APK, "Dar-e-Arqam Scarlet Series English Android App.apk". It installs from outside the Play Store, and Android shows a security warning. | None found on Google Play or the App Store |
| Scarlet Math | `https://drive.google.com/file/d/1z1_05GubJarRVNP-8fno7Az_AVIiDPyi/view?usp=sharing` | **No**, the file is gone (Drive returns 404 for both the view page and the download) | Unknown (presumably an APK, like English) | None found |
| Scarlet Urdu | `https://drive.google.com/file/d/1wFRsPmd0EAdPG4E5DWsKZ27JsVQhptlo/view?usp=sharing` | **No**, the file is gone (404, as above) | Unknown | None found |
| LMS App | `https://play.google.com/store/apps/details?id=com.darearqam.daslms` (the reference header's "LMS App" link) | **No**, Google Play returns 404, so the listing is removed or unpublished | Play Store listing | None found under another name |

**Result**: Only Scarlet English has a working download. Under the brief's rule, the Math, Urdu and LMS cards are kept with no download button and are marked for the client. No store links are invented.

### Portal links on the reference header

These are recorded for client review only. Our site's portal links are not changed (FR-022).

| Label | Reference URL | Status on 2026-10-12 |
|---|---|---|
| DAS Portal | `http://www.dais.edu.pk/` | Plain HTTP. **Domain does not resolve** (the domain is "dais", not "das"). |
| ePortal | `http://eportal.das.edu.locumset.com/` | Plain HTTP, on a third-party domain. **Domain does not resolve.** |
| Student Login | `http://203.170.66.35/pp` | A bare IP address over plain HTTP, so browsers mark it "Not secure". **Connection timed out.** |
| Mail Login | `https://accounts.google.com/signin/v2/identifier?continue=https%3A%2F%2Fadmin.google.com%2Fmail%2F&hd=das.edu.pk` | Google sign-in for the das.edu.pk domain (head office). |
| LMS App | `https://play.google.com/store/apps/details?id=com.darearqam.daslms` | **Play Store 404** (see above). |
| Alumni Registration | `https://forms.gle/6YDN9wrGiwWgkx3z8` | Works. It opens a Google Form. |

### Findings for client approval

Nothing below is changed silently.

| # | Where | Finding | Default until decided |
|---|---|---|---|
| R1 | Body text | Its last sentence, "Kindly click on the following links to download the three Applications.", no longer holds: only one of the three links works. | Kept verbatim, as the brief requires. Reported. |
| R2 | Body text | "…easy to learn and play for making something in the real rather than the virtual world" reads as an incomplete or garbled phrase. "Applications" is capitalised mid-sentence. | Kept verbatim. Any fix needs client approval (Open Question 4). |
| R3 | App names | The reference uses "Math" on its button image, but the body says "Mathematics". The Drive file name uses "Scarlet Series English". | Card names are "Scarlet English", "Scarlet Math", "Scarlet Urdu" and "LMS App", pending client confirmation. |
| R4 | Math, Urdu, LMS | Their links are dead (see Download links). | The cards are kept with no download button and show the muted note "Not available at the moment", which is pending client approval (FR-016). The client is asked to supply working links before launch. |
| R7 | Scarlet Series photo | The photo is a flyer that advertises "Beginning from New Session 2020-21" and shows the head office web address. It may be out of date for the campus. Its reference alt text, "Scarlet Series for Playgroup", doesn't convey the flyer's text. | Shown whole, with alt text that transcribes the flyer, pending client approval. |
| R6 | Dead-link cards | The note "Not available at the moment" is new wording, not from the reference. | Shown. Pending client approval. |
| R5 | Text scope | The text describes the network-wide Scarlet Series, not the Metroville Campus specifically. | Kept. Reported. |

### Deviation from the Reference Site

Constitution I requires this note. The reference has a separate Scarlet Mobile Apps page with a photo and three download-button images. This feature intentionally differs, as the owner's brief directs:

- Mobile Apps is an anchored section of the single /resources page.
- It uses a new card layout with text buttons drawn in the site's style. The reference's button images are not reused.
- It adds a fourth card, the LMS App, taken from the reference's portal links.
- The reference's Downloads, Our Books, Prospectus, Monthly Arqam, Newsletters and Useful Links pages are not part of this site's Resources page.
- **Design tokens (Constitution I/VII)**: The reference page has no layout values for this section. The two new tokens, `--size-resources-flyer-max-h` (36rem) and `--spacing-resources-card-lift` (4px), are composed values, not extracted from the reference. They are recorded in `research/design-tokens.md` under "Resources page (019)". If the client supplies a design, its values replace these.
- **Definition of Done (Constitution XI)**: US4 delivers a document, not a page. It is verified by a unit test of the document's coverage (all 6 portal URLs, all 4 app links, findings R1–R7) and by the E2E test that the site's portal links still open their placeholder pages (US4 scenario 3). There is no browser test of the document itself.

Approved by the owner on 2026-10-13.

The heading and body text follow the reference word for word (FR-010).

## Clarifications

### Session 2026-10-12

- Q: What do visitors see on a card whose download link is dead? → A: A short, muted note, "Not available at the moment", marked pending client approval, in place of the button. The dead links go on the client-review list so the client can supply working ones before launch (owner).

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Find the school's apps and download the one that works (Priority: P1)

A parent opens /resources and reaches Mobile Apps. They read the reference text next to the Scarlet Series photo, then see a card for each app. Where a working link exists they press a clearly labelled download button. It opens in a new tab and tells them beforehand that it installs from outside the Play Store. Where no working link exists, the card is shown without a button.

**Why this priority**: This is the only new content in the feature. A download that surprises the parent with a security warning, or a button that leads to a dead page, damages trust.

**Independent Test**: Open /resources#mobile-apps at 375, 768, 1024 and 1440 px. Check the heading and text against the reference, the local photo, the four cards in order, the one download button on Scarlet English (with its outside-the-Play-Store note), and no button on the other three.

**Acceptance Scenarios**:

1. **Given** /resources, **When** the Mobile Apps section is viewed, **Then** it shows the heading "Scarlet Series Mobile Applications" and the body paragraph exactly as under Pre-build Findings, with the Scarlet Series photo beside them from tablet width up. On phones they stack, text first.
2. **Given** the apps grid, **When** viewed, **Then** it shows four cards in the order Scarlet English, Scarlet Math, Scarlet Urdu, LMS App: 1 column on phones, 2 on tablets and 4 on desktop, with equal card heights within each row.
3. **Given** the Scarlet English card, **When** viewed, **Then** it shows an icon, the name, a "Download for Android" button and a short note that it installs from outside the Play Store.
4. **Given** that button, **When** inspected, **Then** its accessible name contains both the visible button text and the app name ("Download for Android: Scarlet English (opens in a new tab)"), and it opens in a new tab with `rel="noopener noreferrer"`.
5. **Given** a card whose link is dead (Math, Urdu, LMS), **When** viewed, **Then** it shows an icon, the name and the muted note "Not available at the moment", and has no download button or link.
6. **Given** the page loads, **When** network requests are inspected, **Then** no image is loaded from das.edu.pk.

---

### User Story 2 - Jump to a Resources section from the menu (Priority: P1)

A visitor opens the Resources dropdown (desktop) or the Resources group (mobile menu) and sees exactly Photo Gallery and Mobile Apps. Choosing one scrolls to that section with its heading fully visible below the fixed header.

**Why this priority**: The menu is how most visitors reach these sections.

**Independent Test**: At desktop and phone widths, open the menu, choose each entry, and check the URL hash and that the heading is visible.

**Acceptance Scenarios**:

1. **Given** the desktop header, **When** the Resources dropdown opens, **Then** it lists exactly Photo Gallery and Mobile Apps, in that order.
2. **Given** the mobile menu, **When** the Resources group opens, **Then** it lists the same two entries in the same order.
3. **Given** either entry, **When** it is chosen, **Then** the URL becomes `/resources#<anchor>` and the section heading is fully visible below the fixed header.
4. **Given** /resources, **When** it loads, **Then** it has exactly one top-level heading, and the sections appear in the order Photo Gallery, Mobile Apps, each with a second-level heading.

---

### User Story 3 - The gallery works exactly as before, in the shared section style (Priority: P2)

A visitor browses albums on /resources, opens an album and uses the viewer as before. The only visible difference is that the Photo Gallery heading and spacing now match the About and Academics sections, and its background alternates with Mobile Apps.

**Why this priority**: The gallery already works. This is a consistency change that must not break anything.

**Independent Test**: Run the existing 007 gallery E2E specs and confirm they pass. Compare the heading style and spacing with /about and /academics.

**Acceptance Scenarios**:

1. **Given** at least one album with photos, **When** /resources is viewed, **Then** the album cards, grid, caps, lazy loading, album page and viewer behave as before.
2. **Given** the Photo Gallery heading, **When** viewed, **Then** it uses the shared section-heading component and the shared section spacing, as About and Academics do.
3. **Given** no album with photos, **When** /resources is viewed, **Then** the Photo Gallery section is still hidden entirely (007 FR-031), and Mobile Apps is the first section.
4. **Given** the admin gallery screens, **When** used, **Then** they are unchanged.

---

### User Story 4 - Client reviews the reference links (Priority: P3)

The owner sends the client one document that lists every reference link and finding needing a decision: the six portal URLs with their status, the four app links with their status, and findings R1–R7.

**Why this priority**: These links belong to the head office network and may not apply to the campus. They decide what changes in a later update.

**Independent Test**: Open the client-review document and check that it lists all six portal URLs, all four app links with their status, the Student Login security note and findings R1–R7.

**Acceptance Scenarios**:

1. **Given** `docs/content-source/resources/client-review.md`, **When** opened, **Then** it lists the six portal URLs with labels and the status found, and states that Student Login is a bare IP address over plain HTTP that browsers mark "Not secure".
2. **Given** that document, **When** read, **Then** it lists each app link with whether it works, its file type, whether a store listing was found, and the exact LMS URL checked.
3. **Given** the site's portal links (footer and header), **When** followed, **Then** they still open the existing "available soon" placeholder pages.

---

### Edge Cases

- **Gallery hidden (no albums with photos)**: the Photo Gallery menu entry still links to `/resources#photo-gallery`, and with no matching section the browser stays at the top of /resources. That is acceptable and unchanged from 007. Mobile Apps then sits alone. Its background is set for the section itself, not by position, so it never depends on the gallery being present.
- **A working link stops working later**: the site can't detect this at run time. The content source is the single place to update. A card with no link shows no button (FR-016).
- **All app links dead**: the section still shows the heading, text, photo and the four cards, each with the "Not available at the moment" note and no button. It is not hidden, because the text has value on its own. The brief says to keep the cards.
- **Photo fails to load**: the frame keeps its size and its background shows. The layout doesn't jump.
- **APK download on iPhone or desktop**: the link still opens the Drive page in a new tab. The note beside the button says it is an Android app installed from outside the Play Store, so the visitor knows before clicking.
- **Long app name or a fifth app later**: names wrap within the card, and card heights stay equal per row. The grid adds rows using the same column counts.
- **Old addresses**: `/resources/scarlet-mobile-apps` → `/resources#mobile-apps` and `/resources/photo-gallery` → `/resources#photo-gallery` keep redirecting permanently. The other old Resources addresses keep redirecting to `/resources`.

## Requirements *(mandatory)*

### Page and navigation

- **FR-001**: /resources MUST be a single page with exactly one top-level heading (the existing "Resources" page title) and these sections in order, each with a second-level heading and a stable anchor: Photo Gallery (`photo-gallery`), Mobile Apps (`mobile-apps`).
- **FR-002**: The Resources dropdown (desktop), the Resources group (mobile menu) and site search MUST list exactly these two entries in this order, from the same single section definition the page uses.
- **FR-003**: No Downloads or Our Books section may exist on the page. The stale code comments that promise them (on the Resources page and the gallery section) MUST be removed or corrected. No on-site link may point to `#downloads` or `#our-books`, and an automated test MUST check this across the public pages' HTML.
- **FR-004**: Settings → Books, its data and the home page books strip MUST NOT change.
- **FR-005**: Both sections MUST use the shared scroll-margin-top token, so each heading is fully visible below the fixed header at all four widths when reached by anchor.
- **FR-006**: The existing redirects for old Resources addresses MUST keep working unchanged.

### Photo Gallery (structure only)

- **FR-007**: The Photo Gallery's `h2` MUST use the shared section-heading component with an existing variant. The section MUST use the shared section wrapper and spacing tokens used by About and Academics.
- **FR-008**: Gallery behaviour MUST NOT change: albums, caps, viewer, lazy loading, data source, hidden-when-empty (007 FR-031/FR-033) and admin screens. Album cards, the grid and the viewer change only where the wrapper requires it.
- **FR-009**: The existing 007 E2E specs MUST pass. Any assertion on the old heading markup MUST be reported and updated. None was found in the pre-build search; the only gallery-related assertion is on the album page's breadcrumb, which is unaffected.

### Mobile Apps content

- **FR-010**: The heading and body MUST be the reference's text exactly, as listed under Pre-build Findings: no rewording, shortening or typo fixes without client approval (R1, R2).
- **FR-011**: The content source MUST record the source URL and the date copied (2026-10-12). Reference-copied text and links MUST be marked pending client confirmation, using the project's existing convention.
- **FR-012**: The Scarlet Series photo MUST be stored locally in `public/images/resources/` and served from there. The photo is a flyer made mostly of text, so it MUST be shown whole (never cropped), and its alt text MUST transcribe the flyer's text rather than use the reference's short alt, "Scarlet Series for Playgroup". The alt text is marked pending client approval (R7). Nothing may be loaded from das.edu.pk, and the reference's download-button images MUST NOT be used.
- **FR-013**: There MUST be four app cards, in order: Scarlet English, Scarlet Math, Scarlet Urdu, LMS App. Each shows an icon chosen for its subject, the app name, and a one-line label only where the reference has one. It has none for any app, so no label is shown and no description is invented.
- **FR-014**: The URL kept for each app MUST be the exact reference URL listed under Download links. The LMS App MUST use `https://play.google.com/store/apps/details?id=com.darearqam.daslms`. No other store link may be invented.

### Mobile Apps UI

- **FR-015**: The download button wording MUST match the link type:
  - Play Store: "Get it on Google Play" in the site's own button style, with no Google badge artwork.
  - App Store: "Download on the App Store" in the same style. No app uses this today.
  - Direct download (Drive/APK): "Download for Android", with a short visible note that it installs from outside the Play Store.
- **FR-016**: A card whose link is dead MUST show no download button and no link. In place of the button it MUST show a short, muted note, "Not available at the moment". The note is not from the reference, so it is marked pending client approval. The card MUST also be marked for the client in the content source, and its dead link MUST appear in the client-review document so the client can supply a working one before launch. Today this applies to Math, Urdu and LMS.
- **FR-017**: Every download link MUST open in a new tab with `rel="noopener noreferrer"` and have an accessible name that contains the visible button text and the app name, for example "Download for Android: Scarlet English (opens in a new tab)". The visible label stays in the name (WCAG 2.5.3 Label in Name, research R3), so a replacement name such as "Download Scarlet English app" is not used.
- **FR-018**: Intro layout: from tablet width up, the heading and text sit in one column and the photo in the other. On phones they stack, text first. The photo is a tall portrait (744 × 1280), so it MUST be framed so it doesn't make the intro excessively tall on desktop. Any new size MUST be a token.
- **FR-019**: Apps grid: 1 column on phones, 2 on tablets, 4 on desktop. Card heights are equal within a row, and buttons line up at the card bottoms.
- **FR-020**: Hover: the card lifts slightly and the button colour changes. Only transform and colour change, and both respect reduced motion. Keyboard focus is clearly visible on every button.

### Content source and future editing

- **FR-021**: Mobile Apps content MUST live in a typed content file, `src/content/resources/mobile-apps.ts`, shaped as the Resources tab in Settings (014) will edit it: `{ heading, body, image, apps: [{ id, name, label?, icon, url, linkType: "play-store" | "app-store" | "direct-download" }] }`. A dead link is recorded so the card renders with no button (FR-016) while the reference URL is kept for the client-review record. The exact representation is decided in planning.
- **FR-022**: The site's six portal links MUST NOT change in this feature. They keep pointing to the "available soon" placeholder pages.
- **FR-023**: `docs/content-source/resources/client-review.md` MUST list the six portal URLs with labels and status, the Student Login "Not secure" note, the four app links with their status, and findings R1–R7. Each dead app link MUST be listed with a request for a working replacement before launch.

### Design and quality

- **FR-024**: Existing theme colours (navy, yellow, white) and fonts only. New size or spacing values MUST be design tokens.
- **FR-025**: Neighbouring sections MUST alternate backgrounds using existing tokens.
- **FR-026**: At 375, 768, 1024 and 1440 px: no horizontal scroll, clean stacking, readable line lengths, and equal card heights within a row.
- **FR-027**: /resources MUST pass an automated accessibility (axe) scan with no violations.
- **FR-028**: Existing E2E tests that assert the old Mobile Apps placeholder MUST be updated, and the change reported. These are the "Mobile Apps placeholder with the LMS App link" test and the portal-links test, which reads `/portal/` links from the Mobile Apps section. After this feature the portal-links test must still find the six portal links in the footer.

### Key Entities

- **Mobile Apps content**: heading, body text, an intro image (local path, alt text, width and height), source URL, date copied, approval status, and an ordered list of apps.
- **App**: id, name, optional one-line label, icon, link URL, link type (Play Store, App Store or direct download), and whether the link is confirmed working. When it isn't, the card shows no button.
- **Portal link (review record only)**: label, reference URL, status found and notes. It is not displayed on the site in this feature.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: /resources shows exactly 2 sections in the stated order. Both menu entries (desktop and mobile) land on their section with the heading fully visible, at all 4 widths.
- **SC-002**: 100% of the Mobile Apps heading and body text matches the reference word for word.
- **SC-003**: 0 requests to das.edu.pk when /resources loads. 0 reference button images are used.
- **SC-004**: Every download button on the page leads to a link that was confirmed working on the check date. 0 buttons on cards with dead links, and 100% of those cards show the "Not available at the moment" note. 0 store links not taken from the reference.
- **SC-005**: 100% of download links open in a new tab, carry `noopener noreferrer`, and have an accessible name containing the app name.
- **SC-006**: 0 links anywhere on the public site point to `#downloads` or `#our-books`.
- **SC-007**: 100% of the existing 007 gallery E2E specs pass. Gallery behaviour is unchanged.
- **SC-008**: 0 accessibility violations in the automated scan of /resources.
- **SC-009**: 0 horizontal-scroll cases at 375, 768, 1024 and 1440 px. Card heights in each row differ by 0 px.
- **SC-010**: The client-review document covers 6 of 6 portal URLs, 4 of 4 app links (each dead one with a request for a working replacement) and 7 of 7 findings.

## Assumptions

- The page's top-level heading stays the existing "Resources" banner title, and the breadcrumb is unchanged.
- The Mobile Apps section heading is the reference heading, "Scarlet Series Mobile Applications". The menu label stays "Mobile Apps", following the 017/018 pattern of separate menu labels and section headings.
- The Scarlet English Drive link opens Drive's file page, which for a large file shows Google's "can't scan for viruses" notice before downloading. This is the link the reference uses, and it is kept as is.
- The link checks are a snapshot from 2026-10-12. Links are not checked again at run time.
- lucide-react is already a project dependency (confirmed in `package.json`). Icons are decorative and hidden from assistive technology, because the card name carries the meaning.

## Dependencies

- Navigation sections conversion (`pageSections.resources` drives the menu, search and the page).
- 007-gallery-albums (gallery section, data and E2E specs).
- 017/018 patterns: SectionHeading, the shared section wrapper and spacing tokens, the scroll-margin-top token, typed content files, the pending-approval convention and the release check.
- 014-page-content will later make this content editable. Out of scope here.

## Out of Scope

- Any change to gallery behaviour or the admin screens.
- Switching the site's portal links to real URLs.
- Downloads and Our Books content (never built; nothing to migrate).
- Admin editing of Resources content (014-page-content).
- Hosting the APK files on this site.

## Open Questions for the Client

1. Are the three Scarlet apps still offered? The Math and Urdu Drive files are gone and English is only a Drive APK. Are any of them on the Play Store or App Store? Please send current links.
2. The LMS App Play Store listing (`com.darearqam.daslms`) returns "not found". Is there a current link for this campus?
3. Do the six portal URLs apply to Metroville Campus? DAS Portal and ePortal don't resolve, Student Login timed out and uses an insecure HTTP address, and only Alumni Registration and Mail Login appear to work.
4. Approve or reject findings R1–R7, including any typo fixes in the reference text, the card names and the "Not available at the moment" note.
