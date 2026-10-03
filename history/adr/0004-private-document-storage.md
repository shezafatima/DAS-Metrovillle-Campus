# ADR-0004: Private Document Storage — A Second Storage Provider, Split from Cloudinary, for Personal Data

> **Scope**: Document decision clusters, not individual technology choices. Group related decisions that work together (e.g., "Frontend Stack" not separate ADRs for framework, styling, deployment).

- **Status:** Accepted — vendor and wiring chosen by [ADR-0007](0007-private-document-store-vercel-blob.md) (Vercel Blob, private) on 2026-10-02; the behaviour below is unchanged
- **Date:** 2026-09-28
- **Feature:** cross-cutting (Constitution II/V; first consumer is 012-careers — CV upload, PRD §5.9/§6.7)
- **Context:** Career applications (PRD §5.9, §6.7) require storing an applicant's CV (PDF) and serving it back only to a permitted admin, as a download, never by public URL — Constitution v1.2.0 V (Personal Data) states this as a hard requirement, not a preference. The stack already has one media provider, Cloudinary, used today for public news cover images (`src/lib/cloudinary.ts`, `docs/architecture.md`). Cloudinary was evaluated as the storage destination for CVs too, and found unusable for that purpose on this project's plan for three concrete reasons: (1) delivery of raw/non-image files such as PDFs is blocked by default on Cloudinary's free tier — a deliberate anti-abuse restriction, not a bug; (2) Cloudinary's token- and cookie-based access control (the mechanism that would gate a signed file behind a session check) is an Advanced-plan feature, a paid upgrade this fixed-budget client project has not budgeted for; (3) even setting aside (1) and (2), Cloudinary's normal delivery model is a public, guessable-if-leaked URL — the opposite of what Constitution V requires for personal data, and no amount of client-side hiding changes that a fetchable URL is a public URL. Constitution v1.2.0 II already anticipated this and named "a private object store for documents" as part of the fixed stack alongside Cloudinary; this ADR is the record of why that split exists and how the two providers divide responsibility, so the next feature that uploads personal data (any future document, not just CVs) doesn't re-litigate the question or default back to Cloudinary out of convenience.

<!-- Significance checklist (ALL must be true to justify this ADR)
     1) Impact: Long-term consequence for architecture/platform/security?
     2) Alternatives: Multiple viable options considered with tradeoffs?
     3) Scope: Cross-cutting concern (not an isolated detail)?
     If any are false, prefer capturing as a PHR note instead of an ADR. -->

## Decision

Two storage providers, split strictly by data sensitivity, never by convenience:

- **Cloudinary — public media only.** News cover images, hero slides, gallery photos, and any other asset that is *meant* to be publicly fetchable stays exactly where it is today. Nothing changes about its current usage or signed-upload pattern (`signNewsCoverUpload()` / `verifyNewsCover()`).
- **A private object store — documents and personal records only.** CVs today; any future personal-data attachment (e.g. if a later phase adds document uploads to admission or registration) uses the same path. Files are written with unguessable keys (not sequential IDs, not the applicant's own filename) and the store's access setting is private by default — no object is reachable by a URL that resolves without authorization, whether or not that URL is ever advertised.
- **The download path is a session-and-role-checked app route, not a direct link.** A permitted admin's request goes through the existing `requireAdminSession()` guard (`src/lib/dal.ts`, Constitution III), which then either proxies the file bytes or redirects to a short-lived signed URL scoped to that one object — the choice between the two is an implementation detail for 012-careers' own plan, not fixed here. Either way, the response is delivered with `Content-Disposition: attachment` (a download), matching PRD §5.9's "delivered as a download rather than displayed in the panel," and never as an `<img>`/inline-viewer `src` that a browser or a copied link could re-fetch unauthenticated.
- **The specific private-object-store vendor is intentionally not chosen by this ADR.** The requirement is fixed (private-by-default objects, unguessable keys, either signed short-lived URLs or byte-proxying support, ordinary Node/Next.js server SDK), but naming a product here would be inventing a contract the codebase hasn't adopted yet. Vendor selection and its wiring in `docs/architecture.md` are 012-careers implementation-planning work — this is the same open item the constitution's own amendment-3 Sync Impact Report already tracks.

## Consequences

### Positive

- **Constitution V is met exactly, by construction**, not by convention: private-by-default storage, unguessable keys, and a session-and-role-checked download route are the mechanism, not a policy staff have to remember to follow per upload.
- **No forced upgrade to a paid Cloudinary tier** for a feature (career applications) whose file volume doesn't justify it — keeps the fixed-budget constraint (Constitution I rationale) intact.
- **Each provider does the job it's actually good at.** Cloudinary keeps doing CDN-backed image delivery and transforms for public media, which is what it's for; the private store just holds opaque private blobs. Neither provider is asked to do the other's job.
- **Reusable beyond CVs.** Constitution V is written in terms of "documents and personal records" generally, not "CVs specifically," so the next feature that needs to store a private file (an admission attachment, say) reuses this same split and the same download-route pattern instead of inventing a third approach.

### Negative

- **Two storage providers to operate instead of one** — two sets of credentials/env vars, two SDKs, two places a misconfiguration could either break uploads or, worse, leave something private reachable. The upload/download code for the private path needs its own tests asserting a raw object URL is *not* fetchable without going through the app route, the same discipline ADR-0001 already established for `withDeleted: true` staying out of list queries.
- **Vendor selection stays an open TODO** until 012-careers is planned; `docs/architecture.md` cannot be fully updated (wiring, exact SDK calls) until then. This is a known, already-tracked gap, not a surprise introduced by this ADR.
- **A session-checked download route costs more than a CDN redirect** — bytes may pass through (or be proxied by) the Next.js server rather than being served directly from a public edge, adding latency and server load proportional to file size and download frequency. Accepted as the price of the access check; CV volume for a single-campus careers page is not expected to make this a real bottleneck.
- **The split is a convention enforced by code review and route design, not by a technical guardrail that makes the wrong choice impossible.** An engineer could still accidentally call the Cloudinary upload helper for a document; nothing at the type level prevents it. Mitigated by keeping the two upload code paths in clearly separate modules (mirroring how `src/lib/cloudinary.ts` is already isolated) rather than a shared "upload a file" helper that takes a provider flag.

## Alternatives Considered

**A. Upgrade to Cloudinary's Advanced plan and use its token/cookie access control for CVs too.** Rejected: a recurring paid-tier cost increase for one low-volume feature, and it still leaves both public and private data behind a single vendor — no resilience or leverage gained, only cost. Conflicts with the fixed-budget rationale behind Constitution I and II.

**B. Keep CVs on Cloudinary's current (free) plan, but rely on an unguessable public ID as the only protection ("security through obscurity").** Rejected on two independent grounds: mechanically, raw/PDF delivery is blocked by default on this plan regardless of URL guessability, so it doesn't even work; and even if it did, Constitution V requires documents be "never reachable by public URL," not merely "not advertised" — a URL that resolves for anyone who has it is still a public URL.

**C. Store CV bytes directly in MongoDB (GridFS, or a raw `Buffer` field on the application document).** Rejected: couples large binary blobs to the primary operational database — bigger backups, slower replication, and query/index performance cost — for a job a dedicated object store already does better and that the constitution's fixed stack already earmarks separately. Also reinvents access-controlled file delivery inside application code instead of using a store built for it.

**D. Store CVs on the application server's local filesystem.** Rejected: most hosting for this stack does not guarantee a persistent, non-ephemeral filesystem across deploys/scaling events, so files could silently disappear; also has no built-in durability or backup story, unlike a managed object store.

## References

- PRD: [docs/prd.md](../../docs/prd.md) §5.9 (Careers), §6.7 (Career applications)
- Constitution: `.specify/memory/constitution.md` v1.2.0 — II (Fixed Stack, "a private object store for documents"), V (Personal Data), III (Roles & Access, `requireAdminSession()` pattern)
- Architecture: [docs/architecture.md](../../docs/architecture.md) — current Cloudinary usage (`src/lib/cloudinary.ts`, news cover images); to be extended once the private-store vendor is chosen (already-tracked follow-up from the constitution's amendment-3 Sync Impact Report)
- Related ADRs: [ADR-0003](0003-career-application-one-per-person.md) (career-application write model; the feature that first consumes this storage path)
- Evaluator Evidence: [history/prompts/general/0006-adr-private-document-storage.general.prompt.md](../prompts/general/0006-adr-private-document-storage.general.prompt.md)
