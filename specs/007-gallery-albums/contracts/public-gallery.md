# Contract: Public gallery (007)

## Reader

`getPublicGallery(): Promise<PublicGallery>` in `src/lib/gallery/public.ts` (shape in data-model.md). It is cached for 60 s with the tags `settings` and `settings:gallery`, and times out after 3 s. On failure it falls back to the last good value this process read, else `{ albums: [] }`. It never throws and logs `gallery_read_failed` (FR-033). It runs `ensureGalleryMigrated()` before reading, outside the cache, but **only until the in-process `migrationDone` flag is set** (research R8). After that the public path makes no database read outside the 60 s cache.

`getPublicAlbum(id)` returns `PublicAlbum | null`. It uses the same cached value and doesn't read the database a second time.

## `/resources` — page

- `PageBanner` with `title` "Resources" and `trail` `["Resources"]` (016 owns the final banner), then the Photo Gallery section below, and nothing else.

## `/resources` — Photo Gallery section

- `<section id="photo-gallery" aria-labelledby="photo-gallery-heading">` with the heading "Photo Gallery". It is rendered **only** when `albums.length > 0`. Otherwise nothing is rendered, not even the heading (FR-031).
- It shows a grid of album cards in admin order. Each card is one link to `/resources/gallery/<id>` containing the cover image (`alt` = album title), the title (`dir="auto"`, wraps, clamped to 3 lines with the full title in the accessible name), "N photos" / "1 photo", and the date when set, formatted as "12 March 2026".
- Grid columns: 1 at 375, 2 at 768, 3 at 1024 and above. Spacing and type come from `research/design-tokens.md`.
- Feature 016 adds `#downloads` and `#our-books` sections as siblings around this one. The component, its id and its behaviour don't change.

## `/resources/gallery/<albumId>` — album page

- The `albumId` must match `^[a-z0-9]{12}$` and be a public album, else `notFound()`.
- The page frame matches the reference Photo Gallery screenshots: `PageBanner` with `title` "Photo Gallery" (the page's `h1`), breadcrumb "Home » Resources » Photo Gallery" and `backgroundImage` `/images/banners/photo-gallery.jpg` once supplied (until then, `bg-primary`, listed as placeholder content).
- Below the banner: a back link to `/resources#photo-gallery`, the album title as an `h2` (`dir="auto"`), the description and date when set, and a photo grid in admin order. Each photo is a button that opens the viewer at that photo. It has `next/image` with `loader={cloudinaryLoader}`, is lazy below the fold, and its `alt` is the caption when set, else "{album title} — photo {n}".
- Metadata: `title` is the album title, and the Open Graph image is the cover through `ogImageUrl`.

## Viewer

- It uses `ui/dialog.tsx`, full screen, with `aria-label` "{album title} photos".
- It contains the image (`object-contain`), the caption, "n of N", Previous and Next buttons (hidden at the first and last photo, not wrapping), and a Close button.
- Keys: ← and → move, Escape closes. Focus is trapped while it's open and returns to the opening photo button.
- Touch: a horizontal swipe of more than 50 px moves, and tapping the backdrop or Close closes it.
- Only the neighbouring photos are preloaded. No other photos load until they're reached.
- With `prefers-reduced-motion`, there is no slide animation.
