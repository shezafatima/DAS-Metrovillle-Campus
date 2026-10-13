# Implementation Plan: Resources Page

**Branch**: `019-resources` | **Date**: 2026-10-12 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `specs/019-resources/spec.md`

## Summary

`/resources` becomes two anchored sections, composed from `pageSections.resources` as Academics is.

- **Photo Gallery**: the 007 section, unchanged inside. Its bare `<section>`/`<h2>` becomes the shared `AboutSection`, which brings `SectionHeading`, the spacing, the `anchor-section` scroll margin and the `surface` background. Hidden-when-empty stays inside `GallerySection`.
- **Mobile Apps**: new.
  - The reference heading and body sit verbatim beside the locally stored Scarlet Series flyer (uncropped).
  - A grid of four app cards follows. Only Scarlet English has a working link (a Drive APK, "Download for Android" plus a note). Math, Urdu and LMS App show "Not available at the moment" and no link.
  - Content lives in a Zod-validated typed file in 014's shape, where `url: ""` means no working link.
  - The dead reference URLs and the six portal URLs go into `docs/content-source/resources/client-review.md`.
- **Clean-up**: the stale Downloads / Our Books comments are removed. Nothing ever linked to those anchors (spec Pre-build Findings), so nothing needs repointing.

## Technical Context

- **Language/Version**: TypeScript (strict) 6.0, React 19.2, Next.js 16.3 App Router.
- **Primary Dependencies**: Already installed: Tailwind v4, Zod 4, lucide-react (the `BookA`, `Calculator`, `Feather` and `MonitorSmartphone` icons verified present), next/image, `@axe-core/playwright`. **No new packages.**
- **Storage**: A typed content file for Mobile Apps. The gallery keeps its 007 MongoDB document, untouched.
- **Testing**: Vitest + Testing Library. Playwright with system Chrome and the axe scan: the `chromium` project for gallery-independent tests, the serial `admin` project for tests that seed the gallery.
- **Target Platform**: Public website on Vercel; evergreen browsers; widths 375, 768, 1024 and 1440.
- **Project Type**: Single Next.js web app.
- **Performance Goals**:
  - `/resources` keeps `revalidate = 60` (007).
  - Mobile Apps adds no client JavaScript: Server Components only, with CSS-only hover.
  - 0 requests to das.edu.pk.
  - The flyer is lazy-loaded, because it sits below the gallery.
- **Constraints**:
  - Verbatim reference text.
  - Existing colours and fonts, plus 2 named size tokens added first in `research/design-tokens.md`.
  - No invented links.
  - The portal links are untouched.
  - The 007 behaviour and the 007 specs are unchanged.
- **Scale/Scope**:
  - 1 page rewritten.
  - 1 shared wrapper prop added (`AboutSection`'s `beside`/`below`).
  - 1 gallery component re-wrapped.
  - New: 1 section component, 1 card component, 1 icon map, 1 schema module, 2 content files plus an index, 3 unit test files, 2 E2E specs.
  - 2 E2E tests edited.
  - 3 docs files.

## Constitution Check

*Gate: must pass before Phase 0 research. Re-checked after the Phase 1 design.*

| Principle | Check | Status |
|---|---|---|
| I. Purpose & Fidelity | The text is verbatim from the reference (fidelity test). The deviation from the reference (one page, a card UI, the added LMS card) is documented in spec.md, "Deviation from the Reference Site". Conflicts and doubts (R1–R7, dead links) are flagged to the client, never resolved silently. | PASS |
| II. Fixed Stack | No new packages, services or hosts. External links are plain `<a>` elements. The flyer is a local file. | PASS |
| III. Roles & Access | No admin routes. The gallery admin is untouched. | N/A |
| IV. Security | Links: `rel="noopener noreferrer"`; only `https:`; Play and App Store hosts matched exactly (no look-alikes); `http:` and `javascript:` refused by the schema. The insecure Student Login URL isn't used (it is listed for review only). | PASS |
| V. Personal Data | None collected. | N/A |
| VI. Data Integrity | One Zod schema, parsed at module load. `linkMatchesType` is exported for 014's validator, so the rules can't drift. | PASS |
| VII. Design System | Existing tokens, plus `--size-resources-flyer-max-h` (36rem) and `--spacing-resources-card-lift` (4px), recorded first in `research/design-tokens.md` under a new "Resources page (019)" heading. `--radius-card`, `--shadow-card`, `--color-topbar`, `--color-primary` and `--color-home-muted-band` are reused. | PASS |
| VIII. Content | The copy is in a typed file in 014's shape. Section ids and order are fixed. Apps, links and icons change by content only. | PASS |
| IX. Components | `MobileAppsSection` and `AppCard` are their own components. The page only composes. `AboutSection`, `SectionHeading` and `Paragraphs` are reused, and the wrapper is extended rather than copied (R4). All Server Components. | PASS |
| X. Extensibility | Plain JSON shape. No speculative fields. | PASS |
| XI. Testing & DoD | An E2E test for each user story (US1–US3 in E2E; US4 is a document, checked by a unit test on the content's coverage); 4 widths; axe scan. The reference has no layout to match beyond its text (deviation note). | PASS |

**Re-check after design**: PASS. The one shared-code change, `AboutSection` gaining optional `beside`/`below` props, is additive. The existing About and Academics component and E2E suites guard it, because their output is unchanged when the props are absent.

## Project Structure

### Documentation (this feature)

```text
specs/019-resources/
├── spec.md
├── plan.md                    # this file
├── research.md                # R1–R15
├── data-model.md
├── quickstart.md
├── contracts/
│   ├── mobile-apps-content.md
│   └── page-structure.md
├── checklists/requirements.md
└── tasks.md                   # /sp.tasks
```

### Source Code (repository root)

```text
docs/content-source/resources/
├── README.md                  # source URL, copy date, link-check date
├── mobile-apps.txt            # line 1 heading, line 2 body (verbatim)
└── client-review.md           # 6 portal URLs + status, 4 app links + status, findings R1–R7, requests

public/images/resources/scarlet-series-playgroup.jpeg     # copied from the one 2026-10-12 download

src/lib/resources/
├── schema.ts (+ schema.test.ts)                           # mobileAppsSchema, linkMatchesType, LINK_TYPES, APP_ICON_KEYS

src/content/resources/
├── mobile-apps.ts                                         # mobileApps, mobileAppsCopy, mobileAppsSource, review
├── index.ts                                               # parsed exports
├── content.test.ts                                        # invariants (contracts/mobile-apps-content.md)
└── fidelity.test.ts                                       # heading/body == mobile-apps.txt

src/components/resources/
├── mobile-apps.tsx (+ test)                               # MobileAppsSection
├── app-card.tsx (+ test)                                  # available / unavailable footers
└── app-icons.ts                                           # key → lucide icon

# Changed
src/components/about/about-section.tsx (+ test)            # optional beside/below props (R4)
src/components/gallery/gallery-section.tsx                 # AboutSection wrapper; comment rewritten (R5, R13)
src/app/(public)/resources/page.tsx                        # compose from pageSections.resources; metadata; comment
src/content/site-shell.ts                                  # comment on pageSections.resources only
src/app/globals.css, research/design-tokens.md             # 2 tokens
e2e/page-sections.spec.ts                                  # placeholder test removed; portal test reads the footer (R14)
e2e/resources.spec.ts (new)                                # chromium: US1, US2 (Mobile Apps anchor), layout, axe, no removed anchors
e2e/admin-resources-gallery.spec.ts (new)                  # admin: order, both anchors, backgrounds with a seeded gallery
```

**Structure decision**: The existing single-app layout, mirroring 018: `src/lib/resources`, `src/content/resources` and `src/components/resources`. The gallery stays in `src/components/gallery`, and only its wrapper changes.

## Key Design Points

1. **One source for sections**: `pageSections.resources` already lists exactly Photo Gallery and Mobile Apps. The page maps over it, so the menu, search and page can't disagree.
2. **Dead link = empty URL** (R1): one rule, shared with 018's videos. The card component branches only on `url === ""`. Dead URLs live in the source record and the client-review document, never in the HTML.
3. **Label in name** (R3): the visible button text stays in the accessible name, with ": {app name} (opens in a new tab)" appended. The APK note is linked with `aria-describedby`.
4. **The flyer is text** (R7): it is shown whole, with its height capped by a token, and its alt text transcribes it.
5. **Fixed backgrounds** (R6): Photo Gallery `surface`, Mobile Apps `muted`, fixed per section rather than by position, so a hidden gallery leaves no gap in the pattern.

## Risks

1. **The only working download is a Drive APK, and 3 of 4 cards are "Not available"**, so the section may look thin until the client replies. Mitigation: the client-review document asks for links before launch. Adding a link is a one-line content change.
2. **Extending `AboutSection`** could disturb About or Academics. Mitigation: the props are optional, with the existing branch untouched. The About and Academics unit and E2E suites run before and after.
3. **Existing E2E failures unrelated to this feature** (project memory: about 35 admin tests fail on unchanged code). Mitigation: compare the failure sets before and after, and pre-start the dev server.

## Complexity Tracking

| Deviation | Why needed | Simpler alternative rejected because |
|---|---|---|
| A new optional `beside`/`below` on the shared `AboutSection` | The brief puts the heading in the text column beside the photo | A bespoke section would duplicate the wrapper's spacing and scroll margin (Constitution IX) |
| A second E2E file in the `admin` project | Only that project seeds the shared gallery document, which the order and anchor tests need | Putting them in the chromium spec would depend on whatever gallery data the test database happens to hold |

## ADR

None. No decision here meets all three significance tests:

- The dead-link rule reuses 018's empty-URL convention.
- The wrapper prop is local and additive.
- No stack, data model or security boundary changes.

## Spec updates made during planning

- FR-012 and the "Findings for client approval" table: the flyer's alt text transcribes its text (R7). New finding R7: the flyer advertises the 2020-21 session and the head office web address.
