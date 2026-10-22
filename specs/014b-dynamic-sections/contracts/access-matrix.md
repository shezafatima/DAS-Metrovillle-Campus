# Contract: Access Matrix changes (014b)

The outcome rules are unchanged from 011/014. Pages: a login redirect with no session, and `/admin?denied=1` (logged `access_denied`) without the permission. Actions: `unauthorized` / `forbidden`, with no data and `access_denied` logged. Every file below MUST be in `EXPECTED` in `src/test/access-inventory.test.ts`, and the rows are added to `specs/011-roles-and-users/contracts/access-matrix.md`.

## Pages

| Path | File | Access | Change |
|---|---|---|---|
| `/admin/settings/academics` | `settings/academics/page.tsx` | `pages` | **new** (Syllabi, Examination panels) |
| `/admin/settings/admission` | `settings/admission/page.tsx` | `settings_or_pages` | unchanged access; gains the Class Levels panel; Classes panel becomes a checklist |
| `/admin/settings/site-wide` | `settings/site-wide/page.tsx` | `settings` | unchanged access; gains the Portal links panel |

## Server Actions

| File | Action | Access |
|---|---|---|
| `settings/actions.ts` | `saveSettingsPanel` (+ `portal-links`) | `settings` |
| | `savePagesPanel` (+ `syllabi`, `examination`, `class-levels`) | `pages` |
| | `confirmSettingsPanel` **new** | `settings` |
| | `confirmPagesPanel` **new** | `pages` |

`EXPECTED` entry for `settings/actions.ts`: `{ kind: "action", access: "settings", perAccess: { settings: 2, pages: 2 } }`.

## Public routes (no access check; listed for completeness)

| Route | Behaviour |
|---|---|
| `/portal`, `/portal/:path*` | 308 permanent redirect to `/` (`next.config.ts`); the `(public)/portal/[slug]` page is deleted |
| `/academics/syllabi` | → `/academics#syllabi` |
| `/academics/examinations` | → `/academics#examination` |
| `/admission/class-levels` | → `/admission#class-levels` (derived from `pageSections.admission`) |

## Cases (Constitution XI)

There are three cases for every page and action above: no session, missing permission, correct permission. In addition:

| Case | Expected |
|---|---|
| Settings-only user opens `/admin/settings/academics` | `/admin?denied=1`, logged; no Academics tab in the bar |
| Pages-only user opens `/admin/settings/academics` | page; both panels editable |
| Pages-only user opens `/admin/settings/site-wide` | `/admin?denied=1` (unchanged) |
| Settings-only user opens `/admin/settings/admission` | page; window and classes checklist editable; messages and Class Levels read-only |
| Pages-only user opens `/admin/settings/admission` | page; messages and Class Levels editable; window and checklist read-only |
| Pages-only `savePagesPanel({ panel: "portal-links" })` | `forbidden`, logged, links unchanged |
| Settings-only `saveSettingsPanel({ panel: "class-levels" })` | `forbidden`, logged, table unchanged |
| Settings-only `savePagesPanel(...)` any panel | `forbidden` (step 2) |
| Pages-only `confirmPagesPanel({ panel: "syllabi" })` | success |
| Pages-only `confirmPagesPanel({ panel: "portal-links" })` | `forbidden`, logged, flag unchanged |
| Settings-only `confirmSettingsPanel({ panel: "portal-links" })` | success |
| No session, any confirm action | `unauthorized`, flag unchanged |
| Read-only panel with pending content | notice shown, no "Mark as confirmed" button |

**Where the rows are tested**:
- E2E: `e2e/admin-roles-access-matrix.spec.ts` gains the Academics page rows.
- Unit: the action rows live in `src/app/admin/(dashboard)/settings/actions.test.ts`.
- Inventory: `src/test/access-inventory.test.ts`.
