# Contract: Access matrix delta (011)

Add to `specs/011-roles-and-users/contracts/access-matrix.md`, `src/test/access-inventory.test.ts` (EXPECTED), `src/app/api/admin/access-matrix.test.ts` (routes) and `e2e/admin-roles-access-matrix.spec.ts` (pages).

## Pages: new inventory kind `page404`

| File | Access | Content manager gets |
|---|---|---|
| `admin/(dashboard)/registrations/page.tsx` | main_admin | 404 |
| `admin/(dashboard)/registrations/[id]/page.tsx` | main_admin | 404 |
| `admin/(dashboard)/registrations/deleted/page.tsx` | main_admin | 404 |

Inventory check for `page404`: exactly one `await requireAdminPageOr404("main_admin")` and no `requireAdminPage(`.

## Routes

| Route | Access | Case 2 (content manager with **every** permission) |
|---|---|---|
| `PATCH /api/admin/registrations/[id]` | main_admin | 403, status unchanged |
| `DELETE /api/admin/registrations/[id]` | main_admin | 403, not deleted |
| `POST /api/admin/registrations/[id]/restore` | main_admin | 403, still deleted |
| `GET /api/admin/registrations/export` | main_admin | 403, no export record |
| `POST /api/admin/registrations/opened` | main_admin | 403 |
| `POST /api/public/registrations` | public | n/a (inventory `public`) |

Case 3 (main admin) uses an unknown id where the route takes one, so it ends in 404 rather than touching data. The export ends in 200.

## Notifications and nav (presentation plus data)

| Check | Content manager (every permission) | Main admin |
|---|---|---|
| Sidebar "Registrations" item | absent | present, with badge |
| `GET /api/admin/notifications` → `registrationsNew` | 0 | count |
| … → items with `kind: "registration"` | none | present |
| Overview Registrations card | absent | present |
