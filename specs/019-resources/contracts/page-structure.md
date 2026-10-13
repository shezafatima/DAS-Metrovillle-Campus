# Contract: /resources page structure

## Order and anchors

| # | Section | id | `h2` | Background (`data-background`) | Rendered when |
|---|---|---|---|---|---|
| — | Page banner | — | `h1` "Resources" (existing) | — | always |
| 1 | Photo Gallery | `photo-gallery` | `#photo-gallery-heading`, "Photo Gallery" | `surface` | at least one album has photos (007 FR-031, unchanged) |
| 2 | Mobile Apps | `mobile-apps` | `#mobile-apps-heading`, "Scarlet Series Mobile Applications" | `muted` | always |

- The page composes the sections by mapping `pageSections.resources` (the Academics pattern). An unknown id renders nothing.
- Both sections are `AboutSection`s, so both get the `anchor-section` class: `scroll-margin-top: var(--anchor-scroll-margin)`.
- The menu entries (desktop dropdown, mobile group, search) come from `pageSections.resources` and are unchanged: "Photo Gallery" → `/resources#photo-gallery`, "Mobile Apps" → `/resources#mobile-apps`.

## Removed / never present

- No element with id `downloads` or `our-books`. No `href` on any public page contains `#downloads` or `#our-books`.

## Redirects (unchanged, `next.config.ts`)

| Old address | Destination |
|---|---|
| `/resources/photo-gallery` | `/resources#photo-gallery` |
| `/resources/scarlet-mobile-apps` | `/resources#mobile-apps` |
| `/resources/prospectus`, `/monthly-arqam`, `/newsletters`, `/useful-links`, `/our-books` | `/resources` |
| `/resources/gallery` | `/resources#photo-gallery` (page-level redirect, 007) |

## Responsive layout (Mobile Apps)

| Width | Intro | Apps grid |
|---|---|---|
| 375 | Heading → text → flyer, stacked | 1 column |
| 768 | Text (7/12) beside the flyer (5/12) | 2 columns |
| 1024, 1440 | Text (7/12) beside the flyer (5/12) | 4 columns |

At every width:

- there is no horizontal scroll;
- the cards in a row have equal heights;
- the button and notes sit at the card bottom;
- the body text stays within `max-w-prose` (≤ 75 characters per line);
- the flyer is never cropped (its rendered aspect ratio stays 744 / 1280 ± 1%).
