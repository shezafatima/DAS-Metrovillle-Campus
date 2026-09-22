# Contract: Admin news routes — News (003)

All routes below live under `/api/admin/*` and follow the shape set by
`specs/002-foundation/contracts/http-and-actions.md`: each handler calls
`requireAdminSession({ mode: "api" })` itself and answers
`401 { "error": "unauthorized" }` with `Cache-Control: no-store` when no
valid admin session exists. No route ever returns stack traces,
connection details or Cloudinary secrets.

Bodies are JSON. Dates are `YYYY-MM-DD` strings. `id` is the post's
ObjectId string.

## Common error envelope

| Status | Body | When |
|---|---|---|
| `400` | `{ "error": "validation", "fields": { "<field>": "<message>" } }` | schema failure, empty body text, reserved slug, bad cover image |
| `401` | `{ "error": "unauthorized" }` | no session |
| `404` | `{ "error": "not_found" }` | unknown or soft-deleted id |
| `409` | `{ "error": "validation", "fields": { "slug": "This address is already in use." } }` | hand-edited slug collides (create or update) |
| `502` | `{ "error": "upload_verification_failed" }` | Cloudinary could not confirm a changed cover image |
| `503` | `{ "error": "unavailable" }` | data store unreachable |

---

## `POST /api/admin/news` — create

Input: `newsPostInputSchema` (`title, slug?, bodyHtml, language, category, publishDate, status, coverImage`).

Behaviour: sanitise body → compute excerpt → if `slug` omitted, generate
from title and append `-2`, `-3`… until unique; if provided and taken →
`409`. Verify `coverImage` when present (research §3).

| Status | Body |
|---|---|
| `201` | `{ "id": "...", "slug": "annual-sports-day-2026" }` |

## `GET /api/admin/news/[id]` — read for editing

`200` → `AdminPost` DTO (data-model.md). The editor page itself reads
in-process via `admin-queries.ts` (research §8); this route exposes the
same read over HTTP for the 401 test suite and any future consumer.
`404` for unknown or deleted ids.

## `PUT /api/admin/news/[id]` — update

Same input as create; `slug` required here (the editor always sends the
current value). Changing `slug` re-checks uniqueness (`409` on
collision). `200 { "id", "slug" }`. Status may change in the same call
(the editor's single "Save & publish").

## `POST /api/admin/news/[id]/publish` and `.../unpublish`

No body. Sets `status` to `published` / `draft`. `200 { "id", "status" }`.
Idempotent: publishing an already-published post returns `200` unchanged.

## `DELETE /api/admin/news/[id]` — soft delete

Calls `NewsPost.softDeleteById(id)`. `200 { "id" }`. Deleting an
already-deleted or unknown id → `404`. The slug stays reserved.

## `POST /api/admin/uploads/sign` — Cloudinary signature

Input: `{ "kind": "news-cover" }` (the only kind in this feature).

`200`:

```json
{
  "cloudName": "…",
  "apiKey": "…",
  "timestamp": 1790000000,
  "signature": "…",
  "folder": "news/covers",
  "allowedFormats": "jpg,png,webp",
  "transformation": "c_limit,w_2400,h_2400",
  "maxBytes": 5242880
}
```

The browser POSTs multipart to
`https://api.cloudinary.com/v1_1/<cloudName>/image/upload` with `file`,
`api_key`, `timestamp`, `signature`, `folder`, `allowed_formats`,
`transformation`. The signature covers `folder`, `allowed_formats`,
`transformation` and `timestamp`, so the client cannot change them.
Signatures expire per Cloudinary's timestamp window (1 hour).

The API secret is never returned. `401` without a session.

---

## Cover-image verification (server, on create/update)

When `coverImage` is present and its `publicId` differs from the stored
one: `cloudinary.api.resource(publicId)` must return `bytes ≤ 5 MB`,
`format ∈ {jpg, jpeg, png, webp}` and `public_id` starting with
`news/covers/`; otherwise `400 { fields: { coverImage: "…" } }`. A
Cloudinary API failure (not a rejection) → `502` so the admin can retry
without losing the form.
