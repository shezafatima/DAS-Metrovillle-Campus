# Contract: Access Matrix changes (007)

The outcome rules are unchanged from 011 and 005. Pages give a login redirect with no session, or `/admin?denied=1` without the permission. Actions return `unauthorized` or `forbidden`, send no data and log `access_denied`. Every file below MUST be in `EXPECTED` in `src/test/access-inventory.test.ts`. `EXPECTED` is keyed per file, one entry for each page file and one `kind: "action"` entry for the actions file, and the test itself checks that every exported action in that file calls `requireAdminAccess` with the listed access.

## Pages (access `settings`, each calls `requireAdminPage("settings")`)

| Path | File | Change |
|---|---|---|
| `/admin/settings/gallery` | `admin/(dashboard)/settings/gallery/page.tsx` | now the album list (was the flat group) |
| `/admin/settings/gallery/[albumId]` | `admin/(dashboard)/settings/gallery/[albumId]/page.tsx` | **new** |

## Server Actions (`admin/(dashboard)/settings/gallery/actions.ts`)

All nine have access `settings`: `createGalleryAlbum`, `updateGalleryAlbum`, `reorderGalleryAlbums`, `deleteGalleryAlbum`, `addGalleryPhotos`, `updateGalleryPhoto`, `reorderGalleryPhotos`, `setGalleryCover`, `deleteGalleryPhoto`.

## Route handler

`POST /api/admin/settings/uploads/sign` is unchanged (settings). Its existing tests stand.

## Removed

`saveSettingsGroup` with `group: "gallery"` is now refused as `invalid`, because the key has left the registry (research R12). A test asserts this, so the flat path can't write the album document.

## The three cases (Constitution XI, spec FR-036)

For every page and every action above:

| Case | Page | Action |
|---|---|---|
| No session | redirect to `/admin/login` | `{ status: "error", error: "unauthorized" }`, nothing stored |
| Content manager without `settings` | redirect to `/admin?denied=1` | `{ status: "error", error: "forbidden" }`, nothing stored |
| Main admin, or content manager with `settings` | renders | succeeds |

Unit or DB tests cover the actions (`actions.test.ts`, using the `src/test/admin-session.ts` mocks). E2E covers the pages (`e2e/admin-gallery-access.spec.ts`) and adds rows to `e2e/admin-roles-access-matrix.spec.ts`.

## Public (no session, FR-003)

| Path | Behaviour |
|---|---|
| `/resources` | minimal page with `#photo-gallery` section (hidden when empty) |
| `/resources/gallery` | redirect to `/resources#photo-gallery` |
| `/resources/gallery/[albumId]` | album page, or the standard 404 |
| `/resources/photo-gallery` | permanent redirect to `/resources#photo-gallery` (`next.config.ts`) |
