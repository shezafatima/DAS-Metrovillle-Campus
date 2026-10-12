---
description: "Task list for 017-about"
---

# Tasks: About Page — Five Anchored Sections

**Input**: Design documents from `specs/017-about/` (plan.md, spec.md, research.md, data-model.md, contracts/about-content.md, contracts/page-structure.md, quickstart.md)

**Tests**: Requested. The brief lists E2E for anchors, redirects, the hidden team and the four widths, and Constitution XI requires an E2E test per user story. SC-008 needs an axe accessibility scan (owner-approved dev dependency, 2026-10-10). The Read more E2E from the brief is dropped (owner, 2026-10-09). Tests are written first in each phase and must fail before the implementation task that follows them.

**Organization**: Tasks are grouped by user story (spec.md US1–US5), so each story can be built and checked on its own.

**Revision**: 2026-10-10. Applies the /sp.analyze remediation (C1, C2, G1, G3, I1–I8, U1, U2, A1, A2, G2, D1) and the owner's decisions: empty Messages is hidden; axe is approved. Tasks are renumbered (56).

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md
- Paths are relative to the repo root `E:\dar-e-arqam-mc`

## Ground rules for every task

- Text in content files is **verbatim** from `docs/content-source/about/*.txt`. Never fix typos T1, T4 or T5 (spec "Possible typos"). Only T2 (split name and designation) and T3 (trim the trailing tab) are applied.
- Existing tokens only (Constitution VII), plus the three About tokens added in T005:
  - existing: `bg-primary` (navy), `bg-topbar`/`border-topbar` (yellow, accent only), `bg-surface`, `bg-(--color-home-muted-band)`, `text-text`, `text-text-muted`, `SectionHeading` tokens, `anchor-section`, and the Tailwind theme values `max-w-prose`, `rounded-xl`, `max-w-xs` and the spacing scale;
  - added in T005: `aspect-about-person`, `aspect-about-story`, `bg-about-panel`.
  
  No arbitrary bracket values (`aspect-[…]`, `w-[…]`), no translucent colours (`white/20`), no raw hex.
- Server Components only. No `"use client"` in `src/components/about/`.
- Never run `npm run build` and Playwright at the same time (project memory).
- Docs files in this repo use CRLF. Keep the existing line endings when editing them.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the source documents where the brief expects them, add a text reference for the fidelity test, and install the approved accessibility scanner.

- [X] T001 Copy `das-text/ourstory.docx` → `docs/content-source/about/our-story.docx`, `das-text/vision&mission.docx` → `docs/content-source/about/vision-mission.docx`, `das-text/corevalues.docx` → `docs/content-source/about/core-values.docx`, `das-text/messaes.docx` → `docs/content-source/about/messages.docx` (byte copies; leave `das-text/` untouched).
- [X] T002 Extract each copied .docx to UTF-8 plain text, without a BOM, with LF line endings and one Word paragraph per line. Keep empty paragraphs as empty lines and turn `<w:br/>` into a newline, so Ijaz Afzal's name and designation become two lines. Decode XML entities (`&amp;` → `&`) and drop `<w:tab/>`. Write `docs/content-source/about/{our-story,vision-mission,core-values,messages}.txt`. Use PowerShell `System.IO.Compression.ZipFile` to read `word/document.xml` (research R1; no new package). Then check the result: open each .txt and confirm the Urdu reads correctly and matches the spec's Source Content Findings (for example, core-values.txt has 6 English values).
- [X] T003 [P] Create empty folders `src/lib/about/`, `src/content/about/` and `src/components/about/`, and add `docs/content-source/about/README.md` (CRLF). The README says where each file came from (das-text name, renamed from Page 1–4), that the .txt files are the fidelity reference, and that a .txt and its content file must change together when the client approves a fix (quickstart "Common content edits").
- [X] T004 [P] Install the owner-approved dev dependency: run `npm install -D --save-exact @axe-core/playwright@<version>`, choosing the newest version whose peer dependency accepts the installed `@playwright/test` 1.63 (check with `npm view @axe-core/playwright peerDependencies`). Record it in `docs/architecture.md`, where the stack's exact versions are listed (CRLF), with one line: "dev only, accessibility scan in E2E (017, owner-approved 2026-10-10)". Confirm `import AxeBuilder from "@axe-core/playwright"` type-checks (`npx tsc --noEmit`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens, schemas, the visibility and background view, the new section ids and the shared primitives that every story uses.

**⚠️ CRITICAL**: No user-story work starts until this phase is done.

- [X] T005 Add the About tokens:
  - In `src/app/globals.css`, after `--aspect-home-news-card` and following its comment style: `--aspect-about-person: 4 / 5;`, `--aspect-about-story: 4 / 3;` and `--color-about-panel: var(--color-cta-hover);`, with the comment "About (017): no reference page; composed values, see research/design-tokens.md "About page"" and "an alias of an existing navy, not a new colour".
  - In `research/design-tokens.md`, after the "Careers page" section, add "## About page (017 about — no matching reference page)", worded like the Careers section: a table of the three tokens (value and use), the "Reused" list (`bg-primary`, `bg-topbar` accent only, `bg-surface`, `--color-home-muted-band`, `SectionHeading` tokens, `--spacing-home-section-y`, `anchor-section`, `max-w-prose`, `rounded-xl`), and "Deviation (flagged, Constitution I): every value above is composed, not extracted. If the client supplies a design, extract it here first." (spec "Deviation from the Reference Site").
  
  No other new values may be used in this feature.
- [X] T006 [P] Write failing unit tests in `src/lib/about/schema.test.ts`. Each schema in contracts/about-content.md rejects an empty heading, text over its max length, a `longText` with leading or trailing whitespace or with 3+ newlines in a row, duplicate list ids, an id that is not lowercase-hyphenated, and an `icon` outside `ICON_KEYS`. It accepts `image: null` and an `ImageRef`, the optional `urdu` blocks with `lang: "ur"` and the Vision tagline `lang: "ar"`, an empty `members` list, and an empty `messages` list.
- [X] T007 Implement `src/lib/about/schema.ts` exactly as in contracts/about-content.md (Zod 4). `messages` stays `.max(12)` with no minimum (FR-016a). Export `ICON_KEYS`, `IconKey`, every schema and the inferred types `AboutPage`, `OurStory`, `VisionMission`, `CoreValues`, `CoreValue`, `ManagementTeam`, `TeamMember`, `Messages`, `Message`. Reuse the `ImageRef` shape from `src/lib/settings/types.ts` (do not import server code). T006 must pass.
- [X] T008 [P] Write failing unit tests in `src/lib/about/view.test.ts` for the data-model "Derived view":
  - `aboutView({ members: [], messageCount: 3, showPlaceholders: false })` gives sections `our-story, vision-mission, core-values, messages`, backgrounds `surface, navy, muted, surface`, and `teamCards` `[]`.
  - With `showPlaceholders: true` it gives all 5 sections, backgrounds `surface, navy, muted, surface, muted`, and 3 team cards each with `placeholder: true`.
  - With `messageCount: 0` and `showPlaceholders: true`, the sections are `our-story, vision-mission, core-values, management-team` (no `messages`), and the backgrounds still alternate (`surface, navy, muted, surface`).
  - With `messageCount: 0` and `showPlaceholders: false`, the sections are `our-story, vision-mission, core-values`.
  - With one real member, the team is shown with that member only (`placeholder` false), even when `showPlaceholders` is false.
  - `valuesColumns`: 3→3, 6→3, 9→3, 12→3, 4→4, 7→4, 8→4.
  - `aboutNavChildren(view)` returns `{ label, href: "/about#<id>" }` for the visible sections in order.
  - `showTeamPlaceholders({ nodeEnv: "development", forceProduction: false })` is true. With `nodeEnv: "production"` it is false. With `nodeEnv: "development"` and `forceProduction: true` it is false. With `nodeEnv: "test"` it is false.
- [X] T009 Update `src/content/site-shell.ts`: replace `pageSections.about` with `our-story` "Our Story", `vision-mission` "Vision & Mission", `core-values` "Core Values", `management-team` "Our Management Team", `messages` "Messages", in that order. Add the exported `legacyAboutRedirects: { source: string; destination: string }[]` with the 4 entries from contracts/page-structure.md. Update the comment above `pageSections` to say About's old ids were remapped (see `legacyAboutRedirects`). Update `src/content/site-shell.test.ts`: assert `pageSections.about` is exactly these 5 entries in order, and that Careers is still not among the About children (the existing test stays).
- [X] T010 Create the two content files that `aboutView` depends on:
  - `src/content/about/management-team.ts`: export `managementTeam: ManagementTeam` = `{ heading: "Our Management Team", members: [] }`, and a separate `teamPlaceholders: TeamMember[]` with 3 entries: ids `placeholder-1`, `placeholder-2`, `placeholder-3`; `name: "Name"`, `designation: "Designation"`, `description: "Short description"`, `photo: null`. Also export `review = { status: "pending-client-approval", notes: ["Heading is the brief's label, not from a document.", "Members not supplied yet; placeholders are development-only."] }`, with a `// PENDING CLIENT APPROVAL:` comment.
  - `src/content/about/messages.ts`: a **stub**, `messagesContent: Messages` = `{ heading: "Messages", messages: [] }` with `review` pending ("Heading is the brief's label, not from a document."). US4 (T042) fills the list. Until then Messages is hidden everywhere (FR-016a), so the menu never points at a missing section.
- [X] T011 Implement `src/lib/about/view.ts`:
  - `showTeamPlaceholders({ nodeEnv, forceProduction })`.
  - `aboutView({ members, messageCount, showPlaceholders })` returns `{ sections: { id, label, background }[], teamCards: (TeamMember & { placeholder: boolean })[] }`. It uses `pageSections.about` for order and labels, includes `messages` only when `messageCount > 0`, and uses `teamPlaceholders` from T010.
  - `valuesColumns(count)` returns 3 when `count % 3 === 0`, else 4.
  - `aboutNavChildren(view)`.
  
  Create `src/lib/about/resolve-view.ts`, starting with `import "server-only";` (as in `src/lib/gallery/folder.ts`), so `view.ts` stays pure. Export `resolveAboutView()`. It computes `forceProduction` as `freshReadsForTests() && (await cookies()).get("e2e-production-content")?.value === "1"`, calling `cookies()` from `next/headers` **only** inside the `freshReadsForTests()` branch (research R4). It then returns `aboutView({ members: managementTeam.members, messageCount: messagesContent.messages.length, showPlaceholders: showTeamPlaceholders({ nodeEnv: process.env.NODE_ENV, forceProduction }) })`.
  
  T008 must pass.
- [X] T012 [P] Create `src/components/about/paragraphs.tsx`. `Paragraphs({ text, className })` splits a `longText` on `"\n\n"` and renders one `<p>` per paragraph, with `className` defaulting to `font-body text-body text-text`. Add `src/components/about/paragraphs.test.tsx` (3 paragraphs in → 3 `<p>` out, text unchanged including quote characters).
- [X] T013 [P] Create `src/components/about/about-section.tsx`. `AboutSection({ id, background, heading, line, children })` renders:
  - `<section id={id} aria-labelledby={`${id}-heading`} data-background={background} className="anchor-section py-(--spacing-home-section-y) ...">`, with background class `surface` → `bg-surface`, `muted` → `bg-(--color-home-muted-band)`, `navy` → `bg-primary`.
  - An inner container `mx-auto max-w-(--container-max-width) px-(--container-gutter-x)`.
  - `SectionHeading` (`src/components/home/section-heading.tsx`) with `id={`${id}-heading`}`. Use `tone="light"` and `divider={false}` when navy, otherwise `tone="dark"`; pass `line`.
  
  Add `src/components/about/about-section.test.tsx` checking the id, the `aria-labelledby` and h2 link, `data-background`, and the `anchor-section` class.
- [X] T014 [P] Create `src/components/about/person-photo.tsx`. `PersonPhoto({ photo, name })` draws a fixed `aspect-about-person` frame, `w-full`, `overflow-hidden rounded-xl`:
  - With an `ImageRef`: `next/image` with `fill`, `object-cover`, `alt={name}`, and `sizes` for 1–4 column grids.
  - With `null`: `PersonPlaceholder`, a `div` with `bg-(--color-home-muted-band)` centring a lucide `UserRound` in `text-text-muted`, both `aria-hidden="true"`, with the icon also `focusable="false"`.
  
  Add `src/components/about/person-photo.test.tsx` (an ImageRef gives an img whose alt is the name; null gives no img and an `aria-hidden` placeholder; the frame has class `aspect-about-person`).

**Checkpoint**: `npx vitest run src/lib/about src/components/about src/content/site-shell.test.ts` passes.

---

## Phase 3: User Story 1 - Visitor reads who the school is (Priority: P1) 🎯 MVP

**Goal**: /about shows the banner h1, then Our Story, Vision & Mission and Core Values with the client's verbatim English text, distinct backgrounds, and the V&M highlight.

**Independent Test**: Open /about. Compare each section's text with `docs/content-source/about/*.txt`. Check there is one h1, the order, and the V&M panels and value tiles at desktop and phone widths.

### Tests for User Story 1 ⚠️

- [X] T015 [P] [US1] Write failing `src/content/about/content.test.ts`. Every About content file's exported value parses with its schema from `src/lib/about/schema.ts`. Core values have exactly 6 items with ids `leadership, responsibility, commitment, excellence, respect, citizenship`. Every `review.status` is `"pending-client-approval"`.
- [X] T016 [P] [US1] Write failing `src/content/about/fidelity.test.ts` (research R1). It reads each `docs/content-source/about/*.txt` with `fs` and checks:
  1. Every English string in `our-story.ts`, `vision-mission.ts` and `core-values.ts` (headings, subheadings, each paragraph of each `longText`, value names and descriptions) equals a line of its .txt, and the lines appear in the same order as in the .txt.
  2. Every non-empty English line of those .txt files is used, except an explicit `EXCLUDED` list: the four taglines (spec Finding 1).
  3. Every Urdu string in the `urdu` blocks equals a .txt line after trimming (T3).
  
  Messages are added in US4 (T040).
- [X] T017 [P] [US1] Write failing component tests:
  - `src/components/about/our-story.test.tsx`: renders the heading, subheading and 3 paragraphs; no element has `lang="ur"`; when `image` is null, the emblem image is decorative (`alt=""`) inside an `aspect-about-story` panel.
  - `src/components/about/vision-mission.test.tsx`: two panels with h3 "Vision" and "Mission", each with class `bg-about-panel`; the Vision tagline is present; icons are `aria-hidden`; no `lang="ur"` or `lang="ar"` text is rendered.
  - `src/components/about/core-values.test.tsx`: the intro plus a `ul` with 6 `li`, each with an h3 name, its description and an `aria-hidden` icon; with 6 values the list has class `lg:grid-cols-3`, and with 4 values `lg:grid-cols-4`.
- [X] T018 [P] [US1] Write failing `e2e/about.spec.ts` › "US1 content":
  - /about has exactly one h1 ("About Us").
  - The first three `section` ids in DOM order are `our-story, vision-mission, core-values`. The full order is asserted in T049.
  - Each section has one h2 matching its `aria-labelledby`.
  - The Our Story text contains the first sentence of `our-story.txt` paragraph 1.
  - The V&M panels sit side by side at 768 and 1440 px (same `top` within 2 px) and stack at 375 px (second panel's top > first panel's bottom).
  - The Core Values grid has 3 columns at 1440 px (count the distinct `left` values of the tiles), 2 at 768 px and 1 at 375 px.
  - `data-background` alternates as in T008 for the visible sections.
  - No `[lang="ur"]` element exists.
  - The `main` text does not contain "Knowledge That Inspires", "Excellence Rooted in Values", "Creating Thinkers with Integrity", "Where Intelligence Meets Character", "(Page No 1)" or "Welcome Note" (FR-009, FR-021).

### Implementation for User Story 1

- [X] T019 [P] [US1] Create `src/content/about/page.ts`: `aboutPage: AboutPage = { title: "About Us" }`, and `review` pending (title not from a document), with a `// PENDING CLIENT APPROVAL:` comment.
- [X] T020 [P] [US1] Create `src/content/about/our-story.ts` from `our-story.txt`:
  - `heading: "Our Story"`, `subheading: "Building a Legacy of Excellence Since 2021"`.
  - `body`: the 3 English paragraphs joined with `"\n\n"`, copied character for character, keeping the em dash "—".
  - `image: null`.
  - `urdu`: `lang: "ur"`, with the Urdu heading, subheading and 3 paragraphs verbatim.
  
  `review` notes: T5 ("سائٹ ٹاون" spelling, pending), Finding 5 (English and Urdu differ). Omit the tagline "Knowledge That Inspires".
- [X] T021 [P] [US1] Create `src/content/about/vision-mission.ts` from `vision-mission.txt`:
  - `heading: "Our Vision & Mission"`, `subheading: "Guided by Faith, Driven by Excellence"`.
  - `vision: { heading: "Vision", tagline: "Excellence in this World and the Hereafter", body }`, `mission: { heading: "Mission", body }`.
  - `urdu`: `lang: "ur"`. `vision.heading` is "ہمارا وژن", `vision.tagline` is `{ lang: "ar", text: "فِي الدُّنْيَا حَسَنَةً وَفِي الْآخِرَةِ حَسَنَةً" }`, plus `vision.body`. `mission: { heading: "ہمارا مشن", body }`. All verbatim.
  
  `review` notes: T6 heading wording, Finding 4 (Arabic), Finding 5. Omit "Excellence Rooted in Values".
- [X] T022 [P] [US1] Create `src/content/about/core-values.ts` from `core-values.txt`:
  - `heading: "Our Core Values"`, `subheading: "The Principles That Guide Every Step"`, the `intro` paragraph.
  - The 6 values with ids and icons per the data-model table, and descriptions verbatim (each ends with a full stop).
  - `urdu`: heading, subheading, intro and 6 values with the **same ids**. The Responsibility name is "ذمہ داری", trimmed (T3).
  
  `review` notes: T4 (طلبا vs طلبہ), T6, Finding 5 (Respect wording). Omit "Creating Thinkers with Integrity".
- [X] T023 [P] [US1] Create `src/components/about/value-icons.ts`: a `Record<IconKey, LucideIcon>` mapping `compass→Compass, shield-check→ShieldCheck, target→Target, award→Award, heart-handshake→HeartHandshake, landmark→Landmark, users→Users, book-open→BookOpen, star→Star, sprout→Sprout` from `lucide-react`. Exhaustiveness is checked by the type.
- [X] T024 [US1] Create `src/content/about/index.ts`. It re-exports each content value **parsed** with its schema (`ourStorySchema.parse(ourStory)` and so on, including the T010 team and messages files), so a bad edit fails loudly at build and in tests, together with `teamPlaceholders` and the `review` objects. Depends on T010 and T019–T022. Change `src/lib/about/resolve-view.ts` to read from this index. T015 and T016 must pass now.
- [X] T025 [P] [US1] Create `src/components/about/our-story.tsx`: `OurStorySection({ value, background })` using `AboutSection` (`id="our-story"`, `heading`/`line` from the value).
  - Below `lg`: one column. At `lg`: `grid lg:grid-cols-12 lg:gap-12 lg:items-center`, with text `lg:col-span-7` in `Paragraphs` inside `max-w-prose`, and the image `lg:col-span-5`.
  - Image: when `value.image` is set, `next/image` in an `aspect-about-story` frame with `object-cover rounded-xl`, alt "" (decorative). When null, `/images/logo-emblem.svg` with `alt=""`, centred on a `bg-(--color-home-muted-band)` (or `bg-surface` when the section is muted) rounded `aspect-about-story` panel.
  
  Urdu is not rendered. T017 Our Story tests must pass.
- [X] T026 [US1] Create `src/components/about/vision-mission.tsx`: `VisionMissionSection({ value })`, always `background="navy"` (plan Key Design Point 4, research R6).
  - Layout: `grid gap-6 md:grid-cols-2` (side by side from 768 px, FR-012). Each panel is an `article` with `rounded-xl bg-about-panel border-t-4 border-t-topbar p-6 md:p-8 flex flex-col gap-4`. It contains a `bg-topbar` circular icon disc holding a `text-primary` lucide icon (Eye for Vision, Flag for Mission, `aria-hidden`, `focusable="false"`), an h3 in `font-heading font-bold text-white`, and for Vision the tagline in `font-heading text-white` (italic or medium weight, using existing font tokens). The body is `Paragraphs` with `text-white`.
  - No translucent border. Never yellow text on a white background, and never white text on a yellow background.
  
  Before building, read `src/components/home/inspiration-why-choose.tsx` and `src/components/home/books-section.tsx` and reuse their navy-band spacing tokens. T017 V&M tests must pass.
- [X] T027 [P] [US1] Create `src/components/about/core-values.tsx`: `CoreValuesSection({ value, background })`.
  - The intro is `Paragraphs` centred in `mx-auto max-w-prose`.
  - Then a `ul` with `grid grid-cols-1 gap-6 md:grid-cols-2`, plus `lg:grid-cols-3` or `lg:grid-cols-4` from `valuesColumns(values.length)`. Write both class strings literally so Tailwind sees them.
  - Each `li` is a tile with `rounded-xl bg-surface p-6 flex flex-col gap-3` (when the section background is surface, use `bg-(--color-home-muted-band)` for the tile instead), containing a `text-primary` icon from `valueIcons` (`aria-hidden`), an h3 name in `font-heading font-bold text-primary`, and the description as `p` in `text-text`.
  
  Long words wrap (`break-words`). T017 Core Values tests must pass.
- [X] T028 [US1] Replace `src/app/(public)/about/page.tsx`.
  - Add `export const metadata: Metadata = { title: "About Us", description: <first paragraph of ourStory.body>, alternates: { canonical: "/about" } }`.
  - The default export is an async page: `const view = await resolveAboutView()`. Render `<PageBanner title={aboutPage.title} trail={["About"]} breadcrumbHome=… />`, reading `breadcrumbHome` from the same source Careers uses (`careersCopy.banner.breadcrumbHome`; if it is a shared string, read it from where Careers reads it and do not duplicate it). Then map `view.sections` to components by id: `our-story` → `OurStorySection`, `vision-mission` → `VisionMissionSection`, `core-values` → `CoreValuesSection`, passing each its `background`. `management-team` and `messages` render nothing until US5 and US4.
  - Remove the `AnchoredPage` import here only, since Academics and Admission still use it.
- [X] T029 [US1] Run `npx vitest run src/lib/about src/content/about src/components/about`, then (with no build running) `npx playwright test e2e/about.spec.ts --project=chromium -g "US1"`. Fix until green.

**Checkpoint**: /about shows the banner and three real sections. This is the MVP.

---

## Phase 4: User Story 2 - Visitor jumps to a section from the menu (Priority: P1)

**Goal**: The desktop dropdown, mobile menu and header search list the visible About sections, from the same `aboutView` as the page, and anchors land clear of the fixed header.

**Independent Test**: From /contact, pick each built About entry on desktop (1440) and mobile (375). The URL becomes `/about#<id>`, the heading is fully below the header, and the menu lists the visible sections in order.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Write a failing test in `src/components/site-shell/search-box.test.tsx`: with an `index` prop containing only "Our Story", typing "story" lists it and typing "overview" lists nothing. Add a failing `src/lib/site-search.test.ts` case for `buildSearchIndex(items)` flattening children with `parentLabel`.
- [X] T031 [P] [US2] Write failing `e2e/about.spec.ts` › "US2 navigation":
  - Desktop 1440: from /contact, hover About in "Main menu". Its links begin, in order, with Our Story, Vision & Mission and Core Values, and Careers is absent. At this stage Messages is not listed (its content is empty until US4) and Our Management Team is listed in dev. T044 and T048 extend this check to the full list.
  - Click Our Story, Vision & Mission and Core Values (the sections built so far): each lands on `/about#<id>` with `section#<id>` top ≥ header height − 1 (same helper as `e2e/page-sections.spec.ts` `clearOfHeader`).
  - Mobile 375: open the menu, expand About, tap "Core Values". The menu closes and the section is clear of the header.

### Implementation for User Story 2

- [X] T032 [US2] In `src/lib/site-search.ts`, export `buildSearchIndex(items: NavigationItem[]): SearchResult[]` (the existing `flatten`), and keep `searchIndex = buildSearchIndex(navigationItems)` for back-compat. T030's lib test must pass.
- [X] T033 [US2] In `src/components/site-shell/search-box.tsx`, add an optional prop `index?: SearchResult[]` and pass it to `searchSite(query, index)`. The default stays as today. T030's component test must pass.
- [X] T034 [US2] Make `src/components/site-shell/header.tsx` an async Server Component:
  - `const view = await resolveAboutView()`.
  - `const items = navigationItems.map((item) => item.href === "/about" ? { ...item, children: aboutNavChildren(view) } : item)`.
  - `const index = buildSearchIndex(items)`.
  - Render `<NavDesktop items={items} />`, `<SearchBox index={index} />` and `<NavMobile items={items} searchIndex={index} />`.
  
  Add `searchIndex?: SearchResult[]` to `NavMobile`'s props in `src/components/site-shell/nav-mobile.tsx` and pass it to its `<SearchBox index={searchIndex} />`. Check that `src/components/site-shell/public-shell.tsx` renders `<Header />` inside an async component (it already does), and that `header.tsx` and any `public-shell.test.tsx` still pass. If a test renders `Header` synchronously, update it to `await Header()`.
- [X] T035 [US2] Run `npx vitest run src/components/site-shell src/lib/site-search.test.ts` and `npx playwright test e2e/about.spec.ts --project=chromium -g "US2"`. Fix until green.

**Checkpoint**: The menu, search and page agree, and anchors land correctly. Production is now safe to deploy: the team is hidden in production and Messages is hidden while empty, so no menu entry points at a missing section.

---

## Phase 5: User Story 3 - Old About links still work (Priority: P2)

**Goal**: The 4 old /about/... URLs redirect permanently to the mapped targets. Other /about/* paths stay 404. No on-site link targets a removed anchor.

**Independent Test**: Request each old URL with `maxRedirects: 0`. Expect 308 and the mapped `location`. `/about/unknown` returns 404. The home Salient Features card's href is `/about`.

### Tests for User Story 3 ⚠️

- [X] T036 [P] [US3] Update `e2e/page-sections.spec.ts`:
  - Set `PAGES["/about"]` to `["our-story", "vision-mission", "core-values"]` (Team and Messages visibility is checked in about.spec), and build `REDIRECTS` from Academics and Admission only, plus the 4 explicit About pairs from contracts/page-structure.md.
  - Change the keyboard test so it expects the first About child "Our Story" to be focused and the URL `/about#our-story`.
  - Add a test that `GET /` contains no `href="/about#salient-features"` and that the Salient Features quick card links to `/about`.

### Implementation for User Story 3

- [X] T037 [US3] Update `next.config.ts`: build `sectionRedirects` from `(["academics", "admission"] as const)` only, and add `...legacyAboutRedirects.map((r) => ({ ...r, permanent: true }))`, importing `legacyAboutRedirects` from `./src/content/site-shell`. Update the comment to name the About remap.
- [X] T038 [P] [US3] In `src/content/home.ts`, change the `salient-features` quick-access card `href` from `"/about#salient-features"` to `"/about"`, with a short comment that the About sections were remapped in 017. Then search `src/` and `e2e/` for any other `/about#overview`, `/about#salient-features` or `/about#management"` (old id) references and update them.
- [X] T039 [US3] Run `npx playwright test e2e/page-sections.spec.ts --project=chromium`. Fix until green. Note: `next.config.ts` changes need a dev-server restart. If you reuse a running server on port 3100, restart it.

**Checkpoint**: Old links and bookmarks keep working.

---

## Phase 6: User Story 4 - Visitor reads a leader's message (Priority: P2)

**Goal**: The Messages section shows the 3 messages in full, in document order, with a photo or placeholder, the name and the designation. The photo side alternates at desktop. There is no Read more toggle. The section and its menu entry appear now that the list is filled.

**Independent Test**: Open /about#messages. There are 3 `article`s in order (Khairullah Aziz, Ijaz Afzal, Faiza Zeeshan) with the full text visible with no interaction. At 1440 the photo sides go start, end, start; at 375 the photo is above the text. "Messages" is the last About menu entry.

### Tests for User Story 4 ⚠️

- [X] T040 [P] [US4] Extend the tests:
  - `src/content/about/content.test.ts`: messages parse, there are 3 messages with the data-model ids in order, and the Ijaz Afzal name and designation are separate fields (T2).
  - `src/content/about/fidelity.test.ts`: each message `body` equals its quoted paragraph from `messages.txt`, including the straight `"` quotes. Each name and designation equals its own `messages.txt` line: T002 turns Word's manual line break into a newline, so Ijaz Afzal's name and designation are already separate lines (T2). `EXCLUDED` gains "(Page No 1)", the "Welcome Note" heading and its 2 paragraphs, and "Where Intelligence Meets Character" (spec Findings 1–3).
  - `src/components/about/messages.test.tsx`: one `article` per message with an h3 name, the designation and the full body; no `button` is rendered; `data-photo-side` alternates `start`, `end`, `start`; a missing photo renders the `aria-hidden` placeholder; a message whose name is in Urdu script renders that name with `lang="ur"` and `dir="rtl"`.
- [X] T041 [P] [US4] Add `e2e/about.spec.ts` › "US4 messages":
  - 3 articles, in order.
  - No "Read more" button anywhere in the section.
  - At 1440, the photo of article 1 is left of its text, article 2 right and article 3 left (compare the `left` of the photo frame with the text block).
  - At 375, each photo's bottom is ≤ its text's top.
  - With JavaScript disabled (`test.use({ javaScriptEnabled: false })`), all 3 full bodies are visible.
  
  Add to › "US2 navigation": "Messages" is now the last About link. Clicking it in the desktop dropdown, and loading `/about#messages` directly, each land clear of the header.

### Implementation for User Story 4

- [X] T042 [US4] Fill `src/content/about/messages.ts` (the T010 stub) from `messages.txt`: the 3 messages with ids, names and designations from the data-model table, `photo: null`, and `body` the quoted paragraph verbatim. `review` notes: T1 (designation pattern, pending), T2 applied (formatting only), heading not from a document, photos missing, Welcome Note left out.
- [X] T043 [US4] Create `src/components/about/messages.tsx`: `MessagesSection({ value, background })` using `AboutSection id="messages"`.
  - Each message is an `article` with `aria-labelledby` pointing to its h3 and `data-photo-side={index % 2 === 0 ? "start" : "end"}`, laid out as `flex flex-col gap-6 lg:flex-row lg:items-start`, plus `lg:flex-row-reverse` when the side is "end".
  - The photo column is `w-full max-w-xs lg:w-1/4 shrink-0` with `PersonPhoto`.
  - The text column holds an h3 name (`font-heading font-bold text-primary`), the designation (`text-text-muted`), then `Paragraphs` inside a `blockquote` within `max-w-prose`. Mark the name and designation `lang="ur" dir="rtl"` when `isRtlScript()` (`src/lib/rtl-text.ts`) is true for that text.
  - Messages are separated by the existing section gap token. There is no toggle.
- [X] T044 [US4] In `src/app/(public)/about/page.tsx`, map `messages` → `<MessagesSection value={messagesContent} background={section.background} />`. Run `npx vitest run src/content/about src/components/about` and `npx playwright test e2e/about.spec.ts --project=chromium -g "US4|US2"`. Fix until green.

**Checkpoint**: All Messages content is live.

---

## Phase 7: User Story 5 - Management team appears only with real data (Priority: P3)

**Goal**: In development, 3 labelled placeholder cards appear. In production (and under the test cookie), the section, its menu entry and its search entry are absent while `members` is empty. Real members always show.

**Independent Test**: In dev, /about has `section#management-team` with 3 `[data-placeholder="true"]` cards. With cookie `e2e-production-content=1`: there is no `section#management-team`, no "Our Management Team" link in the desktop or mobile menus, no search result for "management", and the rest of the page is unchanged.

### Tests for User Story 5 ⚠️

- [X] T045 [P] [US5] Write failing `src/components/about/management-team.test.tsx`:
  - Placeholder cards show the visible text "Placeholder", plus "Name", "Designation" and "Short description", have `data-placeholder="true"`, and use an `aria-hidden` silhouette.
  - Real cards show the name (h3), designation and description, with photo alt = name.
  - A member whose name or designation is in Urdu script gets `lang="ur"` and `dir="rtl"` on that element.
  - The grid classes are `grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`.
- [X] T046 [P] [US5] Write failing `e2e/about.spec.ts` › "US5 team":
  - (a) Dev default: 3 placeholder cards, each containing "Placeholder". Every card's photo frame has the same width:height ratio, the `--aspect-about-person` ratio (4:5) within 1%.
  - (b) Production rule, using `context.addCookies([{ name: "e2e-production-content", value: "1", url: baseURL }])`: no `#management-team`; the desktop About dropdown has 4 links (no "Our Management Team"); the mobile About group has 4 links; typing "management" in the header search gives no result; `/about#management-team` loads at the top with no error (`scrollY` is 0, or the page did not jump to a missing element); there is no text "Placeholder", "Short description" or "Designation" anywhere on /about or /.
  - (c) Backgrounds follow the hidden-team pattern `surface, navy, muted, surface`.
  
  Add to › "US2 navigation": in dev, the desktop About links are exactly Our Story, Vision & Mission, Core Values, Our Management Team, Messages, and clicking "Our Management Team" lands clear of the header.

### Implementation for User Story 5

- [X] T047 [US5] Create `src/components/about/management-team.tsx`: `ManagementTeamSection({ heading, subheading, cards, background })` using `AboutSection id="management-team"`.
  - A `ul` with `grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4`. Each `li` is a card holding `PersonPhoto`, an h3 name (`font-heading font-bold text-primary`), the designation (`text-text-muted`) and the description (`text-text`). Mark the name and designation `lang="ur" dir="rtl"` when `isRtlScript()` is true for that text.
  - When `card.placeholder`, add `data-placeholder="true"`, a visible badge "Placeholder" above the name (reuse `src/components/ui/badge.tsx` if its public styling uses existing tokens, otherwise a small `rounded border border-text-muted text-text-muted` label), and a dashed border on the card (`border-dashed border-text-muted`).
  
  T045 must pass.
- [X] T048 [US5] In `src/app/(public)/about/page.tsx`, map `management-team` → `<ManagementTeamSection heading={managementTeam.heading} subheading={managementTeam.subheading} cards={view.teamCards} background={section.background} />` (rendered only when present in `view.sections`). Run `npx playwright test e2e/about.spec.ts --project=chromium -g "US5|US2"`. Fix until green.

**Checkpoint**: All five sections are done. Production never shows placeholders.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T049 [P] Add `e2e/about.spec.ts` › "layout and accessibility". For widths 375, 768, 1024 and 1440:
  - `document.documentElement.scrollWidth <= window.innerWidth`.
  - Section order is `our-story, vision-mission, core-values, management-team, messages` (dev).
  - Body paragraphs in Our Story and Messages are ≤ 75ch wide: measure the `p` width against `ch` from a probe span.
  
  SC-008:
  - An axe scan, `new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze()` (`@axe-core/playwright`, T004), runs on /about twice: in the dev default and with the `e2e-production-content=1` cookie. Fail if any violation has impact `serious` or `critical`, and print the violation ids and targets.
  - Explicit assertions alongside it: exactly one h1; each `section` has an `aria-labelledby` that resolves to its h2; every `svg` inside `main` is `aria-hidden="true"`; every `img` inside `main` has an `alt` attribute; there are no duplicate ids on the page.
- [X] T050 [P] Update `e2e/mobile-navigation.spec.ts` (the "expands and collapses in place" test): replace the "Overview" link checks with "Our Story". Check `e2e/desktop-navigation.spec.ts`, `e2e/shell-and-placeholders.spec.ts` (an h1 "About Us" still matches name "About") and `e2e/site-search.spec.ts` for old About labels, and update any that reference Overview, Salient Features or Management.
- [X] T051 [P] Write `docs/content-source/about/client-review.md` (CRLF) for the client. Include:
  - The file mapping.
  - The counts: 6 values, 3 messages.
  - Items not used: Findings 1–5, the Welcome Note and the Urdu versions (stored, not shown).
  - The T1–T6 table with "as written" and "proposed fix".
  - The redirect mapping.
  - The open questions from spec.md (team, photos, fixes, story photo, taglines, English/Urdu differences, page title, Welcome Note, Urdu display).
  
  Plain language, no code.
- [X] T052 Run `npm run lint` and `npx tsc --noEmit`. Fix all issues in the touched files.
- [X] T053 Run the full unit suite `npm test`. All tests pass (fix any fallout in `src/components/site-shell/*.test.tsx`).
- [X] T054 Stop any Playwright or dev server, then run `npm run build`. Confirm:
  - (a) It succeeds.
  - (b) The route table shows `/about` and `/` as static (○), not dynamic (ƒ), which proves the test seam never runs in production (plan Risk 1).
  - (c) `npx next start` followed by GET /about shows no `management-team` section and no "Placeholder" text.
  
  Stop the server afterwards.
- [X] T055 After T054 has finished, run the public Playwright suite `npx playwright test --project=chromium`. Compare failures with the known baseline in project memory (admin E2E failures are pre-existing and not in this project). Every failure in about, page-sections, mobile-navigation, desktop-navigation, site-search or shell specs must be fixed. Record anything unrelated in the PHR.
- [X] T056 Manual review per quickstart.md "Manual check before done" at 375, 768, 1024 and 1440 in the browser, including the V&M highlight against the palette rule (no yellow text on white, no white text on yellow). Note the results in the implementation PHR.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T004)**: none. T002 depends on T001. T003 and T004 are independent.
- **Foundational (T005–T014)**: depends on Setup. T005 comes before any component task (T014, T025–T027, T043, T047). T007 after T006. T011 after T008, T009 and T010. T012–T014 are independent of each other.
- **US1 (T015–T029)**: depends on Foundational. This is the MVP.
- **US2 (T030–T035)**: depends on Foundational (`aboutView`) and US1 (sections to land on). Its anchor clicks cover the US1 sections; Messages and Team clicks are added in US4 (T041) and US5 (T046).
- **US3 (T036–T039)**: depends only on T009. It can run in parallel with US1 and US2.
- **US4 (T040–T044)**: depends on Foundational, T028 (page exists) and T034 (the menu uses `aboutView`, so Messages appears once filled).
- **US5 (T045–T048)**: depends on Foundational, T028 and T034.
- **Polish (T049–T056)**: after all stories. T054 then T055 run strictly in sequence; never build and run Playwright together.

### Within each story

Tests first (they fail), then content, then components, then page wiring, then a test run.

### Parallel opportunities

- Setup: T003 and T004 alongside T001 and T002.
- Foundational: T006, T008, T012 and T013 together, after T005. Then T007, then T009 and T010, then T011. T014 after T005.
- US1: T015–T018 together. T019–T023 together (separate files). T025 and T027 together after T024, with T026 alongside (separate file).
- US3 can be built by a second person during US1 and US2.
- US4 tests T040 and T041 together. US5 tests T045 and T046 together.
- Polish: T049, T050 and T051 together.

### Parallel example: User Story 1

```text
Together: T015 content.test.ts · T016 fidelity.test.ts · T017 component tests · T018 e2e US1
Together: T019 page.ts · T020 our-story.ts · T021 vision-mission.ts · T022 core-values.ts · T023 value-icons.ts
Then:     T024 index.ts
Together: T025 our-story.tsx · T026 vision-mission.tsx · T027 core-values.tsx
Then:     T028 page.tsx → T029 run
```

## Implementation Strategy

### MVP first (US1, then US2 before any deploy)

Phases 1–2, then Phase 3. The result is /about with the banner, Our Story, Vision & Mission and Core Values.

Until US2, the header still lists every About anchor from the static `navigationItems`. **Do not deploy US1 alone.** After US2, production is safe to deploy: the team is hidden in production and Messages is hidden while its content is empty, so every menu entry has a section. In dev the menu lists Our Management Team before US5 builds the section; that is expected.

### Incremental delivery

1. Setup + Foundational.
2. US1 (content) → review with the owner.
3. US2 (menus) + US3 (redirects) → navigation complete; deployable.
4. US4 (messages) → all client text live.
5. US5 (team rule) → dev placeholders and the production check.
6. Polish → axe scan, build check, full public E2E, client review document.

## Notes

- Total: 56 tasks.
- [P] tasks touch different files with no dependency on unfinished tasks.
- Commit after each phase checkpoint. Commit the `das-text/` renames (owner, 2026-10-09; 7 deletions and 7 new files with identical contents) with the Phase 1 commit.
