# Contract — Private document store (`src/lib/documents/`)

ADR-0004 behaviour, using Vercel Blob in private mode (research §1–§3). This is the only module that talks to the store. Nothing in `src/lib/cloudinary.ts` or `src/lib/uploads/` is used for documents.

```ts
export interface DocumentStore {
  put(key: string, bytes: Uint8Array, contentType: "application/pdf"): Promise<void>;
  get(key: string): Promise<{ body: ReadableStream<Uint8Array>; size: number } | null>; // null = not found
  delete(key: string): Promise<void>;    // not found counts as success
  exists(key: string): Promise<boolean>; // tests and sweep only
}
export class DocumentStoreUnavailableError extends Error {}
export function getDocumentStore(): DocumentStore; // cached per process, chosen by env
export function newCvKey(): string;               // "cv/" + base64url(randomBytes(32)) + ".pdf"
```

## Drivers

| Driver | Selected by | Notes |
|---|---|---|
| `vercel-blob` | `DOCUMENT_STORE_DRIVER=vercel-blob` (default) | `@vercel/blob` ^2.8: `put(key, bytes, { access: "private", contentType, addRandomSuffix: false, allowOverwrite: false })`; `get(key, { access: "private" })`, where a non-200 or `null` means not found and `stream` is the body; `del(key)`; `head(key)`. Network, 5xx and auth errors → `DocumentStoreUnavailableError`. The returned blob `url` is never stored or exposed: the app keeps only the key (pathname). |
| `local` | `DOCUMENT_STORE_DRIVER=local` | Files under `DOCUMENT_STORE_LOCAL_DIR` (default `.data/documents`, gitignored). Keys are generated, so they can't contain `..`. A `.unavailable` sentinel file in the dir makes every call throw `DocumentStoreUnavailableError` (E2E). **Refused by `getEnv()` when `NODE_ENV=production`.** |
| fake | injected in Vitest | in-memory map with a failure switch |

## Environment (`src/lib/env.ts`)

| Var | Required when | Notes |
|---|---|---|
| `DOCUMENT_STORE_DRIVER` | always | `vercel-blob` \| `local`; blank → `vercel-blob` |
| `BLOB_STORE_ID` (+ runtime `VERCEL_OIDC_TOKEN`) | `vercel-blob` on Vercel | added automatically when the private store is connected to the project; preferred (short-lived, auto-rotated) |
| `BLOB_READ_WRITE_TOKEN` | `vercel-blob` off Vercel | long-lived fallback (local dev against the real store, `npm run sweep:careers` from a laptop) |
| `DOCUMENT_STORE_LOCAL_DIR` | `local`, optional | |
| `CAREERS_RETENTION_MONTHS` | never | integer 1–120, default 12 |

With `vercel-blob`, startup fails unless `BLOB_STORE_ID` or `BLOB_READ_WRITE_TOKEN` is set (002 "Missing required environment variable" pattern). Tokens are never logged.

## Write order used by `createCareerApplication` (research §6)

1. `key = newCvKey()`
2. Under the ADR-0008 identity locks: window check, then `CareerApplication.create({ ...fields, consentAt: now, cv: { key, size, storedAt: null, removedAt: null } })`, then release the locks. A within-window match → `RecentApplicationError(reapplyFrom)` (no store call).
3. `store.put(key, bytes, "application/pdf")`. On failure → `CareerApplication.deleteOne({ _id })` (hard), then rethrow as `DocumentStoreUnavailableError`.
4. `updateOne({ _id }, { $set: { "cv.storedAt": now } })`. On failure → `store.delete(key)` + hard delete, then rethrow.

## Download

`GET /api/admin/careers/[id]/cv` → access check → `store.get(cv.key)` → `new Response(stream, …)` with the headers in `admin-careers-api.md`, including `Cache-Control: private, no-store`. Never a redirect, never a presigned URL, never `s-maxage`.

## Retention sweep (`src/lib/careers/retention.ts`)

`sweepCareerApplications(now, store)` → `{ expired, retriedRemovals, abandoned }`, idempotent:

- `createdAt < now − CAREERS_RETENTION_MONTHS` (live or deleted) → delete object (not found is fine) → hard-delete document.
- `deletedAt != null && cv.removedAt == null` → retry the object delete → set `cv.removedAt`.
- `cv.storedAt == null && createdAt < now − 1 h` → delete object if present → hard-delete document.

Callers: `after()` in the public route (on success) and in the admin list page, each gated by `checkRateLimit({ key: "sweep:careers", max: 1, windowSeconds: 3600 })`; and `npm run sweep:careers` (no gate).

## Guarantees under test

- A key never contains or derives from the id, name, email, phone, qualification, dates or original filename; two identical submissions get different keys.
- `vercel-blob` with a real private store (optional integration suite, runs only when `BLOB_READ_WRITE_TOKEN_TEST` is set): put → an unauthenticated `fetch(blob.url)` returns 401/403 → get with the token returns the bytes → delete → get returns not found.
- `local` driver: no stored file is reachable by any site URL (E2E requests `/<key>` and `/.data/...` → 404).
