---
description: "Task list for 019-resources"
---

# Tasks: Resources Page

**Input**: Design documents from `specs/019-resources/` (plan.md, spec.md, research.md, data-model.md, contracts/mobile-apps-content.md, contracts/page-structure.md, quickstart.md)

**Tests**: Requested. Constitution XI requires an E2E test per user story, FR-027/SC-008 need an axe scan, FR-003 needs an automated no-removed-anchors check, and research R12 lists the unit and component tests. In each phase the tests come first and must fail before the implementation task that follows them.

**Organization**: Tasks are grouped by user story (spec.md US1–US4), so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US4 from spec.md
- Paths are relative to the repo root `E:\dar-e-arqam-mc`

## Ground rules for every task

- The Mobile Apps heading and body are **verbatim** from the reference (spec "Pre-build Findings", FR-010). Never fix R1 or R2 ("Applications" stays capitalised; "…in the real rather than the virtual world." stays as is). The interface strings that are not from the reference (`mobileAppsCopy`) and the flyer alt text are marked `// PENDING CLIENT APPROVAL:` (018 convention).
- No link is invented (FR-014). Only Scarlet English has a non-empty `url`. The three dead reference URLs live only in `mobileAppsSource.referenceLinks`, the `review` notes and `docs/content-source/resources/client-review.md`, never in rendered HTML (research R1).
- Nothing is loaded from das.edu.pk, and the reference's download-button images are not used (FR-012, SC-003).
- Existing tokens only (Constitution VII), plus the two added in T004: `--size-resources-flyer-max-h` (36rem) and `--spacing-resources-card-lift` (4px). Reused: `bg-surface`, `bg-(--color-home-muted-band)`, `bg-primary`, `--color-topbar`, `--radius-card`, `--shadow-card`, `max-w-prose`, `anchor-section`, the `SectionHeading` tokens. No bracket values, no raw hex.
- Server Components only. No `"use client"` in `src/components/resources/`. Hover is CSS-only (`transform`, `background-color`, `color`). All transitions are `motion-safe:`-prefixed with `duration-(--motion-fast)` (FR-020).
- The portal links (`portalLinks`, footer, header) do not change (FR-022). Settings → Books and the home books strip do not change (FR-004). Gallery behaviour, its data source and the admin gallery screens do not change (FR-008).
- Before writing code that uses a Next.js API, read its guide in `node_modules/next/dist/docs/` and follow any deprecation notices (CLAUDE.md). This covers `Metadata` (T020) and `next/image` (T017).
- Never run `npm run build` and Playwright at the same time (project memory). Pre-start the dev server for admin E2E runs; about 35 admin tests already fail on unchanged code, so compare failure sets before and after rather than expecting zero.
- Files in `specs/019-resources/` use LF. Existing CRLF docs (`research/design-tokens.md`) keep CRLF; new files under `docs/content-source/resources/` use CRLF like 017's and 018's.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the source text, the flyer and the folders in place (research R7, R12).

- [X] T001 Create `docs/content-source/resources/mobile-apps.txt` (UTF-8, no BOM): line 1 the reference heading "Scarlet Series Mobile Applications", line 2 the reference body paragraph, both copied character for character from spec.md "Pre-build Findings → Reference page". Fetch <https://das.edu.pk/resources/scarlet-mobile-apps/> once more to confirm the wording; if it differs from the spec, stop and report to the owner rather than editing silently.
- [X] T002 [P] Copy the flyer downloaded on 2026-10-12 from `C:\Users\SKYTEC~1\AppData\Local\Temp\claude\E--dar-e-arqam-mc\70512ba5-741b-45a0-bbf2-a814c2432e9f\scratchpad\ref\scarlet-series-playgroup.jpeg` to `public/images/resources/scarlet-series-playgroup.jpeg` (byte copy, do not re-encode). Confirm it is 744 × 1280 and about 174 KB. Only if that file is gone, download it once from the reference URL in spec.md into a new empty scratchpad folder and copy from there.
- [X] T003 [P] Create `docs/content-source/resources/README.md` (CRLF): the source URL, copy date 2026-10-12, link-check date 2026-10-12, that `mobile-apps.txt` is the fidelity reference and changes together with `src/content/resources/mobile-apps.ts` when the client approves a fix (quickstart "Common content edits"), that the flyer came from the reference and is stored locally, and a pointer to `client-review.md`. Create the folders `src/lib/resources/`, `src/content/resources/` and `src/components/resources/`.

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens, the Mobile Apps schema and the shared wrapper's new layout props.

**⚠️ CRITICAL**: No user-story work starts until this phase is done.

- [X] T004 Add the Resources tokens (plan Constitution VII, research R7, R9):
  - In `src/app/globals.css`, after the Academics (018) tokens and in their comment style: `--size-resources-flyer-max-h: 36rem;` and `--spacing-resources-card-lift: 4px;`, commented "Resources (019): composed values, see research/design-tokens.md "Resources page"".
  - In `research/design-tokens.md` (CRLF), after the "Academics page" section, add "## Resources page (019)", worded like the Academics section: a table of the two tokens (value, use), the "Reused" list from the ground rules, and the deviation note (composed, not extracted).

  Confirm `max-h-(--size-resources-flyer-max-h)` and `motion-safe:hover:-translate-y-(--spacing-resources-card-lift)` resolve in Tailwind v4.
- [X] T005 [P] Write failing `src/lib/resources/schema.test.ts` for contracts/mobile-apps-content.md:
  - `linkMatchesType`: `play-store` accepts `https://play.google.com/store/apps/details?id=com.darearqam.daslms` (and with an extra `&hl=en`); refuses `http://play.google.com/store/apps/details?id=x`, `https://play.google.com/store/search?q=x`, `https://play.google.com.evil.example/store/apps/details?id=x`, and a details URL with no `id`. `app-store` accepts `https://apps.apple.com/pk/app/x/id123`; refuses `http://apps.apple.com/…` and `https://itunes.apple.com.evil.example/…`. `direct-download` accepts the Scarlet English Drive URL; refuses `http://…`, `javascript:alert(1)`, `/files/app.apk` and non-URLs.
  - `mobileAppsSchema` accepts the data-model.md values; accepts `url: ""` for any `linkType`; rejects a `direct-download` URL that is `http:`; rejects an `app-store` URL under `play-store`; rejects 0 and 9 apps, duplicate app ids, an unknown icon key, a non-kebab id, a 61-character name, an empty heading, a body over 2000 characters, and an image with empty `imageAlt`; accepts `image: null` with `imageAlt: ""`.
- [X] T006 Implement `src/lib/resources/schema.ts` exactly as in contracts/mobile-apps-content.md (Zod 4, `text`, `longText`, `imageRef`, `itemId`, `uniqueIds` from `@/lib/content/fields`). Export `LINK_TYPES`, `APP_ICON_KEYS`, `type LinkType`, `type AppIconKey`, `linkMatchesType`, `appSchema`, `mobileAppsSchema`, and the inferred types `MobileApps` and `MobileApp`. `linkMatchesType` parses with `new URL`, requires `protocol === "https:"`, and compares `hostname` exactly (`play.google.com` with pathname `/store/apps/details` and a non-empty `id` search param; `apps.apple.com`). Pure module, no `server-only`. T005 must pass.
- [X] T007 [P] Extend `src/components/about/about-section.test.tsx`: with `beside` set, the heading and `children` are inside one column and `beside` in another (assert by `data-testid="about-section-main"` / `"about-section-beside"`), the `h2` keeps id `${id}-heading`, and `below` renders after that row, full width; with `beside` absent but `below` set, `below` renders after `children`; with neither, the output is unchanged (the existing assertions still pass). These new assertions must fail.
- [X] T008 Add optional `beside?: ReactNode` and `below?: ReactNode` to `AboutSection` in `src/components/about/about-section.tsx` (research R4). Only in the non-`headingBand` branch: when `beside` is set, render a `grid gap-10 md:grid-cols-12 md:items-start` row with a `md:col-span-7` column (`data-testid="about-section-main"`) holding the `SectionHeading` (start-aligned through `className`, as the home Books band does) and `children`, and a `md:col-span-5` column (`data-testid="about-section-beside"`) holding `beside`; render `below` after the row. When `beside` is absent, keep today's markup exactly and append `below` (if any) after `children`. Add doc comments in the existing style ("(used by Resources)"). T007, the About and Academics component tests must pass: `npx vitest run src/components/about src/components/academics`.

**Checkpoint**: `npx vitest run src/lib/resources src/lib/content src/components/about src/components/academics` passes.

---

## Phase 3: User Story 1 - Find the school's apps and download the one that works (Priority: P1) 🎯 MVP

**Goal**: /resources shows the Mobile Apps section: the verbatim heading and body beside the local, uncropped flyer, then four app cards in order, with one "Download for Android" button (Scarlet English) and "Not available at the moment" on the other three.

**Independent Test**: Open /resources#mobile-apps at 375, 768, 1024 and 1440 px and check spec US1 acceptance scenarios 1–6.

### Tests for User Story 1 ⚠️

- [X] T009 [P] [US1] Write failing `src/content/resources/fidelity.test.ts`: read `docs/content-source/resources/mobile-apps.txt` (normalise CRLF, strip a BOM if any) and assert `mobileApps.heading === line1` and `mobileApps.body === line2` exactly (018's fidelity test pattern).
- [X] T010 [P] [US1] Write failing `src/content/resources/content.test.ts` for the invariants in contracts/mobile-apps-content.md: `mobileApps.image.url` starts with `/images/resources/` and is 744 × 1280; `JSON.stringify(mobileApps)` and `JSON.stringify(mobileAppsCopy)` contain no `das.edu.pk`; the app ids are exactly `scarlet-english`, `scarlet-math`, `scarlet-urdu`, `lms-app` in order, with names "Scarlet English", "Scarlet Math", "Scarlet Urdu", "LMS App"; no app has a `label`; only `scarlet-english` has a non-empty `url`, it equals `mobileAppsSource.referenceLinks["scarlet-english"]` and its `linkType` is `direct-download`; `lms-app` has `linkType: "play-store"`; `mobileAppsSource.referenceLinks` has an entry for every app id with the exact URLs from spec "Download links" (LMS = `https://play.google.com/store/apps/details?id=com.darearqam.daslms`); `mobileAppsSource.copiedOn` and `linksCheckedOn` are `2026-10-12`; `mobileAppsReview.status === "pending-client-approval"`; `mobileAppsCopy` has the data-model.md strings exactly.
- [X] T011 [P] [US1] Write failing `src/components/resources/app-card.test.tsx` (Testing Library):
  - Available `direct-download` app: an `h3` with the name; one link with `href` = url, `target="_blank"`, `rel="noopener noreferrer"`, accessible name "Download for Android: Scarlet English (opens in a new tab)", visible text "Download for Android"; a `<p id="scarlet-english-note">` "Installs from outside the Play Store" and the link's `aria-describedby="scarlet-english-note"`; the icon is `aria-hidden="true"`; the `li` has `data-testid="app-card"` and `data-app-id`.
  - Available `play-store` app (fixture): visible text "Get it on Google Play", no note, no `aria-describedby`. Available `app-store` fixture: "Download on the App Store".
  - Unavailable app (`url: ""`): no `a` element at all; a muted `p` "Not available at the moment".
  - A `label` renders when present and not when absent.
  - The card `li` and the link use only `motion-safe:`-prefixed `transition-*`/`duration-*` classes, with no unprefixed `transition` and no `transition-[` class (FR-020, Constitution VII).
- [X] T012 [P] [US1] Write failing `src/components/resources/mobile-apps.test.tsx`: renders `section#mobile-apps` with `aria-labelledby="mobile-apps-heading"`, `data-background="muted"` and class `anchor-section`; exactly one `h2` (#mobile-apps-heading) with the heading; the body paragraphs; a `figure` with an `img` whose `alt` equals `imageAlt` and whose `src` contains `/images/resources/`; a `ul` with 4 `app-card` items in order; with `image: null` the figure is not rendered; the `figure` has inline `aspect-ratio: 744 / 1280` and a `max-width` built from `--size-resources-flyer-max-h`, so its box doesn't depend on the image loading.
- [X] T013 [P] [US1] Write failing `e2e/resources.spec.ts` (chromium project; gallery-independent), US1 block:
  - `section#mobile-apps` has the `h2` "Scarlet Series Mobile Applications" and the body text exactly as in spec.md.
  - The flyer `img` is local, loaded (`naturalWidth > 0`), and its rendered aspect ratio is 744/1280 ± 1%; at 768 px and up its box sits to the right of the text column, at 375 px below the body text; with the image request aborted (`page.route("**/scarlet-series-playgroup*", r => r.abort())`), the `figure`'s bounding box has the same width and height as when it loads.
  - 4 `[data-testid=app-card]` in order; at 375/768/1024/1440 the column count is 1/2/4/4 (count distinct `left` values in the first row) and card heights within each row differ by 0 px.
  - Scarlet English has exactly one link, accessible name containing "Scarlet English", `target=_blank`, `rel` containing `noopener` and `noreferrer`, and the note visible; Math, Urdu and LMS cards have no `a` and show "Not available at the moment".
  - Recording every request while loading /resources, none has a host ending in `das.edu.pk`.
  - No horizontal scroll at the four widths (`document.documentElement.scrollWidth <= innerWidth`).
  - An axe scan of /resources (`@axe-core/playwright`, as in `e2e/academics.spec.ts`) has no violations.

### Implementation for User Story 1

- [X] T014 [US1] Create `src/content/resources/mobile-apps.ts` (data-model.md "Values today"): export `mobileApps` (the 014 value: `heading`, `body` verbatim from `mobile-apps.txt`; `image: { url: "/images/resources/scarlet-series-playgroup.jpeg", publicId: "", width: 744, height: 1280 }`; `imageAlt` transcribing the flyer — "Dar-e-Arqam Schools proudly introducing Scarlet Series for Playgroup", its eight bullet points, "Beginning from New Session 2020-21", "The series will be provided in parallel to the old series of Play Group", "www.das.edu.pk" — read from the copied image, ≤ 600 characters, marked `// PENDING CLIENT APPROVAL:` (R7); the four apps with icons `book-a`, `calculator`, `feather`, `monitor-smartphone`); `mobileAppsCopy` (buttons by link type, `directDownloadNote`, `unavailable`, `newTab`, each non-brief string marked pending approval, R11); `mobileAppsSource` (url, `copiedOn`, `linksCheckedOn`, `referenceLinks` for all four ids); and `review` (`ReviewMeta` from `@/lib/academics/schema`, status `pending-client-approval`, notes covering R1–R7 and the three dead links). Comment that `mobileAppsSource` is a record only and is never rendered.
- [X] T015 [US1] Create `src/content/resources/index.ts`: `export const mobileApps = mobileAppsSchema.parse(rawMobileApps)` at module load (018 pattern, comment "Parsed at module load, so a bad edit fails loudly at build and in tests."), re-export `mobileAppsCopy`, `mobileAppsSource` and `review as mobileAppsReview`. T009 and T010 must pass.
- [X] T016 [P] [US1] Create `src/components/resources/app-icons.ts`: `appIcons: Record<AppIconKey, LucideIcon>` mapping `book-a` → `BookA`, `calculator` → `Calculator`, `feather` → `Feather`, `monitor-smartphone` → `MonitorSmartphone`, `graduation-cap` → `GraduationCap`, `smartphone` → `Smartphone` (018's `point-icons.ts` pattern).
- [X] T017 [US1] Create `src/components/resources/app-card.tsx` (`AppCard({ app, copy })`, contracts "Rendering contract"): `li` (`data-testid="app-card"`, `data-app-id`) as a flex column `h-full` surface card with `rounded-(--radius-card)`, `shadow-(--shadow-card)`, `motion-safe:transition-transform motion-safe:duration-(--motion-fast) motion-safe:hover:-translate-y-(--spacing-resources-card-lift)` (the sidebar's idiom, no bracket values); a navy circle chip with the yellow (`text-topbar`) icon, `aria-hidden`; the name in an `h3`; the optional label; then a `mt-auto` footer. Available: `<a href target="_blank" rel="noopener noreferrer">` styled navy/white → hover yellow/navy with `motion-safe:transition-colors motion-safe:duration-(--motion-fast)`, so the change is instant under reduced motion (FR-020), and the site's visible focus ring (`focus-visible:ring-2 focus-visible:ring-ring`), visible `copy.buttons[linkType]` plus `<span className="sr-only">: {name} ({copy.newTab})</span>`; for `direct-download`, `aria-describedby="{id}-note"` and the visible note `p`. Unavailable (`url === ""`): only `<p className="text-text-muted">{copy.unavailable}</p>`. T011 must pass.
- [X] T018 [US1] Create `src/components/resources/mobile-apps.tsx` (`MobileAppsSection({ value, copy })`): `AboutSection` with `id="mobile-apps"`, `background="muted"`, `heading={value.heading}`, `stroke` (as Academics), children = `Paragraphs` of `value.body` inside `max-w-prose`, `beside` = (when `value.image`) a `figure` with `className="mx-auto w-full bg-surface"` and `style={{ maxWidth: `calc(var(--size-resources-flyer-max-h) * ${width} / ${height})`, aspectRatio: `${width} / ${height}` }}` (data-derived from the image ref, not a design value), holding a `next/image` with `width`/`height` from the ref, `alt={value.imageAlt}`, `loading="lazy"` and `className="block h-full w-full object-contain"`. The frame's box comes from its own aspect ratio and width, so it keeps its size if the image fails, and the white `bg-surface` shows against the muted section (spec Edge Cases). The flyer is never taller than `--size-resources-flyer-max-h` and never cropped; and `below` = `<ul className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">` of `AppCard`s. T012 must pass.
- [X] T019 [US1] Edit `e2e/page-sections.spec.ts` (research R14, FR-028): remove the test "/resources has a Mobile Apps placeholder with the LMS App link" (superseded by T013); in "every portal link in the footer and the Mobile Apps section opens a placeholder page, not a 404", drop the `section#mobile-apps` loop and rename it "every portal link in the footer opens a placeholder page, not a 404" (the `size >= 6` check stays). Report both changes in the PHR.
- [X] T020 [US1] Rewrite `src/app/(public)/resources/page.tsx`: keep `PageBanner`, `revalidate = 60` and the metadata title; add `description` (the first sentence of `mobileApps.body`) and `alternates: { canonical: "/resources" }`; drop the container `div`, the placeholder and the `Link`/`portalLinks`/`AnchoredSection` imports; map `pageSections.resources` with a `switch` (Academics pattern): `photo-gallery` → `<GallerySection key=… />`, `mobile-apps` → `<MobileAppsSection key=… value={mobileApps} copy={mobileAppsCopy} />`, `default` → `null`. Replace the doc comment with one describing the 019 page (two sections from `pageSections.resources`, fixed backgrounds, old sub-routes redirect here via `next.config.ts`) — no mention of Downloads or Our Books (FR-003). Only the `AnchoredSection` import is dropped. `src/components/site-shell/anchored-sections.tsx` stays unchanged, because `/admission` still uses its `AnchoredPage` export. Then run T013 and `e2e/page-sections.spec.ts` (chromium) — both pass.

**Checkpoint**: `npx vitest run src/lib/resources src/content/resources src/components/resources src/components/about` and `npx playwright test e2e/resources.spec.ts e2e/page-sections.spec.ts --project=chromium` pass. US1 is shippable as the MVP.

---

## Phase 4: User Story 2 - Jump to a Resources section from the menu (Priority: P1)

**Goal**: The Resources dropdown, mobile group and search list exactly Photo Gallery and Mobile Apps; each lands with its heading clear of the fixed header; the page has one `h1` and the sections in order; nothing links to `#downloads` or `#our-books`.

**Independent Test**: At desktop and phone widths, open the menu, choose each entry, and check the URL hash and that the heading is fully visible (spec US2 scenarios 1–4).

### Tests for User Story 2 ⚠️

- [X] T021 [P] [US2] Extend `src/content/site-shell.test.ts`: `pageSections.resources` is exactly `[{ id: "photo-gallery", label: "Photo Gallery" }, { id: "mobile-apps", label: "Mobile Apps" }]`; the Resources nav children are `/resources#photo-gallery`, `/resources#mobile-apps` in that order; no nav child has an href containing `#downloads` or `#our-books`. Extend `src/lib/site-search.test.ts` (search is built from `navigationItems` in `src/lib/site-search.ts`): the `searchIndex` entries with `parentLabel: "Resources"` are exactly Photo Gallery → `/resources#photo-gallery` and Mobile Apps → `/resources#mobile-apps`, in that order, and no `searchIndex` href contains `#downloads` or `#our-books`. (Both are expected to pass already; they guard FR-002.)
- [X] T022 [P] [US2] Add a US2 block to `e2e/resources.spec.ts` (chromium; gallery-independent):
  - Desktop (1440): open the Resources dropdown → exactly "Photo Gallery", "Mobile Apps" in order. Phone (375): open the mobile menu's Resources group → the same two. Choose "Mobile Apps" at both widths → URL ends `/resources#mobile-apps`, and after `waitForScrollSettled` (`e2e/helpers/scroll.ts`) the `h2` top is ≥ the fixed header's bottom and its bottom is within the viewport; repeat at 768 and 1024 by direct navigation to the hash.
  - /resources has exactly one `h1` ("Resources") and every section `h2` is inside a `section.anchor-section`.
  - No removed anchors (FR-003, SC-006): for every top-level public page (`/`, `/about`, `/academics`, `/admission`, `/resources`, `/news`, `/careers`, `/contact`), fetch the HTML with `request` and assert no `href` contains `#downloads` or `#our-books`, and /resources has no element with id `downloads` or `our-books`.
- [X] T023 [P] [US2] Write failing `e2e/admin-resources-gallery.spec.ts` (admin project, serial; seeds with `seedAlbums` / `clearGallery` from `e2e/helpers/gallery.ts`, restoring the gallery in `afterAll`): with one seeded album that has photos, `section#photo-gallery` comes before `section#mobile-apps` in DOM order; both menu entries (desktop dropdown and mobile group) land with the heading fully visible below the header; `#photo-gallery` has `data-background="surface"` and `#mobile-apps` `data-background="muted"`; with `clearGallery()`, `#photo-gallery` is absent and `#mobile-apps` is the first section after the banner, still `muted`. Fails until T026 gives the gallery its `data-background`.

### Implementation for User Story 2

- [X] T024 [US2] Update the comment above `pageSections.resources` in `src/content/site-shell.ts` to describe the 019 page (Photo Gallery from 007, Mobile Apps from 019; menu, search and page all read this list). No change to the values. Run `rg -n "downloads|our-books" src e2e` and confirm the only remaining hit is the `/resources/our-books` redirect in `next.config.ts` (kept, FR-006) once T026 lands.

**Checkpoint**: T021 and the T022 block pass in chromium; T023 passes after Phase 5.

---

## Phase 5: User Story 3 - The gallery works exactly as before, in the shared section style (Priority: P2)

**Goal**: The Photo Gallery uses `AboutSection` (shared heading, spacing, scroll margin, `surface` background); behaviour, data, hidden-when-empty and admin screens are unchanged.

**Independent Test**: Run the 007 gallery E2E specs and confirm they pass; compare the heading style and spacing with /about and /academics.

### Tests for User Story 3 ⚠️

- [X] T025 [US3] Baseline before any gallery change: with the dev server pre-started, run `npx playwright test e2e/admin-gallery-public.spec.ts e2e/admin-gallery-albums.spec.ts e2e/admin-gallery-photos.spec.ts e2e/admin-gallery-layout.spec.ts e2e/admin-gallery-access.spec.ts e2e/admin-gallery-migration.spec.ts --project=admin` and save the list of failing test titles to the session scratchpad as the before-set (project memory: diff failure sets).

### Implementation for User Story 3

- [X] T026 [US3] In `src/components/gallery/gallery-section.tsx` (research R5): keep the `getPublicGallery()` call and the early `return null` exactly where they are; replace the bare `<section>`/`<h2>` with `<AboutSection id="photo-gallery" background="surface" heading={galleryContent.sectionHeading} stroke>` wrapping the unchanged album grid (`AlbumCard`s, `grid-cols-1 md:grid-cols-2 lg:grid-cols-3`). Rewrite the doc comment: keep the 007 notes (anchor, FR-031, FR-033), replace the Feature 016 paragraph with "On the 019 Resources page it is the first of two sections (Photo Gallery, Mobile Apps), in the shared AboutSection wrapper." Album cards, `album-card.tsx`, the album page and the viewer are not touched.
- [X] T027 [US3] Re-run the T025 command; the after-set of failures must equal the before-set (no new failures). Then run `e2e/admin-resources-gallery.spec.ts` (T023) — it passes. If any 007 assertion targeted the old heading markup, update it and report it (FR-009); research R5 expects none.

**Checkpoint**: 007 failure set unchanged, T023 passes, and the gallery `h2` matches /academics' section headings visually.

---

## Phase 6: User Story 4 - Client reviews the reference links (Priority: P3)

**Goal**: One document the owner can send to the client, covering the 6 portal URLs, the 4 app links and findings R1–R7.

**Independent Test**: Open `docs/content-source/resources/client-review.md` and check it against spec US4 scenarios 1–3 and SC-010.

### Tests for User Story 4 ⚠️

- [X] T028 [P] [US4] Add to `src/content/resources/content.test.ts` (research R12, SC-010): read `docs/content-source/resources/client-review.md` and assert it contains each of the six portal reference URLs from spec "Portal links on the reference header" verbatim, the words "Not secure" next to `http://203.170.66.35/pp`, every URL in `mobileAppsSource.referenceLinks`, the IDs `R1`–`R7`, and a "working replacement" request for each of `scarlet-math`, `scarlet-urdu`, `lms-app` (match by app name). Must fail until T029.

### Implementation for User Story 4

- [X] T029 [US4] Create `docs/content-source/resources/client-review.md` (CRLF), for the client, in plain English:
  - "Portal links": a table of the six labels, reference URLs and the status found on 2026-10-12 (copy from spec.md), with a paragraph that Student Login is a bare IP address over plain HTTP that browsers mark "Not secure", and that the site's own portal links still open "available soon" pages until the client decides (FR-022).
  - "App links": a table with each app, the reference link, works yes/no, file type, store listing found, plus the exact LMS URL checked; for Math, Urdu and LMS App, a request for a working replacement before launch; for Scarlet English, the note that it is a Drive APK with Android's outside-the-Play-Store warning.
  - "Findings R1–R7" with the default applied and the question to approve or reject, and the four Open Questions from spec.md.
  - A checkbox per item so the owner can tick replies (quickstart).

  T028 must pass.
- [X] T030 [US4] Verify spec US4 scenario 3 by running the renamed portal test from T019 (`npx playwright test e2e/page-sections.spec.ts --project=chromium -g "portal link"`): all six footer `/portal/` links open placeholder pages. `git diff --stat src/content/site-shell.ts` shows only the comment change from T024.

**Checkpoint**: T028 passes; the document is ready to send.

---

## Phase 7: Polish & Cross-Cutting Concerns

- [X] T031 [P] Update `docs/architecture.md` (CRLF) only if it lists the Resources page's sections or still mentions Downloads / Our Books: replace with Photo Gallery and Mobile Apps (019). Otherwise leave it unchanged.
- [ ] T032 Run the full checks in sequence (never in parallel with Playwright): `npm test`, `npm run lint`, `npx tsc --noEmit`, then `npm run build` (the module-load parse in T015 must not fail; `/resources` stays ISR with `revalidate = 60`). Fix any failure caused by this feature.
- [ ] T033 After the build finishes, run the quickstart E2E commands: `npx playwright test e2e/resources.spec.ts e2e/page-sections.spec.ts e2e/about.spec.ts e2e/academics.spec.ts --project=chromium` (About/Academics guard the `AboutSection` change, plan Risk 2) and `npx playwright test e2e/admin-resources-gallery.spec.ts e2e/admin-gallery-public.spec.ts --project=admin`. Compare admin failures with the T025 before-set.
- [ ] T034 [P] Save owner screenshots of /resources#mobile-apps at 375, 768, 1024 and 1440 px to `specs/019-resources/screenshots/mobile-apps-{375,768,1024,1440}.png` (quickstart "Owner review screenshots"), and check them by eye against contracts/page-structure.md "Responsive layout".
- [ ] T035 Walk through quickstart.md "Run and look" and tick spec SC-001–SC-010 against the test results; note in the PHR the two edited E2E tests (T019) and any unexpected admin failures.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (Phase 1)**: none. T001 must finish before T009; T002 before T013/T018 render the flyer.
- **Foundational (Phase 2)**: after Setup. Blocks every story. T005 → T006; T007 → T008.
- **US1 (Phase 3)**: after Phase 2. Tests T009–T013 first (fail), then T014 → T015; T016 → T017 → T018 → T020; T019 alongside T020 (both touch the placeholder's removal).
- **US2 (Phase 4)**: after T020 (the page must compose from `pageSections.resources`). T023 also needs T026 to pass.
- **US3 (Phase 5)**: after Phase 2 (needs `AboutSection`); independent of US1's content. T025 must run **before** T026.
- **US4 (Phase 6)**: after T014 (T028 reads `mobileAppsSource`). Otherwise independent; the document itself (T029) can be drafted any time after Setup.
- **Polish (Phase 7)**: after all stories.

### Story completion order

```text
Setup → Foundational ─┬─> US1 (P1, MVP) ──> US2 (P1) ──┐
                      ├─> US3 (P2) ──────────────────── ┼─> Polish
                      └─> US4 (P3, after T014) ─────────┘
```

### Parallel opportunities

- Phase 1: T002 and T003 in parallel with T001.
- Phase 2: T005 and T007 in parallel; T004 alongside either.
- US1: T009, T010, T011, T012, T013 all in parallel (separate files); T016 in parallel with T014/T015.
- US2: T021, T022, T023 in parallel (T022 extends `e2e/resources.spec.ts` after T013 is written).
- US3 and US4 can proceed in parallel with US1/US2 once their prerequisites above are met.
- Polish: T031 and T034 in parallel; T032 and T033 strictly sequential.

### Parallel example: User Story 1

```text
Task: "Write failing src/content/resources/fidelity.test.ts"          (T009)
Task: "Write failing src/content/resources/content.test.ts"           (T010)
Task: "Write failing src/components/resources/app-card.test.tsx"      (T011)
Task: "Write failing src/components/resources/mobile-apps.test.tsx"   (T012)
Task: "Write failing e2e/resources.spec.ts US1 block"                 (T013)
```

## Implementation Strategy

### MVP first (User Story 1)

1. Phase 1 Setup, Phase 2 Foundational.
2. Phase 3 (US1): the Mobile Apps section replaces the placeholder. Stop and validate with the Phase 3 checkpoint. This alone delivers the feature's only new content.

### Incremental delivery

1. US2: menu/anchor/order guarantees and the no-removed-anchors check.
2. US3: the gallery moves into the shared wrapper, guarded by the 007 baseline diff.
3. US4: the client-review document, ready to send before launch.
4. Polish: full checks in sequence, screenshots, success-criteria walk-through.

## Notes

- 35 tasks: Setup 3, Foundational 5, US1 12, US2 4, US3 3, US4 3, Polish 5.
- Every user-story task carries its story label; Setup, Foundational and Polish carry none.
- Commit after each phase checkpoint, on branch `019-resources` (no remote; master untouched, project memory).
