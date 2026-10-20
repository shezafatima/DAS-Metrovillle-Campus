# Implementation Plan: About Page — Five Anchored Sections

**Branch**: `017-about` | **Date**: 2026-10-09 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/017-about/spec.md`

## Summary

This feature replaces the placeholder `/about` (four empty sections from the navigation conversion) with five real sections built from the client's Word documents: Our Story, Vision & Mission, Core Values, Our Management Team and Messages.

- **Content**: the client's English text, kept verbatim in typed, Zod-validated content files under `src/content/about/`. The shapes match the 005 Settings engine's value forms, so 014 can move them into the database unchanged. The Urdu text is stored but not shown.
- **Team and Messages visibility**: one pure function (`aboutView`) decides which sections, team cards and backgrounds are shown. The page, the header menu and the search index all use it. The management team (empty for now) is hidden in every production build and shown as labelled placeholders only in development. An empty Messages list hides Messages in every mode (no placeholders).
- **Redirects and links**: the four old `/about/...` routes get an explicit permanent-redirect map. The home page's Salient Features card link is repointed.
- **Fidelity check**: a text-fidelity test compares the content files against committed plain-text extractions of the documents.

## Technical Context

- **Language/Version**: TypeScript (strict) 6.0, React 19.2, Next.js 16.3 App Router.
- **Primary Dependencies**: Already installed: Tailwind v4, Zod 4, lucide-react (icons), next/image (Cloudinary remote pattern already configured). One new **dev** dependency, approved by the owner on 2026-10-10: `@axe-core/playwright`, for the SC-008 accessibility scan.
- **Storage**: Typed content files (no database in 017). 014 later stores the same shapes in the Settings-style collection.
- **Testing**: Vitest + Testing Library (unit and component), Playwright (E2E, system Chrome, dev server on port 3100), and `@axe-core/playwright` (WCAG 2 A/AA scan of /about).
- **Target Platform**: Public website on Vercel; modern evergreen browsers; widths 375, 768, 1024 and 1440.
- **Project Type**: Single Next.js web app (public site plus admin in one project).
- **Performance Goals**: `/about` stays statically rendered in production (no request-time APIs). No client JavaScript is added for the page sections (all Server Components).
- **Constraints**:
  - Existing tokens only (Constitution VII).
  - The text matches the documents verbatim.
  - No placeholders in production.
  - `next.config.ts` redirects stay permanent.
- **Scale/Scope**:
  - 1 page and 5 section components, plus 1 placeholder primitive.
  - 6 content files, 1 schema module, 1 view module.
  - About 2 E2E spec files and about 8 unit/component test files.

## Constitution Check

*Gate: must pass before Phase 0 research. Re-checked after the Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | The deviation from the reference About sub-pages is documented in spec.md "Deviation from the Reference Site". The client's text is used verbatim. Conflicts (missing source path, heading wording T6, English/Urdu differences) are flagged in the spec, not resolved silently. The About sections come from the client brief (PRD §5.2, Open Question 1 now answered by this brief). | PASS |
| II. Fixed Stack | No new runtime packages. lucide-react comes with shadcn/ui (named in the stack) and is already used by public components (search box, carousel, news card). `@axe-core/playwright` is added as a dev-only test helper for Playwright (named in the stack), approved by the owner on 2026-10-10 and recorded in `docs/architecture.md` (Complexity Tracking). | PASS (owner-approved) |
| III. Roles & Access | No admin routes. | N/A |
| IV. Security | No forms, no secrets. The test seam is ignored in production (guarded by `NODE_ENV`, the same pattern as `freshReadsForTests`). | PASS |
| V. Personal Data | No personal data is collected. Staff names and designations are public content supplied by the client. No photos of real people are used as placeholders. | PASS |
| VI. Data Integrity | One Zod schema per section, used by the content tests now and by 014's server validation later. | PASS |
| VII. Design System | Only existing tokens: `primary` (navy), `topbar` (yellow, as an accent only), `surface`, `--color-home-muted-band`, `SectionHeading` tokens, `anchor-section`. `max-w-prose` is a theme token. Three composed values are added as tokens first (T005: `--aspect-about-person`, `--aspect-about-story`, `--color-about-panel` as an alias of `--color-cta-hover`), documented in research/design-tokens.md "About page". | PASS |
| VIII. Content | Copy lives in typed content files in the shape 014 will store. Anchor ids and labels are fixed layout, and sections cannot be added, removed or reordered by content. The team list's items can change, as with hero slides. | PASS |
| IX. Components | One component per section. The page only composes them. All are Server Components. Copy lives in content files. `PersonPlaceholder` and `PersonPhoto` are shared by Team and Messages. | PASS |
| X. Extensibility | The shapes are plain JSON, so other consumers (for example the chatbot) can read them later. Nothing speculative is built. | PASS |
| XI. Testing & DoD | Every user story has an E2E test. Layout is checked at the four widths. The section bodies have no reference layout, so "reference site's own breakpoints" does not apply (spec deviation note); header and menu tests are unchanged. No admin routes, so the access matrix does not apply. SC-008 is checked by an axe scan. | PASS |

**Re-check after design**: PASS. The design adds one request-time read (`cookies()`), and only inside the test-only guard. Production pages stay static.

## Project Structure

### Documentation (this feature)

```text
specs/017-about/
├── spec.md
├── plan.md                 # this file
├── research.md             # R1–R11
├── data-model.md           # section shapes, view, review metadata
├── quickstart.md
├── contracts/
│   ├── about-content.md    # Zod shapes + 014 field mapping
│   └── page-structure.md   # DOM outline, nav, redirects, test seam
├── checklists/requirements.md
└── tasks.md                # /sp.tasks
```

### Source Code (repository root)

```text
docs/content-source/about/
├── our-story.docx, vision-mission.docx, core-values.docx, messages.docx   # copies of das-text/ pages
└── our-story.txt, vision-mission.txt, core-values.txt, messages.txt       # verbatim extractions (fidelity reference)

src/lib/about/
├── schema.ts               # Zod schemas + inferred types + ICON_KEYS
├── schema.test.ts
├── view.ts                 # aboutView(), valuesColumns(), showTeamPlaceholders()
└── view.test.ts

src/content/about/
├── page.ts                 # { title: "About Us" } + review
├── our-story.ts
├── vision-mission.ts
├── core-values.ts
├── management-team.ts      # members: [] + teamPlaceholders (separate export)
├── messages.ts
├── index.ts                # parsed exports (schema.parse at module load)
├── content.test.ts         # every file parses; ids unique
└── fidelity.test.ts        # verbatim vs docs/content-source/about/*.txt

src/components/about/
├── about-section.tsx       # <section> wrapper: id, anchor-section, background, SectionHeading
├── our-story.tsx
├── vision-mission.tsx
├── core-values.tsx
├── value-icons.ts          # IconKey → lucide component
├── management-team.tsx
├── messages.tsx
├── person-photo.tsx        # fixed 4:5 rounded frame; next/image or PersonPlaceholder
├── paragraphs.tsx          # longText → <p> per paragraph
└── *.test.tsx

src/app/(public)/about/page.tsx      # PageBanner + sections from aboutView (replaces AnchoredPage)

# Changed
src/content/site-shell.ts            # pageSections.about → 5 new ids; legacyAboutRedirects
src/content/site-shell.test.ts
next.config.ts                       # about redirects from legacyAboutRedirects
src/content/home.ts                  # salient-features card href → /about
src/components/site-shell/header.tsx # async; About children + search index from aboutView
src/components/site-shell/search-box.tsx  # optional `index` prop
src/lib/site-search.ts               # export buildSearchIndex(items)

e2e/about.spec.ts                    # new (includes the axe scan)
package.json                         # devDependency @axe-core/playwright (exact version)
docs/architecture.md                 # record the new dev dependency
research/design-tokens.md            # "About page (017 about — no matching reference page)"
src/app/globals.css                  # --aspect-about-person, --aspect-about-story, --color-about-panel
e2e/page-sections.spec.ts            # about ids, redirects, keyboard test label
```

**Structure decision**: The existing single-app layout is kept. New code lives in `src/lib/about`, `src/content/about` and `src/components/about`, mirroring `careers` and `home`. `AnchoredPage` stays for Academics and Admission.

## Key Design Points

1. **Single source of visibility** (R4): `aboutView` is used by the page, by `Header` (passed as `items` to `NavDesktop` and `NavMobile`) and by `SearchBox` (via `index`). `showTeamPlaceholders()` returns `NODE_ENV === "development"`, unless the test seam forces production behaviour. Messages is visible iff it has at least one message, in every mode.
2. **Shapes equal 014's values** (R2, contracts/about-content.md). Components take parsed values as props, so they don't know the source.
3. **Backgrounds by visible position** (R6): hiding the team never puts two same-coloured sections next to each other.
4. **Vision & Mission highlight**: a navy band. On desktop it shows two white-bordered panels on navy. Each panel has a yellow icon disc (navy icon), a white h3, a yellow top rule and white body text. They stack below `md`. No yellow text and no white text on yellow.
5. **Messages**: an `article` per message. Below `lg` the photo is above the text; at `lg` and up, the photo side alternates. Full text with no toggle (FR-017).

## Risks

1. **Header becomes async and reads `cookies()` in test mode.** If the guard were wrong, every public page would turn dynamic in production. Mitigation: the guard is `freshReadsForTests()` (checks `NODE_ENV` first). A unit test covers it, and the build output must show `/about` and `/` as static (checked in quickstart).
2. **Fidelity drift when the client approves fixes.** The `.txt` reference and the content file must change together. The fidelity test fails if only one changes, which is the intent. The procedure is in the quickstart.
3. **Existing E2E failures unrelated to this feature** (project memory: ~35 admin E2E tests already fail). Compare failure sets before and after rather than expecting a fully green suite.

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| New dev dependency `@axe-core/playwright` | SC-008 requires an automated accessibility scan, and none is installed | Hand-written role and alt assertions cover only what we think to check. The owner approved the addition (spec Clarifications 2026-10-10) |
| Brief's `frontend-design` skill not used | The skill is not available in this environment | The V&M design follows the existing home-band patterns and token rules instead |
| Read more toggle dropped | Owner's decision (spec Clarifications 2026-10-09) | — |
