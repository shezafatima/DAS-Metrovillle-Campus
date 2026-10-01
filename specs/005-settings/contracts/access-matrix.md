# Contract: Access Matrix additions (005)

Adds rows to the 011 matrix (`specs/011-roles-and-users/contracts/access-matrix.md`). Outcome rules are unchanged (pages: login redirect / `/admin?denied=1`; routes and actions: 401 `unauthorized` / 403 `forbidden`, `no-store`, no data, `access_denied` logged). Every row below MUST also be added to `EXPECTED` in `src/test/access-inventory.test.ts`.

## Pages (access `settings`, each calls `requireAdminPage("settings")`)

| Path | File |
|---|---|
| `/admin/settings` (redirects to `/admin/settings/contact`) | `admin/(dashboard)/settings/page.tsx` |
| `/admin/settings/contact` | `admin/(dashboard)/settings/contact/page.tsx` |
| `/admin/settings/hero` | `admin/(dashboard)/settings/hero/page.tsx` |
| `/admin/settings/stats` | `admin/(dashboard)/settings/stats/page.tsx` |
| `/admin/settings/video` | `admin/(dashboard)/settings/video/page.tsx` |
| `/admin/settings/gallery` | `admin/(dashboard)/settings/gallery/page.tsx` |

`settings/layout.tsx` (the group navigation) is not an access gate; each page checks for itself (Next guide "Layouts and auth checks").

## Route handler

| Method + path | Access |
|---|---|
| `POST /api/admin/settings/uploads/sign` | settings |

## Server Actions (`admin/(dashboard)/settings/actions.ts`, `"use server"`)

| Action | Access |
|---|---|
| `saveSettingsGroup` | settings |

## The three cases, per entry point (Constitution XI, brief "Acceptance")

| # | Case | Expected |
|---|---|---|
| 1 | No session | page → `/admin/login?next=…`; route → 401; action → `{ status: "error", error: "unauthorized" }` |
| 2 | Content manager without `settings` | page → `/admin?denied=1`; route → 403; action → `{ status: "error", error: "forbidden" }`; **nothing is read or written** |
| 3 | Main admin, or content manager with `settings` | page renders; route → 200; action proceeds to validation |

Where each is tested:

- Route: a new row in `src/app/api/admin/access-matrix.test.ts` (real sessions, real database).
- Action: `settings/actions.test.ts` runs cases 1–3 for `saveSettingsGroup` against each of the five group keys.
- Pages: new rows in `e2e/admin-roles-access-matrix.spec.ts`.
- Sidebar: Settings is already filtered by `canAccess` (011); presentation only.
