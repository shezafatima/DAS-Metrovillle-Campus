# Contract — `POST /api/public/careers`

Public, no auth. Route Handler `src/app/api/public/careers/route.ts`, Node runtime.

## Request

`Content-Type: multipart/form-data`

| Part | Type | Notes |
|---|---|---|
| `name` | text | raw typed value |
| `email` | text | raw |
| `phone` | text | raw (`03…` or `+92…`) |
| `qualification` | text | raw |
| `consent` | text | `"true"` when ticked; anything else = not ticked |
| `cv` | file | exactly one (two or more `cv` parts → 400 `fields.cv` "Attach one PDF only."); filename and declared type are ignored by the server |
| `website_url` | text | honeypot (`HONEYPOT_FIELD`), must be empty |

## Processing order (each step can end the request)

1. `Content-Length` > 4,259,840 (4 MiB + 64 KiB) → **413** `{ error: "too_large" }`. The body is read through a capped reader. Going over the cap without a length → **413**.
2. Parse multipart. Failure → **400** `{ error: "validation", fields: {} }`.
3. Honeypot tripped → **200** `{ ok: true }` (nothing stored, no store call).
4. `protectPublicForm(request, { name: "careers" })`, 5 per 10 min per IP → **429** `{ error: "too_many_requests" }` + `Retry-After`.
5. If a `cv` part is present: `checkRateLimit({ key: "form:careers-upload:ip:<ip>", max: 10, windowSeconds: 86400 })` → **429** (same body) + `Retry-After`.
6. Validate fields with `careerApplicationFieldsSchema` and the file with `verifyPdfBytes`. Any failure → **400** `{ error: "validation", fields: { <field>: <message>, … } }`, where `cv` is the file field key. All field errors are returned together.
7. `createCareerApplication(...)` (write order in `document-store.md`):
   - under the per-identity locks (ADR-0008): a non-deleted (active or pending) application with the same email **or** phone made within `CAREERS_REAPPLY_WINDOW_DAYS` (30 PKT calendar days) → **409** `{ error: "already_applied", reapplyFrom: "YYYY-MM-DD" }` (date from the latest match). The body, status and headers are identical for either field. No store write happens.
   - lock still held after 2 s of retries, or the only matches are PENDING records older than 5 minutes (a crash-left upload the sweep will clear) → **503** `{ error: "try_again" }`.
   - store unavailable, or a failure after the insert → **503** `{ error: "store_unavailable" }` (pending document removed).
   - database unavailable → **503** `{ error: "unavailable" }`.
8. Success → **200** `{ ok: true }`, then the throttled retention sweep is scheduled with `after()`.

Every response: `Cache-Control: no-store`. No response ever contains an id, key, stored value or which field matched.

## Client behaviour (`CareersForm`)

| Response | UI |
|---|---|
| 200 | the form is replaced by the confirmation (`careersCopy.success`) |
| 400 | messages next to each field; values and selected file kept |
| 409 | form-level alert `careersCopy.errors.alreadyApplied(reapplyFrom)`, e.g. "You applied recently. You can apply again from 1 November 2026."; values and file kept |
| 413 | `cv` field message "Your CV must be 4 MB or smaller." |
| 429 | form-level alert `careersCopy.errors.rateLimited`; values and file kept |
| 503 (`store_unavailable`, `try_again`, `unavailable`) / network error | form-level alert `careersCopy.errors.tryAgain` ("We couldn't save your application just now. Please try again."); values and file kept |

The client runs the same schema and `precheckCv` before sending, so most errors never need a round trip. The selected `File` is held in component state, so a retry resends it without re-attaching.
