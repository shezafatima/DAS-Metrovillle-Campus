> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Contract: Access Matrix (011)

This table is the source of truth for every admin entry point. Two things are generated from it:

- the three-case test suite (Constitution XI);
- an **inventory test** that walks `src/app/admin/**/page.tsx`, `src/app/api/admin/**/route.ts` and every `"use server"` file under `src/app/admin/`, and fails if any entry point is missing from this table or doesn't call `requireAdminPage` / `requireAdminAccess` with the listed access.

`access` values: a permission key, `main_admin`, or `any` (any active user whose password is set). Research §1 covers the outcomes for pages and routes.

## Outcome rules

**Pages** (`requireAdminPage(access)`), checked in this order:

1. No session, or the account is disabled or deleted → redirect to `/admin/login?next=<path>`.
2. Forbidden → redirect to `/admin?denied=1`. The overview then shows "You don't have access to that section."
3. Otherwise the page renders.

**Routes and actions** (`requireAdminAccess(access)`):

| Case | Route response | Action result |
|---|---|---|
| No session, disabled or deleted | `401 { "error": "unauthorized" }` | `{ status: "error", error: "unauthorized" }` |
| Missing permission or wrong role | `403 { "error": "forbidden" }` | `{ status: "error", error: "forbidden" }` |

Every refusal is `Cache-Control: no-store`, returns no section data, and logs an `access_denied` security event (except for no session).

## Pages

| Path | Access | Notes |
|---|---|---|
| `/admin` (overview) | any | Cards filtered by `canAccess`. Shows the `denied` notice. |
| `/admin/account` | any | Own account only. It takes no id. |
| `/admin/news`, `/admin/news/new`, `/admin/news/[id]` | news | |
| `/admin/messages`, `/admin/messages/[id]` | messages | |
| `/admin/signups` | careers | Clarification 2 |
| `/admin/settings` | settings | Redirects to `/admin/settings/contact` (005) |
| `/admin/settings/contact`, `/hero`, `/stats`, `/video` | settings | 005: one page per group; see `specs/005-settings/contracts/access-matrix.md` |
| `/admin/settings/gallery`, `/admin/settings/gallery/[albumId]` | settings | 007: album list and one album's photos; see `specs/007-gallery-albums/contracts/access-matrix.md` |
| `/admin/design-system` | main_admin | Internal reference page |
| `/admin/users` | main_admin | New |
| `/admin/users/activity` | main_admin | New: the change record |
| `/admin/login` | public | Unchanged |
| `(dashboard)/layout.tsx` | any | Nav and bell data only. Not an access gate (Next guide "Layouts and auth checks"). |

## Route handlers

| Method + path | Access |
|---|---|
| `GET /api/admin/session` | any |
| `GET /api/admin/notifications` | any (results filtered by permission) |
| `POST /api/admin/notifications/read` | any (marks only permitted kinds) |
| `POST /api/admin/news` | news |
| `GET · PUT · DELETE /api/admin/news/[id]` | news |
| `POST /api/admin/news/[id]/publish` | news |
| `POST /api/admin/news/[id]/unpublish` | news |
| `POST /api/admin/uploads/sign` | news (only the news editor uploads today) |
| `POST /api/admin/settings/uploads/sign` | settings (005: hero and gallery images) |
| `PATCH · DELETE /api/admin/messages/[id]` | messages |
| `POST /api/admin/messages/[id]/read` | messages |
| `DELETE /api/admin/signups/[id]` | careers |
| `POST /api/admin/signups/opened` | careers |
| `GET /api/admin/signups/export` | careers |
| `/api/auth/*` closed by `disabledPaths` in 010 | 404 for every role (unchanged) |

## Server Actions

| Action | Access |
|---|---|
| `logout` | none (harmless without a session) |
| `changePassword` (account) | **main_admin**, own account only (Constitution III: the main admin controls every password) |
| `signOutOtherDevices` (account) | any, own account only |
| `createUser`, `updateUserAccess`, `disableUser`, `enableUser`, `resetUserPassword`, `deleteUser` | main_admin (users/actions.ts) |
| `saveSettingsGroup` | settings (005; `group: "gallery"` refused since 007) |
| `createGalleryAlbum`, `updateGalleryAlbum`, `reorderGalleryAlbums`, `deleteGalleryAlbum`, `addGalleryPhotos`, `updateGalleryPhoto`, `reorderGalleryPhotos`, `setGalleryCover`, `deleteGalleryPhoto` | settings (007, settings/gallery/actions.ts) |

## Three-case tests per entry point

For every row above (except public and `logout`), tests assert all three of:

1. No session.
2. **Wrong role or missing permission**: a content manager holding every grant *except* the one required. For `main_admin` rows, a content manager holding **all** grants.
3. **Correct**: a content manager holding exactly the required key. For `main_admin` rows, a main admin.

`any` rows use a content manager with **no** grants as case 3, and — since no role can be wrong for them — an account disabled while holding a live cookie as case 2 (it is treated as no session).

Extra carried-over cases for the account actions are in `docs/briefs/011-roles-and-users.md`.
