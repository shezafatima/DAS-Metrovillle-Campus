# Contract — Admin careers pages and routes

All under the 011 DAL. Pages call `requireAdminPage(access)` once; routes call `requireAdminAccess(access)` once per handler. Refusals: page → login redirect or `/admin?denied=1`; route → **401** `{ error: "unauthorized" }` / **403** `{ error: "forbidden" }`, never data.

| Entry point | Access | Purpose |
|---|---|---|
| page `/admin/careers` | `careers` | list (search `q`, `page`), export link, `MarkCareersOpened` |
| page `/admin/careers/[id]` | `careers` | detail + "Download CV" link; delete button rendered only for the main admin |
| `GET /api/admin/careers/[id]/cv` | `careers` | CV download |
| `DELETE /api/admin/careers/[id]` | `main_admin` | soft delete + remove the file |
| `GET /api/admin/careers/export` | `careers` | filtered CSV |
| `POST /api/admin/careers/opened` | `careers` | advance `careersLastOpenedAt` (009) |

## List and detail DTO (`CareerApplicationRow`)

```ts
{
  id: string;
  name: string;
  email: string;
  phone: string;        // E.164, for tel: href
  phoneDisplay: string; // 03XXXXXXXXX
  qualification: string;
  appliedAt: string;    // ISO
}
```

No `cv.key`, size or other timestamps. Only ACTIVE applications (stored, not deleted). Newest first (`createdAt` desc), `ADMIN_PAGE_SIZE` per page, `Paged<T>`. Search `q` matches name or email (case-insensitive literal substring, works for Urdu) or phone digits (`phoneSearchDigits`), as in 004/008.

## `GET /api/admin/careers/[id]/cv`

- Invalid ObjectId, unknown, pending or deleted → **404** `{ error: "not_found" }`.
- Object missing in the store → **404** (logged `career_cv_missing`, id only).
- Store unavailable → **503** `{ error: "unavailable" }`.
- **200**: body = the PDF bytes (streamed). Headers:
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="cv-<slug>-<YYYY-MM-DD>.pdf"`
  - `X-Content-Type-Options: nosniff`
  - `Content-Security-Policy: sandbox` (defence in depth if a browser ever renders it)
  - `Cache-Control: private, no-store`
- The admin UI uses a plain `<a href download>`. No `<iframe>`, `<embed>`, `<object>` or `<img>` ever points at this route (unit test on the detail component).

## `DELETE /api/admin/careers/[id]`

- Not main admin → 401/403 (a content manager **with** `careers` gets 403).
- Unknown or already deleted → **404**.
- **200** `{ id, deleted: true }`: `deletedAt` set (the application stops counting toward the 30-day window, ADR-0008), then the object is deleted and `cv.removedAt` set. If the object delete fails, the record stays deleted, the failure is logged, the sweep retries, and the response is still 200 (spec edge case).
- UI: `AdminConfirmDeleteDialog` → DELETE → toast → navigate to `/admin/careers` → `refreshNow()`.

## `GET /api/admin/careers/export`

Query `q` (as the list). **200** `text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="applications-<YYYY-MM-DD>.csv"`. UTF-8 BOM, CRLF, RFC 4180 quoting, formula guard (shared `src/lib/csv.ts`). Columns: `Name, Email, Phone, Qualification, Applied`. Every matching ACTIVE row, unpaginated, no file data. No matches → header row only.

## `POST /api/admin/careers/opened`

**200** `{ openedAt }`. Same shape as the removed `/api/admin/signups/opened`.

## Notifications (009) contract changes

- `NotificationsSummary.signupsNew` → `applicationsNew`.
- `NotificationItem.kind` `"signup"` → `"application"`; title = name, description = qualification, timestamp = `createdAt`, href = `/admin/careers/<id>`.
- Sidebar badge on `/admin/careers`; Overview card "Applications" (count of ACTIVE, highlight = new).
