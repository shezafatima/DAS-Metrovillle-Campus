# Research Task — Design Token Extraction from das.edu.pk

Goal: extract the exact computed design values of das.edu.pk so the
Metroville site can reproduce the design as-is. Research only — do not
modify any project code, config, or components.

## Setup
- Install Playwright as a dev dependency and the Chromium browser if
  not already present.
- Write the extraction script to research/extract-tokens.ts so it can
  be re-run later.

## Pages
| Name | URL |
|---|---|
| home | https://das.edu.pk/ |
| about | https://das.edu.pk/about/overview/ |
| salient-features | https://das.edu.pk/about/salent-features/ |
| management | https://das.edu.pk/about/management/ |
| campuses | https://das.edu.pk/campuses-list/ |
| academics | https://das.edu.pk/academics/academics-overview/ |
| admission | https://das.edu.pk/admission/ |
| photo-gallery | https://das.edu.pk/resources/photo-gallery/ |
| our-books | https://das.edu.pk/resources/our-books/ |
| news | https://das.edu.pk/news/ |
| contact | https://das.edu.pk/contact/ |

("salent" is the site's own spelling.)

## Viewports
1440, 1024, 768 and 375px wide.

## Page loading
Before extracting on each page:
- Wait for network idle.
- Close any popup, modal or cookie banner.
- Scroll slowly to the bottom and back to the top so lazy-loaded
  images, sliders and counters render.

## What to extract

### Global
- Font families, and the weights and styles actually used. Record the
  font sources (Google Fonts URLs or @font-face rules).
- Color palette: every text, background and border color used, ranked
  by how many elements use it. Mark which are primary, accent,
  neutral and text colors.
- Breakpoints: read the @media rules from the site's stylesheets and
  list the widths where layout changes (menu collapses, grids reflow).
- Container max-widths and horizontal page padding per viewport.
- Spacing scale: the distinct section padding/margin and gap values
  in use.
- Border radii and box shadows in use.

### Per element type (per viewport)
For each, record font-family, font-size, font-weight, line-height,
letter-spacing, text-transform, color, background-color, padding,
margin, border, border-radius, box-shadow:
- h1, h2, h3, h4, body text, small text, links
- top bar, header, main menu items, dropdown menu, mobile menu
- buttons (every visible variant)
- cards (every visible variant)
- section titles and subtitles
- form inputs, labels, submit buttons
- footer (headings, links, bottom bar)

### Interaction states
- Hover styles of menu items, buttons, cards and links (hover the
  element, then read computed styles).
- transition and animation properties (duration, easing, delay).
- Slider/carousel settings where readable (autoplay interval,
  transition type), and counter animation duration.

## Output
1. research/tokens/<page>-<viewport>.json — raw extracted values.
2. research/design-tokens.md — human-readable summary:
   - Global tokens: fonts, color palette with roles, type scale,
     spacing scale, radii, shadows, container widths, breakpoints,
     motion timings.
   - Suggested token names for each value (e.g. color-primary,
     text-h1, space-section-y), keeping the exact values.
   - Per-page notes: values that differ from the global tokens, and
     the reusable components seen on that page.

## Cross-check
Compare against these known values and report any conflict instead
of overriding it:
- Font: Poppins
- Primary navy: #121291
- Accent yellow: #FFF212 (check whether a toned-down gold is used on
  large surfaces)

## Rules
- Only report values that were actually extracted. Never guess or
  fill gaps from memory.
- Ignore hidden elements and elements from third-party widgets
  (chat widgets, embedded maps) unless they are part of the design.
- If a page can't be reached, blocks automated browsing, or doesn't
  render correctly, stop and report which page and what happened.
- Reference screenshots already exist in screenshots/. Do not take
  new full-page screenshots.