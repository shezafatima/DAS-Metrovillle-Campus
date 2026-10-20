# Contract: Public registration submission

`POST /api/public/registrations` · Node runtime · `Cache-Control: no-store` on every response.

## Request

`Content-Type: application/json`, body ≤ 64 KiB. The raw values are as typed; the server cleans and normalises them.

```json
{
  "studentName": "string",
  "fatherName": "string",
  "motherName": "string",
  "email": "string",
  "dateOfBirth": "YYYY-MM-DD",
  "fatherMobile": "string (may be empty)",
  "motherMobile": "string (may be empty)",
  "address": "string",
  "emergencyName": "string",
  "emergencyPhone": "string",
  "className": "string",
  "motherTongue": "urdu|english|sindhi|punjabi|pashto|balochi|saraiki|other",
  "motherTongueOther": "string (ignored unless other)",
  "vaccinated": "yes|no",
  "medicalHistory": "string (may be empty)",
  "referenceName": "string (may be empty)",
  "referenceClass": "string (may be empty)",
  "referenceRelation": "string (may be empty)",
  "remarks": "string (may be empty)",
  "consent": true,
  "website": "honeypot — must be empty"
}
```

Any submission date, status, reference or other unknown key is ignored (FR-003).

## Processing order

1. `content-length` > 64 KiB → **413**.
2. Body not a JSON object → **400** `{ error: "validation", fields: {} }`.
3. Honeypot filled → **200** `{ ok: true, reference: <random, never stored> }`.
4. Rate limit `form:registration:ip:<ip>` (5 / 10 min) exceeded → **429** with `Retry-After`, `{ error: "rate_limited" }`. If the limit or availability lookup fails → **503** `{ error: "unavailable" }` (logged as `registration_save_failed`, no fields).
5. `getRegistrationAvailability()` not open (window closed, or class list empty) → **403** `{ error: "closed", message: "Admissions are closed. Please check the Admission page for dates." }`.
6. `buildRegistrationSchema({ classes, today })` fails → **400** `{ error: "validation", fields: { <field>: <message> } }`. Field keys match the request keys; both-mobiles-empty sets `fatherMobile` and `motherMobile`; the reference group sets each empty reference key.
7. Insert (retry up to 5 times on a duplicate `reference`). Failure → log `registration_save_failed` (no form data) → **503** `{ error: "unavailable" }`.
8. `after(maybeSweepRegistrations)`.
9. **200** `{ ok: true, reference: "K7MQ2XRT" }`.

## Guarantees

- No response ever contains another registration's data, a count, or whether a duplicate exists.
- 403 / 400 / 429 / 503 never echo submitted values.
- A 403 is returned for a closed window even when the body is also invalid.

## Tests

`src/app/api/public/registrations/route.test.ts` (`describeWithDb`): every status above; the honeypot stores nothing; the window boundaries use a fixed `now`; a class removed between page load and submit → 400 on `className`; a forced duplicate reference → retried; a console spy shows no seeded value in any log line.
