# Architecture Guide — Dar-e-Arqam Metroville Campus Website

## Stack versions
- Next.js 16.3.x (App Router), React 19, TypeScript strict.
- Tailwind CSS v4; tokens in @theme in src/app/globals.css.
- Animation: `motion` package, imported from "motion/react".
  Never install `framer-motion`.
- Fonts self-hosted via next/font.
- Auth: better-auth (Mongo adapter). Data: mongoose.
- Hosting: TODO — revisit advanced.ipAddress.ipAddressHeaders in
  src/lib/auth.ts once chosen; it currently trusts x-forwarded-for /
  x-real-ip, which is only correct behind a proxy that sets them.
- Exact versions are locked in package.json.

## Folder layout
- src/app/(public)/   public routes; layout renders PublicShell
  (header/footer). Kept separate from the root layout so the admin
  area doesn't inherit public chrome (specs/002-foundation/research.md
  §3).
- src/app/admin/      admin routes. admin/layout.tsx sets noindex
  metadata only; admin/login/ is bare; admin/(dashboard)/ renders the
  real AdminShell (sidebar + top bar) via requireAdminSession().
- src/app/api/auth/[...all]/route.ts   toNextJsHandler(auth)
- src/app/api/admin/*/route.ts        each calls
  requireAdminSession({ mode: "api" }) itself — never trust proxy.ts
  or a parent layout as the guard (Constitution III).
- src/app/api/health/route.ts         DB reachability only, no detail
- src/proxy.ts        optimistic, cookie-presence-only redirect for
  /admin/:path* (see "Database and auth" below); also forwards the
  request path as the x-pathname header so a page-level redirect (a
  stale cookie that passes this check but fails real session
  verification) can still return the admin to where they started.
- src/instrumentation.ts   register() calls getEnv() so the app fails
  at startup naming any missing required env var, before serving any
  request.
- src/components/     one component per visual section
- src/components/admin/   admin-only components (AdminShell,
  AdminSidebar, AdminTopBar, AdminMobileNav, AdminPlaceholder,
  LoginForm)
- src/content/<page>.ts   static page copy (typed)
- src/models/         Mongoose models. Better Auth owns user/session/
  account/verification/rateLimit directly — no Mongoose model is
  defined for those. throttle.ts is app-owned (see below).
- src/lib/db.ts       cached Mongoose connection (connectDb, getMongoClient)
- src/lib/auth.ts     Better Auth instance
- src/lib/dal.ts      getAdminSession() / requireAdminSession() — the
  one place that decides whether a request is an authenticated admin
- src/lib/env.ts      Zod-validated process.env (envSchema, seedEnvSchema)
- src/lib/rate-limit.ts   shared fixed-window throttle over the
  `throttle` collection — backs both the login lockout and
  src/lib/public-form.ts's per-form rate limit
- src/lib/login-lockout.ts   Better Auth hooks.before/after implementing
  the dual-key (per-IP + per-account) login lockout
- src/lib/soft-delete.ts   Mongoose plugin: deletedAt filtering,
  softDeleteById/restoreById, opt out via .setOptions({withDeleted:true})
- src/lib/honeypot.ts, src/lib/public-form.ts   spam-trap field +
  rate-limit wrapper for public POST routes
- src/lib/validation/ Zod schemas (shared client + server)
- src/test/db.ts      describeWithDb() — Vitest DB-suite helper that
  skips with a notice when MONGODB_URI is unset
- scripts/seed-admin.ts
- public/images, public/icons   static assets, kebab-case names
- research/design-tokens.md, research/tokens/*.json
- screenshots/        reference captures, named <page>-<viewport>.png

## API namespaces
- /api/auth/*   Better Auth only
- /api/admin/*  session required
- /api/public/* no auth

## Database and auth
- One cached Mongoose connection, reused across requests (src/lib/db.ts).
- Better Auth uses mongodbAdapter with mongoose.connection.db +
  mongoose.connection.getClient() (src/lib/auth.ts). Never open a
  second connection or install a different `mongodb` driver version
  than Mongoose uses — `npm ls mongodb` must show one deduped version.
- Better Auth owns the collections user, session, account,
  verification, rateLimit. App code never defines models for or writes
  to them; the seed script is the one exception, and it goes through
  Better Auth's own `auth.$context.internalAdapter`, never a raw
  collection write.
- emailAndPassword.enabled = true, disableSignUp = true,
  minPasswordLength = 12. disableSignUp blocks both the HTTP route and
  the server-side auth.api.signUpEmail call — there is no code path
  that creates a second admin.
- session.expiresIn = 7 days, updateAge = 1 day (rolling idle expiry).
- The admin is created/reset by `npm run seed:admin` [-- --reset] from
  env vars (ADMIN_EMAIL, ADMIN_PASSWORD); it is never exposed as a
  route. A unique index on user.email (created by the script) makes
  "exactly one admin" hold under concurrent runs.
- Every admin page and every /api/admin/* route calls
  requireAdminSession() itself (src/lib/dal.ts) and returns 401 /
  redirects on its own — never relies on src/proxy.ts or a parent
  layout as the sole guard (Constitution III). proxy.ts only does an
  optimistic, cookie-presence redirect for unauthenticated page
  requests; it never touches the database.
- Login lockout (src/lib/login-lockout.ts) is implemented as Better
  Auth hooks.before/after on /sign-in/email, not just in the login
  Server Action — hooks run for both auth.api.signInEmail() calls and
  the mounted /api/auth/sign-in/email HTTP route, so the lockout can't
  be bypassed by calling the API directly. Thresholds: 5 failures per
  source IP / 15 min, 20 failures per account / 15 min, either
  triggers a 15-minute block, persisted in the app-owned `throttle`
  collection (survives restarts).
- Better Auth's own built-in rate limiting is defence-in-depth only
  (a per-IP request counter, not a failure counter) and is disabled
  outside production so it doesn't interfere with parallel test runs;
  it is not the mechanism that implements the lockout above.

## Validation and data rules
- Zod normalizes input: emails lowercased and trimmed; phones stored
  as +923XXXXXXXXX (accept 03XXXXXXXXX and +92 formats).
- Upserts use findOneAndUpdate with upsert: true, backed by a unique
  index on the natural key.
- Soft delete: deletedAt: Date | null, excluded by default through a
  shared Mongoose plugin.
- Public POST routes: per-IP rate limit + hidden honeypot field.
- Responses to upserted public forms are identical for new and
  existing records.

## Design tokens
- Every value from research/design-tokens.md becomes a named custom
  token in @theme with the exact extracted value (no rounding to
  Tailwind's default scale).
- The reference site's breakpoints are defined as custom breakpoints.
- No arbitrary-value classes (e.g. text-[17px]) for anything a token
  covers.

## Components and motion
- Breakpoint-specific structures use explicit variants
  (NavbarDesktop, NavbarMobile) behind one responsive wrapper.
- "use client" only on the smallest interactive piece.
- Motion helpers (useCountUp, HoverCard, etc.) live in
  src/components/motion/; timing matches the reference.
- All animation respects prefers-reduced-motion.
- Cross-page anchor IDs are defined in the owning spec and never
  renamed without updating links.

## Media and content
- Admin uploads go to Cloudinary; only URLs are stored.
- Copy not yet supplied by the client uses marked placeholders in
  src/content/.
- Text that may contain Urdu uses dir="auto" and an Urdu fallback
  font.

## Testing
- Vitest: unit tests and route handler tests (validation failures,
  401 for admin routes). DB-backed suites use describeWithDb()
  (src/test/db.ts), which connects to MONGODB_DB_NAME=dar_e_arqam_test
  and skips with a console notice — not a failure — when MONGODB_URI
  is unset, so `npm test` stays green on a machine with no database
  configured.
- Playwright: one e2e test per user story; visual comparison against
  screenshots/; computed-style checks against research/tokens/*.json.
  e2e/global-setup.ts points the whole run at dar_e_arqam_test, wipes
  it, and seeds the one admin every admin spec logs in as; it degrades
  the same way as describeWithDb (warns and continues) if MONGODB_URI
  is unset or unreachable, so the DB-independent public-site specs
  still run. Admin specs (e2e/admin-*.spec.ts) run in their own
  Playwright project with fullyParallel:false — they share one
  MongoDB `throttle` collection and one seeded admin, so they can't
  safely run concurrently with each other.