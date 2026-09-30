# Quickstart: verifying Gallery Albums (007)

Prerequisites: `MONGODB_URI` set, an admin seeded (`npm run seed:admin`), and a content manager with and one without `settings` (011). For uploads in tests, use `NEWS_COVER_VERIFY=skip` (not in production) or real Cloudinary environment variables. Never run `npm run build` and Playwright at the same time.

## 1. Migration (US3)

1. Seed the 005 flat gallery: `settings/_id:"gallery"`, `data.images` with 10 live captioned images and 1 soft-deleted one.
2. `npm run migrate:gallery` prints `Migrated 10 photo(s) into 2 album(s); 0 photo(s) were not migrated.`
3. Admin **Settings → Photo gallery** shows "Gallery" (8) and "Gallery 2" (2), in the old order with captions. The deleted image is nowhere to be seen, and it sits in `data.retired`.
4. Run the command again. It reports already migrated, and nothing changes.
5. With 50 live images it reports `Migrated 48 photo(s) into 6 album(s); 2 photo(s) were not migrated.`, and the 2 assets are deleted.
6. Lazy path: seed the flat shape and open `/resources` without running the script. The gallery shows, and a `gallery_migrated` log line appears.

Automated: `src/lib/gallery/migrate.test.ts` (pure) and `src/lib/gallery/ensure-migrated.test.ts` (DB-backed via `describeWithDb`: idempotent, concurrent run).

## 2. Albums and the cap (US1)

1. Create "Annual Day" (with a description and date). It appears last with 0 photos.
2. Create albums until there are 6. **Create album** is disabled with "The gallery is limited to 6 albums. Delete an album to create a new one."
3. Direct call: `createGalleryAlbum` from a test (or two at once with `Promise.all`) returns `full`, and there are still 6.
4. Move an album up, rename it, and delete one after confirming. Create becomes enabled again.
5. Open the album's Edit panel in two tabs and save in both. The second gets "This was changed by someone else. Reload to see their changes." and its typed values stay.

## 3. Photos and the cap (US2)

0. Time it (SC-005): from an empty gallery, create an album, upload 5 photos and set a cover. Record the time; it must be under 3 minutes.
1. Open an album and select 5 images: 5 upload with progress bars. Then select 6 more: 3 are added, and the message says 3 were not added because the album is full. The upload control is now disabled.
2. Edit a caption, move a photo, choose **Make cover**, and delete the cover photo after confirming. The next photo becomes the cover.
3. Select a 6 MB file and a renamed PDF. Each is refused with "Images must be JPG, PNG or WebP, up to 5 MB.", and the other photos are unchanged.
4. Concurrency: a DB test runs two `addGalleryPhotos` calls of 5 each into an empty album at once. The total is 8, and the refused images' assets are deleted.

## 4. Visitors (US4)

1. Open `/resources`. There are cards with cover, title and count in admin order, and the empty album isn't shown.
2. Open a card. The address is `/resources/gallery/<id>`. The banner reads "Photo Gallery" with the breadcrumb "Home » Resources » Photo Gallery" (compare against `screenshots/das.edu.pk_resources_photo-gallery_*.png`), followed by the album title and the grid.
3. Open a photo. Use → to the last, then Escape, and focus is back on the photo. Press Back and you return to `/resources#photo-gallery`.
4. Touch, in a mobile emulation: swipe through the photos and tap Close.
5. Delete all albums: `/resources` has no gallery heading. An old album address gives a 404.
6. Menu → Resources → Photo Gallery lands on `/resources#photo-gallery`, and `/resources/photo-gallery` redirects there.

## 5. Access (US5)

For both pages and all nine actions, check signed out, a content manager without `settings`, and one with it (contracts/access-matrix.md). Automated: `settings/gallery/actions.test.ts`, `e2e/admin-gallery-access.spec.ts`, and the access inventory test.

## 6. Layout

At 375, 768, 1024 and 1440px, the admin album list, the album screen, `/resources` and the album page have no horizontal scroll. Check with an 80-character title, an Urdu title and caption, 1 photo and 8 photos. Also check the reference's own breakpoints (research/design-tokens.md: 480, 640, 782 and 1280px). Automated: `e2e/admin-gallery-layout.spec.ts` and `e2e/admin-gallery-public.spec.ts`.
