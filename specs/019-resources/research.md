# Research: Resources Page (019)

All findings were checked against the code on branch `019-resources` and the live reference on 2026-10-12. The link checks themselves are recorded in spec.md, "Pre-build Findings". No NEEDS CLARIFICATION items remain.

## R1. How a dead app link is stored

- **Decision**: Keep the brief's shape `{ id, name, label?, icon, url, linkType }`. `url: ""` means "no working link": the card shows the "Not available at the moment" note and no button. The dead reference URLs are kept outside the 014 value, in `mobileAppsSource.referenceLinks` (with the date checked), the `review` notes and `docs/content-source/resources/client-review.md`.
- **Rationale**: This matches 018's `video.url === ""` rule, so 014 edits it the same way (empty the field, or paste a working link). A dead URL never reaches the HTML, so a rendering bug can't expose it. The 014 shape stays exactly as the brief specifies.
- **Alternatives considered**:
  - A `status: "working" | "dead"` field next to `url`. This adds a field that 014's editor must keep in step with the URL, and the brief's shape doesn't have it.
  - Keeping the dead URL with a flag. The dead link stays in the published data, and one missed check renders a broken button.

## R2. Validating `url` against `linkType`

- **Decision**: A Zod refine on each app: `url === "" || linkMatchesType(url, linkType)`.
  - `play-store`: `https://play.google.com/store/apps/details?id=<package>`.
  - `app-store`: `https://apps.apple.com/...`.
  - `direct-download`: any `https:` URL.

  Plain `http:` is refused for every type. The same function is exported for 014's validator.
- **Rationale**: The button wording depends on `linkType` (FR-015). A Play URL marked `direct-download` would show the wrong button and the wrong warning. The check runs at module load, so a bad edit fails the build (018 pattern).
- **Alternatives considered**:
  - Inferring `linkType` from the URL. The brief makes `linkType` an explicit field, and 014 shows it as a select.
  - Limiting `direct-download` to Google Drive. That is too narrow, because the client may host files elsewhere.

## R3. Button text and accessible name

- **Decision**:
  - The visible text is the button label from content ("Download for Android", "Get it on Google Play" or "Download on the App Store").
  - The accessible name is the visible text plus visually hidden text, for example "Download for Android: Scarlet English (opens in a new tab)".
  - The outside-the-Play-Store note is visible text, linked to the button with `aria-describedby`.
  - Each link has `target="_blank"` and `rel="noopener noreferrer"`.
- **Rationale**: WCAG 2.5.3 (Label in Name) requires the accessible name to contain the visible label. A replacement `aria-label` like the brief's example, "Download Scarlet English app", would drop "for Android" and fail it for voice-control users. Appending the app name keeps both the visible label and the brief's requirement that the name includes the app name (FR-017).
- **Alternatives considered**: `aria-label="Download Scarlet English app"`. This fails label-in-name and hides the platform from screen-reader users.

## R4. The section wrapper for Mobile Apps (heading beside the photo)

- **Decision**: Add one optional prop to the shared `AboutSection`: `beside?: ReactNode` (plus `below?: ReactNode`).
  - When `beside` is set, the heading (`SectionHeading`, aligned to the start) and `children` sit in a 7/12 column, and `beside` sits in a 5/12 column from `md` up.
  - On phones they stack: heading and text, then `beside`.
  - `below` runs full width under the row, and holds the apps grid.
  - Every other caller is unchanged.
- **Rationale**: The brief puts the heading in the text column, beside the photo. `AboutSection` always centres the heading above everything, so it can't express that today. Extending the shared wrapper keeps one section component (Constitution IX) and gives Mobile Apps the same `anchor-section` scroll margin, backgrounds and spacing as About and Academics. `SectionHeading` already supports start alignment through `className` (the home Books band uses it).
- **Alternatives considered**:
  - The heading centred above, with a text | photo grid below. This contradicts the brief's intro layout.
  - A bespoke `<section>` with copied classes. That duplicates the wrapper, and its spacing and scroll margin would drift.

## R5. Photo Gallery in the shared structure

- **Decision**: Inside `GallerySection`, replace the bare `<section>` and `<h2>` with `AboutSection`, using id `photo-gallery`, background `surface`, the heading from `galleryContent.sectionHeading` and the `stroke` variant (as Academics uses). The heading id stays `photo-gallery-heading`, because `AboutSection` derives it as `${id}-heading`. The album grid inside is unchanged. The page drops its own container `div` and composes the sections from `pageSections.resources`, as Academics does.
- **Rationale**: Hidden-when-empty (007 FR-031) stays in the same place: `GallerySection` returns `null` before any wrapper renders. The data source, cards, grid and viewer don't change.
- **Search of existing tests**: no 007 E2E spec asserts the gallery `h2` markup or class. The only heading-related assertion is the album page's breadcrumb, which is unaffected. Nothing to update (FR-009).
- **Alternatives considered**: Wrapping `GallerySection` from the page. The page would then render the wrapper and heading even when the gallery returns `null`, which breaks hidden-when-empty.

## R6. Backgrounds

- **Decision**: Each section has a fixed background: Photo Gallery `surface`, Mobile Apps `muted` (`--color-home-muted-band`). The banner sits above.
- **Rationale**: These are the same tokens as Academics. The background is fixed per section, so when the gallery is hidden Mobile Apps keeps its muted band (spec Edge Cases). It doesn't shift by position.

## R7. The Scarlet Series photo

- **Findings**: The reference photo is a 744 × 1280 portrait **flyer of mostly text**: "Dar-e-Arqam Schools proudly introducing Scarlet Series for Playgroup", eight bullet points, "Beginning from New Session 2020-21", "The series will be provided in parallel to the old series of Play Group" and "www.das.edu.pk".
- **Decision**:
  - Store it once as `public/images/resources/scarlet-series-playgroup.jpeg`. It was fetched once on 2026-10-12 into the session scratchpad and is copied from there, not downloaded again.
  - Show it whole, never cropped: `object-contain` at its natural ratio, its height capped by a new token `--size-resources-flyer-max-h` (36rem).
  - Its alt text transcribes the flyer's text, because it is an image of text (WCAG 1.1.1). The text is marked pending client approval. The spec's FR-012 is updated to match, as finding R7.
- **Rationale**: Cropping would cut off the flyer's text. The reference alt, "Scarlet Series for Playgroup", gives screen-reader users none of the flyer's content.
- **New finding R7, for the client**: the flyer advertises the 2020-21 session and the head office web address. It may be out of date for the campus.
- **Alternatives considered**:
  - A fixed 3/4 crop with `object-cover`. It cuts text.
  - A short alt plus a long description elsewhere. This adds a pattern the site doesn't have.

## R8. Card grid and equal heights

- **Decision**:
  - The grid is `grid-cols-1 md:grid-cols-2 lg:grid-cols-4`. The grid's default stretch makes the cards equal height per row.
  - Each card is a flex column: icon chip, name, optional label, then a footer at the bottom (`mt-auto`) holding the button and note, or the unavailable note.
  - The surface card uses `--radius-card` and `--shadow-card`. The icon chip is a navy circle with a yellow (`--color-topbar`) icon.
- **Rationale**: These are the column counts the brief gives (1/2/4). At 1024 px the four columns are each about 220 px wide, which fits the longest button label on two lines at most. The E2E test measures equal heights.

## R9. Hover and motion

- **Decision**:
  - On hover the card lifts by a new token, `--spacing-resources-card-lift` (4px), only under `motion-safe`.
  - The button goes from navy with white text to yellow (`--color-topbar`) with navy text. Navy on yellow passes AA.
  - Only `transform`, `background-color` and `color` transition.
  - Focus uses the site's existing visible focus ring.
- **Rationale**: This follows the brief ("transform and colour only") and Constitution VII (new values become tokens).

## R10. Icons

- **Decision**: The icon keys are stored as data (018's `POINT_ICON_KEYS` pattern) in a closed enum, and the component maps each key to a lucide-react icon: `book-a` (English), `calculator` (Math), `feather` (Urdu, for the qalam and calligraphy), `monitor-smartphone` (LMS App). All four exist in the installed lucide-react. Icons are `aria-hidden`.
- **Rationale**: The owner can swap an icon by changing its key, and 014 shows the key as a select. A closed enum keeps unknown names out.

## R11. Interface copy that is not from the reference

- **Decision**: These strings live in a `mobileAppsCopy` export in the content file, apart from the 014 value: the button labels, the outside-the-Play-Store note ("Installs from outside the Play Store"), the unavailable note ("Not available at the moment") and "opens in a new tab". Each is marked pending client approval (finding R6).
- **Rationale**: Constitution IX says page copy lives in content files. Keeping it out of the 014 value matches 018's split between `academicsPage` strings and section values.

## R12. Fidelity and invariants

- **Decision**:
  - `docs/content-source/resources/mobile-apps.txt` holds the reference heading (line 1) and body (line 2) as copied. A README records the URL and copy date.
  - `src/content/resources/fidelity.test.ts` asserts that the heading and body equal those lines exactly.
  - `content.test.ts` asserts:
    - the image is local;
    - no URL in the content points at `das.edu.pk` (except the source record, which isn't rendered);
    - the four apps are in order;
    - only Scarlet English has a URL;
    - every non-empty URL matches its `linkType`.
- **Rationale**: This follows the 018 pattern. SC-002 and SC-003 become unit-testable, and E2E double-checks them in the browser.

## R13. Removing the stale Downloads / Our Books references

- **Finding**: The only references are code comments in `src/app/(public)/resources/page.tsx` and `src/components/gallery/gallery-section.tsx`, plus the `next.config.ts` redirect `/resources/our-books` → `/resources`, which stays. No link anywhere uses `#downloads` or `#our-books`.
- **Decision**: Rewrite both comments to describe the 019 page. Add an E2E test that fetches every top-level public page and asserts that no `href` contains `#downloads` or `#our-books` (FR-003, SC-006).

## R14. Existing E2E tests affected

| Spec | Test | Change |
|---|---|---|
| `e2e/page-sections.spec.ts` | "/resources has a Mobile Apps placeholder with the LMS App link" | Removed. It is superseded by `e2e/resources.spec.ts` US1. |
| `e2e/page-sections.spec.ts` | "every portal link in the footer and the Mobile Apps section opens a placeholder page" | Reads the footer only. The footer still has all six `/portal/` links, so `size >= 6` holds. Test renamed. |
| `e2e/admin-gallery-*.spec.ts` (007) | none | Unchanged (R5). |

- **Where the gallery-dependent tests run**: Playwright runs `admin-*.spec.ts` in the serial `admin` project, the only one that seeds the shared gallery document. The tests that need albums go in `e2e/admin-resources-gallery.spec.ts`: Photo Gallery before Mobile Apps, both menu anchors landing clear of the header, and alternating backgrounds. They reuse `e2e/helpers/gallery.ts`.
- **Gallery-independent tests**: `e2e/resources.spec.ts` (chromium project) runs regardless of gallery state: Mobile Apps content, cards, links, widths, axe, and no links to removed anchors.

## R15. Release check

- **Decision**: The release check is not changed. The dead-link cards are a supported, approved state (Clarification Q1), not placeholder content, and blocking production on head-office links the campus may never get would block launch indefinitely. The client-review list is how they get chased.
- **Alternatives considered**: A blocking release problem while any `url === ""`. Rejected for the reason above. The owner can ask for a warning-only line later.
