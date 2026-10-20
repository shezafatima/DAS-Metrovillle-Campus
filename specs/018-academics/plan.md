# Implementation Plan: Academics Page

**Branch**: `018-academics` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/018-academics/spec.md`

## Summary

This feature replaces the placeholder `/academics` (five empty `AnchoredPage` sections) with three real sections: Academic Overview, Teachers' Training and Hifz-e-Quran.

- **Content**: the client's English text, verbatim, in Zod-validated typed files under `src/content/academics/`. The shapes match 014's Settings value forms. A text-fidelity test compares them against committed extractions of the documents and the reference page.
- **Navigation**: Syllabi and Examinations leave `pageSections.academics`, so the menu and search follow automatically. Old addresses get an explicit permanent-redirect map.
- **Video**: the home page's YouTube click-to-load block becomes the single shared `VideoEmbed`, which supports YouTube and Instagram. Academics uses local posters only, so nothing reaches a provider before the click.
- **Placeholders**: training photos show as a staggered collage. In development, labelled placeholders fill the gaps. In production, missing photos and videos simply aren't rendered. The dev/production decision comes from the same seam as 017.

## Technical Context

- **Language/Version**: TypeScript (strict) 6.0, React 19.2, Next.js 16.3 App Router.
- **Primary Dependencies**: Already installed: Tailwind v4, Zod 4, lucide-react, next/image, `@axe-core/playwright` (dev, added in 017). **No new packages.**
- **Storage**: Typed content files. No database in 018. 014 later stores the same shapes.
- **Testing**: Vitest + Testing Library; Playwright (system Chrome, dev server on port 3100) with the axe scan.
- **Target Platform**: Public website on Vercel; evergreen browsers; widths 375, 768, 1024 and 1440.
- **Project Type**: Single Next.js web app.
- **Performance Goals**:
  - `/academics` stays statically rendered in production.
  - The page's only client JavaScript is `VideoEmbed`, already shipped on the home page.
  - 0 third-party requests before the visitor clicks play.
- **Constraints**:
  - Existing tokens only, plus 3 named tokens added first.
  - Verbatim text; no Urdu stored.
  - No placeholders in production.
  - Redirects are permanent.
  - The home Why Choose video is unchanged.
- **Scale/Scope**: 1 page, 3 section components, 1 collage component, 1 shared video component (generalised). 4 content files plus fixtures, 1 schema module, 1 view module, 1 video module, 1 E2E spec, about 10 unit/component test files.

## Constitution Check

*Gate: must pass before Phase 0 research. Re-checked after the Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | The text is verbatim from the client's documents and the reference page. The deviation from the reference (one page, collage and videos added, Syllabi and Examinations removed) is now documented in spec.md, "Deviation from the Reference Site", added during this planning session. Source conflicts T1–T7 are flagged, not resolved silently. | PASS |
| II. Fixed Stack | No new packages. The Instagram embed is an iframe of Instagram's own embed page, loaded only after a click. It isn't a service integration and stores no data. | PASS |
| III. Roles & Access | No admin routes. | N/A |
| IV. Security | No forms or secrets. The test seams are guarded by `freshReadsForTests()` (`NODE_ENV !== "production"`). Embed URLs are built only from parsed ids and codes, never from raw input, and look-alike hosts are refused. | PASS |
| V. Personal Data | None collected. Photo alt text is owner-supplied. No people are shown as placeholders. | PASS |
| VI. Data Integrity | One Zod schema per section, used by the content tests now and by 014's validation later. The video URL refine reuses the same parser as the renderer. | PASS |
| VII. Design System | Existing tokens, plus `--aspect-academics-overview` (alias), `--aspect-academics-photo` and `--spacing-academics-collage-offset`. All three are recorded first in `research/design-tokens.md`. `max-w-prose` and `max-w-4xl` are theme tokens. | PASS |
| VIII. Content | Copy is in typed files in 014's shape. Section ids and order are fixed layout. Items, photos and videos are content-only changes. | PASS |
| IX. Components | One component per section, and the page only composes them. `AboutSection`, `Paragraphs` and `SectionHeading` are reused. One video block, generalised rather than duplicated. Server Components everywhere except `VideoEmbed`. | PASS |
| X. Extensibility | Plain JSON shapes. Nothing speculative. | PASS |
| XI. Testing & DoD | An E2E test for every user story; 4 widths; axe scan. The reference has no Academics layout to match beyond its text (deviation note). No admin routes. | PASS |

**Re-check after design**: PASS. The schema helpers move from the About schema into `src/lib/content/fields.ts`. The request-time placeholder decision moves into `src/lib/content-mode.ts`. Both are reuse moves with no behaviour change, and the About tests guard them.

## Project Structure

### Documentation (this feature)

```text
specs/018-academics/
├── spec.md
├── plan.md                 # this file
├── research.md             # R1–R12
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── academics-content.md
│   └── page-structure.md
└── tasks.md                # /sp.tasks
```

### Source Code (repository root)

```text
docs/content-source/academics/
├── README.md                                   # origins, live URL + copy date
├── academic-overview.docx, hifz-e-quran.docx   # copies of das-text/ files
└── academic-overview.txt, teachers-training.txt, hifz-e-quran.txt

src/lib/content/fields.ts (+ test)              # text/longText/imageRef/itemId/uniqueIds (moved from about/schema.ts)
src/lib/content/placeholders.ts                 # showPlaceholders() (pure; moved from about/view.ts, re-exported there)
src/lib/content-mode.ts (+ test)                # placeholdersAllowed() (moved from about/resolve-view.ts)
src/lib/video/embed.ts (+ test)                 # parseInstagramAddress, resolveVideo, PlayableVideo
src/lib/academics/
├── schema.ts (+ test)
├── view.ts (+ test)                            # trainingPhotoTiles()
└── resolve.ts                                  # content + test-seam media + placeholdersAllowed

src/content/academics/
├── page.ts, academic-overview.ts, teachers-training.ts, hifz-e-quran.ts
├── fixtures.ts                                 # test-seam media only
├── index.ts                                    # parsed exports
├── content.test.ts                             # parse, ids, 19 items, no Urdu, local/Cloudinary URLs only
└── fidelity.test.ts

src/components/media/video-embed.tsx (+ test)   # replaces src/components/home/youtube-embed.tsx
src/components/academics/
├── academic-overview.tsx, teachers-training.tsx, training-photos.tsx, hifz-e-quran.tsx
└── *.test.tsx

src/app/(public)/academics/page.tsx             # PageBanner + 3 sections (replaces AnchoredPage)

# Changed
src/lib/about/schema.ts, src/lib/about/resolve-view.ts   # import the moved helpers
src/components/home/inspiration-why-choose.tsx           # uses VideoEmbed (same output)
src/content/site-shell.ts (+ test)                       # pageSections.academics, legacyAcademicsRedirects
next.config.ts                                           # Academics redirects from the legacy map
src/app/globals.css, research/design-tokens.md           # 3 tokens
e2e/academics.spec.ts (new), e2e/page-sections.spec.ts, e2e/site-search.spec.ts
```

**Structure decision**: The existing single-app layout, mirroring 017: `src/lib/academics`, `src/content/academics` and `src/components/academics`. Cross-page primitives go to neutral homes (`src/lib/content`, `src/lib/video`, `src/components/media`). `AnchoredPage` stays for Admission.

## Key Design Points

1. **One source for sections** (R7): `pageSections.academics` drives the page ids, menu, mobile group and search. Redirects come from an explicit legacy map, because the ids changed.
2. **One video block** (R3): `VideoEmbed` takes a resolved `PlayableVideo` and a poster. Academics never passes a remote poster, so SC-004 holds by construction and is checked in the browser.
3. **Production hides, development labels** (R5, R6): `trainingPhotoTiles` is the only place that decides what the collage shows. A missing video URL means no block in every mode.
4. **Layout** (R8): overview and training use text 7/12 beside media 5/12 from `md`. Videos are centred below at `max-w-4xl`. Backgrounds are surface, muted, surface.

## Risks

1. **Instagram's embed in a 16:9 frame may look cramped**, especially on phones. Mitigation: owner screenshots (quickstart). Switching to YouTube is a content-only change.
2. **Refactoring shared helpers out of About** could break About. Mitigation: pure moves, and the About unit and E2E suites run before and after.
3. **Existing E2E failures unrelated to this feature** (project memory). Compare failure sets before and after.

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| Second test-only cookie (`e2e-academics-media`) | The videos and photos are empty until the client supplies them, but US4 and US5 need browser tests | Editing content for tests leaves the repo dirty. Component tests can't prove there were no network requests |
| Helpers moved out of `src/lib/about/` | Academics needs the same field forms and placeholder mode (Constitution IX) | Copying them would create two drifting definitions |

## ADR

- [ADR-0010](../../history/adr/0010-shared-click-to-load-video-block.md): One shared click-to-load video block for YouTube and Instagram, with local-only posters on content pages (Proposed).
