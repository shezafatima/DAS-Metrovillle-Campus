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
- src/components/admin/news/   news editor UI (NewsEditor,
  RichTextEditor, CoverImageField, NewsTable, NewsTableFilters,
  NewsPagination, DeletePostDialog, useUnsavedChanges) — 003 news
- src/components/news/   public news UI (NewsBanner, NewsGrid,
  NewsCard, NewsPagination, NewsEmptyState, CategoryFilter, CoverImage,
  PostBody) — 003 news
- src/components/signup/   public signup section (SignupSection,
  SignupForm) — 004 signup; one reusable section placed on Home (006)
  and Resources (009), on the Home placeholder until then
- src/components/admin/signups/   admin signup list UI
  (SignupsTable, SignupsTableFilters, DeleteSignupDialog) — 004 signup
- src/components/admin/admin-pagination.tsx   shared admin-list
  pagination (lifted out of news/news-pagination.tsx, which is now a
  thin wrapper over it — 004 signup, sp.analyze finding D1)
- src/content/<page>.ts   static page copy (typed)
- src/models/         Mongoose models. Better Auth owns user/session/
  account/verification/rateLimit directly — no Mongoose model is
  defined for those. throttle.ts, news-post.ts (003 news, collection
  `news`) and signup.ts (004 signup, collection `signups`) are
  app-owned (see below).
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
- src/lib/news/       003 news domain logic: categories.ts (fixed
  list), slug.ts, sanitize.ts (server-side HTML allowlist — the
  authoritative control, not the editor's own extension allowlist),
  excerpt.ts, dates.ts (publish-date/PKT-visibility helpers),
  cloudinary-loader.ts (next/image loader), mutations.ts
  (create/update/publish/unpublish/delete — the one place that
  validates, sanitises, generates slugs and calls Cloudinary
  verification), admin-queries.ts, public-queries.ts (the single
  visibility predicate every public read goes through), route-errors.ts
- src/lib/cloudinary.ts   configured Cloudinary SDK: signNewsCoverUpload()
  (signed direct browser upload), verifyNewsCover() (server-side
  confirmation of an uploaded cover's size/format/folder)
- src/lib/admin-list.ts   shared admin-list building blocks (Paged<T>,
  escapeRegExp, ADMIN_PAGE_SIZE) — moved out of news/admin-queries.ts
  so signup's admin list imports these instead of the news module or a
  duplicate copy (004 signup, sp.analyze finding D1)
- src/lib/signup/   004 signup domain logic: sources.ts (fixed Home/
  Resources list), phone.ts (Pakistani-mobile normalise/format/search-
  digits), dates.ts (PKT instant formatting — distinct from news'
  calendar-date dates.ts), mutations.ts (upsertSignup — the one atomic
  natural-key upsert with restore-on-resignup, see ADR-0001;
  deleteSignup), admin-queries.ts (listSignups/countSignups/
  findSignupsForExport — one shared filter builder), csv.ts (RFC 4180
  export encoding), route-errors.ts
- src/test/db.ts      describeWithDb() — Vitest DB-suite helper that
  skips with a notice when MONGODB_URI is unset
- src/test/admin-session.ts   seedTestAdmin()/getTestSessionCookie() —
  shared by every DB-backed admin route test that needs a real session
- scripts/seed-admin.ts
- public/images, public/icons   static assets, kebab-case names
- research/design-tokens.md, research/tokens/*.json,
  research/tokens/news-cards-*.json (003 news), research/tokens/
  signup-*.json (004 signup — signup band, extracted by
  research/extract-signup-tokens.ts)
- screenshots/        reference captures, named <page>-<viewport>.png

## API namespaces
- /api/auth/*   Better Auth only
- /api/admin/*  session required — includes /api/admin/news* (post
  CRUD, publish/unpublish), /api/admin/uploads/sign (Cloudinary
  signature for direct browser upload; the API secret never leaves
  this route), /api/admin/signups/[id] (soft delete) and
  /api/admin/signups/export (filtered CSV) — 004 signup
- /api/public/* no auth — includes /api/public/signups (004 signup;
  honeypot → rate limit → validate → upsert, identical response for
  every outcome)

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
- Shell/site text of unknown language uses dir="auto" and an Urdu
  fallback font. News content (003) is the one exception: each post
  carries an explicit `language: "en" | "ur"` field the admin sets
  (spec clarification, FR-028/FR-029), and that field — not
  auto-detection — drives `dir` and the Urdu font everywhere the post
  is shown (title, editor, admin table, public card, detail page).

## News (003) rendering notes
- Public news pages (`/news`, `/news/<category>`, `/news/<slug>`) are
  `export const dynamic = "force-dynamic"` — no ISR/revalidate. A
  cached page would let an unpublished/deleted post linger past its
  removal, which the spec requires to be immediate (research.md §6).
- Every public read (list, category list, detail, metadata) goes
  through the single visibility predicate in
  `src/lib/news/public-queries.ts` — status published, publishDate ≤
  today in Asia/Karachi, not soft-deleted. There is no other public
  query path; this is what makes "drafts and deleted posts are never
  returned publicly" a property of the code, not a per-page discipline.
- Cover images: signed direct browser→Cloudinary upload
  (`/api/admin/uploads/sign` mints the signature; the API secret never
  leaves that route); the server independently verifies size/format/
  folder via the Cloudinary API on save (`verifyNewsCover`,
  `src/lib/cloudinary.ts`) before accepting a changed `coverImage`.

## Signup (004) data rules
- One person, one record: `signups` has a unique index on `email` with
  no partial filter, so a soft-deleted record's email stays reserved.
  The public route's only write is one atomic
  `Signup.findOneAndUpdate(..., { upsert: true, withDeleted: true })`
  that creates, updates or restores in a single call — see
  `history/adr/0001-signup-upsert-and-restore.md` for the full
  rationale, the alternatives rejected, and why this pattern does
  **not** extend to contact messages (008), which are append-only
  (every submission is its own record, even from the same email).
  `withDeleted: true` is permitted only inside
  `src/lib/signup/mutations.ts`; no list/read query anywhere else
  passes it.
- The public response body is identical (`{ ok: true }`, no id or
  flag) whether the record was created, updated, restored, or the
  submission was silently dropped by the honeypot — nothing in the
  response distinguishes a new signup from a returning one or a bot.

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
  safely run concurrently with each other. Public signup specs
  (e2e/signup-*.spec.ts) run in a third project, `forms`, for the same
  reason: every Playwright worker shares one source IP, and the
  rate-limit test deliberately exhausts that budget (004 signup,
  research.md §8) — `chromium`'s testIgnore excludes both `admin-*`
  and `signup-*` so a spec never runs twice under two projects.
  `e2e/helpers/signups.ts` follows the same seed/clear/withConnection
  pattern as `e2e/helpers/news.ts`.