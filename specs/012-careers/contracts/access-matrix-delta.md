# Contract — Access matrix changes (011 `contracts/access-matrix.md`)

## Removed

| Entry | Access |
|---|---|
| `admin/(dashboard)/signups/page.tsx` | careers |
| `api/admin/signups/[id]/route.ts` | careers |
| `api/admin/signups/opened/route.ts` | careers |
| `api/admin/signups/export/route.ts` | careers |
| `api/public/signups/route.ts` | public |

## Added

| Entry | Access | No session / wrong / right |
|---|---|---|
| `admin/(dashboard)/careers/page.tsx` | careers | login redirect / CM without careers → `/admin?denied=1` / CM with careers → 200 |
| `admin/(dashboard)/careers/[id]/page.tsx` | careers | same |
| `api/admin/careers/[id]/cv/route.ts` | careers | 401 / 403 (CM without careers) / 200 attachment |
| `api/admin/careers/export/route.ts` | careers | 401 / 403 / 200 CSV |
| `api/admin/careers/opened/route.ts` | careers | 401 / 403 / 200 |
| `api/admin/careers/[id]/route.ts` (DELETE) | **main_admin** | 401 / 403 (**CM with careers**) / 200 (main admin) |

Updated in `src/test/access-inventory.test.ts` (EXPECTED), `src/app/api/admin/access-matrix.test.ts` (route cases) and `e2e/admin-roles-access-matrix.spec.ts` (page cases).

Also: `PERMISSION_LABELS.careers` = "Careers (Applications)"; `adminNavItems` "Signups" → `{ label: "Applications", href: "/admin/careers", access: "careers" }`; the sidebar icon and badge maps key on `/admin/careers`.
