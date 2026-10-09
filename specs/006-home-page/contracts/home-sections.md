# Contract: Home page sections (006)

`/` (`src/app/(public)/page.tsx`): this is a Server Component with `revalidate = 60` inherited from the public layout. The sections appear in this order (FR-006):

| # | Section | Source | Empty / failure behaviour |
|---|---|---|---|
| 1 | Hero slider | `getPublicSettings("hero")` | No visible slide, or a read failure, gives the 005 default slide (FR-004) |
| 2 | Quick-access cards ×4 (looping coverflow, `QuickAccessCards`, with a heading and a yellow stroke) | `home.quickAccess` | Always shown; no Franchise card |
| 3 | Inspiration | `home.inspiration` | Always shown |
| 4 | Why Choose Dar-e-Arqam Schools? | `home.whyChoose` + `getPublicSettings("video")` | No `youtubeId` shows the text alone, with no empty frame |
| 5 | Latest News | `getLatestPosts()` (6) | No posts, or a failure, hides the section (FR-016) |
| 6 | Books band (rolling covers, `BooksSection`) | `home.books` (fixed heading, line and 10 covers in `public/images/home/books/`) | Missing files are skipped; none present hides the section (FR-011) |
| 7 | Salient features ×4 | `home.salientFeatures` | Always shown |
| 8 | Progress dashboard | `home.progressDashboard` + `getPublicSettings("stats")` | A failure shows the 005 starting values |
| 10 | Careers CTA (`id="signup"`) | `home.careersCta` | Always shown; "Join Now" goes to `/careers` |
| 11 | Partners carousel | `home.partners` | 1 logo is shown still; many logos are a carousel |

## Shared behaviour

- **Carousel** (`components/home/carousel.tsx`, client):
  - `items`, a `perView` map per width (from tokens), and `autoplayMs?`.
  - Previous/next buttons are named by `homeContent.carousel.previous/next` and are hidden when all items fit.
  - Native swipe and scroll-snap.
  - Autoplay pauses on hover, focus-within and `document.hidden`, and is off under reduced motion.
  - The track is a `role="region"` with `aria-roledescription="carousel"` and the section's label. Items are `role="group"`, labelled "n of N".
- **Hero slider**:
  - It advances after `displaySeconds`, with the transition from the tokens.
  - Dots appear only with more than one slide; there are no previous/next buttons (2026-10-07).
  - Slides slide sideways. It is `100svh` tall under the fixed header and ends with a scroll cue to `#after-hero`.
  - One `<picture>` per slide: the mobile file below `md` and on portrait screens, the desktop file on landscape screens from `md`. With no mobile file the desktop picture is shown whole (letterboxed) on phones.
  - It pauses on hover and focus, and doesn't autoplay under reduced motion.
  - Its mobile image shows below `md`.
  - The first slide's image is `priority`.
- **Images**: the first hero image is `priority`; everything else uses `next/image` lazy loading (FR-030). Decorative icons get `alt=""`.
- **Headings**:
  - The page has one `h1`. The reference has none, so a visually hidden `h1` reads "Dar-e-Arqam Schools — Metroville Campus" (SC-006).
  - Each section heading is an `h2`, and card titles are `h3`.
- **Section boundary**: every async section catches its own failure, logs it, and renders its fallback (FR-027).
- **Metadata**: a title, a description, and an Open Graph and Twitter image (the first hero image through `ogImageUrl`, else `/images/og-home.png`).
