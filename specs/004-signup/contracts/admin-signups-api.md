# Contract: Admin signup routes and pages

**Feature**: 004-signup | **Namespace**: `/api/admin/*` and `/admin/*` — session required (Constitution III)

Every handler below calls `requireAdminSession({ mode: "api" })` first
and returns `401 { "error": "unauthorized" }` (`Cache-Control:
no-store`) without a valid session. Every page calls
`requireAdminSession()` and redirects to `/admin/login?next=…`. Each
has an unauthorized-access test (Constitution VIII).

## Page: `GET /admin/signups`

Server Component. Reads search params, calls `listSignups`, renders
`SignupsTableFilters`, `SignupsTable`, `AdminPagination`, and the
Export link.

| Param | Type | Default | Notes |
|---|---|---|---|
| `q` | string | — | Trimmed; matches name, email or phone (phone query digit-normalised) |
| `source` | `home` \| `resources` \| `all` | `all` | Unknown values treated as `all` |
| `page` | positive integer | `1` | Out-of-range → last page clamps in the query |

Rows: Name (dir="auto", Urdu fallback font), Email (`mailto:`), Phone
(text `03…`, `href="tel:+92…"`), Pages (one badge per source), First
signup, Latest signup (both `dd MMM yyyy, HH:mm` PKT), Actions
(Delete). 20 per page, newest `lastSignupAt` first. Empty state when
`items` is empty.

Export link: `href="/api/admin/signups/export?q=<q>&source=<source>"`
with the `download` attribute, carrying the current filters.

## `DELETE /api/admin/signups/[id]`

Soft-deletes one record.

| Status | Body | When |
|---|---|---|
| `200` | `{ "id": "<id>", "deleted": true }` | Record was live and is now soft-deleted |
| `401` | `{ "error": "unauthorized" }` | No session |
| `404` | `{ "error": "not_found" }` | Unknown id, malformed id, or already deleted |
| `503` | `{ "error": "unavailable" }` | Database failure |

Client (`DeleteSignupDialog`): confirm → request → `200` toast
"Signup deleted" + `router.refresh()`; `404` toast "This signup is no
longer available" + refresh; other → toast "Service temporarily
unavailable".

## `GET /api/admin/signups/export?q=&source=`

Returns every record matching the same filter as the list (no
pagination) as CSV.

| Status | Headers / body | When |
|---|---|---|
| `200` | `Content-Type: text/csv; charset=utf-8`, `Content-Disposition: attachment; filename="signups-YYYY-MM-DD.csv"`, `Cache-Control: no-store`; body = UTF-8 BOM + header row + rows (CRLF) | Success (header row only when nothing matches) |
| `401` | `{ "error": "unauthorized" }` | No session |
| `503` | `{ "error": "unavailable" }` | Database failure |

CSV format (`src/lib/signup/csv.ts`):

```
﻿Name,Email,Phone,Pages,First signup,Latest signup\r\n
"Ali Khan","ali@example.com","03001234567","Home; Resources","22 Sep 2026, 14:05","22 Sep 2026, 15:40"\r\n
```

- Every field quoted; `"` inside a field doubled.
- A field starting with `=`, `+`, `-`, `@`, `\t` or `\r` is prefixed
  with `'` (formula-injection guard).
- Row order = list order (`lastSignupAt` desc).
- Urdu names are written as stored; the BOM makes Excel decode them.

## Overview card

`GET /admin` (existing page) calls `countSignups()` and passes the
value to the existing `StatCard title="Signups"`; the `SIGNUPS_COUNT`
constant and its `TODO(004-signup…)` reference are removed (the
`007-contact` messages TODO stays).

## Not provided (by design)

- `GET /api/admin/signups` JSON list — the page reads through
  `listSignups()` directly; no second consumer needs JSON yet
  (Constitution VII: don't build speculative endpoints). Adding one
  later is a thin handler over the same query module.
- `PUT`/`PATCH` — editing is out of scope.
- `POST …/restore` — restore happens only via re-signup.
