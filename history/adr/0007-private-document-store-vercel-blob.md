# ADR-0007: Private Document Store — Vercel Blob (Private), Server-Side Upload Capped at 4 MB, Proxied Download

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted
- **Date:** 2026-10-02
- **Feature:** 012-careers (first consumer; reusable for any later private document)
- **Completes:** [ADR-0004](0004-private-document-storage.md), which fixed the *behaviour* of private document storage (private by default, unguessable keys, session- and role-checked download as an attachment) and deliberately left the *vendor* and the upload/download wiring to 012's plan. This ADR fills those gaps. It does not change ADR-0004's rules.
- **Context:** 012-careers stores applicants' CVs (Constitution V: personal documents, never reachable by public URL, content-verified, downloadable only by a permitted admin). Planning first drafted a vendor-neutral S3 adapter (Cloudflare R2 recommended) because hosting was undecided. On 2026-10-02 the owner chose **Vercel Blob**. Vercel's documentation (checked 2026-10-02) states that private Blob stores need authentication for every read and write, that a private blob's URL is not publicly accessible, and that the recommended way to serve private blobs is a route that authenticates, calls `get()` and streams, which is exactly ADR-0004's pattern. The same documentation also states that **Vercel Functions reject request bodies over 4.5 MB**. The brief's 5 MB CV limit therefore cannot pass through a server route on Vercel. The two documented ways around that are browser-direct "client uploads" or a lower limit. The owner chose **a 4 MB limit** (spec Clarifications, 2026-10-02).

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

One integrated approach to private documents, with these components:

- **Store: Vercel Blob, private store.** `@vercel/blob` ^2.8 (private storage needs ≥ 2.3). All calls use `access: "private"`. Authentication is OIDC when running on Vercel (`BLOB_STORE_ID` + the runtime `VERCEL_OIDC_TOKEN`, added when the store is connected to the project), with `BLOB_READ_WRITE_TOKEN` as the fallback off Vercel (scripts, local runs against the real store). Credentials live only in env and are checked at startup.
- **One module boundary: `src/lib/documents/`.** A `DocumentStore` interface (`put`, `get`, `delete`, `exists`) with three implementations: `vercel-blob` (production), `local` (a gitignored directory outside `public/`, for development and E2E, **refused by `getEnv()` in production**) and an in-memory fake (Vitest). Nothing else imports `@vercel/blob`. Cloudinary modules are never used for documents (ADR-0004 mitigation for "nothing at the type level prevents the wrong helper").
- **Keys:** `cv/<base64url(32 random bytes)>.pdf`, generated on the server, with `addRandomSuffix: false` and `allowOverwrite: false`. Only the key (pathname) is stored. The blob URL the SDK returns is discarded, and the original filename is never stored.
- **Upload: one server-side multipart request, CV ≤ 4 MiB.** The public route enforces a body cap of 4 MiB + 64 KiB (below Vercel's 4.5 MB) and checks the real content (`%PDF-` header, `%%EOF` trailer, size) **before** anything is written. There is no browser-direct upload and no upload token is ever issued to a visitor.
- **Write order: insert first (pending), then `put`, then mark stored.** A within-window refusal (ADR-0008) happens before the store is touched. If the store fails, the pending record is removed and the applicant keeps their typed details. An hourly sweep removes anything abandoned.
- **Download: byte proxy, never a URL.** An admin route checks the session and the `careers` permission, calls `get(key, { access: "private" })` and streams the bytes with `Content-Disposition: attachment`, `X-Content-Type-Options: nosniff`, `Content-Security-Policy: sandbox` and `Cache-Control: private, no-store`. There are no presigned URLs, no redirects and no `s-maxage`, and access is never left to middleware (Vercel's own warning about cached private content).
- **Deletion and retention:** admin delete (main admin only) and the retention sweep call `del(key)`. A failed delete is retried by the sweep (`cv.removedAt` marks completion).

## Consequences

### Positive

- **ADR-0004 holds by construction:** private-by-default objects, unguessable keys, and a download that only exists behind the app's own access check. No URL to a CV ever reaches a browser, a log or a Referer header.
- **The PDF is checked before it is stored.** Bad files, duplicates and rate-limited requests never cost a store write, and the store can't be filled by strangers: no upload tokens are issued and per-IP upload limits apply.
- **Least moving parts on the expected host:** one SDK, credentials injected by connecting the store to the project, OIDC tokens rotated automatically, no bucket policies or CORS to get wrong.
- **Testable without a cloud account:** the `local` driver lets E2E prove "the file is gone after delete" and "store unavailable keeps the typed details". The production guard stops that convenience from ever storing real CVs on an ephemeral disk.
- **Reusable:** any later private document (e.g. if an admission attachment is ever approved) goes through the same `DocumentStore` and download-route pattern.

### Negative

- **User-facing limit changed from 5 MB to 4 MB.** Applicants with larger CVs get a clear refusal message and must compress the file. The client must be told. The limit can only rise by moving to client uploads (Alternative B) or off Vercel Functions.
- **Couples document storage to Vercel hosting.** Hosting is still listed as TODO in `docs/architecture.md`. Choosing Vercel Blob effectively chooses Vercel, and leaving Vercel later means migrating the stored CVs and swapping the driver. The `DocumentStore` boundary limits that work to one module plus a copy script.
- **Every CV passes through a Function twice** (upload and download), with Fast Data Transfer and Function time charged. This is acceptable at single-campus volume (Vercel advises against proxying files over 100 MB, far above 4 MB).
- **A third storage path to keep honest:** Cloudinary (public media), Blob (private documents) and the `local` driver (dev and E2E only). The production refusal of `local` and the single-module rule are review points, not type-level guarantees.
- **Private reads go through Vercel's CDN cache by default** (the 1-month `cacheControlMaxAge` default). Because keys are never reused and every read is behind the app's own access check, a cached copy is never reachable from outside. It does mean deleting a blob is not guaranteed to purge every edge copy instantly. That is acceptable: no route can request a deleted application's key.

## Alternatives Considered

**A. Vendor-neutral S3 API with Cloudflare R2 (the first planning draft).** No 4.5 MB host limit (the server cap would follow the hosting platform), no egress fees, portable across R2, S3 and B2. Rejected by the owner in favour of Vercel Blob: it means a second vendor account and bucket and token management, and it matters only if hosting is not Vercel.

**B. Vercel Blob with browser-direct client uploads, keeping 5 MB.** The server validates the fields and reserves the application, issues a one-file upload token for a server-chosen pathname, the browser uploads directly, then the server fetches the blob to verify the PDF and either confirms or deletes it. Rejected (owner, 2026-10-02): three requests instead of one; a public endpoint that hands visitors upload tokens; content verified only *after* the bytes are in the store; an abandoned upload holds the email and phone for up to an hour; and `onUploadCompleted` callbacks don't reach localhost, so E2E needs a real store or a hand-written emulator.

**C. Vercel Blob, presigned GET URLs for downloads.** Simpler download route (redirect), less Function transfer. Rejected: it exposes the store hostname and pathname to the browser, the URL works for anyone holding it until it expires, and the attachment disposition is not controlled by the app. It weakens exactly what ADR-0004 protects.

**D. Cloudinary (existing provider) or MongoDB GridFS.** Already rejected by ADR-0004 (Alternatives A–C): public delivery model and paid access control for Cloudinary; binary bloat in the operational database for GridFS.

## References

- Feature Spec: [specs/012-careers/spec.md](../../specs/012-careers/spec.md) (Clarifications: 4 MB; FR-015 to FR-022; Assumptions)
- Implementation Plan: [specs/012-careers/plan.md](../../specs/012-careers/plan.md)
- Research: [specs/012-careers/research.md](../../specs/012-careers/research.md) §1–§6, §9
- Data Model: [specs/012-careers/data-model.md](../../specs/012-careers/data-model.md) (Stored CV, lifecycle)
- Contracts: [document-store.md](../../specs/012-careers/contracts/document-store.md), [public-careers-api.md](../../specs/012-careers/contracts/public-careers-api.md), [admin-careers-api.md](../../specs/012-careers/contracts/admin-careers-api.md)
- Vercel docs (checked 2026-10-02): [Private storage](https://vercel.com/docs/vercel-blob/private-storage), [Server uploads (4.5 MB limit)](https://vercel.com/docs/vercel-blob/server-upload), [Client uploads](https://vercel.com/docs/vercel-blob/client-upload)
- Constitution: II (Fixed Stack: "a private object store for documents"), IV (Security), V (Personal Data), VI (Data Integrity)
- Related ADRs: [ADR-0004](0004-private-document-storage.md) (completed by this ADR), [ADR-0008](0008-career-application-30-day-reapply-window.md) (refusal happens before any store write → insert-first ordering; supersedes ADR-0006), [ADR-0003](0003-career-application-one-per-person.md)
- Evaluator Evidence: [history/prompts/012-careers/0006-adr-private-document-store-vercel-blob.misc.prompt.md](../prompts/012-careers/0006-adr-private-document-store-vercel-blob.misc.prompt.md)
