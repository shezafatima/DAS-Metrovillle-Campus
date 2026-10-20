# Research: 017-about

All decisions below are grounded in the current code (branch `017-about`, from `main` at 624e505). There are no open NEEDS CLARIFICATION items.

## R1. Source documents and the fidelity check

- **Decision**: Copy the four client files from `das-text/` into `docs/content-source/about/` under the brief's names (`our-story.docx` ← `ourstory.docx`, `vision-mission.docx` ← `vision&mission.docx`, `core-values.docx` ← `corevalues.docx`, `messages.docx` ← `messaes.docx`; the owner renamed these from Page 4, 2, 3 and 1, with identical contents). Next to each, commit a plain-text extraction (`*.txt`, one paragraph per line, UTF-8) produced once from `word/document.xml`. Use the PowerShell `System.IO.Compression` reader, the same method as in the spec session. A Vitest test (`src/content/about/fidelity.test.ts`) checks that every displayed English string in the content files appears verbatim, in order, in its `.txt`. It also checks that every non-excluded English paragraph of the `.txt` is used. Exclusions (taglines, "(Page No 1)", Welcome Note) are listed in the test with the spec finding number.
- **Rationale**: This makes SC-001 an automated check without adding a dependency. Node has no built-in .docx reader, and a zip/docx library would be a new package (Constitution II).
- **Alternatives**: Parse the .docx in the test (needs a zip library). Compare by eye only (not repeatable).

## R2. Content shape compatible with 014 (Settings engine)

- **Decision**: Each section's value uses only the value forms the 005 Settings engine already produces (`src/lib/settings/types.ts`):
  - `text` / `longText` for plain strings. Multi-paragraph text is one `longText` string, with paragraphs separated by a blank line (`\n\n`). The display splits on that.
  - `image` → `ImageRef | null` (`{ url, publicId, width, height }`), so Cloudinary photos drop in later. `null` means "use the placeholder".
  - `list` → items carrying a stable `id`. The engine's `deletedAt` envelope is added by 014's reader and filtered out before display, so the content files hold live items only.
  
  The shapes are Zod schemas in `src/lib/about/schema.ts`, with types inferred from them (Constitution VI: one schema). Every content file is parsed by a unit test.
- **Rationale**: In 014, each section becomes a `GroupDefinition` whose stored value parses with the same schema. The display components take the parsed value and never know where it came from (Constitution VIII).
- **Alternatives**: Arrays of paragraph strings. This is closer to the documents, but 014's engine has no "list of strings" field, so a `longText` per block avoids inventing one. A rich-text/HTML body was rejected because nothing in the documents needs formatting, and sanitising would be needed.

## R3. Value icons stored as data

- **Decision**: A core value stores `icon` as a key from a fixed list (`compass`, `shield-check`, `target`, `award`, `heart-handshake`, `landmark`, plus spares `users`, `book-open`, `star`, `sprout`). A server-renderable map in `src/components/about/value-icons.ts` turns the key into a lucide-react component. Icon choices: Leadership→Compass, Responsibility→ShieldCheck, Commitment→Target, Excellence→Award, Respect→HeartHandshake, Citizenship→Landmark. Vision→Eye and Mission→Flag are fixed in the panel component, not data. All icons are `aria-hidden`.
- **Rationale**: A database cannot store a component, and a closed list keeps 014's editor to a select. All the chosen names exist in the installed lucide-react (checked in `lucide-react.d.ts`). lucide-react is already a dependency and is used by public components (search box, carousel).
- **Note for 014**: The Settings engine has no "select" field type yet. 014 must add one, or use a text field with an allowed-values rule. This is recorded in `contracts/about-content.md`.

## R4. Hiding the management team in production (and testing it)

- **Decision**: One pure function, `aboutView({ members, messageCount, showPlaceholders })` in `src/lib/about/view.ts`. It returns the visible sections (ids and labels, in order), the team cards to draw (real members, or the labelled placeholders, or none), and each visible section's background. `showPlaceholders` is true only when `process.env.NODE_ENV === "development"`. `next build` always sets production, so live **and** preview deployments never show placeholders (spec Assumption). Messages is included only when `messageCount > 0`, in every mode, and has no placeholders (owner, 2026-10-10).
  - The header and search must agree with the page. `Header` (server) computes the About children from the same function and passes `items` to `NavDesktop` and `NavMobile`, which already accept an `items` prop. It also passes the search index to `SearchBox`, which gets a new `index` prop. `searchSite` already takes an index.
  - **Test seam**: Playwright's server runs `next dev`, so placeholders show there. To E2E-test the production rule, `showPlaceholders` is also false when `freshReadsForTests()` is true (`src/lib/e2e-fresh-reads.ts`, never true in production) **and** the request carries the cookie `e2e-production-content=1`. The cookie is read only inside that guard, so production pages never touch `cookies()` and stay static.
- **Rationale**: One decision point for page, menu and search, so they can never disagree (FR-002, FR-015). The test seam follows the project's existing pattern of test-only switches that are never honoured in production.
- **Alternatives**: A separate `next build && next start` server for one spec (too heavy; the project memory says never to run a build and Playwright together). An env-only switch (one dev server cannot cover both modes). A static `navigationItems` filter (cannot be switched per test).

## R5. Redirects from the old About sub-routes

- **Decision**: `next.config.ts` keeps deriving Academics and Admission redirects from `pageSections`, but About gets an explicit legacy map exported from `src/content/site-shell.ts` (`legacyAboutRedirects`): `overview→/about#our-story`, `salient-features→/about`, `management→/about#management-team`, `messages→/about#messages`. All are `permanent: true` (308).
- **Rationale**: The new About ids are not the old ones, so deriving would create redirects from URLs that never existed and drop the real old ones.
- **Also**: `src/content/home.ts` quick-access card `salient-features` href changes `/about#salient-features` → `/about` (spec US3-3).

## R6. Section backgrounds and headings

- **Decision**: Backgrounds use existing tokens only. Vision & Mission is always the navy band (`bg-primary`). The other visible sections alternate between `bg-surface` and `bg-(--color-home-muted-band)` by their position among the *visible* sections, so hiding the team never puts two same-coloured sections next to each other. With the team shown: Story surface, V&M navy, Values muted, Team surface, Messages muted. With it hidden: Story surface, V&M navy, Values muted, Messages surface. Headings use `SectionHeading` with `tone="dark"` (`tone="light"`, divider off, on the navy band). The document's subheading goes in its `line`.
- **Panels**: the V&M panels use `bg-about-panel` (`--color-about-panel`, an alias of the existing navy `--color-cta-hover`) on the `bg-primary` band, with no translucent white border (that would be a new colour).
- **Yellow**: Only `--color-topbar` is used, and only as an accent: icon discs and a top rule on the V&M panels. Never yellow text on white or white text on yellow (palette rule in `globals.css`).
- **Note**: The brief asks for the `frontend-design` skill. That skill is not available in this environment, so the V&M treatment is designed by hand within these rules and reviewed at the four widths.

## R7. Page heading and images

- **Decision**: The h1 is the existing `PageBanner` (title "About Us", trail ["About"]), as on Careers. "About Us" is pending client approval.
  - Our Story's image slot: when `image` is `null`, show the existing school emblem `/images/logo-emblem.svg` (decorative) on a muted panel. When the client supplies a photo, use it at the `--aspect-about-story` ratio (4:3) with `object-cover`.
  - Team and message photos: `next/image` in a fixed `--aspect-about-person` (4:5) frame, rounded and `object-cover`. Cloudinary is already in `images.remotePatterns`. With no photo, a `PersonPlaceholder` component draws the lucide `UserRound` on `bg-(--color-home-muted-band)` in the same frame (`aria-hidden`). No image file is added and no real person is shown.
- **Alt text**: Real photos use the person's name. Placeholders and the emblem use empty alt or are hidden from assistive technology (FR-028).

## R8. Readable line length and layout

- **Decision**: Body text columns use `max-w-prose` (65ch), the Tailwind theme value (a named token, not a raw value).
  - Story: 1 column; at `lg` 2 columns (text 7/12, image 5/12).
  - V&M: 1 column; side-by-side panels from `md`.
  - Values: `grid-cols-1 md:grid-cols-2 lg:grid-cols-3` (or `lg:grid-cols-4` by the rule in FR-013, computed from the count).
  - Team: 1 / 2 / 3 / 4 columns.
  - Messages: photo above text below `lg`; at `lg` photo and text side by side, with the photo side alternating (`lg:flex-row` / `lg:flex-row-reverse`).
  
  Long words wrap (`break-words`).

## R9. Urdu and Arabic stored but not shown

- **Decision**: Each section schema has an optional `urdu` block holding the Urdu text verbatim (T3 tab trimmed), plus `lang` on each block: `"ur"`, or `"ar"` for the Qur'anic phrase. The display components ignore it in this feature (FR-020). The fidelity test also checks the stored Urdu against the `.txt` extraction, so it is ready when 014 or a later change shows it.

## R10. Accessibility check (SC-008)

- **Finding**: The project had no automated accessibility checker.
- **Decision** (owner-approved, 2026-10-10): add `@axe-core/playwright` as a dev dependency, at an exact version compatible with the installed `@playwright/test` 1.63. `e2e/about.spec.ts` runs `new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze()` on /about twice: in the dev default (placeholders shown) and with the production cookie. It fails on any violation with impact `serious` or `critical`. The explicit assertions (one h1, labelled sections, hidden icons, alt text, no duplicate ids) stay alongside it. The dependency is recorded in `docs/architecture.md`, where exact versions live (Constitution II).

## R11. Testing approach

- **Unit (Vitest)**: schemas parse every content file; `aboutView` cases (empty/dev → placeholders, empty/production → hidden, members → shown in order, background alternation, values grid columns); fidelity test (R1); redirect map; home link.
- **Component (Vitest + RTL)**: each section renders its content, headings, `lang`/`dir`, decorative icons; placeholders labelled.
- **E2E (Playwright)**: new `e2e/about.spec.ts` (axe scan in both team modes, order, anchors from desktop dropdown and mobile menu, clear of the header, team placeholders in dev, team hidden with the production cookie including menu and search, message photo alternation, four widths with no sideways scroll). Update `e2e/page-sections.spec.ts` for the new ids, redirects and keyboard test ("Our Story").
- **Updated unit tests**: nav and search tests that hard-code `/about/overview` labels are fixtures (they pass their own items) and need no change. `site-shell.test.ts` is updated for the new About sections.
