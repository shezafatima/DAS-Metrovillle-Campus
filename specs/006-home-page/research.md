# Research: Home Page (006)

Format per decision: Decision / Rationale / Alternatives considered.

## R1 — Design tokens for the home sections

**Decision**: Before building any section, run a focused extraction script, `research/extract-home-tokens.ts` with `research/extract-home-tokens.browser.js`, against https://das.edu.pk/ at 375, 768, 1024 and 1440px. It follows the 004 signup and 008 contact extractors: Playwright `channel: "chrome"`, with the browser code read as raw text. It writes `research/tokens/home-sections-<width>.json` and appends a **"Home sections (006)"** chapter to `research/design-tokens.md`. That chapter covers, for every home section (Find Us Nearby band, quick-access flip-box cards, inspiration, Why Choose, Latest News carousel, Books band and carousel, Salient features, Progress dashboard, icon quick-links, partners carousel):
- background colours and images
- padding and gaps
- heading, subheading and body type (family, size, weight, line height, colour)
- card sizes, radii and shadows
- arrow and dot controls
- the number of items visible per width
- slider timings where readable

The same script records the `src` of every reference image used by those sections, so the exact client assets can be saved under `public/images/home/` (quick-access icons, inspiration logo, icon-link tiles, partner logos, and the Books band and dashboard background images).

**Rationale**: Constitution VII and FR-032 say no raw design value is allowed, and the global page aggregates don't cover the home sections (design-tokens.md "Per-page notes": home has flip-boxes, two Swiper carousels and counter boxes, none of them extracted per element). The site is reachable from this machine and Chrome is installed (checked 2026-10-01).

**Alternatives considered**: eyeballing the screenshots. That breaks "never guess" and Constitution VII, so it was rejected.

## R2 — Books carousel content (revised 2026-10-01)

**Decision**: The books section is fully static. `src/content/home.ts` lists 10 fixed covers, `/images/home/books/book-01.jpg` … `book-10.jpg`, each with alt text (placeholder until the real titles are known). The owner adds the files to `public/` by hand. `BooksCarousel` shows the listed covers whose files exist: in production this is checked once per server process, and in development on every render, so a newly added file appears without a restart. With none present, the section is hidden.

**Rationale**: This is the owner's final decision: the covers are a fixed set, not admin-managed. The "skip missing files" rule means the page never shows broken images while the files are still being added.

**Alternatives considered**:
- *A Settings "Books" group with admin uploads*: built first the same day, then dropped at the owner's request.
- *Render all 10 regardless*: this shows broken images until every file exists. Rejected.

## R3 — Carousels (hero, latest news, books, partners) without a new library

**Decision**: One small client component, `src/components/home/carousel.tsx`. It's a horizontal track using CSS scroll-snap (`overflow-x: auto; scroll-snap-type: x mandatory`), with previous/next buttons that scroll by one page and optional autoplay that:
- pauses on hover, focus-within and a hidden tab
- is off under `prefers-reduced-motion`
- is off when everything fits

Swipe comes from native scrolling. Items per view come from a `perView` map ({375, 768, 1024, 1440} → n) taken from the R1 extraction. The hero, which shows one full-bleed slide at a time with dots, uses its own `hero-slider.tsx` with fade or slide per the extracted transition. Its interval comes from Settings `displaySeconds`.

**Rationale**: Constitution II rules out new dependencies. Scroll-snap gives touch, keyboard and screen-reader behaviour for free, and one shared component covers four carousels.

**Alternatives considered**: Swiper or Embla. They'd match the reference implementation exactly, but they're a new dependency with styling to override. Rejected.

## R4 — Latest News data

**Decision**: Add `listLatestPosts(limit = 6)` to `src/lib/news/public-queries.ts`. It reuses `publicVisibilityFilter` and the same sort, which gives FR-014's identical visibility rules. It's called inside a never-throwing wrapper, so a failure hides the section (FR-016). It's cached with `unstable_cache` for 60 s and tag `news` (FR-017). Because the 003 news admin mutations don't revalidate a tag today, they gain `revalidateTag("news", { expire: 0 })` plus `revalidatePath("/")`. The cards reuse 003 `NewsCard`, so the Urdu direction and font and the cover placeholder come free (FR-015).

**Rationale**: It reuses the visibility rule, so drafts can't leak, and the home page stays fast.

**Alternatives considered**: `force-dynamic` on `/`. That makes every home view a database read. Rejected.

## R5 — Resilience per section

**Decision**: The page (`src/app/(public)/page.tsx`) is a Server Component that renders each data section inside its own async child, wrapped in `<SectionBoundary>`: a `try/catch` around the data read that renders `null` (or the section's fallback) and logs. Settings reads already never throw (005). News uses R4's wrapper. A failure in one section never blocks another (FR-027).

## R6 — Static content shape (FR-026)

**Decision**: `src/content/home.ts` exports one typed object per static section (`findUsNearby`, `quickAccessCards[4]`, `inspiration`, `whyChoose`, `booksSection`, `salientFeatures[4]`, `quickLinks[4]`, `careersCta`, `partners[]`). Each matches the shape a future 014 database record would have (`{ id, title, text, image: { src, alt }, href }`). Placeholder flags follow 004 (`placeholder: true` adds `data-placeholder`). Wording is the reference's own (verbatim from R1); the careers CTA reuses `signupCopy`'s heading and supporting line.

## R7 — Careers call-to-action

**Decision**: Add `CareersCta` (`src/components/home/careers-cta.tsx`). It uses the signup band's markup and tokens (`bg-signup-band`, heading highlight, supporting line, `id="signup"`) with a "Join Now" `Link` to `/careers` styled as the reference red button (`button-*` token from R1). The home page stops rendering `SignupSection`. `SignupSection` itself stays for its other users.

## R8 — Progress dashboard count-up

**Decision**: The client component `stat-counter.tsx` uses an `IntersectionObserver` that fires once and counts with `requestAnimationFrame` over 2 s (spec Assumption: the duration couldn't be extracted). Under reduced motion it shows the final number immediately. Values come from `getPublicSettings("stats")`. The server renders the final numbers too, so the page reads correctly without JavaScript.

## R9 — Hero

**Decision**: `getPublicSettings("hero")` supplies the visible slides and `displaySeconds`, and 005's default slide covers "no slides" (FR-004). Each slide is a `<picture>`-equivalent: two `next/image` elements toggled with `md:` classes, so phones load the mobile image (FR-003). The first slide is `priority` and the rest are lazy (FR-030). Previous/next arrows and dots appear only with more than one slide, autoplay pauses on hover and focus, and it's off under reduced motion (FR-005).

## R10 — Metadata (P3)

**Decision**: `export const metadata` on `/` carries a title, description and Open Graph/Twitter image. The image is the first hero desktop image through `ogImageUrl` (via `generateMetadata`), falling back to `public/images/logo.svg` rasterised as `public/images/og-home.png`.

## R11 — Testing approach

- **Unit**: `listLatestPosts` (visibility, limit, sort), the carousel `perView` and autoplay rules, and the stat-counter reduced-motion behaviour.
- **DB**: `listLatestPosts` against seeded posts.
- **E2E**: `e2e/admin-home-page.spec.ts` (one describe per story group) and `e2e/admin-home-layout.spec.ts` cover:
  - hero slides from Settings appear and advance
  - the mobile image is used on phones
  - the default slide shows when no slide is visible
  - all sections in order, and each link destination (Join Now reaches `/careers`, each icon link reaches its anchor)
  - the video facade
  - Latest News: newest first, Urdu right-to-left, the placeholder, hidden when empty
  - books from the files present
  - the stat change, and the count-up under reduced motion
  - the page still rendering with no slides or news
  - metadata and lazy images
  - layout at 375/480/640/768/782/1024/1280/1440
  - nothing auto-moving under reduced motion

  They seed Settings and News directly, so they're named `admin-home-*` (the serial project). The dev server runs with `E2E_FRESH_READS=1` (`src/lib/e2e-fresh-reads.ts`, ignored in production), so public reads skip their 60 s caches.
- **Superseded specs**: `e2e/signup-public.spec.ts` and `e2e/signup-visual.spec.ts` fill in the 004 signup form on `/`, which this feature removes. They're skipped at file level with a comment pointing to 012-careers. The admin signup specs and the API tests keep running.
