# Contract: Public signup endpoint

**Feature**: 004-signup | **Namespace**: `/api/public/*` (no auth) per `docs/architecture.md`

## `POST /api/public/signups`

Accepts one lead-capture submission from the signup section. Protected
by the 002 public-form protection (honeypot + per-IP rate limit).

### Request

`Content-Type: application/json`

```json
{
  "name": "  Ali   Khan ",
  "email": " Ali@Example.COM ",
  "phone": "0300-1234567",
  "source": "home",
  "website_url": ""
}
```

| Field | Rules (after trimming) |
|---|---|
| `name` | required; internal runs of whitespace collapsed; 1–100 chars; any script |
| `email` | required; lower-cased; valid address; ≤ 254 chars |
| `phone` | required; Pakistani mobile in any of `03XXXXXXXXX`, `0300-XXXXXXX`, `+92 3XX XXXXXXX`, `92 3XX XXXXXXX` (spaces/hyphens/dots/parens ignored); normalised to `+923XXXXXXXXX` |
| `source` | required; one of `"home"`, `"resources"` |
| `website_url` | honeypot — must be absent or empty for a genuine submission; never rendered visibly |

### Responses

All responses: `Cache-Control: no-store`.

| Status | Body | When |
|---|---|---|
| `200` | `{ "ok": true }` | Stored (created, updated or restored) — **identical** for every outcome. Also returned, unchanged, when the honeypot is filled (nothing stored). |
| `400` | `{ "error": "validation", "fields": { "name"?: string, "email"?: string, "phone"?: string, "source"?: string } }` | One or more fields invalid; each message is the one the client shows next to the field. Also for a non-JSON or non-object body (`fields` empty). |
| `429` | `{ "error": "too_many_requests" }` + `Retry-After: <seconds>` | More than 5 submissions from this source IP in 10 minutes (002 default). |
| `503` | `{ "error": "unavailable" }` | Database unreachable or unexpected failure. No details leak. |

Order of evaluation: honeypot → rate limit → validation → upsert. A
honeypot submission returns **before** the rate limiter runs
(`protectPublicForm` checks the trap first), so it neither stores
anything nor consumes a rate-limit slot.

### Invariants (tested)

- Two requests with `Ali@Example.com` and `ali@example.com` produce one
  document and two identical `200` bodies.
- `firstSignupAt` is unchanged by the second request; `lastSignupAt`
  advances; `sources` gains the new page without duplicates.
- A request for a soft-deleted email restores the document
  (`deletedAt: null`) and returns the same `200`.
- Ten concurrent first-time requests for one email leave one document.
- With `website_url: "x"`, status is `200`, body is `{ "ok": true }`,
  and no document exists afterwards.
- The sixth request within the window from one IP returns `429` with
  `Retry-After`.

### Client behaviour (SignupForm)

- Runs `signupInputSchema` locally first; only sends when valid.
- `200` → success state: thank-you text replaces the form, fields
  cleared, a "Sign up someone else" control returns to the empty form.
- `400` → field messages from `fields`; typed values kept.
- `429` → "Please try again shortly." banner; typed values kept.
- `503` / network error → "Something went wrong — please try again."
  banner; typed values kept.
