# Contract: Access Matrix changes (014)

The outcome rules are unchanged from 011. Pages: login redirect with no session, `/admin?denied=1` (logged `access_denied`) without the permission. Actions and routes: `unauthorized` / `forbidden` (401/403), no data, `access_denied` logged. Every file below MUST be in `EXPECTED` in `src/test/access-inventory.test.ts`.

New access value: `settings_or_pages` (granted by `settings` or `pages`; main admin always). Not a grantable key.

## Pages

| Path | File | Access | Change |
|---|---|---|---|
| `/admin/settings` | `settings/page.tsx` | `settings_or_pages` | was `settings`; redirects to `site-wide` if the user holds Settings, else `home` |
| `/admin/settings/site-wide` | `settings/site-wide/page.tsx` | `settings` | **new** |
| `/admin/settings/home` | `settings/home/page.tsx` | `pages` | **new** |
| `/admin/settings/admission` | `settings/admission/page.tsx` | `settings_or_pages` | was `settings`; now three panels |
| `/admin/settings/resources` | `settings/resources/page.tsx` | `pages` | **new** (album list) |
| `/admin/settings/resources/gallery/[albumId]` | `settings/resources/gallery/[albumId]/page.tsx` | `pages` | moved from `settings/gallery/[albumId]` |
| `/admin/settings/{contact,hero,stats,video,gallery}` | — | — | **removed**; permanent redirects in `next.config.ts` |
| `/admin/settings/{about,academics,careers}` | — | — | no file; not found |

## Server Actions

| File | Actions | Access |
|---|---|---|
| `settings/actions.ts` | `saveSettingsPanel` | `settings` |
| | `savePagesPanel` | `pages` |
| | (`saveSettingsGroup` removed) | |
| `settings/resources/gallery/actions.ts` (moved) | the nine album/photo actions | `pages` (was `settings`) |

`EXPECTED` entry for `settings/actions.ts`: `{ kind: "action", access: "settings", perAccess: { settings: 1, pages: 1 } }`.

## Route handler

| Route | Access |
|---|---|
| `POST /api/admin/settings/uploads/sign` | `pages` (was `settings`) |

## Sidebar

The Settings item's access becomes `settings_or_pages` (presentation only).

## Cases (Constitution XI)

For every page, action and route above: no session, missing permission, correct permission. In addition:

| Case | Expected |
|---|---|
| Pages-only user opens `/admin/settings/site-wide` | `/admin?denied=1`, logged |
| Settings-only user opens `/admin/settings/home` or `/resources` | `/admin?denied=1`, logged |
| Settings-only user opens `/admin/settings/admission` | page; window and classes editable, messages read-only |
| Pages-only user opens `/admin/settings/admission` | page; messages editable, window and classes read-only |
| User with neither opens any `/admin/settings/...` | `/admin?denied=1`; no Settings item in the sidebar |
| Pages-only `savePagesPanel({ panel: "admission-window" })` | `forbidden`, logged, unchanged |
| Pages-only `savePagesPanel({ panel: "admission-messages", data: { opensOn, closesOn, classes, announcement } })` | success; only the announcement and closed message stored; dates and classes unchanged |
| Settings-only `saveSettingsPanel({ panel: "admission-messages" })` | `forbidden`, logged |
| Settings-only gallery action or upload signer | `forbidden` |
| No session follows any old URL (the six URLs plus an album URL) | redirect, then `/admin/login?next=<destination path>`, for example `next=/admin/settings/home` |
| Signed-in user without the destination's permission follows an old URL | same as opening the destination: `/admin?denied=1`, `access_denied` logged |
| User with the permission follows an old URL | the destination tab with the panel in view |

E2E: `e2e/admin-roles-access-matrix.spec.ts` gains the page rows; action rows live in `settings/actions.test.ts` and the gallery actions test; the signer in `src/app/api/admin/access-matrix.test.ts`.
