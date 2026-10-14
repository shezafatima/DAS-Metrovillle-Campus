# Implementation Plan: Resources Page

**Branch**: `019-resources` | **Spec**: [spec.md](./spec.md)

## Summary

The Photo Gallery is wrapped in the shared `AboutSection`, its album cards are redesigned as photo tiles, and the page composes only that section. The Mobile Apps section from the first plan was removed (spec Summary).

## Changes

- `src/app/(public)/resources/page.tsx`: banner plus `GallerySection`.
- `src/components/gallery/gallery-section.tsx`: `AboutSection` wrapper (`surface`, with the stroke).
- `src/components/gallery/album-card.tsx`: the photo-tile card.
- `src/components/home/heading-stroke.tsx` and `src/app/globals.css`: the stroke colour reads `--heading-stroke-color`; `#photo-gallery` sets it to `--color-gold`.
- `src/components/about/about-section.tsx`: optional `beside` and `below` props, added for the removed section and now unused.
- `src/content/site-shell.ts`: `pageSections.resources` is Photo Gallery only.
- `next.config.ts`: `/resources/scarlet-mobile-apps` redirects to `/resources`.

## Constitution check

No new packages, tokens or hosts. Server Components only. Existing tokens only (the card scrim is the `black` already used by the album photo grid). Gallery behaviour is unchanged, guarded by the 007 specs.

## Tests

- Unit: `site-shell.test.ts`, `site-search.test.ts`, `about-section.test.tsx`.
- E2E (chromium): `e2e/resources.spec.ts` (one h1, no removed anchors, redirect), `e2e/page-sections.spec.ts`.
- E2E (admin, seeded gallery): `e2e/admin-resources-gallery.spec.ts`, plus the 007 `admin-gallery-*` specs.
