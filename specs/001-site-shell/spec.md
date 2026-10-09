# Feature Specification: Site Shell

**Feature Branch**: `001-site-shell`
**Created**: 2026-09-16
**Status**: Draft
**Input**: User description: "Feature Brief — 001 Site Shell: Build the shared public site shell: top bar, header with main menu, mobile menu, footer, and the page layout every public page uses. References: screenshots/ (header/footer captures — exact filenames TBD, see Assumptions), research/design-tokens.md (values), docs/prd.md §4 (Metroville sitemap). User stories: P1 desktop navigation, P1 mobile navigation, P2 contact details and social links, P2 footer, P3 header scroll behavior, P3 shared layout and placeholder pages. Deviations from das.edu.pk: no Franchise Offer item, menu limited to PRD sitemap, all campus details are Metroville's. Out of scope: admin dashboard layout, site search, signup form, real page content beyond the shell. Acceptance: matches reference screenshots and tokens at 375/768/1024/1440px, every menu link reachable on desktop and mobile, one e2e test per user story."

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Desktop navigation (Priority: P1)

A visitor on a desktop-width screen can reach every public page in the
site from the header: the logo returns them home, and a main menu —
in the fixed order Home, About, Campuses, Academics, Admission,
Resources, News, Contact — reaches every other page, with sub-pages
reachable through hover- or keyboard-triggered dropdowns.

**Why this priority**: The header is the primary way visitors move
around the entire public site. Until it works, no other page —
admission info, news, contact — is reachable, so nothing else the
site offers has value yet.

**Independent Test**: Load the site at desktop width, click the logo
to confirm it returns home, then tab and click through every header
menu item and dropdown to confirm each one lands on its page. This
alone delivers full desktop reachability of every public page, before
any other feature is built.

**Acceptance Scenarios**:

1. **Given** a visitor is on any public page at desktop width, **When** they activate the logo, **Then** they land on the home page.
2. **Given** the header is visible at desktop width, **When** it renders, **Then** the menu items appear in exactly this order: Home, About, Campuses, Academics, Admission, Resources, News, Contact.
3. **Given** a menu item has configured sub-pages, **When** a visitor hovers over it or moves keyboard focus onto it, **Then** its dropdown opens and shows its sub-page links.
4. **Given** a dropdown is open, **When** the pointer moves away from the item and its dropdown, and keyboard focus is not inside either, **Then** the dropdown closes.
5. **Given** a visitor is viewing a specific public page, **When** the header renders, **Then** the menu item for that page is visibly marked as the current/active item.

---

### User Story 2 - Mobile navigation (Priority: P1)

A visitor on a phone or tablet can reach every public page through a
mobile menu that replaces the full header menu below the reference
site's collapse breakpoint, supports expanding and collapsing
sub-pages, and closes cleanly without leaving the visitor stranded or
scrolling the page behind it.

**Why this priority**: A large share of visitors — parents checking
the site on a phone — depend entirely on this menu. Without it, the
site is effectively unusable on mobile, regardless of how well
desktop navigation works.

**Independent Test**: Load the site at a mobile/tablet width, open
the menu via its button, navigate into and out of an item with
sub-pages, and close the menu by each of the three supported methods
(link chosen, close control, Escape). This alone delivers full mobile
reachability, independent of desktop navigation.

**Acceptance Scenarios**:

1. **Given** the viewport width is at or below the reference site's menu-collapse breakpoint, **When** the header renders, **Then** the full menu is hidden and a menu button is shown instead.
2. **Given** the menu button is visible, **When** a visitor activates it, **Then** the mobile menu opens and lists all top-level sitemap items.
3. **Given** the mobile menu is open and an item has sub-pages, **When** a visitor activates that item, **Then** its sub-pages expand in place; activating it again collapses them.
4. **Given** the mobile menu is open, **When** a visitor chooses a link, presses the close control, or presses Escape, **Then** the menu closes.
5. **Given** the mobile menu is open, **When** a visitor attempts to scroll, **Then** the page behind the menu does not scroll.
6. **Given** the mobile menu is open, **When** a visitor tabs through its contents, **Then** keyboard focus stays inside the menu; **When** the menu closes by any method, **Then** focus returns to the menu button.

---

### User Story 3 - Contact details and social links (Priority: P2)

A visitor on any public page can see how to reach the Metroville
campus — phone, email, address — in the footer, use them directly
(dialer, mail app), and reach the campus's social channels from the
top bar, all sourced from one editable place rather than hardcoded per
page. The top bar itself matches the reference's layout: portal
quick-links (e.g. student/parent logins) on one side, social icons on
the other — confirmed against the live reference site, per the updated
Assumption below (contact details moved out of the top bar into the
footer only, correcting this story's original "both the top bar and
footer" premise, which didn't match the reference).

**Why this priority**: Reaching the campus builds trust and drives
enquiries, but the site is already fully navigable without it once
Stories 1 and 2 are done — this adds value on top of reachability
rather than enabling it.

**Independent Test**: View any public page, confirm phone/email/
address appear in the footer, confirm the phone and email are
actionable links, confirm the top bar shows portal links and any
configured social links (opening in a new tab), and confirm editing a
value in the single content source changes what's displayed everywhere
without touching layout code.

**Acceptance Scenarios**:

1. **Given** a visitor is on any public page, **When** they view the footer, **Then** they see the campus phone number, email address and physical address as configured for Metroville.
2. **Given** the phone number is displayed, **When** a visitor activates it, **Then** their device's dialer opens pre-filled with that number.
3. **Given** the email address is displayed, **When** a visitor activates it, **Then** their device's mail app opens addressed to that email.
4. **Given** a social link has a configured value, **When** a visitor activates it, **Then** it opens in a new browser tab.
5. **Given** a content editor changes a contact detail or social link value in the single content source, **When** any public page is viewed afterward, **Then** the new value appears everywhere it's shown, with no change to layout code.
6. **Given** a visitor is on any public page, **When** they view the top bar, **Then** they see the configured portal quick-links on one side and any configured social links on the other, matching the reference layout.

---

### User Story 4 - Footer (Priority: P2)

A visitor on any public page sees a footer with columns, quick links
and a bottom bar matching the reference's layout, populated with
Metroville-specific content and a copyright line that always shows
the current year.

**Why this priority**: The footer completes the page frame and
carries secondary navigation and legal information, but its absence
doesn't block a visitor from reaching or using any page — it's a
completeness item layered on top of the P1 stories.

**Independent Test**: View the footer on any public page and confirm
its columns, quick links and bottom bar match the reference layout
with Metroville content, and that the copyright year is correct on
the date of viewing.

**Acceptance Scenarios**:

1. **Given** a visitor is on any public page, **When** they scroll to the footer, **Then** they see footer columns, quick links and a bottom bar matching the reference layout, populated with Metroville content.
2. **Given** the footer bottom bar is shown, **When** viewed on any date, **Then** its copyright line shows that year, computed at render time.

---

### User Story 5 - Header scroll behavior (Priority: P3)

A visitor scrolling a public page sees the header behave exactly as
it does on the reference site — whether it stays pinned (sticky) or
scrolls away, and whether it changes size or background as the page
scrolls.

**Why this priority**: This is a fidelity/polish detail. It affects
how closely the site feels like the reference but doesn't change what
a visitor can reach or do, so it's the lowest priority in this
feature.

**Independent Test**: Scroll a public page from top to bottom and
back on desktop and mobile, and compare the header's behavior against
the reference site's recorded behavior.

**Acceptance Scenarios**:

1. **Given** a visitor scrolls down a public page, **When** the reference header is sticky, **Then** this header stays visible in the same way; **When** the reference header is not sticky, **Then** this header scrolls away in the same way.
2. **Given** the reference site changes the header's size or background at a scroll threshold, **When** a visitor scrolls past the equivalent point here, **Then** the same change is reproduced.

---

### User Story 6 - Shared layout and placeholder pages (Priority: P3)

Every public route in the PRD sitemap renders inside the shared shell
— as a placeholder if its own feature isn't built yet — so navigation
never dead-ends, unknown URLs show a proper "not found" page inside
the shell, and keyboard users can skip straight to page content.

**Why this priority**: This makes the shell usable as the foundation
every later feature builds inside, and prevents broken links — but
it's an enabling/plumbing concern that only matters once Stories 1–2
already let visitors reach these routes.

**Independent Test**: Navigate to every route listed in the PRD
sitemap and confirm each renders inside the shell (placeholder or
real), navigate to a URL outside the sitemap and confirm a "page not
found" page renders inside the shell with a link home, and confirm
the skip-to-content link is the first thing focused on Tab.

**Acceptance Scenarios**:

1. **Given** any route listed in the PRD sitemap (§4), **When** a visitor navigates to it, **Then** a page renders inside the shared shell, showing placeholder content if that page's own feature hasn't been built yet.
2. **Given** a visitor navigates to a URL that matches no sitemap route, **When** the page loads, **Then** a "page not found" page renders inside the shell with a link back to home.
3. **Given** any public page loads, **When** a visitor presses Tab as their first key press, **Then** a "skip to content" link is the first element to receive focus.

---

### Edge Cases

- What happens when a menu label is very long, or is Urdu text — does the header/mobile menu layout stay intact without overlapping or clipped text?
- Can a visitor using only a keyboard, or a screen reader, operate every part of the menu (open/close dropdowns, open/close the mobile menu, know which page is current)?
- What happens when a social link has no configured value — is its icon hidden, rather than shown as a dead link?
- How does the menu render a top-level sitemap item that currently has no sub-pages versus one that later gains sub-pages — is that difference driven by content alone, with no code change?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The system MUST display a header on every public page with a logo linking to the home page and a main menu listing sitemap items in this order: Home, About, Campuses, Academics, Admission, Resources, News, Contact.
- **FR-002**: The main menu MUST visibly mark the item corresponding to the currently viewed page as active/current.
- **FR-003**: A menu item with configured sub-pages MUST open a dropdown showing those sub-pages on hover and on keyboard focus, and MUST close it once neither the pointer nor keyboard focus remains on the item or its dropdown.
- **FR-004**: Whether a top-level menu item shows a dropdown MUST be driven by its content/data (does it have configured sub-pages or not), not by a hardcoded per-item code path — so a sitemap item can gain or lose a dropdown through content changes alone.
- **FR-005**: At the reference site's menu-collapse breakpoint and narrower, the system MUST replace the full menu with a menu button.
- **FR-006**: Activating the mobile menu button MUST open a mobile menu listing all top-level sitemap items; activating an item with sub-pages MUST expand or collapse those sub-pages in place.
- **FR-007**: The mobile menu MUST close when a visitor selects a link within it, activates a close control, or presses Escape.
- **FR-008**: While the mobile menu is open, the page behind it MUST NOT scroll.
- **FR-009**: While the mobile menu is open, keyboard focus MUST be trapped within it; when the menu closes by any method, focus MUST return to the menu button.
- **FR-010**: The system MUST display the Metroville campus phone number, email address and physical address in the footer.
- **FR-011**: The displayed phone number MUST be a `tel:` link and the displayed email address MUST be a `mailto:` link.
- **FR-012**: A configured social link MUST open in a new browser tab; a social link with no configured value MUST be omitted from the rendered page rather than shown as a non-functional link.
- **FR-013**: Contact details and social links MUST be stored in one editable content source, so a value can be changed without editing layout code.
- **FR-025** (superseded 2026-10-07: the yellow top bar is removed; portal links are in the footer and social icons only in the footer): The top bar MUST display the configured portal quick-links on one side and any configured social links on the other, matching the reference layout; portal links MUST be sourced from the same editable content source (FR-013's mechanism) and MUST NOT link to a fabricated external URL — each targets an internal placeholder page until the real system exists.
- **FR-026**: The header MUST provide a search control that finds pages by matching the query against navigation item labels (top-level items and their dropdown sub-pages) and navigates to a selected match; it MUST be reachable both on desktop and from within the mobile menu, and MUST NOT claim to search page content that doesn't exist yet.
- **FR-014**: The footer MUST display columns, quick links and a bottom bar matching the reference layout, populated with Metroville-specific content (not das.edu.pk head-office content).
- **FR-015**: The footer bottom bar MUST show a copyright line whose year is computed at render time, so it is always the current year.
- **FR-016** (amended 2026-10-07, see 006 spec Deviations: the header is now sticky at every width with a fixed height, transparent over the home hero and solid elsewhere; no longer reference-matched): The header's scroll behavior — whether it is sticky, and any change in size or background while scrolling — MUST match the reference site's behavior.
- **FR-017**: Every route listed in the PRD sitemap (docs/prd.md §4) MUST render a page inside the shared shell, showing placeholder content when that page's own feature has not yet been built.
- **FR-018**: A URL that matches no sitemap route MUST render a "page not found" page inside the shared shell, including a link back to the home page.
- **FR-019**: Every public page MUST include a "skip to content" link as the first focusable element on the page.
- **FR-020**: The menu MUST NOT include a Franchise Offer item or link anywhere, and MUST include only pages present in the PRD sitemap.
- **FR-021**: All campus details shown in the shell (address, phone, email, and similar) MUST be the Metroville campus's own details, never the das.edu.pk head office's.
- **FR-022**: The shell's layout MUST remain intact — no overlapping or clipped text — when menu labels are unusually long or contain Urdu text.
- **FR-023**: Every interactive element of the shell (menu items, dropdowns, mobile menu, skip link) MUST be operable using only a keyboard, and MUST expose its state (expanded/collapsed, current page) to assistive technology.
- **FR-024**: The shell's rendered layout, spacing, colors and hover effects MUST match the values recorded in research/design-tokens.md and the reference screenshots at 375px, 768px, 1024px and 1440px viewport widths.

### Key Entities *(include if feature involves data)*

- **Navigation Item**: One entry in the main menu — label, target route, display order, and an optional list of child Navigation Items (sub-pages). Presence or absence of children is what determines dropdown behavior (FR-004).
- **Contact Info**: The single editable record of the Metroville campus's phone, email, physical address (read by the footer), and social links (each optionally empty, read by the top bar) (FR-010–FR-013).
- **Portal Link**: One top-bar quick-link (label, target route) to an external student/parent/staff system not yet built in this project; each targets an internal placeholder page (FR-025).
- **Footer Content**: The footer's columns (each a label plus a list of links), quick links, and bottom-bar text, scoped to Metroville content (FR-014–FR-015).
- **Sitemap Route**: A public route from the PRD sitemap paired with whether it currently has real page content or shows a shell placeholder (FR-017).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A visitor can reach every public page listed in the PRD sitemap from the header in 2 interactions or fewer, on both desktop and mobile.
- **SC-002**: 100% of PRD sitemap routes render inside the shared shell, and no sitemap or unknown URL ever produces a broken or blank page.
- **SC-003**: The shell's layout, colors, spacing and hover effects visually match the reference at 375px, 768px, 1024px and 1440px widths, with no deviation beyond the documented ones (no Franchise Offer, Metroville-only content).
- **SC-004**: A keyboard-only visitor can open, navigate and close both the desktop dropdowns and the mobile menu without a mouse, and a screen reader correctly announces the current page and each menu item's expanded/collapsed state.
- **SC-005**: Changing a contact detail or social link in its single content source is reflected on every public page with no code change.
- **SC-006**: Every user story above has at least one passing end-to-end test.

## Out of Scope

- Admin dashboard layout — covered by feature 002.
- Full-text search over page content — no content index exists yet (real page content beyond the shell is out of scope below); see FR-026 and its Assumption for the nav-title search that ships instead.
- The signup form shown in the reference footer — covered by feature 004; this feature's footer omits it.
- Real page content for any page other than the shell itself and its placeholders.

## Assumptions

- **Reference imagery**: `screenshots/header-desktop.png` etc. named in the brief don't exist yet (the brief itself flags this as TODO). Until dedicated header/footer crops are supplied, the full-page reference captures already in `screenshots/` (the `das.edu.pk_.png` family, per viewport) are the reference for header and footer layout, since they contain both.
- **Actual contact values**: Real Metroville phone/email/address are not yet supplied (PRD §5.3 and Open Question 8 mark this TBD). This spec defines the single-source, editable mechanism (FR-010, FR-013); placeholder values are used until the client supplies real ones — that substitution is a content update, not a spec or code change.
- **Collapse breakpoint source**: "The reference site's collapse breakpoint" (Stories 1–2, FR-005) is the breakpoint recorded for das.edu.pk in `research/design-tokens.md`, not a new value invented for this feature.
- **Placeholder route scope**: "Every route in the PRD sitemap" (FR-017) covers the sitemap's top-level and named static routes. The dynamic news detail route (`/news/[slug]`) has no real slugs to placeholder against until feature 003-news exists, so it is out of scope here beyond the shell rendering around whatever `/news` itself shows.
- **About/Academics dropdown content**: docs/prd.md marked these sub-pages "TBD" at spec time. During implementation, the actual das.edu.pk page captures in `screenshots/` (filenames encode the real URL structure, e.g. `das.edu.pk_about_management_.png` → `/about/management/`) gave concrete, non-guessed evidence of the real sub-page set, which is what `navigationItems` now uses (About: Overview, Salient Features, Management, Messages — matching the PRD's own guess; Academics: Academics Overview, Examinations, Syllabi, Teachers Training — superseding the PRD's guess, which named pages, e.g. "Uniform", that the real site places under Admission instead). This remains content-driven (FR-004) — adding, removing, or correcting a sub-page is still a content edit, not a code change.
- **Site search scoped to navigation titles (added during implementation)**: The reference site has a search box; this spec originally excluded search entirely ("not in the PRD"). Since most pages in this feature are still shell placeholders (Out of Scope — real page content is a later feature), there is no real content to build a full-text index against yet. FR-026 ships a real, working search over the one thing that does exist and is meaningful to search: navigation item titles (top-level pages and their dropdown sub-pages) — not a placeholder UI, but intentionally scoped short of a content search engine.
- **Top bar contact info moved to footer-only (corrected during implementation)**: This story's original premise — phone/email/address in *both* the top bar and footer — was written before the reference's actual top bar content was checked. The live site's top bar has no contact info at all: portal quick-links (DAS Portal, ePortal, Student Login, Mail Login, LMS App, Alumni Registration) on one side, social icons on the other; contact info appears only in the footer. FR-010/FR-013 and this story now match that reality. The portal links point to external student/parent/staff systems this project doesn't build (no auth — out of scope); each links to an internal `/portal/<slug>` placeholder rather than a fabricated external URL (FR-025).
