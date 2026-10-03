# Data Model — 012 Careers

## CareerApplication → collection `careerApplications`

Model `src/models/career-application.ts`, with `softDeletePlugin` (adds `deletedAt: Date | null`, default `null`, filtered out of normal reads).

| Field | Type | Rules |
|---|---|---|
| `_id` | ObjectId | generated |
| `name` | string | required, trimmed, inner spaces collapsed, 2–100 chars, Urdu allowed |
| `email` | string | required, trimmed + lower-cased, valid email, ≤254 |
| `phone` | string | required, Pakistani mobile normalised to E.164 `+923XXXXXXXXX` (shared `normalisePakistaniMobile`) |
| `qualification` | string | required, trimmed, inner spaces collapsed, 2–150 chars, free text, Urdu allowed |
| `consentAt` | Date | required, set by the server when consent was `true` (never trusted from the client) |
| `cv.key` | string | required, `cv/<base64url 32 random bytes>.pdf`; **never returned to any browser** |
| `cv.size` | number | bytes, 1 – 4,194,304 |
| `cv.storedAt` | Date \| null | `null` = pending (file not yet confirmed in the store) |
| `cv.removedAt` | Date \| null | set once the stored object is confirmed deleted |
| `createdAt` / `updatedAt` | Date | Mongoose timestamps; `createdAt` = the "applied date" |
| `deletedAt` | Date \| null | soft delete (plugin) |

Not stored on purpose: the uploaded filename, the declared MIME type, the visitor's IP.

### Indexes

| Index | Purpose |
|---|---|
| `{ email: 1, createdAt: -1 }` (**not unique**) | 30-day window lookup by email (ADR-0008) |
| `{ phone: 1, createdAt: -1 }` (**not unique**) | 30-day window lookup by phone (ADR-0008) |
| `{ createdAt: -1 }` | list newest first, retention sweep |
| `{ "cv.storedAt": 1, createdAt: 1 }` | pending clean-up |
| `deletedAt` (plugin) | default filter |

No unique index on email or phone: the same person may hold several applications over time (ADR-0008). The 30-day rule is enforced by the window check below, run only while holding the identity locks.

### Reapply window (ADR-0008)

- `CAREERS_REAPPLY_WINDOW_DAYS = 30` (`src/lib/careers/rules.ts`), the only place the number is written.
- Calendar days in Asia/Karachi: an application made on PKT date *D* blocks new submissions through *D + 29*; the person may apply again from 00:00 PKT on *D + 30* (`reapplyFrom`).
- **Blocking set:** non-deleted applications (ACTIVE or PENDING; the soft-delete plugin excludes DELETED) where `email = :email OR phone = :phone` and `createdAt >= startOfPktDay(now) − (CAREERS_REAPPLY_WINDOW_DAYS − 1) days`. If any exist, the submission is refused with `reapplyFrom` taken from the **latest** one, **except** when every match is PENDING and older than `STALE_PENDING_MS` (5 min, `rules.ts`): that is a crash-left upload, so the response is 503 `try_again` instead of a 30-day refusal (the sweep removes it within the hour).
- Soft-deleted applications never block, so a main-admin delete lets the person reapply at once.
- Reapplying after the window creates a **new, separate** application; the earlier one is kept unchanged (**client confirmation pending**). The admin list shows both, newest first.

### Visibility rule (admin)

Every admin read (list, detail, count, export, notifications) adds `"cv.storedAt": { $ne: null }` through one shared filter builder in `src/lib/careers/admin-queries.ts`. A pending application is never visible. The plugin already hides deleted ones.

### Lifecycle

```text
            insert (validated)           put file OK + storedAt set
 (none) ───────────────────────► PENDING ───────────────────────────► ACTIVE
                                    │  put fails / crash                 │  main admin deletes
                                    ▼                                    ▼
                         hard-deleted at once                  DELETED (soft): deletedAt set,
                         (or by the sweep after 1 h)           object deleted → cv.removedAt set
                                                               (retried by the sweep if it failed)
 ACTIVE or DELETED older than retention ──sweep──► object deleted (if any) ──► document hard-deleted
```

- PENDING and ACTIVE applications both count toward the 30-day window. DELETED ones never do.
- No transition ever modifies `name`, `email`, `phone`, `qualification` or `cv.key` after insert (no merge, no edit).

## CareerApplicationLock → collection `careerApplicationLocks` (ADR-0008)

Short-lived per-identity locks that serialise "window check + insert" for submissions sharing an email or a phone.

| Field | Type | Rules |
|---|---|---|
| `_id` | string | `"email:" + sha256(normalised email)` or `"phone:" + sha256(E.164 phone)`; hashed, so no personal data is stored |
| `owner` | string | random per request; only the owner can release |
| `expiresAt` | Date | lease = acquire time + 30 s; an expired lease may be taken over at once |

Index: TTL on `expiresAt` (`expireAfterSeconds: 0`), for garbage collection only; correctness never waits for the TTL monitor.

Protocol (per submission): acquire both keys in sorted `_id` order with `findOneAndUpdate({ _id, expiresAt: { $lte: now } }, { $set: { owner, expiresAt: now + 30 s } }, { upsert: true })`. `E11000` means held, so retry every 200 ms for up to 2 s, then 503 `try_again`. Holding both keys → window check → insert PENDING → release both (`deleteOne({ _id, owner })`) in `finally`. The critical section aborts with 503 past 10 s.

## Stored CV (object in the private document store)

| Property | Value |
|---|---|
| Key | `CareerApplication.cv.key` (random, 256 bits) |
| Content | the uploaded bytes, verified `%PDF-` header and `%%EOF` trailer, ≤4 MiB |
| Content-Type at rest | `application/pdf` |
| Access | Vercel Blob private store (`access: "private"`) / local dir outside `public/`; reachable only through `GET /api/admin/careers/[id]/cv` |
| Removed when | application soft-deleted (immediately), pending abandoned (≤1 h), or retention expiry |

## AdminNotificationState (009) — changed

| Field | Change |
|---|---|
| `careersLastOpenedAt` | **new**, `Date`; on first read defaults to *now* via update-pipeline upsert `$ifNull` (existing admin docs included) |
| `signupsLastOpenedAt` | **removed** from the schema; `$unset` by `npm run retire:signups` |

"New application" = ACTIVE, not deleted, `createdAt > careersLastOpenedAt`.

## Throttle keys (existing `throttle` collection)

| Key | Policy |
|---|---|
| `form:careers:ip:<ip>` | 5 per 10 min (submissions) |
| `form:careers-upload:ip:<ip>` | 10 per 24 h (requests carrying a file) |
| `sweep:careers` | `max: 1, windowSeconds: 3600`, so the opportunistic sweep runs at most hourly across processes |

## Removed

- Collection `signups` (dropped by `npm run retire:signups`; not migrated).
- Model `src/models/signup.ts`.

## Validation schema (shared client + server)

`src/lib/validation/career-application.ts`:

- `careerApplicationFieldsSchema`: `name`, `email`, `phone`, `qualification`, `consent: z.literal(true)` with field messages. Used by the form before submit and by the route on the parsed multipart fields.
- File rules live in `src/lib/careers/cv-limits.ts`: `CV_MAX_BYTES = 4 * 1024 * 1024`; `precheckCv(file)` (browser: type/extension hint, size, leading `%PDF-`); `verifyPdfBytes(bytes)` (server: size, header, trailer). Messages: "Choose your CV as a PDF file.", "Your CV must be a PDF file.", "Your CV must be 4 MB or smaller.", "Your CV file is empty."

Field messages (content file `src/content/careers.ts`):

| Field | Message |
|---|---|
| name | "Enter your full name." |
| email | "Enter a valid email address." |
| phone | "Enter a Pakistani mobile number, e.g. 03001234567." (same as other forms) |
| qualification | "Enter your highest qualification." |
| consent | "Please tick the box to agree before applying." |
