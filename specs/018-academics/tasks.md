---
description: "Task list for 018-academics"
---

# Tasks: Academics Page

**Input**: Design documents from `specs/018-academics/` (plan.md, spec.md, research.md, data-model.md, contracts/academics-content.md, contracts/page-structure.md, quickstart.md)

**Tests**: Requested. Constitution XI requires an E2E test per user story, SC-006 needs an axe scan, and research R12 lists the unit and component tests. In each phase the tests come first and must fail before the implementation task that follows them.

**Organization**: Tasks are grouped by user story (spec.md US1–US5), so each story can be built and checked on its own.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: can run in parallel (different files, no dependency on an unfinished task)
- **[Story]**: US1–US5 from spec.md
- Paths are relative to the repo root `E:\dar-e-arqam-mc`

## Ground rules for every task

- Text in content files is **verbatim** from `docs/content-source/academics/*.txt` (FR-007). Never fix T5 or T6. Never change the case of "HIFZ-UL-QURAN PROGRAM", in content or CSS (T4, no `uppercase`/`capitalize` classes). The only line not in a source is the T1 sentence, marked `// PENDING CLIENT APPROVAL:`.
- No Urdu in any content file or on the page (FR-008).
- Existing tokens only (Constitution VII), plus the three tokens added in T005: `aspect-academics-overview`, `aspect-academics-photo`, `--spacing-academics-collage-offset`. Reused: `bg-surface`, `bg-(--color-home-muted-band)`, `bg-primary`, `max-w-prose`, `max-w-4xl`, `rounded-xl`, `--spacing-home-section-y`, `anchor-section`, the `SectionHeading` tokens. No bracket values (`aspect-[…]`, `mt-[…]`), no translucent colours, no raw hex.
- Server Components everywhere except `src/components/media/video-embed.tsx`. No `"use client"` in `src/components/academics/`.
- Before writing code that uses a Next.js API, read its guide in `node_modules/next/dist/docs/` and follow any deprecation notices (CLAUDE.md). This covers `cookies()` (T009, T043), `Metadata` (T028), `redirects()` (T036) and `next/image` (T025, T041, T051).
- Test seams (`e2e-production-content`, `e2e-academics-media`) are read **only** inside a `freshReadsForTests()` branch (`src/lib/e2e-fresh-reads.ts`), so production pages stay static.
- Never run `npm run build` and Playwright at the same time (project memory). `next.config.ts` changes need a dev-server restart.
- Files in `specs/018-academics/` use LF. Existing CRLF docs (`docs/architecture.md`, `research/design-tokens.md`) keep CRLF; new files under `docs/content-source/academics/` use CRLF like 017's.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Put the source documents where the brief expects them and commit the text references for the fidelity test (research R1).

- [X] T001 Byte-copy `das-text/Academic Excellence .docx` → `docs/content-source/academics/academic-overview.docx` and `das-text/HIFZ-UL-QURAN.docx` → `docs/content-source/academics/hifz-e-quran.docx`. Leave `das-text/` untouched.
- [X] T002 Extract both copied .docx files to UTF-8 plain text (no BOM, LF, one Word paragraph per line, empty paragraphs kept as empty lines, `<w:br/>` → newline, XML entities decoded, `<w:tab/>` dropped) into `docs/content-source/academics/academic-overview.txt` and `docs/content-source/academics/hifz-e-quran.txt`. Use the same PowerShell `System.IO.Compression.ZipFile` reader on `word/document.xml` as 017's T002 (no new package). Check the result against spec "Source Content": academic-overview.txt has the English heading, subheading, 3 paragraphs, the Urdu block and the trailing "Curiosity with Purpose" (T2); hifz-e-quran.txt has the English heading, subheading, intro, 2 subheadings with paragraphs and the Urdu block containing the T1 sentence. Curly apostrophes (`’` in "Qur’an") must survive.
- [X] T003 [P] Create `docs/content-source/academics/teachers-training.txt` (UTF-8, LF): line 1 the intro paragraph, then the 19 list items one per line, in source order, copied from <https://das.edu.pk/academics/teachers-training/>. Fetch the page again to confirm the wording matches spec "Source Content" character for character (straight `'`, the "/" in "Teacher / Student assessment manuals"); if it differs, stop and report to the owner rather than editing silently.
- [X] T004 [P] Create `docs/content-source/academics/README.md` (CRLF): where each file came from (the das-text name and its renamed copy; the live URL and copy date 2026-10-12 for teachers-training.txt, FR-011), that the .txt files are the fidelity reference, and that a .txt and its content file change together when the client approves a fix (quickstart "Common content edits"). Create the folders `src/lib/academics/`, `src/lib/video/`, `src/lib/content/`, `src/content/academics/`, `src/components/academics/`, `src/components/media/`, and `public/images/academics/teachers-training/` (with a `.gitkeep`).

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Tokens, the shared helpers moved out of About, the video URL parser, the Academics schemas and the new section ids.

**⚠️ CRITICAL**: No user-story work starts until this phase is done.

- [X] T005 Add the Academics tokens (research R9):
  - In `src/app/globals.css`, after the About (017) tokens and in their comment style: `--aspect-academics-overview: var(--aspect-about-story);`, `--aspect-academics-photo: 4 / 3;` and `--spacing-academics-collage-offset: 2.5rem;`, commented "Academics (018): no reference page; composed values, see research/design-tokens.md "Academics page"" and, on the first, "an alias of the About story ratio".
  - In `research/design-tokens.md` (CRLF), after the "About page" section, add "## Academics page (018 — no matching reference page)", worded like the About section: a table of the three tokens (value, use), the "Reused" list from the ground rules, and "Deviation (flagged, Constitution I): every value above is composed, not extracted. If the client supplies a design, extract it here first."
  
  Confirm the utilities `aspect-academics-overview`, `aspect-academics-photo` and `mt-(--spacing-academics-collage-offset)` / `pb-(--spacing-academics-collage-offset)` resolve (Tailwind v4 theme). No other new values may be used.
- [X] T006 [P] Write failing `src/lib/content/fields.test.ts`: `text(10)` trims and rejects `""` and 11 characters; `longText(100)` accepts `"a\n\nb"` and rejects leading/trailing whitespace and 3+ newlines in a row; `imageRef` accepts `{ url: "/images/x.svg", publicId: "", width: 1, height: 1 }` and a `https://res.cloudinary.com/...` url; `itemId` accepts `school-leadership` and rejects `School_Leadership`; `uniqueIds` is false for duplicate ids.
- [X] T007 Move `text`, `longText`, `imageRef`, `itemId` and `uniqueIds` from `src/lib/about/schema.ts` (lines 9–23) into `src/lib/content/fields.ts` as named exports, unchanged. Make `src/lib/about/schema.ts` import them from `@/lib/content/fields`. No behaviour change: T006 and the existing `src/lib/about/schema.test.ts` must pass.
- [X] T008 [P] Write failing `src/lib/content-mode.test.ts` for `placeholdersAllowed()` (mock `next/headers` `cookies` and `@/lib/e2e-fresh-reads`): with `NODE_ENV=development` and no cookie → true; with the guard true and cookie `e2e-production-content=1` → false; with `NODE_ENV=production` → false and `cookies` is **never called**; with the guard false, `cookies` is never called.
- [X] T009 Move the pure rule `showTeamPlaceholders` from `src/lib/about/view.ts` into `src/lib/content/placeholders.ts` as `showPlaceholders({ nodeEnv, forceProduction })`, unchanged. In `src/lib/about/view.ts`, add `export { showPlaceholders as showTeamPlaceholders } from "@/lib/content/placeholders";` so About's code and tests are unchanged. Then create `src/lib/content-mode.ts` (starts with `import "server-only";`): `placeholdersAllowed(): Promise<boolean>` returns `showPlaceholders({ nodeEnv: process.env.NODE_ENV, forceProduction })`, where `forceProduction = freshReadsForTests() && (await cookies()).get("e2e-production-content")?.value === "1"` (lifted from `src/lib/about/resolve-view.ts`). Change `resolveAboutView()` to call `placeholdersAllowed()` and pass the result as `showPlaceholders`. Keep the doc comment, moved to the new module. T008, `src/lib/about/view.test.ts` and the About components tests must pass.
- [X] T010 [P] Write failing `src/lib/video/embed.test.ts` (research R3):
  - `parseInstagramAddress` accepts `https://www.instagram.com/p/ABC123xyz/`, `https://instagram.com/reel/ABC123xyz`, `/reels/<code>` and `/tv/<code>` (with or without trailing slash or query string), returning `{ kind: "p" | "reel", code }`: `/p/` and `/tv/` give `p`; `/reel/` and `/reels/` give `reel` (the embed URL rule in contracts/page-structure.md only has `p` and `reel`).
  - It refuses: `http://evil-instagram.com/p/ABC123xyz/`, `https://instagram.com.evil.io/p/ABC123xyz/`, `https://user:pw@instagram.com/p/ABC123xyz/`, a profile `https://www.instagram.com/darearqam/`, a code shorter than 5 or with `.`, and non-URLs.
  - `resolveVideo({ provider: "youtube", url })` gives `{ provider: "youtube", embedUrl: "https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0" }` for watch, youtu.be, embed and Shorts URLs (reusing `parseYouTubeAddress` from `src/lib/settings/youtube.ts`).
  - `resolveVideo({ provider: "instagram", url })` gives `embedUrl: "https://www.instagram.com/<p|reel>/<code>/embed/"`.
  - `resolveVideo` returns `null` for `""`, whitespace, an unparsable URL, and a YouTube URL under `provider: "instagram"` (and vice versa).
- [X] T011 Implement `src/lib/video/embed.ts`: export `type VideoProvider = "youtube" | "instagram"`, `type PlayableVideo = { provider: VideoProvider; embedUrl: string }`, `parseInstagramAddress(input: string)`, `youTubeEmbedUrl(id: string)` and `resolveVideo(entry: { provider: VideoProvider; url: string }): PlayableVideo | null`. Build URLs only from the parsed id/code, never from raw input. Pure module (no `server-only`; `VideoEmbed` and schemas both import it). T010 must pass, and `src/lib/settings/youtube.test.ts` stays green.
- [X] T012 [P] Write failing `src/lib/academics/schema.test.ts` for every schema in contracts/academics-content.md:
  - `videoEntrySchema` accepts `url: ""` and a valid URL for its provider; rejects an Instagram URL under `youtube`, a URL over 300 characters, and an empty `title`.
  - `academicOverviewSchema` accepts `image: null` with `imageAlt: ""`; rejects an `ImageRef` with empty `imageAlt`.
  - `teachersTrainingSchema` rejects 0 items, 41 items, duplicate item ids, 4 photos, a photo with empty `alt`, and duplicate photo ids; accepts 0 photos.
  - `hifzEQuranSchema` rejects 0 and 7 subsections and duplicate subsection ids.
  - `academicsPageSchema` rejects an empty `title` or `playLabel`.
- [X] T013 Implement `src/lib/academics/schema.ts` exactly as in contracts/academics-content.md (Zod 4, helpers from `@/lib/content/fields`, `resolveVideo` from `@/lib/video/embed`). Export `VIDEO_PROVIDERS`, every schema and the inferred types `VideoEntry`, `AcademicsPage`, `AcademicOverview`, `TeachersTraining`, `TrainingItem`, `TrainingPhoto`, `HifzEQuran`, `HifzSubsection`, plus `type ReviewMeta = { status: "pending-client-approval" | "approved"; notes: string[] }`. T012 must pass.
- [X] T014 Update `src/content/site-shell.ts`: replace `pageSections.academics` with `academic-overview` "Academic Overview", `teachers-training` "Teachers' Training", `hifz-e-quran` "Hifz-e-Quran", in that order. Add the exported `legacyAcademicsRedirects: { source: string; destination: string }[]` with the 4 entries from contracts/page-structure.md (not `/hifz-e-quran`, which keeps its own rule). Update the comment above `pageSections` to say Academics' ids were remapped in 018 (see `legacyAcademicsRedirects`). Update `src/content/site-shell.test.ts`: `pageSections.academics` is exactly these 3 entries in order; the Academics nav children are `/academics#academic-overview`, `/academics#teachers-training`, `/academics#hifz-e-quran`; no Academics child label matches `/syllabi|examination/i`; `legacyAcademicsRedirects` equals the 4 pairs. Note: until T040, `next.config.ts` still derives `/academics/<id>` redirects from these ids, which is wrong but harmless on this local branch.

**Checkpoint**: `npx vitest run src/lib/content src/lib/content-mode.test.ts src/lib/video src/lib/academics src/lib/about src/components/about src/content/site-shell.test.ts` passes.

---

## Phase 3: User Story 1 - Read about the school's academics on one page (Priority: P1) 🎯 MVP

**Goal**: /academics shows the banner h1 "Academics", then Academic Overview, Teachers' Training and Hifz-e-Quran with the verbatim English text, alternating backgrounds, and the overview's two-column layout with the emblem panel.

**Independent Test**: Open /academics at 375, 768, 1024 and 1440 px. One h1, three h2s in order with the right anchors, text matching `docs/content-source/academics/*.txt`, no Urdu, no sideways scroll.

### Tests for User Story 1 ⚠️

- [X] T015 [P] [US1] Write failing `src/content/academics/content.test.ts`:
  - Every exported value in `src/content/academics/index.ts` parses with its schema.
  - Teachers' Training has exactly 19 items with the ids listed in T020, in order.
  - Hifz-e-Quran has subsection ids `admission-based-on-aptitude`, `hifz-alongside-academic-education`; the second body has exactly 2 paragraphs.
  - Every `review.status` is `"pending-client-approval"`; `teachersTrainingSource` equals `{ url: "https://das.edu.pk/academics/teachers-training/", copiedOn: "2026-10-12" }`.
  - No string anywhere in the Academics values (walk the objects recursively) contains a character in `\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF` (FR-008).
  - Every image URL (overview image, photos, posters) starts with `/` or `https://res.cloudinary.com/` (R11).
  - The Hifz heading is exactly `"HIFZ-UL-QURAN PROGRAM"`.
- [X] T016 [P] [US1] Write failing `src/content/academics/fidelity.test.ts` with the same three checks as `src/content/about/fidelity.test.ts` (research R1), reading `docs/content-source/academics/*.txt` with `fs`:
  1. Every displayed English string (headings, subheadings, each paragraph of each `longText`, each list item, each subsection heading) equals a line of its .txt, in .txt order. The only exception is an `OWNER_ADDITIONS` set holding the T1 sentence, with a comment "T1, pending client approval".
  2. Every non-empty English line of each .txt is used, except an `EXCLUDED` list: "Curiosity with Purpose" (T2).
  3. Lines containing Arabic-script characters are skipped in check 2 and never appear in content.
- [X] T017 [P] [US1] Write failing component tests:
  - `src/components/academics/academic-overview.test.tsx`: `section#academic-overview` with `data-background="surface"`; h2 "Academic Excellence" and the subheading; 3 `<p>` matching the body; with `image: null` an `aspect-academics-overview` panel holding `/images/logo-emblem.svg` with `alt=""`; with an `ImageRef` an img whose alt is `imageAlt`; the text column comes before the media column in DOM order.
  - `src/components/academics/teachers-training.test.tsx`: `section#teachers-training` with `data-background="muted"`; h2 "Teachers' Training"; the intro `<p>`; a `ul` with 19 `li` in order; no `[data-testid=training-photos]` and no `[data-testid=training-video]` when the props pass none.
  - `src/components/academics/hifz-e-quran.test.tsx`: `section#hifz-e-quran` with `data-background="surface"`; h2 text exactly "HIFZ-UL-QURAN PROGRAM" and no `uppercase`/`capitalize` class on it or its ancestors; the subheading; the intro; two h3 in order each followed by its paragraphs (the second with 2 `<p>`); no `[data-testid=hifz-video]` without a video.
- [X] T018 [P] [US1] Write failing `e2e/academics.spec.ts` › "US1 content":
  - /academics has exactly one h1 ("Academics").
  - The `section` ids in DOM order inside `main` are `academic-overview, teachers-training, hifz-e-quran`, and each has one h2 whose id matches its `aria-labelledby`.
  - `data-background` is `surface, muted, surface`.
  - Text spot-checks: the first sentence of paragraph 1 of academic-overview.txt, "School leadership" and "Tips for lecturers" as the first and last `li`, "HIFZ-UL-QURAN PROGRAM", and the 15-day observation sentence.
  - The `main` text contains no Arabic-script characters and not "Curiosity with Purpose", "Syllabi" or "Examination".
  - At 1440 and 768 the overview text and figure sit side by side (figure `left` > text `right` − 1); at 375 the figure's top ≥ the text's bottom.

### Implementation for User Story 1

- [X] T019 [P] [US1] Create `src/content/academics/page.ts`: `academicsPage: AcademicsPage = { title: "Academics", playLabel: "Play video" }` and `review` pending ("Page title is not from a document (spec Clarification Q4)."), with a `// PENDING CLIENT APPROVAL:` comment.
- [X] T020 [P] [US1] Create `src/content/academics/teachers-training.ts` from `teachers-training.txt`:
  - `teachersTraining: TeachersTraining` with `heading: "Teachers' Training"`, `intro` verbatim, `photos: []`, `video: { provider: "youtube", url: "", poster: null, title: "Teachers' Training video" }`.
  - `items`, verbatim and in order, with ids: `school-leadership`, `managing-schools`, `managing-classrooms`, `achieving-goals`, `improving-student-grades`, `school-improvement-programs`, `assessment-manuals`, `literacy-development`, `strategic-planning`, `staff-development-guides`, `learning-through-technology`, `professional-development-guides`, `teacher-training-manuals`, `school-law`, `curriculum-planning-guides`, `educational-philosophy`, `tips-for-fresh-teachers`, `training-theory-and-practice`, `tips-for-lecturers`.
  - `teachersTrainingSource = { url: "https://das.edu.pk/academics/teachers-training/", copiedOn: "2026-10-12" }` (FR-011).
  - `review` pending, notes T6, T7, "video URL and photos not supplied yet", "video title is not from a document".
- [X] T021 [P] [US1] Create `src/content/academics/academic-overview.ts` from `academic-overview.txt`: `heading: "Academic Excellence"`, `subheading: "Building Strong Foundations for Lifelong Learning"`, `body` the 3 paragraphs joined with `"\n\n"`, `image: null`, `imageAlt: ""`. `review` notes T2 (omitted line), T3 (menu label vs heading), "photo not supplied yet; the emblem panel shows".
- [X] T022 [P] [US1] Create `src/content/academics/hifz-e-quran.ts` from `hifz-e-quran.txt`: `heading: "HIFZ-UL-QURAN PROGRAM"`, `subheading: "A Meaningful Step Towards a Beautiful World & a Better Hereafter"`, `intro`, and the 2 subsections with ids from T015. The second body is the source paragraph, `"\n\n"`, then the T1 sentence, with `// PENDING CLIENT APPROVAL: T1, translated from the Urdu at the owner's request (2026-10-12).` directly above it. `video: { provider: "instagram", url: "", poster: null, title: "Hifz-ul-Quran Program video" }`. `review` notes T1, T4, T5, "video URL and poster not supplied yet", "video title is not from a document".
- [X] T023 [US1] Create `src/content/academics/index.ts`: re-export each value **parsed** with its schema (`academicsPageSchema.parse(academicsPage)` and so on), plus `teachersTrainingSource` and each file's `review` (as `academicsReviews` keyed by section id). Depends on T013 and T019–T022. T015 and T016 must pass now.
- [X] T024 [US1] Create `src/lib/academics/resolve.ts` (`import "server-only";`): `resolveAcademicsView()` returns `{ page, overview, training, hifz, showPlaceholders }`, reading the parsed content from `@/content/academics` and `showPlaceholders` from `placeholdersAllowed()` (T009). US4 (T043) adds the media seam here.
- [X] T025 [P] [US1] Create `src/components/academics/academic-overview.tsx`: `AcademicOverviewSection({ value })` using `AboutSection` (`id="academic-overview"`, `background="surface"`, `heading`, `line={value.subheading}`).
  - `grid gap-8 md:grid-cols-12 md:items-center md:gap-12`: text `md:col-span-7` with `Paragraphs` inside `max-w-prose`; `figure` `md:col-span-5`. Phones stack text first.
  - Image: when `value.image`, `next/image` `fill` in an `aspect-academics-overview relative overflow-hidden rounded-xl bg-(--color-home-muted-band)` frame, `object-cover`, `alt={value.imageAlt}`. When null, the same markup as Our Story's emblem panel (read `src/components/about/our-story.tsx` and match it): `/images/logo-emblem.svg` with `alt=""`, centred.
  
  T017 overview tests must pass.
- [X] T026 [P] [US1] Create `src/components/academics/teachers-training.tsx`: `TeachersTrainingSection({ value, photos, video })`, where `photos?: ReactNode` (US5) and `video?: ReactNode` (US4) are optional slots, using `AboutSection` (`id="teachers-training"`, `background="muted"`).
  - With `photos`: `grid gap-8 md:grid-cols-12 md:gap-12`, text `md:col-span-7`, photos `md:col-span-5`. Without: the text alone, still in `max-w-prose`.
  - Text: `Paragraphs` for the intro, then `ul` with `list-disc ps-6 marker:text-primary` and the existing why-choose list item classes (read `src/components/home/inspiration-why-choose.tsx`), one `li` per item keyed by id.
  - The section body is `flex flex-col gap-10` (the gap the home Why Choose block uses between text and video). With `video`, its last child is `<div className="mx-auto w-full max-w-4xl" data-testid="training-video">`.
  
  T017 training tests must pass.
- [X] T027 [P] [US1] Create `src/components/academics/hifz-e-quran.tsx`: `HifzEQuranSection({ value, video })` using `AboutSection` (`id="hifz-e-quran"`, `background="surface"`, `heading` exactly as stored, `line={value.subheading}`). Then `max-w-prose` text: `Paragraphs` for the intro; each subsection as an `h3` (the existing why-choose h3 classes, `font-heading font-bold text-primary`) followed by `Paragraphs`. The section body is `flex flex-col gap-10`; with `video`, its last child is `<div className="mx-auto w-full max-w-4xl" data-testid="hifz-video">`. No case transforms. T017 Hifz tests must pass.
- [X] T028 [US1] Replace `src/app/(public)/academics/page.tsx`:
  - `export const metadata: Metadata = { title: "Academics", description: <first paragraph of academicOverview.body>, alternates: { canonical: "/academics" } }`.
  - An async default export: `const view = await resolveAcademicsView()`. Render `<PageBanner title={view.page.title} trail={["Academics"]} breadcrumbHome={careersCopy.banner.breadcrumbHome} />` (as `src/app/(public)/about/page.tsx` does), then `AcademicOverviewSection`, `TeachersTrainingSection` and `HifzEQuranSection`, in the order of `pageSections.academics` (map by id, so the order has one source).
  - Remove the `AnchoredPage` import here only; Admission still uses it.
- [X] T029 [US1] Run `npx vitest run src/content/academics src/components/academics src/lib/academics`, then (no build running) `npx playwright test e2e/academics.spec.ts --project=chromium -g "US1"` and `e2e/shell-and-placeholders.spec.ts` (its `/academics` h1 check must still pass). Fix until green.

**Checkpoint**: /academics shows the banner and the three real sections. This is the MVP.

---

## Phase 4: User Story 2 - Jump to a section from the menu (Priority: P1)

**Goal**: The desktop dropdown, mobile group and site search list exactly Academic Overview, Teachers' Training and Hifz-e-Quran (already derived from `pageSections.academics` by T014), and each lands clear of the fixed header.

**Independent Test**: At 1440 and 375, open the menu, choose each entry: the URL becomes `/academics#<id>` and the h2 is fully below the header. Search "syllabi" or "examination" gives no Academics result.

### Tests for User Story 2 ⚠️

- [X] T030 [P] [US2] Add `e2e/academics.spec.ts` › "US2 navigation":
  - Desktop 1440: from /contact, hover Academics in "Main menu". Its child links are exactly Academic Overview, Teachers' Training, Hifz-e-Quran, in order. Click each in turn (re-opening the dropdown): URL `/academics#<id>` and `section#<id>` top ≥ header height − 1 (copy the `headerHeight`/`top` helpers from `e2e/page-sections.spec.ts`).
  - Mobile 375: open the menu, expand Academics; the group lists the same 3 links in order; tap "Hifz-e-Quran": the menu closes and the section is clear of the header.
  - Loading `/academics#teachers-training` directly lands clear of the header.
  - At 375, 768, 1024 and 1440, loading `/academics#<id>` directly for each of the 3 ids puts `section#<id>` top ≥ header height − 1 (FR-006, SC-001).
- [X] T031 [P] [US2] Update `e2e/site-search.spec.ts`: replace "finds a dropdown sub-page by its own label" with a search for "Teachers" that finds the "Teachers' Training" link with `href="/academics#teachers-training"`. Add a test that "syllabi" and "examination" each produce no link whose `href` starts with `/academics`.
- [X] T032 [US2] In `e2e/page-sections.spec.ts`, change the desktop test "a dropdown link scrolls to its section, clear of the header, without a reload" to click "Hifz-e-Quran" and expect `/academics#hifz-e-quran` and `top(page, "hifz-e-quran")`.

### Implementation for User Story 2

- [X] T033 [US2] Search `src/` and `e2e/` for `syllabi`, `examinations`, `academics-overview` and "Academics Overview" (case-insensitive) and update every remaining reference outside `legacyAcademicsRedirects`, `e2e/page-sections.spec.ts` REDIRECTS (US3) and the negative checks (FR-004). Check `e2e/mobile-navigation.spec.ts` and `e2e/desktop-navigation.spec.ts` in particular. Confirm the home Education Curriculum card in `src/content/home.ts` still links to `/academics`.
- [X] T034 [US2] Run `npx vitest run src/content/site-shell.test.ts src/components/site-shell src/lib/site-search.test.ts` and `npx playwright test e2e/academics.spec.ts e2e/site-search.spec.ts e2e/mobile-navigation.spec.ts e2e/desktop-navigation.spec.ts --project=chromium -g "US2|search|navigation|menu"`. Fix until green.

**Checkpoint**: Menu, search and page agree; anchors land correctly.

---

## Phase 5: User Story 3 - Old Academics addresses still work (Priority: P2)

**Goal**: The 5 old addresses redirect permanently (308) to their US3 targets; any other `/academics/<x>` is a 404.

**Independent Test**: Request each old URL with `maxRedirects: 0`: 308 and the mapped `location`. `/academics/unknown` and `/academics/academic-overview` return 404.

### Tests for User Story 3 ⚠️

- [X] T035 [US3] Update `e2e/page-sections.spec.ts` (after T032, same file):
  - `PAGES["/academics"]` = `["academic-overview", "teachers-training", "hifz-e-quran"]`.
  - Build the derived REDIRECTS from `/admission` only (exclude `/about` and `/academics`), and add the 4 explicit Academics pairs from contracts/page-structure.md with a comment "Academics was remapped in 018". Keep `["/hifz-e-quran", "/academics#hifz-e-quran"]`.
  - Add `/academics/academic-overview` and `/academics/syllabus` to the 404 list (ids that never existed as routes must not redirect).

### Implementation for User Story 3

- [X] T036 [US3] Update `next.config.ts`: build `sectionRedirects` from `(["admission"] as const)` only; add `...legacyAcademicsRedirects.map((redirect) => ({ ...redirect, permanent: true }))` beside the About map, importing it from `./src/content/site-shell`. Keep the `/hifz-e-quran` rule. Update the top comment to name the Academics remap.
- [X] T037 [US3] Restart any dev server on port 3100, then run `npx playwright test e2e/page-sections.spec.ts --project=chromium`. Fix until green.

**Checkpoint**: Old links and bookmarks keep working.

---

## Phase 6: User Story 4 - Watch the training and Hifz videos without slowing the page (Priority: P2)

**Goal**: One shared `VideoEmbed` (YouTube + Instagram) used by the home page and both Academics videos. Academics shows a local poster and a labelled play button, makes no provider request before the click, and renders no block without a URL.

**Independent Test**: With cookie `e2e-academics-media=two`, load /academics while recording requests: no YouTube/Instagram host is contacted; click each play button: an iframe with the right src appears in the same 16:9 frame. With no cookie, neither video block exists. The home Why Choose video behaves as before.

### Tests for User Story 4 ⚠️

- [X] T038 [P] [US4] Write failing `src/components/media/video-embed.test.tsx`:
  - Before click: a `button` with the given `aria-label`; no `iframe`; with `poster: null` or a local poster, no element in the rendered HTML has a `src`/`href`/`srcset` containing `youtube`, `ytimg`, `instagram`, `cdninstagram` or `fbcdn`; with `poster: null` the placeholder panel (`bg-primary` + `/images/logo-emblem.svg`, `aria-hidden`) is shown.
  - Click, and separately keyboard Enter and Space on the focused button → an `iframe` with `src === video.embedUrl` and `title === title`, inside the same `aspect-video` element; the button is gone.
  - With `poster: { src: "https://i.ytimg.com/vi/abc/hqdefault.jpg", remote: true }` the markup equals today's home markup: a plain `img` with that src, `alt=""`, `loading="lazy"`.
  - `testId` sets `data-testid` on the frame.
- [X] T039 [P] [US4] Add `e2e/academics.spec.ts` › "US4 videos":
  - Without a media cookie: no `[data-testid=training-video]` or `[data-testid=hifz-video]` and no `.aspect-video` inside `main`.
  - With `context.addCookies([{ name: "e2e-academics-media", value: "two", url: baseURL }])`: before navigation, `page.on("request")` records hosts; `page.route(/youtube-nocookie\.com|instagram\.com/, r => r.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }))`. After load and a full scroll to the bottom, no recorded host matches `youtube|youtube-nocookie|ytimg|instagram|cdninstagram|fbcdn`.
  - Each block shows a button named "Play video: <title>". Clicking the training button gives an iframe with src starting `https://www.youtube-nocookie.com/embed/`; pressing Enter on the focused Hifz button gives one with src `https://www.instagram.com/…/embed/`. No iframe exists before the clicks (nothing autoplays).
  - At 375, 768, 1024 and 1440, each video frame's width/height is 16/9 within 1%, before and after the click.
- [X] T040 [P] [US4] Extend `src/components/academics/teachers-training.test.tsx` and `src/components/academics/hifz-e-quran.test.tsx`: with a `video` slot the `[data-testid=training-video]` / `[data-testid=hifz-video]` wrapper renders after the text (and after the photos column for training); without, it does not.

### Implementation for User Story 4

- [X] T041 [US4] Create `src/components/media/video-embed.tsx` (`"use client"`) from `src/components/home/youtube-embed.tsx`, with the props in contracts/page-structure.md (`video: PlayableVideo`, `title`, `playLabel`, `poster`, `testId?`). Keep the exact frame, button, play-icon and iframe classes and `allow`/`allowFullScreen` attributes. Poster: `remote` → the existing plain `<img>` (keep its eslint comment); local → `next/image` `fill` `object-cover`, `alt=""`, `sizes="(min-width: 896px) 896px, 100vw"`; `null` → a `bg-primary` panel with the centred `/images/logo-emblem.svg` (`alt=""`, `aria-hidden="true"`). The iframe uses `video.embedUrl` only. T038 must pass.
- [X] T042 [US4] Switch `src/components/home/inspiration-why-choose.tsx` to `VideoEmbed` with `video={{ provider: "youtube", embedUrl: youTubeEmbedUrl(video.youtubeId) }}`, `poster={{ src: \`https://i.ytimg.com/vi/${video.youtubeId}/hqdefault.jpg\`, remote: true }}`, `testId="why-choose-video"`, and the same `title`/`playLabel`. Delete `src/components/home/youtube-embed.tsx`. Confirm with `git grep -n "youtube-embed\|YouTubeEmbed"` that nothing else imports it. Existing home component tests must pass unchanged (FR-019). Then check that the `src/components/media/` entry in `docs/architecture.md` (written ahead during the /sp.analyze remediation: click-only loading, YouTube and Instagram hosts, CSP note) matches the built code, including the file paths and the `src/components/home/` entry's wording, and fix any drift (CRLF). Check that ADR-0010 exists at `history/adr/0010-shared-click-to-load-video-block.md`.
- [X] T043 [US4] Add the media test seam (research R10):
  - `src/content/academics/fixtures.ts`: `academicsMediaFixtures = { one: { photos: [1 photo] }, two: { photos: [2 photos] }, three: { photos: [3 photos] }, videos: { training: "https://www.youtube.com/watch?v=Fixture0001", hifz: "https://www.instagram.com/reel/Fixture12345/" } }`. Photos use the existing local SVGs `/images/teachers-training.svg`, `/images/co-curricular.svg`, `/images/personality_development-1.svg` (width/height from each SVG's `viewBox`, `publicId: ""`, ids `fixture-1…3`, alt "Sample training photo 1…3"). A header comment: test-only, never imported outside `src/lib/academics/resolve.ts`.
  - In `src/lib/academics/resolve.ts`, read `e2e-academics-media` **only** inside `if (freshReadsForTests())`. For `one`/`two`/`three`, return copies of `training` and `hifz` with the fixture photos and URLs (posters stay `null`). Then compute `trainingVideo = resolveVideo(training.video)` and `hifzVideo = resolveVideo(hifz.video)` and add them to the view.
- [X] T044 [US4] Wire the videos in `src/app/(public)/academics/page.tsx`: when `view.trainingVideo` is not null, pass `video={<VideoEmbed video={view.trainingVideo} title={view.training.video.title} playLabel={\`${view.page.playLabel}: ${view.training.video.title}\`} poster={view.training.video.poster ? { src: view.training.video.poster.url } : null} />}` to `TeachersTrainingSection`; the same for Hifz (`view.hifzVideo`, `view.hifz…`). No `testId`: the section's wrapper carries `training-video` / `hifz-video` (T026, T027). Null → no slot, so no block (FR-013, FR-015). T040 must pass.
- [X] T045 [US4] Run `npx vitest run src/components/media src/components/home src/components/academics src/lib/video` and `npx playwright test e2e/academics.spec.ts e2e/admin-home-page.spec.ts --project=chromium -g "US4|video|why"`. The home Why Choose video tests must pass unchanged (SC-008); compare any admin-home-page failures against the known admin baseline (project memory). Fix until green.
- [X] T046 [US4] Ask the owner for the Teachers' Training YouTube URL and the Hifz Instagram URL and poster (spec Open Questions 1 and 3). If supplied, set `video.url` (and `poster` with the file under `public/images/academics/`) in `src/content/academics/teachers-training.ts` / `hifz-e-quran.ts` and rerun T045; otherwise leave them empty (blocks stay hidden) and note it in the PHR.

**Checkpoint**: Both videos work behind one click with no early third-party requests; the home video is unchanged.

---

## Phase 7: User Story 5 - Teachers' Training photo collage (Priority: P3)

**Goal**: A staggered 2–3 photo collage beside the training text. Development fills missing photos with labelled placeholder tiles; production shows no photo block until real photos exist (one real photo shows as a single framed photo).

**Independent Test**: Dev default: `[data-testid=training-photos][data-layout=collage]` with 3 `[data-placeholder=true]` tiles. Cookie `e2e-production-content=1`: no photo block and no "Placeholder" text. Cookies `e2e-academics-media=two` / `three`: 2 / 3 real tiles, balanced, no overlap at the 4 widths.

### Tests for User Story 5 ⚠️

- [X] T047 [P] [US5] Write failing `src/lib/academics/view.test.ts` for `trainingPhotoTiles(photos, showPlaceholders)` covering every row of the data-model table (0/1/2/3/4 photos × `false`/`true`): layout, tile count, real tiles first in content order, placeholder ids `placeholder-1…`, `placeholder: true` with `image: null` and `alt: ""`, and 4 photos sliced to the first 3.
- [X] T048 [P] [US5] Write failing `src/components/academics/training-photos.test.tsx` for `TrainingPhotos({ layout, tiles })`:
  - `layout="none"` renders nothing.
  - `single`: one `figure`/img with the photo's alt, `data-layout="single"`.
  - `collage` with 2 tiles: `md:grid-cols-2`, the second tile has the offset class `md:mt-(--spacing-academics-collage-offset)`, and the container has `md:pb-(--spacing-academics-collage-offset)`.
  - `collage` with 3 tiles: the first spans `md:col-span-2`, the third has the offset class.
  - A placeholder tile has `data-placeholder="true"`, a visible "Placeholder" badge, a dashed border, no `img`, and is `aria-hidden` apart from the badge text being in the DOM; every frame has `aspect-academics-photo rounded-xl overflow-hidden`.
- [X] T049 [P] [US5] Add `e2e/academics.spec.ts` › "US5 photos":
  - (a) Dev default: `[data-testid=training-photos]` has `data-layout="collage"` and 3 `[data-placeholder="true"]` tiles each containing "Placeholder".
  - (b) Cookie `e2e-production-content=1`: no `[data-testid=training-photos]`, no `[data-placeholder]`, no text "Placeholder" in `main`; the training text spans without a photo column; the rest of the page is unchanged.
  - (c) Cookies `e2e-academics-media=two`, then `three`, each run in **both** modes (dev default, and with `e2e-production-content=1`): 2 / 3 real `img` with their alt text and no `[data-placeholder]`. At 375, 768, 1024 and 1440: no tile's box intersects the text column's box or the training video's box; every tile's ratio is 4:3 within 1%; at 375 the tiles stack (each top ≥ the previous bottom); from 768 the photos sit beside the text.
  - (d) Cookie `e2e-academics-media=one`: with `e2e-production-content=1`, `data-layout="single"` and 1 `img`; in dev, `data-layout="collage"` with 1 real tile and 2 `[data-placeholder="true"]` tiles.

### Implementation for User Story 5

- [X] T050 [US5] Implement `src/lib/academics/view.ts` (pure): `type Tile = { id: string; image: ImageRef | null; alt: string; placeholder: boolean }` and `trainingPhotoTiles(photos: TrainingPhoto[], showPlaceholders: boolean): { layout: "none" | "single" | "collage"; tiles: Tile[] }` per the data-model table. T047 must pass.
- [X] T051 [US5] Create `src/components/academics/training-photos.tsx` (Server Component): `TrainingPhotos({ layout, tiles })` per research R6, `data-testid="training-photos"` and `data-layout`.
  - Phones: `grid grid-cols-1 gap-4`, no offset. From `md`: `md:grid-cols-2 md:pb-(--spacing-academics-collage-offset)`; with 3 tiles the first is `md:col-span-2`; the last tile of a collage gets `md:mt-(--spacing-academics-collage-offset)` (write each class literally).
  - Each frame: `relative aspect-academics-photo overflow-hidden rounded-xl bg-surface` (the section is muted, so a failed image shows the surface background); real tiles use `next/image` `fill` `object-cover` with `alt` and `sizes` for a 5/12 column.
  - Placeholder tiles: `data-placeholder="true"`, `border-2 border-dashed border-text-muted`, and the same "Placeholder" badge as 017's team placeholders (read `src/components/about/management-team.tsx` and reuse its badge markup).
  
  T048 must pass.
- [X] T052 [US5] Wire it: in `src/app/(public)/academics/page.tsx` compute `const { layout, tiles } = trainingPhotoTiles(view.training.photos, view.showPlaceholders)` and pass `photos={layout === "none" ? undefined : <TrainingPhotos layout={layout} tiles={tiles} />}` to `TeachersTrainingSection`. Run `npx vitest run src/lib/academics src/components/academics` and `npx playwright test e2e/academics.spec.ts --project=chromium -g "US5|US4"`. Fix until green.
- [X] T053 [US5] Ask the owner for 2–3 training photos with a short description of each (alt text) and the Academic Overview photo (spec Open Questions 2 and 4). If supplied, add the files under `public/images/academics/teachers-training/` and `public/images/academics/`, fill `photos` / `image` + `imageAlt` in the content files, and rerun T052 and `src/content/academics/content.test.ts`; otherwise leave them empty and note it in the PHR.

**Checkpoint**: All three sections are complete. Production never shows placeholders.

---

## Phase 8: Polish & Cross-Cutting Concerns

- [X] T054 [P] Add `e2e/academics.spec.ts` › "layout and accessibility", for widths 375, 768, 1024 and 1440:
  - `document.documentElement.scrollWidth <= window.innerWidth`, in the dev default and with `e2e-academics-media=three`.
  - Body paragraphs in the three sections are ≤ 75ch wide (the `ch` probe-span helper from `e2e/about.spec.ts`).
  - An axe scan, `new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze()`, in three modes: dev default, `e2e-production-content=1`, and `e2e-academics-media=three` (before and after clicking the training play button). Fail on any violation (FR-027 / SC-006) and print ids and targets.
  - Explicit checks: one h1; each section's `aria-labelledby` resolves to its h2; every `svg` in `main` is `aria-hidden="true"`; every `img` in `main` has an `alt` attribute; no duplicate ids; no `[lang="ur"]`.
- [X] T055 [P] Write `docs/content-source/academics/client-review.md` (CRLF) for the client, in plain language with no code: the file mapping; the counts (3 overview paragraphs, 19 training items, 2 Hifz sub-sections); text left out (the Urdu versions, T2); the T1–T7 table with "as written" and "proposed fix" (T1 shows the translated sentence for approval); the redirect mapping; and the Open Questions from spec.md (video URLs, photos with descriptions, Hifz poster, overview photo, T1–T7, the "Academics" title). Mention the Instagram-vs-YouTube choice (R4).
- [X] T056 Run `npm run lint` and `npx tsc --noEmit`. Fix all issues in the touched files.
- [X] T057 Run the full unit suite `npm test`. All tests pass (About tests guard the T007/T009 moves).
- [X] T058 Stop any Playwright or dev server, then run `npm run build`. Confirm:
  - (a) It succeeds.
  - (b) The route table shows `/academics`, `/about` and `/` as static (○), not dynamic (ƒ), proving the cookie seams never run in production.
  - (c) `npx next start`, then GET /academics: no `training-photos`, no `data-placeholder`, no "Placeholder" text, no `aspect-video` block, and the overview emblem panel is present. GET `/academics/syllabi` returns 308 to `/academics`.
  
  Stop the server afterwards.
- [X] T059 After T058 has finished, run the public Playwright suite `npx playwright test --project=chromium`. Compare failures with the known baseline in project memory. Every failure in academics, about, page-sections, site-search, mobile-navigation, desktop-navigation, shell-and-placeholders or the home specs must be fixed. Record anything unrelated in the PHR.
- [ ] T060 Manual review per quickstart.md "Manual check before done" at 375, 768, 1024 and 1440. With `e2e-academics-media=two` and then `three` (in `next dev`), take screenshots of the Instagram frame after clicking play at all four widths (use the real URL from T046 if supplied, since the fixture reel will not load real content) and save them to `specs/018-academics/screenshots/` for the owner (US4-5, R4). Record the hosts the real Instagram embed contacts (DevTools → Network, after clicking play) and correct the host list in `docs/architecture.md` if it differs. Note the results in the implementation PHR.

---

## Dependencies & Execution Order

### Phase dependencies

- **Setup (T001–T004)**: none. T002 after T001. T003 and T004 are independent.
- **Foundational (T005–T014)**: after Setup. T007 after T006; T009 after T007 and T008; T011 after T010; T013 after T011 and T012; T014 is independent of the rest. T005 before any component task.
- **US1 (T015–T029)**: after Foundational. MVP.
- **US2 (T030–T034)**: after T014 and T028 (sections to land on). Mostly verification, since T014 already drives the menu and search.
- **US3 (T035–T037)**: after T014 and T032 (same spec file). Can run alongside US1 otherwise.
- **US4 (T038–T046)**: after Foundational and T024–T028 (resolve and section slots). T042 needs T041.
- **US5 (T047–T053)**: after Foundational and T026/T028; T049(c) needs T043 (media seam) from US4.
- **Polish (T054–T060)**: after all stories. T058 then T059 strictly in sequence; never build and run Playwright together.

### Within each story

Tests first (they fail), then content, then components, then page wiring, then a test run.

### Parallel opportunities

- Setup: T003 and T004 alongside T001/T002.
- Foundational: T006, T008, T010 and T012 together; T014 any time in this phase.
- US1: T015–T018 together; T019–T022 together; then T023 → T024; T025–T027 together; then T028 → T029.
- US2: T030 and T031 together (T032 touches page-sections.spec, sequence it before T035).
- US4: T038–T040 together.
- US5: T047–T049 together.
- Polish: T054 and T055 together.

### Parallel example: User Story 1

```text
Together: T015 content.test.ts · T016 fidelity.test.ts · T017 component tests · T018 e2e US1
Together: T019 page.ts · T020 teachers-training.ts · T021 academic-overview.ts · T022 hifz-e-quran.ts
Then:     T023 index.ts → T024 resolve.ts
Together: T025 academic-overview.tsx · T026 teachers-training.tsx · T027 hifz-e-quran.tsx
Then:     T028 page.tsx → T029 run
```

### Parallel example: User Story 4

```text
Together: T038 video-embed.test.tsx · T039 e2e US4 · T040 section slot tests
Then:     T041 video-embed.tsx → T042 home switch (delete youtube-embed.tsx)
Then:     T043 fixtures + resolve seam → T044 page wiring → T045 run → T046 owner media
```

## Implementation Strategy

### MVP first (US1 + US2)

Phases 1–2, then Phase 3. Because T014 changes `pageSections.academics` in Foundational, the menu already points at the three new anchors by the time US1 lands, so US1 + US2 together are deployable. **Do not deploy before US3**, though: until T036, `next.config.ts` derives wrong `/academics/<id>` redirects and drops the old Syllabi and Examinations routes.

### Incremental delivery

1. Setup + Foundational.
2. US1 (text) → review with the owner.
3. US2 (menus) + US3 (redirects) → navigation complete; deployable (no videos or photos, which production hides).
4. US4 (videos) → shared `VideoEmbed`, home unchanged; ask for URLs.
5. US5 (photos) → collage, dev placeholders, production check; ask for photos.
6. Polish → axe, build check, full public E2E, client review document, Instagram screenshots.

## Notes

- Total: 60 tasks.
- [P] tasks touch different files with no dependency on unfinished tasks.
- Commit after each phase checkpoint. The Phase 1 commit includes the untracked spec, plan, ADR-0010 and prompt history already on the branch.
