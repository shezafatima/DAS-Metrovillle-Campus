# Research: 018-academics

Every decision below is grounded in the code on branch `018-academics` (from `fd94548`). No NEEDS CLARIFICATION items remain open.

## R1. Source documents and the fidelity check

- **Decision**: Follow 017's R1.
  - Copy the two client files into `docs/content-source/academics/` under the brief's names: `academic-overview.docx` ← `das-text/Academic Excellence .docx` and `hifz-e-quran.docx` ← `das-text/HIFZ-UL-QURAN.docx`.
  - Commit a plain-text extraction (`*.txt`, one paragraph per line, UTF-8) next to each. Use the same PowerShell `System.IO.Compression` reader on `word/document.xml` as 017.
  - For Teachers' Training, commit `teachers-training.txt`: the intro and the 19 list items, one per line, taken from the live page (<https://das.edu.pk/academics/teachers-training/>, fetched 2026-10-12). The README records the URL and the date.
  - Add `src/content/academics/fidelity.test.ts` with the same three checks as `src/content/about/fidelity.test.ts`:
    1. Every displayed English string is a line of the source, in order.
    2. Every English line of the source is used, unless excluded.
    3. No Urdu is stored.
  - Exclusions are listed in the test with their finding number: T2 "Curiosity with Purpose". The owner-requested T1 sentence is the only allowed line that is not in a source. It sits in an `OWNER_ADDITIONS` set tagged "T1, pending client approval".
- **Rationale**: SC-002 becomes an automated check with no new dependency (Constitution II).
- **Alternatives**: Parsing the .docx inside the test would need a zip library (a new package). Checking by eye isn't repeatable.

## R2. Content shapes compatible with 014

- **Decision**: Use the same value forms as 017 R2: `text`, `longText` (paragraphs separated by `\n\n`), `ImageRef | null`, and lists of items with a stable `id`. The schemas live in `src/lib/academics/schema.ts`.
  - The field helpers (`text`, `longText`, `imageRef`, `itemId`, `uniqueIds`) are private to `src/lib/about/schema.ts` today. They move to `src/lib/content/fields.ts`, and About imports them from there. Behaviour doesn't change, and Constitution IX asks for primitives to be built once.
  - Local photos use `ImageRef` with `url` starting with `/` and `publicId: ""`, so a Cloudinary photo can replace one later with no shape change. The existing schema already allows a leading `/`.
  - Alt text sits beside each image (`alt` or `imageAlt`), because `ImageRef` has none. A non-null image MUST have non-empty alt text (schema refine; FR-014, US5-4).
  - Non-editable metadata isn't part of the 014 value: the Teachers' Training source URL and copy date (FR-011), and the review notes. It's exported separately (`source`, `review`), as 017's `review` is.
- **Rationale**: 014 can store each section as a Settings-style group whose value parses with the same schema (Constitution VI, VIII).
- **Alternatives**: Arrays of plain strings for the 19 items. These are closer to the source, but 014's list fields need item ids.

## R3. One click-to-load video block (FR-016 to FR-019)

- **Decision**: Generalise the existing `src/components/home/youtube-embed.tsx` into `src/components/media/video-embed.tsx` (`VideoEmbed`, client component) and delete the old file. Its only caller, `inspiration-why-choose.tsx`, switches to the new block.
  - Props: `video: PlayableVideo` (`{ provider, embedUrl }`), `title` (the iframe's accessible name), `playLabel`, `poster: { src: string; remote?: boolean } | null`, and an optional `testId`.
  - **Before the click**: a `<button>` with `aria-label={playLabel}` over the poster.
    - A remote poster (only the home page's YouTube thumbnail) keeps the plain `<img>` it uses today.
    - A local poster uses `next/image` with `fill`.
    - `null` draws the local placeholder: a navy panel with `/images/logo-emblem.svg`, `aria-hidden`.
    - No third-party URL appears in the markup.
  - **After the click**: an `<iframe>` with `src={embedUrl}` in the same `aspect-video` frame. Only then does the browser contact the provider.
  - `src/lib/video/embed.ts` has `resolveVideo(entry): PlayableVideo | null`. It returns `null` for an empty or unparsable URL. YouTube reuses `parseYouTubeAddress` (`src/lib/settings/youtube.ts`, unchanged) and maps to `https://www.youtube-nocookie.com/embed/<id>?autoplay=1&rel=0`, the current behaviour. Instagram uses a new `parseInstagramAddress`:
    - Accepted hosts: `instagram.com` and `www.instagram.com`.
    - Accepted paths: `/p/<code>`, `/reel/<code>`, `/reels/<code>` and `/tv/<code>`, with an optional trailing slash.
    - `<code>` must match `^[A-Za-z0-9_-]{5,64}$`.
    - It maps to `https://www.instagram.com/<p|reel>/<code>/embed/`.
    - Anything else is refused: look-alike hosts, profile pages, credentials in the URL.
  - **Home page**: `video.youtubeId` becomes a `PlayableVideo` built from the same id. The poster is `{ src: "https://i.ytimg.com/vi/<id>/hqdefault.jpg", remote: true }` and `testId="why-choose-video"`. Markup, classes and behaviour stay identical (FR-019, SC-008). `e2e/admin-home-page.spec.ts` already covers this.
- **Rationale**: Extending the one existing block avoids a second component (FR-016). Building embed URLs in a pure function keeps the network rule testable without a browser. Instagram's official embed page needs no `embed.js` script (FR-017).
- **Alternatives**: Instagram's `embed.js` blockquote (loads a third-party script, and can't defer until the click without injecting it). A second component for Instagram (forbidden by FR-016).

## R4. Instagram inside a 16:9 frame

- **Decision**: The Instagram iframe fills the same `absolute inset-0` box as YouTube. Instagram's page lays itself out to the frame's width and scrolls inside the iframe if it's taller. The quickstart captures screenshots at 375, 768, 1024 and 1440 px for the owner (US4-5). If the result looks poor, the owner can switch the entry to the school's YouTube channel (`provider: "youtube"`), which is a content-only change.
- **Alternatives**: A centred portrait iframe on a navy backdrop inside the 16:9 frame. It looks better on desktop, but at 375 px the frame is about 193 px tall, so a portrait embed would be unreadable. Keep this as a follow-up if the owner prefers it.

## R5. Placeholder mode (dev shows placeholders, production hides them)

- **Decision**: Pull the request-time decision out of `src/lib/about/resolve-view.ts` into `src/lib/content-mode.ts`. Its function `placeholdersAllowed(): Promise<boolean>` returns `showTeamPlaceholders({ nodeEnv, forceProduction })`, where `forceProduction` is `freshReadsForTests() && cookie e2e-production-content=1`. `resolveAboutView` and the Academics page both call it.
  - The Academics menu doesn't depend on it, because all three sections are always shown. So `Header` needs no change for Academics: its children still come from `navigationItems` → `pageSections.academics`.
- **Rationale**: This keeps one test seam for both pages. `cookies()` is still only read under the test guard, so production pages stay static.

## R6. Training photos: collage, single photo and placeholders

- **Decision**: A pure function `trainingPhotoTiles(photos, showPlaceholders)` in `src/lib/academics/view.ts` returns `{ layout: "none" | "single" | "collage", tiles: Tile[] }`.
  - It takes the first 3 photos. The schema also caps the list at 3, so the content test fails on a 4th. That's the "content check warns" in the edge cases, and 014's editor will refuse a 4th.
  - **Production**: 0 photos gives `none`, 1 gives `single`, and 2–3 give `collage`.
  - **Development**: with fewer than 2 photos, the real photos are padded with placeholder tiles up to 3, and the layout is `collage`. Placeholder tiles have a dashed border and a visible "Placeholder" badge (the same look as 017's team placeholders), with no image file.
  - **Collage layout (md and up)**:
    - 2 photos: a 2-column grid, with the second photo dropped by `--spacing-academics-collage-offset`.
    - 3 photos: the first spans both columns, the next two sit side by side, and the third is dropped by the offset.
    - The container reserves bottom padding equal to the offset, so nothing overlaps the video below.
    - Phones: one column, no offset.
    - Every frame uses `--aspect-academics-photo` (4:3), `rounded-xl` and `object-cover`. A failed image leaves the frame's background showing (edge case).
- **Rationale**: "Staggered" needs no absolute positioning, so it can't overlap the text at any width (US5-3).

## R7. Redirects and section ids

- **Decision**:
  - `pageSections.academics` becomes `academic-overview` / "Academic Overview", `teachers-training` / "Teachers' Training" and `hifz-e-quran` / "Hifz-e-Quran".
  - Deriving redirects from these ids would create redirects from URLs that never existed and drop the real old ones (the same problem as 017 R5). So `src/content/site-shell.ts` exports `legacyAcademicsRedirects`:
    - `/academics/academics-overview` → `/academics#academic-overview`
    - `/academics/syllabi` → `/academics`
    - `/academics/examinations` → `/academics`
    - `/academics/teachers-training` → `/academics#teachers-training`
  - `next.config.ts` derives section redirects only for `admission`, and adds the Academics map with `permanent: true`. `/hifz-e-quran` keeps its existing rule.
  - There's no `[slug]` route under `/academics`, so any other `/academics/...` address stays a 404 (FR-005).
- **Removed anchors** (FR-004): update `e2e/site-search.spec.ts` (the "syllabi" case becomes a search for "Teachers" → `/academics#teachers-training`, plus a negative check that "syllabi" and "examination" find no Academics result) and `e2e/page-sections.spec.ts` (ids, redirects, dropdown test now clicks "Hifz-e-Quran").

## R8. Page layout, headings and backgrounds

- **Decision**:
  - The h1 is `PageBanner` with title "Academics" and trail `["Academics"]` (the 017 pattern). Metadata: title "Academics", description from the first overview paragraph, canonical `/academics`.
  - Sections reuse `AboutSection` (`src/components/about/about-section.tsx`). It provides the anchor id, `anchor-section` scroll margin, `aria-labelledby`, the background and `SectionHeading`, so it is the shared section wrapper (FR-006, FR-024). `Paragraphs` is reused too. Backgrounds are fixed: overview `surface`, training `muted`, Hifz `surface` (FR-025).
  - **Academic Overview**: a `md:grid-cols-12` grid, with text in 7 columns (`max-w-prose`) and the image in 5. Phones stack text first. With `image: null`, it shows the emblem panel, the same markup as Our Story (spec Clarification Q3).
  - **Teachers' Training** (Clarification Q2):
    - md and up: a `md:grid-cols-12` grid, with the intro and `<ul>` in 7 columns and the collage in 5. Without photos, the text spans the row, still capped at `max-w-prose`.
    - The video sits below, centred, capped at `max-w-4xl`. That's an existing theme size, so the frame isn't 675 px tall at 1440 px.
    - Phones: text, then photos, then video.
  - **Hifz-e-Quran**: `SectionHeading` with heading "HIFZ-UL-QURAN PROGRAM" (no case change, Clarification Q4) and line "A Meaningful Step…". Then the intro paragraph, and each sub-section as an `h3` (the existing why-choose h3 classes) with its paragraphs. Then the video, centred and capped at `max-w-4xl`.
  - The list uses `list-disc ps-6 marker:text-primary`, the existing why-choose list classes.

## R9. Design tokens (FR-023, Constitution VII)

- **Decision**: Add three tokens to `globals.css`, recorded first in `research/design-tokens.md` under "Academics page (018 — no matching reference page)":
  - `--aspect-academics-overview: var(--aspect-about-story)` (an alias, 4:3)
  - `--aspect-academics-photo: 4 / 3`
  - `--spacing-academics-collage-offset: 2.5rem`
- Everything else is reused: `bg-surface`, `--color-home-muted-band`, `bg-primary` (poster placeholder), `max-w-prose`, `max-w-4xl`, `rounded-xl`, `--spacing-home-section-y` and the `SectionHeading` tokens.
- **Deviation note** (Constitution I): these values are composed, not extracted, because the reference has no matching layout.

## R10. Test seam for media (videos and photos are empty until the client supplies them)

- **Finding**: The content files ship with empty video URLs and no photos, so `next dev` can't show the collage or the players without changing content.
- **Decision**: Add a second test-only cookie under the same guard: `e2e-academics-media=two|three`. `src/lib/academics/resolve.ts` swaps in fixture media from `src/content/academics/fixtures.ts`:
  - 2 or 3 sample photos, using existing local SVGs in `public/images/`.
  - A sample YouTube URL and a sample Instagram reel URL.
  - No poster, so the local placeholder poster shows.
  
  The guard is `freshReadsForTests()`, so production never reads the cookie and pages stay static.
- **Network**: Playwright records every request host from navigation until the click and asserts none match `youtube`, `youtube-nocookie`, `ytimg`, `instagram`, `cdninstagram` or `fbcdn` (SC-004). After the click, `page.route` fulfils the provider host with a blank page, so the test doesn't depend on the real network.
- **Alternatives**: Editing content for the test (leaves the repo dirty). Component tests only (they can't prove the absence of network requests in a real browser).

## R11. Release check

- **Decision**: No new release-check rule. Nothing in 018 adds a stock-photo host, and the overview fallback is the local emblem. Production hides empty media, so there's nothing placeholder-like to block. The existing `TEMPORARY_IMAGE_HOSTS` rule still applies (FR-012). A unit test asserts that the Academics content references only local paths or Cloudinary URLs.

## R12. Testing approach

- **Unit (Vitest)**:
  - `parseInstagramAddress` and `resolveVideo` (accepted and refused URLs, look-alike hosts).
  - `trainingPhotoTiles` (0/1/2/3/4 photos × dev/production).
  - Schemas parse every content file; ids are unique; exactly 19 items; non-null images have alt text.
  - The fidelity test (R1).
  - `legacyAcademicsRedirects` and the `pageSections.academics` ids.
  - `placeholdersAllowed`.
- **Component (Vitest + RTL)**:
  - `VideoEmbed`: poster before click, no third-party `src`/`href` in the markup with a local or null poster, a labelled button operable by Enter/Space, an iframe after click with the right src and title, the home remote poster unchanged.
  - Each section renders its text, headings and structure. The collage renders 2 and 3 photos, and placeholders are labelled. No video or photo block when absent.
- **E2E (Playwright)**: a new `e2e/academics.spec.ts` covering:
  - US1: order, one h1, h2 per section, text spot-checks, no Urdu, no sideways scroll at 4 widths, overview columns.
  - US2: desktop dropdown and mobile group entries, landing clear of the header.
  - US3: redirects and 404.
  - US4: no provider requests before click, iframe after click, 16:9 at 4 widths, no block without a URL.
  - US5: dev placeholders, production cookie shows no photo block, 2 and 3 sample photos at 4 widths with no overlap.
  - An axe scan in dev, production and the media-fixture modes (SC-006).
  
  Update `e2e/page-sections.spec.ts` and `e2e/site-search.spec.ts`. The home video specs must still pass unchanged (SC-008).
