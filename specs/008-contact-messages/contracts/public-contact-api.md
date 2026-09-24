# Contract: Public contact endpoint

**Feature**: 008-contact-messages | **Namespace**: `/api/public/*` (no auth) per `docs/architecture.md`

## `POST /api/public/messages`

Accepts one contact-form submission. Protected by the 002 public-form
protection (honeypot + per-IP rate limit) under the form name
`"contact"` — its own budget, separate from `"signup"`. **Every valid
submission creates a new record**; nothing is looked up, merged or
restored by email (research §1).

### Request

`Content-Type: application/json`, body ≤ 64 KiB (`Content-Length`).

```json
{
  "name": "  Ali   Khan ",
  "email": " Ali@Example.COM ",
  "phone": "",
  "subject": "Admission for class 3",
  "message": "Assalam o Alaikum,\r\n\r\nWhat are the fees for class 3?",
  "website_url": ""
}
```

| Field | Rules (after trimming) |
|---|---|
| `name` | required; inner whitespace collapsed; 1–100 chars; any script |
| `email` | required; lower-cased; valid address; ≤ 254 chars |
| `phone` | optional — absent/empty/whitespace → stored `null`; otherwise a Pakistani mobile in `03XXXXXXXXX`, `0300-XXXXXXX`, `+92 3XX XXXXXXX`, `92 3XX XXXXXXX` (spaces/hyphens/dots/parens ignored), stored `+923XXXXXXXXX` |
| `subject` | required; inner whitespace collapsed; 1–150 chars; any script |
| `message` | required; CRLF/CR → LF; 1–5,000 chars; inner line breaks kept; any script; stored as `body` |
| `website_url` | honeypot — absent or empty for a genuine submission |

### Responses

All responses: `Cache-Control: no-store`.

| Status | Body | When |
|---|---|---|
| `200` | `{ "ok": true }` | Stored as a new message with status `new`. Also returned, unchanged, when the honeypot is filled (nothing stored). |
| `400` | `{ "error": "validation", "fields": { "name"?, "email"?, "phone"?, "subject"?, "message"? } }` | One or more fields invalid (messages are the ones shown next to each field, including the limit for over-length values). Also for a non-JSON / non-object body (`fields` empty). |
| `413` | `{ "error": "too_large" }` | `Content-Length` above 64 KiB (checked before parsing). |
| `429` | `{ "error": "too_many_requests" }` + `Retry-After` | More than 5 submissions from this source in 10 minutes (002 default). |
| `503` | `{ "error": "unavailable" }` | Database unreachable / unexpected failure; no details leak. |

Order: size guard → parse → honeypot → rate limit → validation →
insert. A honeypot submission returns before the rate limiter runs.

### Invariants (tested)

- Two valid requests from `Ali@Example.com` and `ali@example.com` →
  **two** documents, both `status: "new"`, both `200 { ok: true }`.
- An empty `phone` stores `null`; `0300-1234567` stores `+923001234567`.
- `message` of 5,000 chars → 200; 5,001 → 400 with
  `fields.message = "Message must be 5,000 characters or fewer."`.
- `website_url: "x"` → 200 `{ ok: true }`, no document.
- Sixth request from one source within the window → 429 with
  `Retry-After`; a signup submission from the same source in between
  does not count toward it.
- HTML in any field is stored verbatim (escaping is a rendering
  concern — admin contract "Safe display").

## Client (`ContactForm`)

- Validates with the same `messageInputSchema` before sending; sends
  the visitor's raw typed values (server normalises).
- `200` → thank-you panel (`role="status"`), all fields cleared,
  "Send another message" button restores the empty form.
- `400` → field messages from `fields`, values kept.
- `429` → banner "Too many messages — please try again shortly.",
  values kept.
- `413` / `503` / network error → banner "We couldn't send your
  message right now. Please try again in a moment.", values kept.
- Message field shows `n / 5,000`; over the limit the counter and the
  field message use `--color-error`.
- Honeypot `website_url` rendered in the same hidden, `aria-hidden`,
  `tabIndex={-1}` wrapper as `SignupForm`.
