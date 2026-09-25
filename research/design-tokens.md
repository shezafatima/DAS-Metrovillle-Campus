# das.edu.pk — Design Token Extraction

Extracted per `research/TASK.md` using `research/extract-tokens.ts` (+ the
supplementary `research/extract-transitions.ts` pass for interaction timing).
Raw per-page/per-viewport captures live in `research/tokens/*.json`
(44 files: 11 pages × {1440, 1024, 768, 375}px, plus 11 `_transitions-<page>.json`
files at 1440px). Every value below was read from a live computed-style
extraction against the real site — nothing here is guessed or filled from
memory, per the task's rules.

**Site stack (context for interpreting these values)**: WordPress + the Avada
theme (Fusion Builder), served through LiteSpeed cache. Sliders/carousels use
jQuery FlexSlider and Swiper; the RevSlider plugin is loaded but not active on
any of the 11 crawled pages. This explains the `fusion-*` / `awb-*` class
names referenced throughout.

## Cross-check (per TASK.md)

| Assumed value | Found on site | Verdict |
|---|---|---|
| Font: Poppins | `Poppins` **is** a real, self-hosted `@font-face` family (weights 700 and 300), used for `h2`/`h3` headings site-wide (30px/24px, weight 700). **But** it is not the site's only or primary font: body copy, links and paragraphs use a different self-hosted family, `"softLINKS Regular"` (16px/400, the single most-used font declaration by a wide margin — 9,552 of the ranked font occurrences vs. Poppins's 644); the main menu uses `"Roboto Condensed"` (700); buttons use `"Open Sans"` (600). | **Partial match — flagging, not overriding.** Poppins is confirmed real and used exactly as named for headings, but "the font is Poppins" undersells that the theme is running four different type families for different roles. |
| Primary navy: `#121291` | `rgb(18, 18, 145)` = exactly `#121291`. It's the single most common branded color, 2,228 occurrences across all 44 captures (main menu text, many headings/links, icons). | **Confirmed exact match.** |
| Accent yellow: `#FFF212` (check whether a toned-down gold is used on large surfaces instead) | `#FFF212` does **not** appear anywhere in any of the 44 captures. **Correction (2026-09-16, confirmed by directly sampling pixels from `screenshots/das.edu.pk_*.png` header crops at 1440/1024/375px — all three read exactly `rgb(255, 255, 0)`):** `#FFFF00` pure yellow, originally logged below as "84 occurrences, small elements only," is actually the **full-width top-bar background on every page** — the getComputedStyle sweep evidently sampled a transparent/inner element while an ancestor paints the visible yellow, so the occurrence count undercounted its real role. It coexists with the cyan accent below rather than replacing it: cyan is the large-surface *content* accent, yellow is the top bar's *chrome* background. `#FFEB3B` (4), `#FFD700` gold (4), `#FF9800` orange (8), `#F09A3E` toned gold/orange (16) remain genuinely minor. | **Corrected — see note.** `#FFF212` itself is still absent, but `#FFFF00` is a large-scale color (top bar), not a minor one; cyan `#00BCD4` remains the correct large-surface *content* accent. |

## Global tokens

### Fonts

Self-hosted `@font-face` families actually declared and rendered on the site
(confirmed via `document.styleSheets` `@font-face` rules **and** matched
against real computed `font-family` usage on visible elements):

| Family | Weights/styles seen | Used for | Suggested token |
|---|---|---|---|
| `"softLINKS Regular"` / `"softLINKS Medium"` / `"softLINKS Bold"` / `"softLINKS ExtraBold"` | 400 (dominant), 700 | Body text, paragraphs, footer text, form fields — the site's default text font | `font-body` |
| `"softLINKS Urdu Normal"` / `"softLINKS Urdu Bold"` | 400 | Urdu-language content (font-face declared; no Urdu text encountered on the 11 crawled English pages) | `font-body-urdu` |
| `Poppins` | 700, 300 | `h2`, `h3` section headings | `font-heading` |
| `"Roboto Condensed"` | 700 | Main menu items | `font-nav` |
| `"Open Sans"` | 400 (italic variants), 600 | Buttons | `font-button` |
| `awb-icons`, `"Font Awesome 5 Free"`, `"Font Awesome 5 Brands"`, `revicons` | — | Icon fonts (theme UI chrome, not content) | n/a (icon fonts) |

No Google Fonts `<link>` is actually load-bearing: the page requests
`fonts.googleapis.com/css2?family=Roboto:wght@400` but that family was not
found in use on any captured element — all real text renders in the
self-hosted families above.

### Color palette (ranked by element count, summed across all 44 captures)

| Color | Hex | Count | Role |
|---|---|---|---|
| `rgb(0, 0, 0)` | `#000000` | 6,812 | Neutral — default text/border color |
| `rgb(18, 18, 145)` | `#121291` | 2,228 | **Primary** (navy — confirmed, see cross-check) |
| `rgb(255, 255, 255)` | `#FFFFFF` | 1,620 | Neutral — surfaces, text-on-dark |
| `rgb(51, 51, 51)` | `#333333` | 810 | Neutral — secondary text (e.g. `h3`) |
| `rgb(0, 188, 212)` | `#00BCD4` | 562 | **Accent** (cyan — the real large-scale accent; see cross-check) |
| `rgba(51, 51, 51, 0.65)` | `#333333` @ 65% | 154 | Neutral — muted text |
| `rgb(34, 51, 85)` | `#223355` | 112 | Secondary navy-adjacent tone |
| `rgb(0, 91, 140)` | `#005B8C` | 96 | Secondary blue |
| `rgb(25, 25, 146)` | `#191992` | 88 | Navy variant (footer links; close to but not identical to primary `#121291`) |
| `rgb(255, 255, 0)` | `#FFFF00` | 84 | **Top bar background**, full width, every page (see corrected cross-check note — the raw occurrence count undercounts this because the sweep sampled an inner transparent element) |
| `rgb(215, 214, 214)` | `#D7D6D6` | 80 | Neutral — light surface |
| `rgb(244, 67, 54)` | `#F44336` | 56 | **Secondary** (red — all `.fusion-button` CTA backgrounds) |
| `rgb(116, 116, 116)` | `#747474` | 40 | Neutral — muted text (card body) |
| `rgb(153, 153, 153)` | `#999999` | 24 | Neutral — placeholder/disabled text |

Social-icon brand colors (`#3B5998` Facebook, `#C13584` Instagram,
`#0077B5` LinkedIn, etc.) were also captured but are third-party brand
colors, not site design tokens — omitted here, present in the raw JSON.

Suggested tokens: `color-primary` (`#121291`), `color-accent` (`#00BCD4`),
`color-cta` (`#F44336`, button background), `color-text` (`#000000`),
`color-text-muted` (`#747474` / `#999999`), `color-neutral-100`
(`#D7D6D6`), `color-surface` (`#FFFFFF`).

### Type scale (from real headings/body text, 1440px)

| Element | Font | Size | Weight | Line-height | Color | Token |
|---|---|---|---|---|---|---|
| `h2` | Poppins | 30px | 700 | 36px | `#E82264` (pink — page/section title color on home) | `text-h2` |
| `h3` | Poppins | 24px | 700 | 33.6px | `#333333` | `text-h3` |
| Body / `p` | softLINKS Regular | 16px | 400 | 24px | context-dependent (`#000` default, `#FFF` on dark sections) | `text-body` |
| Main menu item | Roboto Condensed | 16px | 700 | 16px | `#121291` | `text-nav` |
| Button | Open Sans | 18px (`.button-xlarge`) / 14px (default) | 600 | 21px / 17px | `#FFFFFF` | `text-button-lg` / `text-button` |
| Footer link | softLINKS Regular | 16px | 400 | 24px | `#191992` | `text-footer-link` |

`h1` and `h4` were only sparsely present (see per-page notes) and `small`
text was not found on any of the 11 pages — no token is suggested for either
without a confirmed sample.

**Responsive type scaling**: `h2`/`h3` font-size barely changes down to
768px (30px → 29.6px) and only visibly shrinks at 375px (30px → 24.8px),
via Avada's fluid/"responsive typography" CSS custom property system
(`fusion-responsive-typography-calculated` class), not a fixed set of
breakpoint overrides.

### Spacing scale (section/row-level `padding`/`margin`/`gap`, ranked by count)

| Value | Count | Suggested token |
|---|---|---|
| `padding: 0 30px` (x-axis) | 268 | `space-section-x` |
| `padding: 20px 0` (y-axis) | 78 | `space-section-y-sm` |
| `padding: 30px 0` (y-axis) | 56 | `space-section-y-md` |
| `padding-top: 15px` (bottom 0) | 32 | `space-block-sm` |
| `padding: 0 15px` (x-axis) | 24 | `space-section-x-sm` |
| `margin-bottom: 60px` | 12 | `space-section-gap-lg` |

### Radii & shadows

| Radius | Count | Where |
|---|---|---|
| `4px` | 216 | small UI elements (form fields, tags) |
| `32px` | 176 | large rounded elements (pill buttons/icon frames) |
| `50%` | 124 | circular avatars/icons |
| `20px` | 16 | card-level rounding |

Only **one** box-shadow value was found anywhere on the site:
`rgba(0, 0, 0, 0.14) 0px 10px 50px -2px` (44 occurrences) — used on
`.fusion-column-wrapper.fusion-column-has-shadow` cards. Suggested token:
`shadow-card`.

### Container widths & breakpoints (measured, home page `.fusion-row`)

| Viewport | Row `max-width` | Rendered width | Note |
|---|---|---|---|
| 1440px | `1280px` | 1280px | Boxed layout caps at 1280px; ~80px of horizontal page gutter |
| 1024px | `1280px` (unreached) | 964px | Row still boxed but viewport-limited; effective 30px side padding (matches the `padding-x:30px/30px` spacing token) |
| 768px | `100%` | 768px | Row goes fluid — no longer boxed |
| 375px | `100%` | 375px | Fluid, full-bleed |

Suggested tokens: `container-max-width: 1280px`, `container-gutter-x: 30px`.

**`@media` breakpoints** — all width-related media rules actually present in
the loaded stylesheets (deduplicated, most-referenced first). Many are
WordPress-core rules (block editor, admin bar) rather than this theme's own
layout breakpoints — both kinds are listed as extracted, since the task asks
to read them from the stylesheets rather than infer which ones are
"real": `600px`, `782px`, `640px` (`max-width`, high count — **this is the
theme's own mobile-menu collapse breakpoint**, corroborated by
`mainMenuItem` disappearing from our own DOM captures between 1024px and
768px), `1024px` (`max-width`), `480px`, `768px`, `767px`, `850px`, `960px`,
`783px`, `1200px`, `1280px`, `992px`, plus a long tail of one-off widths used
by individual plugins (RevSlider's `58em`/`54em` tiers, WooCommerce-style
`991px`/`1199px`, etc. — full list with source stylesheet and occurrence
count in the raw JSON `mediaQueries` field of any capture).

The only width tested that produced an actual DOM change we could measure
directly: **main menu items are present in the DOM at 1440px and 1024px, and
absent at 768px and 375px** (replaced by the mobile menu toggle) — i.e. the
effective mobile-menu collapse point is between 1024px and 768px, consistent
with the `only screen and (max-width: 1024px)` rule above.

### Motion timings

| Interaction | Property | Duration | Easing | Where (consistent across all 11 pages) |
|---|---|---|---|---|
| Main menu / footer link hover | `color`, `background-color`, `border-color` | `0.2s` | `linear` | `.fusion-main-menu a`, footer links |
| Button hover | `color`, `font-size`, `background-color`, `background-image`, `border-color`, `border-width`, `border-style`, `border-radius`, `box-shadow`, `opacity`, `transform` | `0.2s` (all properties) | `ease` | `.fusion-button` |
| Column "lift up" / "zoom in" hover | `transform`, `filter`, `background-color`, `border-color` | `0.3s` | default (`ease`) | `.fusion-column-inner-bg.hover-type-liftup` / `.hover-type-zoomin` |
| Swiper slide transition | `transform`, `opacity` | `0.45s` | `ease` | `.awb-swiper .swiper-slide` (home page carousels) |
| Back-to-top link | `opacity` | `0.4s` | `ease-in-out` | `.fusion-top-top-link` |
| Back-to-top link | `background` | `0.2s` | `ease-in-out` | `.fusion-top-top-link` |

**Observed hover color changes** (before → after, home page):
- Button background: `#F44336` (red) → `rgb(25, 25, 144)` (navy) on hover; text stays white.
- Footer link color: `#191992` (navy) → `rgb(3, 169, 244)` (bright blue) on hover.
- Main menu item and content-box card: no computed-style change detected on `:hover` in our capture (theme may drive their hover feedback through a `:before`/pseudo-element or JS-toggled class not reflected in plain `getComputedStyle` on the element itself).

**Slider/carousel settings** (read from the live jQuery FlexSlider / Swiper
instances on the home page — the only page with active sliders):
- FlexSlider (image carousel): `animation: fade`, `slideshow: true`, `slideshowSpeed: 7000ms`, `animationSpeed: 600ms`, `direction: horizontal`.
- Swiper (×2 instances, e.g. testimonials/logos strip): `autoplay.enabled: true`, `autoplay.delay: 2500ms`, `speed: 500ms`, `loop: true`, `effect: slide`.

**Counter animation duration**: not readable. The counter boxes
(`.fusion-counter-box`, 4 on the home page) exist in the DOM but their
number span carries no `data-speed`/`data-to`/duration attribute we could
find, and no exposed JS instance was found on `window` to query — per the
task's rule against guessing, no duration value is reported for these.

## Suggested token names (summary)

```
color-primary:        #121291
color-accent:          #00BCD4
color-cta:             #F44336
color-topbar:          #FFFF00  (top-bar background — see corrected cross-check note)
color-text:            #000000
color-text-muted:      #747474
color-text-muted-2:    #999999
color-surface:         #FFFFFF
color-neutral-100:     #D7D6D6

font-body:             "softLINKS Regular", Arial, Helvetica, sans-serif
font-heading:          Poppins, Arial, Helvetica, sans-serif
font-nav:               "Roboto Condensed", Arial, Helvetica, sans-serif
font-button:            "Open Sans", Arial, Helvetica, sans-serif

text-h2:      30px / 700 / 36px line-height
text-h3:      24px / 700 / 33.6px line-height
text-body:    16px / 400 / 24px line-height
text-nav:     16px / 700 / 16px line-height, 1px letter-spacing
text-button:  14px / 600 / 17px line-height (default), 18px / 600 / 21px (xlarge)

space-section-x:      30px
space-section-x-sm:   15px
space-section-y-sm:    20px
space-section-y-md:    30px
space-section-gap-lg: 60px

radius-sm:      4px
radius-lg:      32px
radius-full:    50%
radius-card:    20px

shadow-card: 0 10px 50px -2px rgba(0, 0, 0, 0.14)

container-max-width: 1280px
container-gutter-x:  30px

motion-fast:   0.2s linear   (links, nav)
motion-medium: 0.3s ease     (card hover lift/zoom)
motion-slide:  0.45s ease    (swiper slide transition)
motion-fade:   0.4s ease-in-out (back-to-top opacity)
```

## Per-page notes

Element-type occurrence counts below are at 1440px; "reusable components
seen" lists what that page contributes beyond the global tokens above.
Raw per-viewport detail for every page is in `research/tokens/<page>-<viewport>.json`.

- **home** (`/`) — The only page with active sliders, flip-box cards, and
  counter boxes. `h1` absent (uses `h2`/`h3` for all section titles instead).
  16× `h2`, 12× `h3`, 1× `h4`. Reusable components: FlexSlider hero, 2×
  Swiper carousels, 5× flip-boxes (`.flip-box-front-inner`), 4×
  counter-boxes, all 6 button variants (`button-1`…`button-6`, all red
  `#F44336`, differing only in size/padding), a shadowed content column
  (`.fusion-column-wrapper.fusion-column-has-shadow`).
- **about** (`/about/overview/`) — Standard content page: 1× `h1`, 7× `h2`,
  8 body paragraphs. No cards/sliders/counters. `sectionTitle`/`sectionSubtitle`
  selectors matched nothing on this page (Avada "title" block not used here).
- **salient-features** (`/about/salent-features/`) — 1× `h1`, 10× `h2`, 7×
  `h3`, 18 body paragraphs — the most heading-dense content page captured.
  No links found in main content (`.fusion-text a` / `.post-content a`
  matched none), no cards/sliders.
- **management** (`/about/management/`) — Sparse text (1 paragraph, 2×
  `h2`) but 48 links and 2 `sectionTitle` matches — appears to be mostly a
  list/directory-style page (management team listing) rather than prose.
- **campuses** (`/campuses-list/`) — Very sparse (1× `h1`, 1× `h2`, 2
  paragraphs, 0 links) — a listing page, likely image-tile/map based rather
  than text.
- **academics** (`/academics/academics-overview/`) — 1× `h1`, no `h2`/`h3`,
  7 paragraphs, 0 links — plain prose page.
- **admission** (`/admission/`) — Most form-heavy content page: 1× `h1`, 5×
  `h2`, 4× `h3`, 1× `h4`, 22 paragraphs, 5 links, 2 form inputs, 1 submit
  button. This is the best reference page for `formInput`/`submitButton`
  styling outside of `contact`.
- **photo-gallery** (`/resources/photo-gallery/`) — Extremely sparse
  extracted text (1× `h1`, 1 paragraph, 0 links, 0 cards, 0 sliders) despite
  being a gallery page — the gallery grid itself is very likely rendered by
  a plugin/shortcode whose markup didn't match any of our selector set (e.g.
  a lightbox-triggered image grid with no matching card/link classes). Flag
  for a follow-up, targeted extraction pass if this page's grid needs exact
  tokens.
- **our-books** (`/resources/our-books/`) — Same pattern as photo-gallery:
  1× `h1`, 1 paragraph, no matched cards/links — likely a plugin-rendered
  flipbook/PDF-embed grid outside our selector coverage.
- **news** (`/news/`) — 1× `h1`, 9× `h2`, 3× `h3`, 22 paragraphs, 50 links
  (blog-style post grid), and the only inner page with an active FlexSlider
  instance detected (1 found).
- **contact** (`/contact/`) — 1× `h1`, 1× `h2`, 4× `h3`, 10 paragraphs, 3
  links, 2 form inputs (`.wpcf7-form`), 1 submit button, 1 `sectionTitle`
  match, and 2 shadowed columns (`.fusion-column-wrapper.fusion-column-has-shadow`
  — likely the contact-form card and a map/info card).

**Consistent across every page**: header (`.fusion-header`), secondary top
bar (`.fusion-secondary-header`, ×2 matches — desktop + mobile variants in
DOM simultaneously), 9 main-menu items, 5 dropdown submenus, 6 footer links,
1 footer bottom bar. No page had a `smallText`, `footerHeading`, or
`mobileMenu` match at 1440px — `mobileMenu` is expected to be hidden/absent
at desktop width (confirmed present only below the ~1024→768px collapse
point, see Breakpoints above); `footerHeading` and small text were not found
at any captured viewport on any of the 11 pages.

## Known extraction gaps (per the task's "never guess" rule)

- Counter-box animation duration: not exposed anywhere readable — omitted rather than guessed.
- `photo-gallery` and `our-books` grid/card markup wasn't matched by any selector in this pass — their specific tile/card tokens are not yet captured and would need a targeted follow-up look at those two pages' actual DOM.
- `h1`/`h4`/`small`/`footerHeading`/`sectionSubtitle` have too few (or zero) real samples across the 11 pages to responsibly propose a token — not included above.
- One extraction artifact: the button-variant scan used a `[class*="fusion-button"]` substring selector, which also matched the root `<html>` element once per page (Avada stamps flags like `fusion-button_type-flat` on `<html>`). That spurious match is visible in the raw `buttonVariants` array in each JSON file as an entry keyed by the full `<html>` class list; it has been excluded from the analysis above and is called out here rather than silently dropped.

## Admin dashboard tokens (not from das.edu.pk — no reference exists)

Per spec `002-foundation`'s "Deviations from the Reference": the admin
area has no das.edu.pk counterpart, so these are **chosen** values (a
clean, standard dashboard layout), not extracted ones — but Constitution
V still requires every design value to be named here before use in
components.

| Token | Value | Role |
|---|---|---|
| `spacing-admin-sidebar` | `240px` | Expanded sidebar width at `lg`+ |
| `spacing-admin-sidebar-icon` | `48px` | Collapsed (icon-rail) sidebar width — shadcn/ui sidebar's own default |
| `spacing-admin-sidebar-mobile` | `288px` | Sidebar drawer width below `lg` |
| `spacing-admin-topbar` | `56px` | Fixed top-bar height |

Admin redesign (visual/structural only — functionality, routes, and
auth unchanged): the admin area gets its own scoped theme
(`.admin-theme` in `src/app/globals.css`) built entirely from tokens
already named here — `color-primary` (#121291, navy — sidebar
background, primary actions, text) and `color-topbar` (#FFFF00,
yellow — used narrowly as the shadcn sidebar's `--sidebar-accent`
active-item color and the `Badge` "highlight" variant only, never as
a general hover/accent color, and always paired with navy text, never
white, for contrast). `color-cta` (#F44336) is reused for the
destructive/error slot. `color-neutral-100`, `color-text`,
`color-text-muted`, and `color-surface` cover the remaining neutral
slots. Two new named tokens carry the yellow-on-navy badge pairing
where it isn't already a shadcn theme slot:

| Token | Value | Role |
|---|---|---|
| `color-admin-highlight` | `#FFFF00` (= `color-topbar`) | `Badge` "highlight" variant background |
| `color-admin-highlight-foreground` | `#121291` (= `color-primary`) | Text on the highlight badge |

Poppins (`font-heading`'s family) is used for all admin text, not just
headings, at the two weights already loaded site-wide (300, 700) — no
new font weight/file is added.

## News cards (003 news — extracted per-element, not page aggregates)

`research/extract-news-tokens.ts` targets `https://das.edu.pk/news/`'s
actual card, meta line, "Read More" link and banner elements
specifically — the page-level aggregate scan above (news-*.json)
counts colour/font/spacing *frequency* across the whole page and
doesn't isolate these values. Raw output:
`research/tokens/news-cards-{375,768,1024,1440}.json`.

**Identical at all four widths** (375/768/1024/1440 — not fluid, not
breakpoint-dependent):

| Element | Value |
|---|---|
| Card title | `22px` / `700` / `31.9px` line-height / `rgb(18,18,145)` = `color-primary` |
| Card meta line (date \| category) | `14px` / `400` / `21px` line-height / `rgb(0,0,0)` = `color-text` |
| Card excerpt | `16px` / `400` / `24px` line-height / `rgb(0,0,0)` — same as `text-body` |
| "Read More" link | `14px` / `400` / `24px` line-height / `rgb(0,188,212)` = `color-accent` |
| Card padding | `30px 25px 20px` (top/sides/bottom) |
| Card border | `1px solid #ebeaea` (top/left/right), **`3px solid #ebeaea` bottom** (thicker accent edge); `border-radius: 0`; `box-shadow: none` |
| Card cover image aspect ratio | `2.139` (≈ `400 / 187`, the source images' native crop) |

**Finding — no grid gap**: cards are laid out by an absolutely-positioned
JS grid (Fusion/isotope), not CSS `grid`/`flex`. Measured horizontal
distance between adjacent card edges is ≈0px at every width
(`gapBetweenColumnsPx`: 375 n/a single column, 768 `-1px`, 1024
`-0.66px`, 1440 `-1px` — i.e. cards touch). The visual separation in
the reference comes entirely from each card's own border, not a grid
gutter. The rebuild therefore uses a real CSS grid with **no gap**
(`gap-0`) and keeps the card border — do not add a `spacing-news-grid-gap`
token; none exists on the reference.

**Columns per width** — confirms Tailwind's *default* breakpoints need
no override:

| Width | Columns | Tailwind prefix |
|---|---|---|
| 375px | 1 | (base) |
| 768px | 2 | `md:` (768px min-width) |
| 1024px | 3 | `lg:` (1024px min-width) |
| 1440px | 3 | `lg:` (unchanged) |

**Banner** ("News" title bar / breadcrumb) — two-tier, not per-width:

| | <768px (375) | ≥768px (768/1024/1440) |
|---|---|---|
| Height | `102px` | `155px` (only 1024/1440 measured at 155; 768 measured 102 — see note) |
| Title font-size | `25.68px` (fluid, Fusion's own responsive-typography calculator) | `35.21px`–`36px` (plateaus at `36px` from 1024px) |
| Background | `rgb(18,18,145)` = `color-primary` | same |
| Title color | `rgb(255,255,0)` = `color-topbar` | same |
| Breadcrumb | `18px` / `rgb(255,255,255)` white | same |

Note: banner height measured `102px` at both 375 *and* 768, jumping to
`155px` only at 1024+ — so the height break is at `lg:`, not `md:`,
one width later than the column-count break. Title font-size is a
continuous fluid calculation in the source (not a fixed breakpoint
value); the rebuild uses two fixed sizes (`25.68px` below `md:`,
`36px` from `md:` up) rather than reproducing the fluid formula, since
the two nearby measured values (35.21px at 768, 36px at 1024) are
visually indistinguishable.

New tokens (added to `@theme` in `src/app/globals.css`):

| Token | Value |
|---|---|
| `--text-news-card-title` | `22px` / `700` / `31.9px` |
| `--text-news-meta` | `14px` / `400` / `21px` |
| `--text-news-read-more` | `14px` / `400` / `24px` |
| `--color-news-card-border` | `#ebeaea` |
| `--spacing-news-card-padding` | `30px 25px 20px` |
| `--aspect-news-card-image` | `400 / 187` |
| `--spacing-news-banner-height` | `102px` (banner height below `lg:`) |
| `--spacing-news-banner-height-lg` | `155px` (banner height from `lg:`) |
| `--text-news-banner-title` | `25.68px` (below `md:`) |
| `--text-news-banner-title-md` | `36px` (from `md:`) |

No new colour tokens: `color-primary`, `color-accent`, `color-text`,
`color-topbar` already cover every colour above.

## Signup band (004 signup — extracted per-element, not page aggregates)

`research/extract-signup-tokens.ts` targets the signup form on
`https://das.edu.pk/` (a Contact Form 7 form with fields
`your-name`/`your-email`/`your-phone`, selected by field name rather
than Avada's auto-generated per-row/column classes, which are not
stable identifiers). Raw output:
`research/tokens/signup-{375,768,1024,1440}.json`.

**Identical at all four widths** (375/768/1024/1440 — not fluid, not
breakpoint-dependent):

| Element | Value |
|---|---|
| Heading | `"Join Over "` (white `#ffffff`) + `"300,000 Students"` (gold, see below) + `" Enjoying Dar-e-Arqam School Now"` (white) — `24px` / `700` / `33.6px` line-height, Poppins — **exact match for the existing `text-h3`/`font-heading` tokens**; reused, not duplicated |
| Heading highlight colour | `rgb(255,215,0)` = `#ffd700` — **not** `color-topbar` (`#ffff00`); a distinct gold, new token |
| Supporting line | `"Become Part of Dar-e-Arqam Schools to Further Your Career."` — `15px` / `700` / `25.05px` line-height / `rgb(211,211,211)` = `#d3d3d3` / Poppins (`font-heading`, not `font-body`) — no existing size match, new token |
| Usage note | **none** — the reference has no note under the form; this feature adds one (spec Deviations) |
| Band background | `rgb(30,41,75)` = `#1e294b` — a distinct navy, not `color-primary` (`#121291`) or the admin's `#223355` |
| Band vertical padding | `20px` top and bottom (identical at every width) |
| Input | height `47px`, padding `0 15px`, font-size `13px`, border `1px solid #d2d2d2`, `border-radius: 0`, background `#ffffff`, typed-text colour `rgb(170,169,169)` = `#aaa9a9` |
| Input gap (row layout) | `25px` between adjacent fields |
| Button | background `#f44336` = `color-cta`, padding `13px 29px`, font-size `14px`/`600`/Open Sans, `border-radius: 0`, text white — **exact match for the existing `text-button`/`font-button` tokens**; reused, not duplicated. Hover background `rgb(25,25,144)` = `#191990` (text stays white) — the same red→navy hover already logged under "Observed hover color changes" above, now given a name |

**Layout — live-site observation vs. this feature's requirement**: the
live reference keeps the three fields and button in one row down to
768px and only stacks at 375px (`layout: "row"` measured at 768,
1024, 1440; `"stacked"` at 375 — Avada's percentage-width columns
don't reflow until a narrower breakpoint than 768). **This feature
deliberately does not reproduce that** for 768px: no screenshot of
this section exists at 768 or 375 (the captured references are cut
off above it), so the spec's clarification session chose a two-field-row
layout at 768 with the button full-width below, before this
extraction pass could run. That clarified layout is the requirement
recorded in spec.md; this observation is logged here per Constitution
I so the choice is traceable, not silently overwritten by a later,
more convenient data point.

No usage-note text exists on the reference at any width to extract
(confirmed empty in the raw capture).

New tokens (added to `@theme` in `src/app/globals.css`):

| Token | Value |
|---|---|
| `--color-signup-band` | `#1e294b` |
| `--color-signup-highlight` | `#ffd700` |
| `--color-signup-supporting` | `#d3d3d3` |
| `--color-signup-input-bg` | `#ffffff` |
| `--color-signup-input-text` | `#aaa9a9` (typed text; stands in for the unreachable `::placeholder` colour too — see "Known extraction gaps") |
| `--color-signup-input-border` | `#d2d2d2` |
| `--color-cta-hover` | `#191990` (general — the button's navy hover, now named instead of only logged in prose; reusable by any `color-cta` button) |
| `--text-signup-supporting` | `15px` / `700` / `25.05px` |
| `--text-signup-input` | `13px` |
| `--spacing-signup-band-y` | `20px` |
| `--spacing-signup-input-height` | `47px` |
| `--spacing-signup-gap` | `25px` |
| `--radius-signup-input` | `0px` (sharp corners — do not default to the `4px` form-field radius used elsewhere) |
| `--radius-signup-button` | `0px` |

## Semantic colours (general — introduced by 004 signup, sp.analyze finding U1)

The reference has no error or success state anywhere on the site (no
form validation UI exists to extract from), so these two tokens are
not extracted values — they are assigned from **already-confirmed
reference colours** so they read as part of the same palette rather
than an invented one, and are recorded here as a documented deviation
per spec.md "Deviations from the Reference":

| Token | Value | Source |
|---|---|---|
| `--color-error` | `#f44336` | `color-cta` — already the admin's `--destructive` slot (see "Admin redesign" above) |
| `--color-success` | `#00bcd4` | `color-accent` |

General tokens, not signup-specific — reusable by the contact form
(008) and any other admin or public form state.

## Contact page (008 — extracted per-element)

Extracted with `research/extract-contact-tokens.ts` (+
`.browser.js`) against `https://das.edu.pk/contact/` at 375/768/1024/1440,
following the same per-element approach as the signup band above. Every
value below is **identical at all four widths** — this Avada page has no
responsive step for the columns, map heading or form band (only the
banner's title/height step, which the News banner already covers — see
below). Raw captures: `research/tokens/contact-page-<viewport>.json`.

### Banner

`.fusion-page-title-bar` height 102px → 155px (`lg:`), `h1.entry-title`
font-size 25.68px → 36px, both stepping at the same breakpoint as the News
banner. Background: `rgb(18, 18, 145)` (`--color-primary`) **plus** a
background image (`contact.jpg.webp`, downloaded to
`public/images/contact/banner.webp`) that the News banner doesn't have.
Title colour `rgb(255, 255, 0)` = `--color-topbar`. Breadcrumb "Home »
Contact", `font-size: 18px`, white text — identical markup/values to the
News banner's breadcrumb.

**Reused directly (no new tokens)**: `--spacing-news-banner-height`,
`--spacing-news-banner-height-lg`, `--text-news-banner-title`,
`--text-news-banner-title-md`, `--color-primary`, `--color-topbar`. Because
every value matches, `PageBanner` (lifted from `NewsBanner`, with an added
optional `backgroundImage` prop) replaces both banners — see contracts/
contact-page.md and plan.md research §14.

### Detail columns (BY PHONE / BY EMAIL / VISIT US / WRITE US)

| Element | Value | Reuse |
|---|---|---|
| Heading (`h3`) | `24px / 700 / 33.6px line-height / Poppins / #333` | Exact match for `--text-h3` + `--font-heading` — no new token |
| Subtitle (`h5`) | `14px / 700 / letter-spacing 3px / 28px line-height / Poppins / #333` | New — no existing token has this letter-spacing |
| Body (`p`) | `16px / 24px line-height / #000` | Exact match for `--text-body` + `--color-text` — no new token |
| Icon | 200×200px rendered | New |
| Column gap (`lg:`, 1440) | 51px | New |

Icons downloaded to `public/images/contact/{by-phone,by-email,visit-us,write-us}.png`
from `wp-content/uploads/2019/02/{phone-us,email-us-1,visit-us,write-enquiry}.png`.

Copy (verified against the live page, matching the values already
drafted in contracts/contact-page.md):

- By Phone — subtitle "Monday to Saturday 9am to 6pm PST" (this is the
  reference's literal **office hours** text, i.e. `contactInfo.officeHours`
  rendered as the subtitle — not a static string); body the phone number.
- By Email — subtitle "Write email on any of the following addresses";
  body two addresses, `info@das.edu.pk` / `enquiry@das.edu.pk` (content
  values, not hardcoded — see spec's single-address clarification, kept
  as one `contactInfo.email`).
- Visit Us — subtitle "Visit us in person and meet our representative";
  body the two-line address (kept as spec's single placeholder address).
- Write Us — subtitle "Write us an inquiry by filling form below"; body
  "Click this link to view inquiry form" (the `WriteUsLink`).

### Map heading and area

`h2` "Locate Us on Google Maps": `48px / 700 / center / rgb(34, 51, 85)`
(`#223355`) — no existing token matches this size or colour; new
`--text-contact-map-heading` / `--color-contact-map-heading`. Reserved map
area measured at 552px tall at 1440 (`--spacing-contact-map-height`,
applied uniformly — the reference has no responsive step here either).
The reference's own map iframe uses the parameterised
`google.com/maps/embed?pb=...` form tied to a specific My Business listing
id, not reproducible without that id; `mapEmbedSrc()` uses the documented
keyless `maps.google.com/maps?q=...&output=embed` alternative instead
(plan.md "Follow-ups", research §13 — an approved, deliberate substitution,
not a fidelity gap).

### Form band

| Element | Value | Reuse |
|---|---|---|
| Band background | `rgb(255, 244, 168)` (`#fff4a8`) | New — `--color-contact-form-band` |
| Band vertical padding | `30px` | New — `--spacing-contact-form-band-y` |
| Input height | `47px` | Exact match for `--spacing-signup-input-height` |
| Input border | `1px solid #d2d2d2` | Exact match for `--color-signup-input-border` |
| Input placeholder colour | `rgb(170, 169, 169)` (`#aaa9a9`) | Exact match for `--color-signup-input-text` |
| Input font-size | `13px` | Exact match for `--text-signup-input` |
| Input/button radius | `0px` | Exact match for `--radius-signup-input` / `--radius-signup-button` |
| Textarea height | `150px` | New — `--spacing-contact-textarea-height` |
| Field gap (row, `md:`) | `51px` horizontal / `60px` vertical | New — `--spacing-contact-form-gap-x` / `-y` |
| Send button background / hover | `rgb(244, 67, 54)` → `rgb(25, 25, 144)` | Exact match for `--color-cta` / `--color-cta-hover` |
| Send button text | `14px / 600 / Open Sans / white` | Exact match for `--text-button` |

Layout at 1440: Name/Email share a row (`layout: "row"`, gapX 51.2px
confirms the reference brief's two-per-row description — contracts/
contact-page.md "Form layout").

Deviations already recorded in spec.md "Deviations from the Reference"
(Phone + Subject fields added, no reCAPTCHA badge — the live page still
shows an invisible reCAPTCHA v2 badge; Constitution II keeps this
project keyless/dependency-free) apply unchanged; nothing new found here.

New tokens (added to `@theme` in `src/app/globals.css`):

| Token | Value |
|---|---|
| `--color-contact-form-band` | `#fff4a8` |
| `--color-contact-map-heading` | `#223355` |
| `--text-contact-map-heading` | `48px` / `700` |
| `--text-contact-column-subtitle` | `14px` / `700` / `28px` line-height / `3px` letter-spacing |
| `--spacing-contact-form-band-y` | `30px` |
| `--spacing-contact-textarea-height` | `150px` |
| `--spacing-contact-form-gap-x` | `51px` |
| `--spacing-contact-form-gap-y` | `60px` |
| `--spacing-contact-icon` | `200px` |
| `--spacing-contact-columns-gap` | `51px` |
| `--spacing-contact-map-height` | `552px` |
