# Research — 012 Careers

All Technical Context unknowns resolved below. Each entry: **Decision**, **Rationale**, **Alternatives considered**.

## §1 Private document store: Vercel Blob, private store

- **Decision**: **Vercel Blob with a private store** (owner's choice, 2026-10-02; this supersedes an earlier vendor-neutral S3 draft). Package `@vercel/blob` ^2.8 (private storage needs ≥ 2.3). It is used only behind a small `DocumentStore` interface (`put`, `get`, `delete`, `exists`) in `src/lib/documents/`:
  - `put(key, bytes, { access: "private", contentType: "application/pdf", addRandomSuffix: false, allowOverwrite: false })`
  - `get(key, { access: "private" })` → `{ statusCode, stream, blob }` or `null`
  - `del(key)` and `head(key)`

  Authentication: OIDC (`BLOB_STORE_ID` + `VERCEL_OIDC_TOKEN`, added automatically when the store is connected to the Vercel project), with `BLOB_READ_WRITE_TOKEN` as the fallback outside Vercel (local dev against the real store, scripts).
- **Rationale**: Private stores need authentication for every read and write. A blob's URL (`https://<store>.private.blob.vercel-storage.com/<pathname>`) is not publicly accessible, which is ADR-0004's "private by default". Vercel's documented pattern for serving private blobs is exactly ADR-0004's: a route that authenticates, calls `get()` and streams. It is the simplest fit if the site is hosted on Vercel.
- **Consequence: 4 MB CV limit.** Vercel Functions reject request bodies over 4.5 MB. A server upload (§4) therefore caps the CV at **4 MiB** (4,194,304 bytes), leaving room for the other fields and multipart overhead. The owner chose this over browser-direct client uploads (2026-10-02), recorded in spec Clarifications.
- **Alternatives considered**: Cloudflare R2 / AWS S3 via the S3 API (vendor-neutral, no 4.5 MB host limit, but a second vendor account and not chosen); Vercel Blob **client uploads** to keep 5 MB (three-step flow, an abandoned upload holds the email and phone for up to 1 h, and E2E needs a real store or an emulator; rejected by the owner); GridFS or filesystem (rejected by ADR-0004 C/D).
- **Constitution II**: the constitution already names "a private object store for documents" in the fixed stack; `@vercel/blob` is the client for it, not a new provider category. `docs/architecture.md` gets the wiring, closing ADR-0004's tracked TODO. Hosting on Vercel is implied but not decided here.

## §2 Local/test driver

- **Decision**: A second `DocumentStore` implementation, `local`, writes to a directory outside `public/` (default `.data/documents/`, gitignored). Chosen by `DOCUMENT_STORE_DRIVER=local|vercel-blob`. `getEnv()` **refuses `local` when `NODE_ENV === "production"`**. Playwright's dev server runs with `local` pointed at `.data/e2e-documents/`; Vitest uses an in-memory fake injected through the same interface.
- **Rationale**: E2E must prove "delete removes the file" and "store unavailable keeps details" without cloud credentials on every machine; Next never serves files outside `public/`, so local files have no URL. The production guard keeps a misconfigured deploy from writing CVs to an ephemeral disk (ADR-0004 D).
- **Alternatives considered**: a shared real Vercel Blob test store for E2E (needs a token on every machine and leaves test files in a real store); mocking the SDK in E2E (doesn't exercise the real route).

## §3 Download: byte proxy through the app, not signed URLs

- **Decision**: `GET /api/admin/careers/[id]/cv` checks access, loads the application, streams the object from the store, and returns it with `Content-Type: application/pdf`, `Content-Disposition: attachment; filename="<generated>.pdf"`, `X-Content-Type-Options: nosniff`, `Cache-Control: private, no-store`. No signed URL is ever minted.
- **Rationale**: ADR-0004 allowed either. Proxying means the object location never reaches a browser (so it can't be copied or leak through logs or Referer), the attachment disposition is guaranteed, and the same route works with the local driver. At ≤4 MB per file and low volume, the server cost ADR-0004 accepted is negligible.
- **Alternatives considered**: Vercel Blob presigned GET URLs (expose the store hostname and pathname to the browser, and the disposition is not under our control).
- **Caching**: CV keys are unique and never overwritten, so `get()` uses the default CDN-backed read. The app's response sets `Cache-Control: private, no-store` (Vercel's advice for personal data). No `s-maxage` is set, and auth is never left to middleware (Vercel's own warning).

## §4 Upload transport: one multipart POST to a Route Handler

- **Decision**: The form posts `multipart/form-data` (fields + `cv` file + honeypot) to `POST /api/public/careers`, a Route Handler. Server Actions are not used (their 1 MB default body cap would need raising globally). `src/proxy.ts` matches only `/admin/*`, so its 10 MB body buffering doesn't apply. The whole request stays under Vercel's 4.5 MB function body limit (§1). The handler rejects `Content-Length > 4 MiB + 64 KiB` with 413 before reading, and reads the body through a capped reader (also covering chunked requests with no length) before `formData()`.
- **Rationale**: Matches the 008 public-route pattern (size guard → parse → honeypot → limit → validate → write); one request means typed details and file succeed or fail together.
- **Alternatives considered**: Vercel Blob client uploads (rejected in §1); a Server Action with a raised `bodySizeLimit` (global setting, affects every action).

## §5 Verifying a PDF by content

- **Decision**: Server check (authoritative): size 1 byte–4 MiB (4,194,304 bytes); the first 5 bytes are `%PDF-`; `%%EOF` appears in the last 1,024 bytes. The declared MIME type and filename are ignored (but the client precheck uses them for a fast message). Shared constants in `src/lib/careers/cv-limits.ts`, client precheck `precheckCv(file)` mirroring `src/lib/uploads/image-limits.ts`.
- **Rationale**: Constitution V requires checking actual content. The header check catches every renamed non-PDF (PNG, DOCX/ZIP `PK`, EXE `MZ`); the trailer check catches truncated or polyglot junk without adding a PDF-parsing dependency. CVs are never rendered by the app, so deeper parsing buys no safety.
- **Alternatives considered**: `pdf-lib`/`pdfjs` parsing (new dependency, larger attack surface in the server); `file-type` package (new dependency for a 5-byte check).

## §6 Write order: insert first (pending), then store the file

- **Decision**: (1) Validate everything. (2) Generate the storage key. (3) Insert the application with `cv.storedAt: null` (pending); steps (1)–(3) run while holding the per-identity locks of ADR-0008, and a within-window match means a 409 refusal **before anything touches the store**. (4) `put` the file. (5) Set `cv.storedAt = now`. If (4) or (5) fails, hard-delete the just-inserted pending document (compensation) and return 503 `store_unavailable`. Admin lists, counts, export and notifications only show documents with `cv.storedAt != null`. The sweep (§9) removes pending documents older than 1 hour, along with any object at their key.
- **Rationale**: A refusal leaves no file by construction, so refused attempts cost no store write. A crash between (3) and (5) leaves at most a pending record that blocks reapplying for ≤1 hour and is then cleaned up.
- **Alternatives considered**: Put first, then insert, deleting the object on a duplicate (every duplicate costs a write and a delete, and a crash orphans an unreferenced object nothing points to); transactions (Atlas Flex supports them, but they span only the database, not the store, so they don't solve the cross-system problem).

## §7 Reapply window and race prevention (ADR-0008; supersedes the ADR-0006 unique indexes)

- **Decision**: No unique index on email or phone. Non-unique `{ email: 1, createdAt: -1 }` and `{ phone: 1, createdAt: -1 }` serve the window lookup. `CAREERS_REAPPLY_WINDOW_DAYS = 30` (`src/lib/careers/rules.ts`), counted in Pakistan calendar days. Concurrency: per-identity locks in `careerApplicationLocks` (hashed `_id`, owner, 30 s lease, TTL index), acquired in sorted order via a conditional upsert whose `E11000` means "held"; retry every 200 ms for up to 2 s, then 503. The window check and the PENDING insert happen inside the locks, which are released in `finally`. DB tests: same email → 409 with date; same phone → 409; concurrent same-email and same-phone (10 parallel calls) → exactly one; soft-deleted → not blocking; backdated 30 days → accepted; an expired lease left by a crash is taken over; email and phone matching different applications → the later date wins.
- **Rationale**: A unique index can't express a time window. The locks make the check-then-insert safe because their exclusivity is a database unique key.
- **Alternatives considered**: see ADR-0008 (aging partial index, claim documents, transactions, bare check).

## §8 Within-window refusal response

- **Decision**: `409 { error: "already_applied", reapplyFrom: "YYYY-MM-DD" }` (PKT date, from the latest blocking application), identical whichever field matched, no stored data. Message: "You applied recently. You can apply again from {d MMMM yyyy}." Typed fields and the selected file stay in the form.
- **Rationale**: FR-013 and ADR-0008. Showing the date reveals that a recent application exists for the typed email or phone; the owner accepted this trade and it is flagged. Per-IP limits (§10) keep probing slow.

## §9 Retention and clean-up sweep

- **Decision**: `CAREERS_RETENTION_MONTHS` (optional env, integer 1–120, default 12). `sweepCareerApplications(now)` in `src/lib/careers/retention.ts`: for each application with `createdAt < now − retention` (live or soft-deleted) → delete its object (ignoring "not found") → hard-delete the document; for soft-deleted documents whose `cv.removedAt` is null → retry deleting the object; for pending documents older than 1 hour → delete object if present, hard-delete document. It runs (a) from `after()` (Next `next/server`) on the admin Applications page render and on each successful public submission, throttled to once per hour through the existing `throttle` collection key `sweep:careers`, and (b) by `npm run sweep:careers` for an operator or host cron.
- **Rationale**: Hosting (and so a scheduler) is undecided; an opportunistic hourly sweep makes deletion automatic without new infrastructure, and the script gives a cron-ready entry point once hosting exists. Removing *soft-deleted* records after the period too keeps the site from holding personal data indefinitely (Constitution V).
- **Alternatives considered**: MongoDB TTL index (would delete documents but can't delete the stored objects, so CVs would be orphaned); host cron only (no host yet).

## §10 Rate limits

- **Decision**: Reuse `protectPublicForm` with its own budget `"careers"` (default 5 per 10 min per IP), then a second `checkRateLimit` key `form:careers-upload:ip:<ip>` at **10 per 24 h**, counted for every request that carries a file part, before any validation or store write. Both refusals → 429 with `Retry-After`.
- **Rationale**: FR-022/FR-032: the upload budget caps how fast one visitor can push bytes at the store even within the submission budget's resets (5 per 10 min would allow 720 uploads a day; 10 per day bounds a single IP to ≤40 MB per day). Same IP extraction as other forms (002-owned `X-Forwarded-For` follow-up unchanged).

## §11 Download filename

- **Decision**: `cv-<ascii-slug of name, max 40 chars, or "applicant" if empty>-<YYYY-MM-DD applied, PKT>.pdf`. Never the uploaded filename. The original filename is **not stored** at all.
- **Rationale**: FR-018 + spec assumption. Urdu-only names slug to empty → "applicant". Not storing the original name removes the field the "unguessable" test would otherwise have to consider.

## §12 Storage key

- **Decision**: `cv/<base64url(crypto.randomBytes(32))>.pdf` (256 random bits), generated server-side, stored only in `cv.key`, never sent to any browser (admin DTOs omit it). Test: for an application, the key contains none of `_id`, name, email, phone digits, qualification or applied date, and two applications with identical data get different keys.

## §13 Page design source

- **Decision**: No reference capture of a careers page exists (`screenshots/` has none); if one is found on das.edu.pk during the token pass it is captured and becomes the source, and any conflict with this layout is flagged (Constitution I). `/careers` reuses the Contact page structure already extracted: `PageBanner` (title "Careers", breadcrumb) + an intro block + a form band using the existing `--*-contact-form-*` / `signup-input` tokens, with fields on one 2-column grid at ≥768px (name | email, phone | qualification, CV full width, consent full width, button full width) and a single column below. Any new value (file-input row, checkbox) is extracted from the reference's own form controls or mapped to existing tokens. Nothing is approximated inline (Constitution VII).
- **Rationale**: Brief: "the reference's form styling, fields aligned in a single consistent grid"; Constitution I says conflicts are flagged, and there is no conflicting reference page.

## §14 Notifications and overview (009) move from signups to applications

- **Decision**: `NotificationItem.kind` `"signup"` → `"application"` (href `/admin/careers/<id>`); summary `signupsNew` → `applicationsNew`; "new" = `createdAt > careersLastOpenedAt` (an application is never updated, so there's no repeat bump). `AdminNotificationState` gains `careersLastOpenedAt`, read with an update-pipeline upsert `$ifNull: ["$careersLastOpenedAt", now]` so existing admins default to *now* (ADR-0002's no-flood rule) and `signupsLastOpenedAt` is `$unset` by the retire script. `POST /api/admin/careers/opened` replaces `/api/admin/signups/opened`. Overview "Signups" card → "Applications".

## §15 Retiring signup (004)

- **Decision**: Delete every signup-only module, route, page, component, content file, test and E2E spec (inventory in plan.md); keep the shared helpers that 008 lifted (`phone.ts`, `admin-datetime.ts`, `route-errors.ts`, `field-errors.ts`, `admin-list-filters.tsx`, `admin-delete-dialog.tsx`, `admin-pagination.tsx`) and the `signup-*` design tokens and `.signup-honeypot` class (the contact form uses them). Move `csvField`/BOM/CRLF from `src/lib/signup/csv.ts` to shared `src/lib/csv.ts` first. `npm run retire:signups` drops the `signups` collection and unsets `signupsLastOpenedAt` (release step, idempotent). ADR-0001 is marked "Superseded" (its collection no longer exists; its boundary note for messages is still cited by ADR-0003, now superseded by ADR-0008). Full scope (public and admin side, and the collection) confirmed by the owner on 2026-10-02; back up `signups` before the release step.
- **Rationale**: FR-033/034; no data migration (test data only).

## §16 Retention, delete rights and permission label

- Delete is `requireAdminAccess("main_admin")` (spec Q2). `PERMISSION_LABELS.careers` → "Careers (Applications)". Sidebar entry "Applications" → `/admin/careers`, access `careers`.

## §17 Testing approach

- **Vitest (pure)**: schema (Urdu, phone, consent, lengths), `verifyPdf` (real PDF, PNG renamed, ZIP renamed, empty, 4 MiB exact accepted, 4 MiB + 1 rejected, missing `%%EOF`), key generator (unguessable), download filename, CSV.
- **Vitest + DB (`describeWithDb`)**: mutations (insert / within-window email / within-window phone / concurrent / reapply after delete / reapply after 30 days / stale-lock takeover /compensation on store failure using a failing fake store), queries (search, pagination, pending hidden), retention sweep, public route matrix (413, honeypot, 429 submit, 429 upload, 400 fields, 400 bad PDF, 409, 503, 200), and the **three access cases for every admin route** in `access-matrix.test.ts` (delete: no session / content manager with `careers` / main admin).
- **Playwright**: `careers-public.spec.ts` (`forms` project: apply, field errors, non-PDF, oversized, repeat email and repeat phone refused with the reapply date, reapply after a backdated 30 days, details kept on 503 via a test-only store toggle, four widths), `admin-careers.spec.ts` (`admin` project: list/search/detail/download/export/delete → file gone → reapply works; content manager sees no delete), `admin-careers-access.spec.ts` (pages × three cases), plus updates to `admin-roles-access-matrix.spec.ts` and notifications specs. Fixtures: `e2e/fixtures/cv-valid.pdf` (tiny real PDF), `cv-renamed.pdf` (PNG bytes); the oversized file is generated in-test.
- **Store unavailable in E2E**: the `local` driver (refused in production) throws `DocumentStoreUnavailableError` while a sentinel file `<dir>/.unavailable` exists; the spec creates and removes it. Rejected: an env-var failure switch read by shared code (a runtime toggle that could reach production).
