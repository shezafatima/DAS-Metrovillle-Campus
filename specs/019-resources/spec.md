# Feature Specification: Resources Page

**Feature Branch**: `019-resources`
**Status**: Implemented (reduced scope)

## Summary

`/resources` is the Photo Gallery (`#photo-gallery`, from 007) in the shared section wrapper. The first plan also had a Scarlet Series "Mobile Apps" section. The owner removed it on 2026-10-14, together with its flyer, content, schema and menu entry. Its full requirements, link checks and client findings are in git history (commit `971b1c3` and the prompt records under `history/prompts/019-resources/`).

## Requirements

- **FR-001**: `/resources` has one `h1` ("Resources") and one section, Photo Gallery (`photo-gallery`), with an `h2`, the shared scroll margin and the `surface` background. It renders nothing when no album has photos (007 FR-031).
- **FR-002**: The Resources dropdown, the mobile menu group and site search list exactly Photo Gallery, from `pageSections.resources`.
- **FR-003**: No link or element uses `#downloads`, `#our-books` or `#mobile-apps`. The old `/resources/scarlet-mobile-apps` address redirects permanently to `/resources`; the other old Resources addresses keep their redirects.
- **FR-004**: Gallery behaviour is unchanged: album caps, viewer, lazy loading, data source, hidden-when-empty and the admin screens.
- **FR-005**: Album cards are 4:3 photo tiles: the cover fills the card with rounded corners, the title in white over a bottom gradient, a photo-count badge top-right, and a gentle zoom and stronger gradient on hover and focus (transform and opacity only, motion-safe). The grid is 1 column on phones, 2 on tablets, 3 on desktop.
- **FR-006**: The Photo Gallery heading is centred with the shared heading stroke, in `--color-gold` (the bright yellow is faint on white).
- **FR-007**: `/resources` passes an axe scan, and has no horizontal scroll at 375, 768, 1024 and 1440 px.

## Out of Scope

Mobile apps, downloads, Our Books, any gallery behaviour or admin change, and the portal links.
