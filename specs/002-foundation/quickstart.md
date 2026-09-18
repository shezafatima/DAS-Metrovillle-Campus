# Quickstart: Foundation (002)

How to run, seed, and verify the admin foundation locally.

## 1. Configure

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Value |
|---|---|
| `MONGODB_URI` | Atlas Flex connection string (no database name in the path; the app picks the name) |
| `MONGODB_DB_NAME` | optional, defaults to `dar_e_arqam` (tests use `dar_e_arqam_test`) |
| `BETTER_AUTH_SECRET` | ≥ 32 random characters, e.g. `openssl rand -base64 32` |
| `BETTER_AUTH_URL` | `http://localhost:3000` |
| `ADMIN_EMAIL` | the single admin's email |
| `ADMIN_PASSWORD` | at least 12 characters |

Starting the app with any of the first four missing fails with
`Missing required environment variable: <NAME>`, thrown from
`src/instrumentation.ts`'s `register()`.

> **Verified discrepancy (T064)**: under `next dev` with Turbopack
> (Next.js 16), `register()` compiles and runs lazily on the first
> request that needs it, not before the initial `✓ Ready` line — so the
> terminal can print "Ready" even with a required variable missing.
> The failure still surfaces immediately, with the exact message above
> and a clean stack trace, the moment any page or route is actually
> requested (in this app, that's any request at all, since `proxy.ts`
> matches every `/admin/**` path and every other route eventually
> touches `src/lib/db.ts`/`src/lib/auth.ts`). `next build` / `next
> start` (production) are expected to gate on `register()` completing
> before accepting connections at all, per the Next.js instrumentation
> guide — this project's test suite does not currently exercise a
> production build to confirm that difference.

## 2. Install and seed

```bash
npm install
npm run seed:admin            # creates the admin; safe to re-run
npm run seed:admin -- --reset # changes the password and ends all sessions
```

## 3. Run

```bash
npm run dev
```

- `http://localhost:3000/admin` → redirects to `/admin/login?next=/admin`
- Log in → lands on `/admin` with sidebar (Overview, News, Messages,
  Signups, Settings) and the top bar showing your email + Logout.
- `http://localhost:3000/api/health` → `{"status":"ok"}`
- `http://localhost:3000/api/admin/session` → `401` in a private window,
  `{"email":"..."}` when logged in.

## 4. Verify

```bash
npm run lint
npm test                      # Vitest: DB tests need MONGODB_URI, else skipped with a notice
npm run test:e2e              # Playwright: seeds the test DB, then runs e2e/admin-*.spec.ts
```

The e2e suite covers (spec Acceptance): login, logout, wrong credentials,
logged-out redirect + return to the requested page, the lockout after 5
failures, the `/api/auth/sign-up/email` refusal, and the admin layout at
375 / 768 / 1024 / 1440 px.

## 5. Where things live

| Concern | Path |
|---|---|
| Env schema + startup check | `src/lib/env.ts`, `src/instrumentation.ts` |
| DB connection | `src/lib/db.ts` |
| Better Auth instance + lockout hooks | `src/lib/auth.ts`, `src/lib/login-lockout.ts` |
| Session DAL | `src/lib/dal.ts` |
| Rate limit / honeypot / public-form wrapper | `src/lib/rate-limit.ts`, `src/lib/honeypot.ts`, `src/lib/public-form.ts` |
| Soft-delete plugin | `src/lib/soft-delete.ts` |
| Throttle model | `src/models/throttle.ts` |
| Admin pages + shell | `src/app/admin/**`, `src/components/admin/**` |
| Public shell (moved) | `src/app/(public)/layout.tsx`, `src/components/site-shell/public-shell.tsx` |
| Seed command | `scripts/seed-admin.ts` |
