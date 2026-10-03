# Quickstart — 012 Careers

## 1. Local setup (no cloud account needed)

Add to `.env.local`:

```env
DOCUMENT_STORE_DRIVER=local
# optional: DOCUMENT_STORE_LOCAL_DIR=.data/documents
# optional: CAREERS_RETENTION_MONTHS=12
```

`npm install` (adds `@vercel/blob`), then `npm run dev`. CVs land in `.data/documents/cv/…` (gitignored, outside `public/`, so no URL serves them).

## 2. Try it

1. Open `/careers` (or use the top-bar or footer "Careers" link, or Home's "Join Now").
2. Submit with a real small PDF and consent ticked → confirmation shown.
3. Submit again with the same email (different phone), then the same phone (different email) → "You applied recently. You can apply again from <date 30 days on>." both times. Then set that application's `createdAt` 30 days back in the database and submit again → accepted as a new, separate application (both appear in the admin list).
4. Rename a `.png` to `.pdf` and submit → "Your CV must be a PDF file." Try a file over 4 MB → "Your CV must be 4 MB or smaller."
5. Create `.data/documents/.unavailable`, submit → "We couldn't save your application just now…", with every typed value and the file still in the form. Delete the sentinel file and submit again → success.
6. Sign in as the main admin → **Applications** → search, open, **Download CV** (a file download, never a preview), **Export CSV** (open it in Excel and check Urdu names), **Delete** → the file is gone from `.data/documents` → applying again with the same email works.
7. Sign in as a content manager with `careers` → list, detail, download and export work, and there is no Delete button. `DELETE /api/admin/careers/<id>` → 403.

## 3. Tests

```bash
npm test                                   # Vitest (DB suites need MONGODB_URI)
npx playwright test --project=forms careers-public
npx playwright test --project=admin admin-careers
```

Never run `npm run build` and Playwright at the same time (memory: sequence heavy processes). Playwright's dev server gets `DOCUMENT_STORE_DRIVER=local` and `DOCUMENT_STORE_LOCAL_DIR=.data/e2e-documents` from `playwright.config.ts`.

## 4. Production (Vercel Blob, private)

1. In the Vercel project: **Storage → Create Storage → Blob → access: Private** (or `vercel blob create-store careers-documents --access private`). Connect it to the project for Production and Preview (add Development only if you want local runs against the real store).
2. Vercel then adds `BLOB_STORE_ID` (OIDC, preferred) and `BLOB_READ_WRITE_TOKEN` (fallback). Set `DOCUMENT_STORE_DRIVER=vercel-blob` (or leave it blank). Never set `local` in production: startup refuses it.
3. **Real-store test** (do this once before go-live, against a throwaway PRIVATE store, never the production one): put `BLOB_READ_WRITE_TOKEN` in `.env.local`, then run `RUN_BLOB_INTEGRATION=1 bash scripts/with-test-env.sh npx vitest run src/lib/documents/vercel-blob.integration.test.ts`. It proves put/get/exists/delete, that a key is kept exactly (no random suffix) and not overwritten, that the blob URL answers 401/403 without credentials, and that a bad token is reported without leaking the SDK error. It skips unless both are set.
   Then check by hand: upload one test CV through `/careers`, take its blob URL from the Vercel Storage browser, and confirm an anonymous `curl <blob-url>` returns 401/403. Delete the test application from the admin and confirm the blob is gone.
4. The CV limit is **4 MB**, set by Vercel's 4.5 MB function request limit (spec Clarifications).
5. **Release steps** after deploying 012, run once:
   - Back up first: Atlas snapshot or `mongoexport --collection=signups`.
   - `npm run retire:signups` — drops `signups` and unsets `signupsLastOpenedAt` (idempotent; prints what it removed).
   - Optional: a Vercel Cron job or a host scheduler calling the sweep daily. The app also sweeps opportunistically, at most hourly; `npm run sweep:careers` runs it by hand (needs `BLOB_READ_WRITE_TOKEN` locally).
6. Ask the client for: privacy notice and consent wording, the confirmed retention period, and the intro copy, then replace the placeholders in `src/content/careers.ts` and set `CAREERS_RETENTION_MONTHS` in Production. **Until both are done, the production build fails** (`npm run prebuild` / `scripts/check-release-content.ts`, T100).
