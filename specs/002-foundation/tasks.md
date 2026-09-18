---

description: "Task list for Foundation (002) implementation"
---

# Tasks: Foundation

**Input**: Design documents from `/specs/002-foundation/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/http-and-actions.md, contracts/seed-admin-cli.md, quickstart.md

**Tests**: Included — spec.md's Acceptance section and Constitution VIII explicitly require an e2e test per user story, an unauthorized-access test for every admin route, a test proving the seed command never creates a second admin, and layout checks at 375/768/1024/1440px. plan.md's test plan maps each to a file; those files are tasks here. DB-backed Vitest files (`[DB]`) connect to `MONGODB_DB_NAME=dar_e_arqam_test` and skip with a notice when `MONGODB_URI` is unset (research.md §11).

**Organization**: Tasks are grouped by user story (spec.md priorities P1–P3) so each story is an independently testable increment.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependency on an incomplete task)
- **[Story]**: Maps the task to a spec.md user story (US1–US6); Setup/Foundational/Polish tasks carry no story label
- File paths are exact and relative to the repository root

## Path Conventions

Single existing Next.js app (plan.md Structure Decision) — `src/`, `scripts/`, `e2e/` at repository root. Public pages move into the `src/app/(public)/` route group; admin pages live under `src/app/admin/`.

---

## Phase 1: Setup

**Purpose**: Install the fixed-stack packages this feature introduces, declare the scripts and env contract, and add the two layout tokens the admin shell needs (Constitution II, V).

- [ ] T001 Install runtime dependencies at the versions verified in research.md §1: `npm install better-auth@1.7.5 mongoose@9.10.1 zod@4.6.5 @next/env` — then confirm `npm ls mongodb` shows a single `mongodb@7.x` instance under `mongoose` (architecture rule: one driver)
- [ ] T002 [P] Add the npm script `"seed:admin": "tsx scripts/seed-admin.ts"` to `package.json`; keep existing scripts untouched (contracts/seed-admin-cli.md Invocation)
- [ ] T003 [P] Update `.env.example`: add `MONGODB_DB_NAME=dar_e_arqam` (optional, with a comment that tests use `dar_e_arqam_test`), note `BETTER_AUTH_SECRET` must be ≥ 32 characters (`openssl rand -base64 32`), and note `ADMIN_PASSWORD` must be ≥ 12 characters (quickstart.md §1)
- [ ] T004 [P] Add an "Admin dashboard tokens (not from das.edu.pk)" section to `research/design-tokens.md` naming `spacing-admin-sidebar: 240px` and `spacing-admin-topbar: 56px` (Constitution V requires the token file to name a value before use — done), then add both to the `@theme` block in `src/app/globals.css` with a comment citing research.md §12 (no new color tokens)

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Env validation, DB connection, Better Auth instance, throttle primitive, validation schemas, DAL, the public-shell route-group move, and test infrastructure — everything every story imports.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

### Environment and database

- [ ] T005 Create `src/lib/env.ts`: Zod `envSchema` (`MONGODB_URI` non-empty, `BETTER_AUTH_SECRET` min 32, `BETTER_AUTH_URL` url, `MONGODB_DB_NAME` default `"dar_e_arqam"`) and `seedEnvSchema` (`ADMIN_EMAIL` trim→lowercase→email with message `"ADMIN_EMAIL is not a valid email address"`, `ADMIN_PASSWORD` min 12 with message `"ADMIN_PASSWORD must be at least 12 characters"`); export cached `getEnv()` / `getSeedEnv()` that throw `Error("Missing required environment variable: <NAME>")` naming the first missing variable (FR-005, FR-033; data-model.md Validation schemas) — depends on T001
- [ ] T006 [P] Vitest unit tests in `src/lib/env.test.ts`: missing `MONGODB_URI` → error names `MONGODB_URI`; short secret → error; `ADMIN_PASSWORD` of 11 chars → the exact minimum-length message; `ADMIN_EMAIL` ` Admin@Example.COM ` → `admin@example.com` (SC-010, FR-010) — depends on T005
- [ ] T007 [P] Create `src/instrumentation.ts` exporting `register()` that calls `getEnv()` so the app fails at startup with the named-variable message (FR-033; research.md §10) — depends on T005
- [ ] T008 [P] Create `src/lib/db.ts`: `connectDb()` returning one cached Mongoose connection (global singleton across dev HMR), using `getEnv().MONGODB_URI` and `dbName: getEnv().MONGODB_DB_NAME`, `serverSelectionTimeoutMS: 5000`; export `getMongoClient()` = `mongoose.connection.getClient()` for Better Auth (architecture "Database and auth"; research.md §1) — depends on T005
- [ ] T009 [P] Create `src/lib/log.ts`: `logSecurityEvent({ type: "login_failed" | "login_blocked" | "login_success" | "logout" | "password_reset", ip?, email?, outcome? })` writing one structured JSON line to `console.info`; the parameter type has no `password`/`token`/`session` keys (FR-034)

### Throttle primitive (shared by US5 and US6)

- [ ] T010 Create `src/models/throttle.ts`: Mongoose model `Throttle` with `key` (string, unique index), `count` (number, default 0), `windowStart` (Date), `blockedUntil` (Date | null, default null), `expiresAt` (Date, TTL index `expireAfterSeconds: 0`) per data-model.md "Throttle entry" — depends on T008
- [ ] T011 Create `src/lib/rate-limit.ts` over `Throttle`: `checkRateLimit({ key, max, windowSeconds })` → `{ allowed, retryAfterSeconds }` (single atomic `findOneAndUpdate` with `$inc`, upsert, resets when `windowStart + window < now`); `recordFailure({ key, threshold, windowSeconds, blockSeconds })` → sets `blockedUntil = now + blockSeconds` when `count` reaches `threshold`; `isBlocked(key)` → `blockedUntil > now`; `clearKeys(keys[])`; exported policy constants `LOGIN_IP_POLICY {threshold:5, windowSeconds:900, blockSeconds:900}`, `LOGIN_EMAIL_POLICY {threshold:20, windowSeconds:900, blockSeconds:900}`, `PUBLIC_FORM_POLICY {max:5, windowSeconds:600}` (data-model.md policies + state machine; FR-027, FR-031) — depends on T010
- [ ] T012 Vitest `[DB]` tests in `src/lib/rate-limit.test.ts`: `max` requests allowed then the next refused with `retryAfterSeconds > 0`; window reset after `windowStart` is backdated; `recordFailure` sets `blockedUntil` exactly on the threshold-th failure and not before; `isBlocked` false once `blockedUntil` is backdated; 20 concurrent `recordFailure` calls yield `count === 20` (atomicity); `expiresAt` = max(window end, blockedUntil) — depends on T011, T014
- [ ] T013 [P] Create `src/lib/honeypot.ts` (`HONEYPOT_FIELD = "website_url"`, `isHoneypotTripped(input: FormData | Record<string, unknown>)` → true when the field is present and non-empty) and `src/lib/honeypot.test.ts` covering FormData and JSON inputs, empty vs filled (FR-031)

### Test infrastructure

- [ ] T014 Create `src/test/db.ts`: `describeWithDb(name, fn)` helper that reads `MONGODB_URI`, forces `MONGODB_DB_NAME=dar_e_arqam_test`, connects once, drops the collections a test names in `beforeEach`, disconnects in `afterAll`, and calls `describe.skip` with `console.warn("[db tests skipped] MONGODB_URI not set")` when unset; update `vitest.config.ts` so `src/lib/**`, `src/models/**`, `src/app/api/**`, `src/app/admin/**/actions.test.ts`, `scripts/**` run in the `node` environment while component tests stay in `jsdom`, and add `scripts/**/*.test.ts` to `include` (research.md §11) — depends on T008
- [ ] T015 [P] Create `e2e/global-setup.ts` that loads `.env.local` via `@next/env`'s `loadEnvConfig`, sets `process.env.MONGODB_DB_NAME = "dar_e_arqam_test"`, drops that database's `user`/`session`/`account`/`throttle` collections, exports a `clearThrottle()` helper, and runs `scripts/seed-admin.ts` via `child_process.execFileSync` with `E2E_ADMIN_EMAIL`/`E2E_ADMIN_PASSWORD` (defaults `e2e-admin@example.com` / `correct-horse-battery-staple`) passed as `ADMIN_EMAIL`/`ADMIN_PASSWORD`; update `playwright.config.ts` with `globalSetup`, `webServer.env: { MONGODB_DB_NAME: "dar_e_arqam_test" }`, and a `fullyParallel: false` (or `workers: 1`) project matching `e2e/admin-*.spec.ts` so admin specs sharing the persisted `throttle` collection cannot race each other (plan.md Testing) — depends on T001 (first succeeds once T024 exists)

### Better Auth and session access

- [ ] T016 Create `src/lib/auth.ts` per research.md §4: `betterAuth({ database: mongodbAdapter(db, { client }) })` using `connectDb()`/`getMongoClient()`, `baseURL`/`secret` from `getEnv()`, `emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 }`, `session: { expiresIn: 604800, updateAge: 86400 }`, `rateLimit: { enabled: process.env.NODE_ENV === "production", storage: "database", window: 60, max: 30, customRules: { "/sign-in/email": { window: 60, max: 10 } } }` (disabled outside production so parallel test runs aren't rate-limited by this defence-in-depth layer; the dual-key lockout in US5 is the tested mechanism), `plugins: [nextCookies()]`, `advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } }`; leave a `hooks` slot that US5 fills (FR-001, FR-011, FR-019) — depends on T008
- [ ] T017 [P] Create `src/app/api/auth/[...all]/route.ts` exporting `GET`/`POST` from `toNextJsHandler(auth)` (`better-auth/next-js`) (contracts/http-and-actions.md `/api/auth/*`) — depends on T016
- [ ] T018 [P] Create `src/lib/validation/login.ts` (`loginSchema`: `email` trim→lowercase→`z.email()`, `password` non-empty string, `next` optional string) and `src/lib/validation/return-path.ts` (`safeAdminReturnPath(next?: string): string` → `next` only if it starts with `/admin/`, has no `//`, no `:`, no `\`, and is not `/admin/login`; else `/admin`) (FR-010, FR-016; data-model.md) — depends on T001
- [ ] T019 [P] Vitest unit tests in `src/lib/validation/return-path.test.ts`: `/admin/news` kept; `undefined`, `/`, `/admin/login`, `//evil.com`, `https://evil.com`, `/admin/..\\x`, `/adminx` → `/admin` (FR-016; spec edge case "return destination tampering") — depends on T018
- [ ] T020 Create `src/lib/dal.ts`: `getAdminSession()` → `auth.api.getSession({ headers: await headers() })` returning `{ email, sessionId } | null` and never throwing for "no session"; `requireAdminSession({ mode: "page" | "api" } = { mode: "page" })` → in page mode `redirect("/admin/login?next=" + encodeURIComponent(current pathname))` when null, in api mode returns `null` (contracts/http-and-actions.md DAL; FR-015, FR-017, FR-018) — depends on T016

### Public shell route-group move (unblocks the admin layout)

- [ ] T021 Create `src/components/site-shell/public-shell.tsx`: server component rendering `<SkipLink />`, `<Header />`, `<main id="main-content" className="flex flex-1 flex-col">{children}</main>`, `<Footer />` — extracted verbatim from the current `src/app/layout.tsx` body (research.md §3)
- [ ] T022 Move the public routes into the group with `git mv` (unchanged contents): `src/app/page.tsx`, `src/app/page.test.tsx`, `src/app/about/`, `src/app/academics/`, `src/app/admission/`, `src/app/campuses/`, `src/app/contact/`, `src/app/hifz-e-quran/`, `src/app/news/`, `src/app/portal/`, `src/app/resources/` → `src/app/(public)/…`; create `src/app/(public)/layout.tsx` rendering `<PublicShell>{children}</PublicShell>`; strip `SkipLink`/`Header`/`Footer`/`<main>` from `src/app/layout.tsx` so it keeps only `<html>`, `<body className="min-h-full flex flex-col">`, fonts and `globals.css`; wrap the JSX in `src/app/not-found.tsx` in `<PublicShell>` (FR-020; research.md §3) — depends on T021. **Commit the 001 work first** (plan.md risk 3) so history records renames.
- [ ] T023 Run the existing suite to prove the move is invisible: `npm test` and `npx playwright test` (all `e2e/*.spec.ts` from 001 must pass; `src/app/(public)/page.test.tsx` import paths still resolve) — depends on T022

**Checkpoint**: Env, DB, auth instance, throttle primitive, schemas, DAL, test harness and the public/admin layout split are in place — user stories can begin.

---

## Phase 3: User Story 1 - Admin account setup (Priority: P1) 🎯 MVP

**Goal**: One idempotent command creates the single admin from env, refuses short passwords, reports "already exists" on re-run, and with `--reset` replaces the password and ends all sessions.

**Independent Test**: With an empty `user` collection run `npm run seed:admin` → one user; run again → still one, output says exists; run with `--reset` and a new password → the new password verifies and sessions are gone. No login page required.

### Implementation for User Story 1

- [ ] T024 [US1] Create `scripts/seed-admin.ts` per `contracts/seed-admin-cli.md`: `loadEnvConfig(process.cwd())`; `getSeedEnv()` (exit 1 with the named-variable / min-length / invalid-email message before connecting); `connectDb()` (on failure print `Could not connect to the database`, exit 1, no connection details); `const ctx = await auth.$context`; ensure a unique index via `mongoose.connection.db.collection("user").createIndex({ email: 1 }, { unique: true })`; `ctx.internalAdapter.findUserByEmail(email)` → create (`createUser({ email, name: localPart, emailVerified: true }, { method: "email-password" })` + `linkAccount({ userId, providerId: "credential", accountId: userId, password: await ctx.password.hash(pw) })`) / exists / `--reset` (`updatePassword(userId, hash)` + `deleteUserSessions(userId)`); catch duplicate-key error code 11000 as "already exists"; print exactly the contract's single stdout line; `logSecurityEvent({ type: "password_reset" })` on reset; never print the password (FR-001–FR-007; research.md §5) — depends on T005, T008, T009, T016
- [ ] T025 [US1] Vitest `[DB]` tests in `scripts/seed-admin.test.ts` running the script with `execFileSync("npx", ["tsx", "scripts/seed-admin.ts"], { env })` against `dar_e_arqam_test`: fresh → stdout `Admin created:` and `user` count 1; second run → `already exists` and count 1; `--reset` with a new password → `password updated`, count 1, `session` count 0 after inserting a fake session row, `auth.api.signInEmail` succeeds with the new password and fails with the old; 10 concurrent runs (`Promise.all` of `execFile`) → count 1 (SC-003); missing `ADMIN_EMAIL` → exit 1 and stdout names `ADMIN_EMAIL`; 11-char password → exit 1 with the minimum message; mixed-case email → stored lower-case (FR-002–FR-006, FR-010) — depends on T024, T014
- [ ] T026 [US1] Playwright `e2e/admin-setup.spec.ts` (`test.describe.configure({ mode: "serial" })`): runs the seed twice via `child_process` and asserts the two stdout lines; POSTs `/api/auth/sign-up/email` via `request.post` and expects `400` with code `EMAIL_PASSWORD_SIGN_UP_DISABLED` (FR-001, FR-002; spec Acceptance "never creates a second admin") — depends on T024, T015, T017

**Checkpoint**: The single admin exists and can be reset; nothing else can create an account.

---

## Phase 4: User Story 2 - Admin login and logout (Priority: P1)

**Goal**: `/admin/login` signs the admin in with one indistinguishable failure message, the session survives reloads, a logged-in visit to `/admin/login` bounces to `/admin`, and logout returns to `/admin/login`.

**Independent Test**: Seed the admin; log in → `/admin`; reload → still in; visit `/admin/login` → sent to `/admin`; log out → `/admin/login`; wrong password, wrong email, unknown email → byte-identical message.

### Implementation for User Story 2

- [ ] T027 [P] [US2] Create `src/content/admin.ts` exporting `adminNavItems` (`Overview → /admin`, `News → /admin/news`, `Messages → /admin/messages`, `Signups → /admin/signups`, `Settings → /admin/settings`, in that order), `loginCopy` (`title`, `emailLabel`, `passwordLabel`, `submit`, `errors: { generic: "The email or password is incorrect.", blocked: "Too many attempts. Please try again later.", unavailable: "The service is temporarily unavailable. Please try again later." }`), and `placeholderCopy.comingSoon` (Constitution VI copy-in-content; FR-009, FR-014, FR-021)
- [ ] T028 [US2] Create `src/app/admin/layout.tsx`: `export const metadata = { title: { template: "%s — Admin", default: "Admin" }, robots: { index: false, follow: false } }`; renders `{children}` only (FR-026; research.md §2)
- [ ] T029 [US2] Create `src/app/admin/login/actions.ts` (`"use server"`): `login(prevState, formData)` per `contracts/http-and-actions.md` — honeypot tripped → `{ error: "generic" }` without calling auth; `loginSchema.safeParse` failure → `{ error: "generic" }`; `auth.api.signInEmail({ body: { email, password }, headers: await headers() })`; `isAPIError(e) && e.status === 401` → `{ error: "generic" }`, `429` → `{ error: "blocked" }`, anything else → `{ error: "unavailable" }` plus `console.error` of the error name only; success → `logSecurityEvent({ type: "login_success", email, ip })` then `redirect(safeAdminReturnPath(next))` (FR-008, FR-009, FR-014, FR-016) — depends on T016, T018, T013, T009
- [ ] T030 [US2] Create `src/components/admin/login-form.tsx` (`"use client"`): `useActionState(login, { error: null })`; labelled `email` (`type="email"`, `autoComplete="username"`) and `password` (`autoComplete="current-password"`) inputs, hidden `next` input, visually-hidden honeypot input named `HONEYPOT_FIELD` with `tabIndex={-1}` `autoComplete="off"` `aria-hidden`, submit `Button` disabled while pending, and a `role="alert"` region showing `loginCopy.errors[state.error]`; tokens only (`font-button`, `text-text`, `bg-primary`, `border-neutral-100`) (FR-008, FR-009) — depends on T027, T029
- [ ] T031 [US2] Create `src/app/admin/login/page.tsx` (server): `if (await getAdminSession()) redirect("/admin")`; reads `searchParams.next`, renders a centred card with `Logo`, `loginCopy.title`, and `<LoginForm next={safeAdminReturnPath(next)} />`; `metadata.title = "Login"` (FR-012) — depends on T020, T030
- [ ] T032 [US2] Create `src/app/admin/(dashboard)/actions.ts` (`"use server"`): `logout()` → `try { await auth.api.signOut({ headers: await headers() }) } catch {}` then `logSecurityEvent({ type: "logout" })` and `redirect("/admin/login")` (FR-013; spec edge case "logout with no session") — depends on T016, T009
- [ ] T033 [US2] Create minimal `src/app/admin/(dashboard)/layout.tsx` (server): `const session = await requireAdminSession()`; renders `{children}` plus a temporary top strip with `session.email` and `<form action={logout}><Button>Logout</Button></form>` (US4 replaces the strip with `AdminShell`); and `src/app/admin/(dashboard)/page.tsx` rendering an `<h1>Overview</h1>` placeholder (FR-008 "goes to /admin", FR-013, FR-022) — depends on T020, T032
- [ ] T034 [US2] Vitest unit test in `src/app/admin/login/actions.test.ts` with `auth.api.signInEmail` mocked: 401 `APIError` → `{ error: "generic" }`; 429 → `{ error: "blocked" }`; thrown `MongoServerSelectionError` whose message contains a fake connection string → `{ error: "unavailable" }` and the returned object contains no text from that error; honeypot filled → generic without calling the mock; success → `redirect` called with `/admin` for `next=https://evil.com` and `/admin/news` for `next=/admin/news` (FR-009, FR-014, FR-016; SC-009) — depends on T029
- [ ] T035 [US2] Playwright `e2e/admin-login-logout.spec.ts`: correct credentials → URL `/admin` and email visible; `page.reload()` → still `/admin`; visit `/admin/login` while logged in → `/admin`; logout → `/admin/login` and `/admin` now redirects; wrong password / wrong email / unknown email → the three alert texts are strictly equal (SC-004); upper-cased email + correct password → success (FR-010) (US2 scenarios 1–8) — depends on T031, T033, T015

**Checkpoint**: The admin can log in, stay logged in, and log out; failures leak nothing.

---

## Phase 5: User Story 3 - Protected admin area (Priority: P1)

**Goal**: Every admin page except login redirects logged-out visitors to login and returns them afterwards; every admin API request without a valid session is 401; expired sessions equal no session.

**Independent Test**: Logged out: request `/admin/news` → `/admin/login?next=/admin/news`; log in → land on `/admin/news`; `GET /api/admin/session` → 401. Backdate a session's `expiresAt` → both behave as logged out.

### Implementation for User Story 3

- [ ] T036 [US3] Create `src/proxy.ts` with `export const config = { matcher: ["/admin/:path*"] }` and `proxy(request)`: if `pathname !== "/admin/login"` and `!getSessionCookie(request)` (`better-auth/cookies`) → `NextResponse.redirect(new URL("/admin/login?next=" + encodeURIComponent(pathname + search), request.url))`; otherwise `NextResponse.next()`; no DB access (contracts/http-and-actions.md "Page-level redirects"; FR-015; research.md §2) — depends on T016
- [ ] T037 [P] [US3] Create `src/app/api/admin/session/route.ts`: `GET` → `const s = await requireAdminSession({ mode: "api" })`; `null` → `Response.json({ error: "unauthorized" }, { status: 401 })`; else `Response.json({ email: s.email })`; both with `Cache-Control: no-store` (FR-017; contracts `/api/admin/session`) — depends on T020
- [ ] T038 [US3] Add placeholder routes so redirect-and-return has real targets: `src/app/admin/(dashboard)/news/page.tsx`, `messages/page.tsx`, `signups/page.tsx`, `settings/page.tsx`, each `await requireAdminSession()` then render `<h1>{title}</h1>` (US4 swaps in `AdminPlaceholder`) (FR-015, FR-024) — depends on T033
- [ ] T039 [US3] Vitest `[DB]` tests in `src/app/api/admin/session/route.test.ts`: `GET` with no cookie → 401 body `{ error: "unauthorized" }` and header `cache-control: no-store`; with the cookie from `auth.api.signInEmail({ returnHeaders: true })` → 200 `{ email }`; after `updateOne` sets that session's `expiresAt` to yesterday → 401 (FR-017, FR-018; spec Acceptance "every admin API route") — depends on T037, T024, T014
- [ ] T040 [US3] Playwright `e2e/admin-protected.spec.ts`: logged out `/admin`, `/admin/news`, `/admin/settings` → `/admin/login?next=…`; log in from the `/admin/news` redirect → land on `/admin/news` (US3 scenario 2); `next=https://evil.com` → `/admin` (scenario 3); `request.get("/api/admin/session")` without cookies → 401 (scenario 4); with a garbage `better-auth.session_token` cookie → `/admin` redirects to login and the API returns 401 (scenario 5: stale cookie passes proxy but fails DAL); logged in → 200 with email (scenario 6) — depends on T036, T037, T038, T015

**Checkpoint**: The admin area is closed to anyone without a live session, at both page and API level.

---

## Phase 6: User Story 4 - Admin layout (Priority: P2)

**Goal**: The admin area renders its own shell — sidebar (Overview, News, Messages, Signups, Settings; active item marked), top bar with the admin's email and Logout, collapsing to a menu button below `lg` — with placeholder pages, no public header/footer, and `noindex`.

**Independent Test**: Log in; each of the five sections highlights its sidebar entry and shows the email in the top bar; the public header/footer are absent; at 375/768 a menu button opens the same five links; at 1024/1440 the sidebar is visible.

### Implementation for User Story 4

- [ ] T041 [P] [US4] Create `src/components/admin/admin-sidebar.tsx` (`"use client"`): `usePathname()`; renders `adminNavItems` as a `<nav aria-label="Admin">` list; an item is active when `pathname === href` or (`href !== "/admin"` and `pathname.startsWith(href + "/")`); active item gets `aria-current="page"` and an accent left border (`border-accent`); container `bg-primary text-surface w-admin-sidebar font-button` (FR-021; research.md §12) — depends on T027, T004
- [ ] T042 [P] [US4] Create `src/components/admin/admin-top-bar.tsx` (server): `h-admin-topbar border-b border-neutral-100`, shows `email` (`text-text-muted font-button`) and `<form action={logout}><Button variant="outline" type="submit">Logout</Button></form>`; accepts a `menuSlot` prop for the mobile button (FR-022) — depends on T032, T004
- [ ] T043 [P] [US4] Create `src/components/admin/admin-mobile-nav.tsx` (`"use client"`): rendered `lg:hidden`; a `Button` with `aria-expanded`, `aria-controls`, `lucide-react` `Menu`/`X` icon and visible text "Menu"; toggles a `motion` drawer (respecting `prefers-reduced-motion`) containing `<AdminSidebar />`; closes on Escape, on link click, and on backdrop click; returns focus to the button on close (FR-023; pattern from `src/components/site-shell/nav-mobile.tsx`) — depends on T041
- [ ] T044 [US4] Create `src/components/admin/admin-shell.tsx` (server): `<div className="flex min-h-full">` with `<aside className="hidden lg:block"><AdminSidebar /></aside>` and a column holding `<AdminTopBar email menuSlot={<AdminMobileNav />} />` and `<main id="admin-content" className="flex-1 …">{children}</main>` using spacing tokens only (FR-020, FR-023) — depends on T041, T042, T043
- [ ] T045 [P] [US4] Create `src/components/admin/admin-placeholder.tsx` (server): `<h1 className="font-heading text-h3 text-text">{title}</h1>` + `placeholderCopy.comingSoon` paragraph (FR-024) — depends on T027
- [ ] T046 [US4] Replace the temporary strip in `src/app/admin/(dashboard)/layout.tsx` with `<AdminShell email={session.email}>{children}</AdminShell>`, and switch `page.tsx`, `news/page.tsx`, `messages/page.tsx`, `signups/page.tsx`, `settings/page.tsx` to `<AdminPlaceholder title="…" />` with per-page `metadata.title` (FR-020, FR-024) — depends on T044, T045, T038
- [ ] T047 [P] [US4] Vitest test in `src/components/admin/admin-sidebar.test.tsx` (jsdom, `next/navigation` mocked): renders exactly the five labels in order; `pathname=/admin/news/123` marks News active and nothing else; `pathname=/admin` marks only Overview (FR-021) — depends on T041
- [ ] T048 [US4] Playwright `e2e/admin-layout.spec.ts`: logged in, for each of the five hrefs assert the `aria-current="page"` link text and the top-bar email, and that the public `banner` and `contentinfo` landmarks are absent; `<meta name="robots">` contains `noindex`; at 375 and 768 the sidebar `nav` is hidden and the "Menu" button opens it with the same five links, Escape closes it; at 1024 and 1440 the sidebar is visible and no menu button is rendered; no horizontal overflow (`scrollWidth <= clientWidth`) at all four widths; `/` contains no link whose `href` starts with `/admin` (FR-020–FR-026; SC-006) — depends on T046, T015

**Checkpoint**: The admin has a real, responsive shell that later features only add pages to.

---

## Phase 7: User Story 5 - Login abuse protection (Priority: P2)

**Goal**: 5 failures per source or 20 per account within 15 minutes block further attempts (even with the correct password) for 15 minutes with a clear message; the block persists across restarts; success clears the counters.

**Independent Test**: Submit 5 wrong passwords → "Too many attempts" even with the right one; backdate `blockedUntil` → login works; the throttle rows live in MongoDB so a restart cannot lose them.

### Implementation for User Story 5

- [ ] T049 [US5] Create `src/lib/login-lockout.ts` exporting `loginLockoutBefore` and `loginLockoutAfter` built with `createAuthMiddleware` (`better-auth/api`): both return early unless `ctx.path === "/sign-in/email"`; derive `ip = getIP(ctx.headers, ctx.context.options) ?? "unknown"` and `email` from `ctx.body.email` (trim/lowercase); **before**: if `isBlocked("login:ip:"+ip) || isBlocked("login:email:"+email)` → `logSecurityEvent({ type: "login_blocked", ip, email })` and `throw new APIError("TOO_MANY_REQUESTS", { message: "Too many attempts", code: "LOGIN_BLOCKED" })`; **after**: if `ctx.context.returned instanceof APIError && ctx.context.returned.status === 401` → `recordFailure` for both keys with `LOGIN_IP_POLICY` / `LOGIN_EMAIL_POLICY` and `logSecurityEvent({ type: "login_failed", ip, email })`; if `ctx.context.newSession` → `clearKeys([...])` (FR-027, FR-028, FR-029, FR-034; research.md §6) — depends on T011, T009, T016
- [ ] T050 [US5] Wire `hooks: { before: loginLockoutBefore, after: loginLockoutAfter }` into `src/lib/auth.ts` (FR-027) — depends on T049
- [ ] T051 [US5] Vitest `[DB]` tests in `src/lib/login-lockout.test.ts` using `auth.api.signInEmail` with a seeded admin and `headers` carrying `x-forwarded-for`: 4 failures from ip A → 5th fails 401, 6th (correct password) → `APIError` 429 with code `LOGIN_BLOCKED`; 20 failures against the admin email spread over 20 distinct ips → the 21st from a fresh ip is 429 (per-account key); backdating `blockedUntil` on both keys → correct password succeeds and both `throttle` rows are deleted (FR-029); a second `betterAuth` instance (simulated restart) sees the same block because it reads the `throttle` collection (FR-028); `POST /api/auth/sign-in/email` through the route handler from T017 is also 429 once blocked (US5 scenarios 1–6; SC-005) — depends on T050, T024, T017, T014
- [ ] T052 [US5] Playwright `e2e/admin-lockout.spec.ts` (`mode: "serial"`, calls `clearThrottle()` from `e2e/global-setup.ts` in `beforeAll`): 5 wrong passwords → alert text equals `loginCopy.errors.blocked` on the 6th attempt with the **correct** password; `request.post("/api/auth/sign-in/email")` with correct credentials → 429 while blocked (US5 scenarios 2–3; spec Acceptance "blocked-after-repeated-failures") — depends on T050, T035

**Checkpoint**: Password guessing is bounded per source and per account, and the block cannot be bypassed or lost.

---

## Phase 8: User Story 6 - Shared building blocks for later features (Priority: P3)

**Goal**: Soft delete, public-form protection, and a detail-free health check exist and are tested so features 003–007 adopt them.

**Independent Test**: A throwaway model soft-deletes → hidden → restores; the form wrapper refuses the 6th submission and silently drops honeypot hits; `/api/health` returns `ok` or `unavailable` and nothing else.

### Implementation for User Story 6

- [ ] T053 [P] [US6] Create `src/lib/soft-delete.ts`: Mongoose plugin `softDeletePlugin(schema)` adding `deletedAt: { type: Date, default: null, index: true }`; `pre` hooks on `find`, `findOne`, `countDocuments`, `findOneAndUpdate`, `updateOne`, `updateMany` that add `{ deletedAt: null }` unless `this.getOptions().withDeleted === true`; `pre("aggregate")` that unshifts `{ $match: { deletedAt: null } }` unless `this.options.withDeleted`; statics `softDeleteById(id)` and `restoreById(id)` (the latter queries with `withDeleted: true`); export a `SoftDeleteModel<T>` type (FR-030; data-model.md "Shared plugin"; research.md §8) — depends on T008
- [ ] T054 [US6] Vitest `[DB]` tests in `src/lib/soft-delete.test.ts` with an ad-hoc `TestItem` model: after `softDeleteById`, `find`/`findOne`/`countDocuments`/`aggregate` exclude it; `find().setOptions({ withDeleted: true })` includes it; `restoreById` brings it back with all original fields equal; `updateMany` skips deleted rows (US6 scenarios 1–2) — depends on T053, T014
- [ ] T055 [P] [US6] Create `src/lib/public-form.ts`: `protectPublicForm(request: Request, { name, max = PUBLIC_FORM_POLICY.max, windowSeconds = PUBLIC_FORM_POLICY.windowSeconds }, body?: FormData | Record<string, unknown>)` → `{ kind: "honeypot" }` when `isHoneypotTripped(body)`, `{ kind: "limited", retryAfterSeconds }` when `checkRateLimit({ key: "form:"+name+":ip:"+ip })` refuses (ip from `x-forwarded-for` / `x-real-ip` / `"unknown"`), else `{ kind: "ok" }`; plus `tooManyRequestsResponse(retryAfterSeconds)` → `Response.json({ error: "too_many_requests" }, { status: 429, headers: { "Retry-After": … } })` (FR-031; contracts "Public-form protection wrapper") — depends on T011, T013
- [ ] T056 [US6] Vitest `[DB]` tests in `src/lib/public-form.test.ts` with constructed `Request` objects: 5 calls `ok`, 6th `limited` with `retryAfterSeconds > 0`; a different ip is unaffected; honeypot-filled body → `honeypot` **without** consuming a rate-limit slot; `tooManyRequestsResponse` has status 429, `Retry-After`, and exactly `{ error: "too_many_requests" }` (US6 scenarios 3–4) — depends on T055, T014
- [ ] T057 [P] [US6] Create `src/app/api/health/route.ts`: `GET` → `await connectDb()` then `mongoose.connection.db.admin().ping()` raced against a 2 s timeout; success → `Response.json({ status: "ok" })`, any failure → `Response.json({ status: "unavailable" }, { status: 503 })`; both `Cache-Control: no-store`; `export const dynamic = "force-dynamic"`; the catch block never serialises the error (FR-032; research.md §9) — depends on T008
- [ ] T058 [US6] Vitest tests in `src/app/api/health/route.test.ts`: `[DB]` real ping → 200 and `Object.keys(body)` equals `["status"]`; with `connectDb` mocked to reject with an error whose message contains a fake connection string → 503, body exactly `{ status: "unavailable" }`, and the response text does not contain the fake string (US6 scenarios 5–6; SC-009) — depends on T057, T014
- [ ] T059 [US6] Playwright `e2e/admin-primitives.spec.ts`: `request.get("/api/health")` → 200 `{ status: "ok" }` with `cache-control: no-store`; `request.post("/api/auth/sign-up/email")` → 400 (the always-on API-level guard; complements T026) (US6 scenario 5; FR-001) — depends on T057, T015

**Checkpoint**: All six stories are independently functional and tested.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Documentation, lint/type gates, and the full DoD run.

- [ ] T060 [P] Update `docs/architecture.md`: record the `(public)` route group + `PublicShell`, `src/proxy.ts` (not `middleware.ts`), `src/lib/dal.ts`, `src/lib/rate-limit.ts` / `throttle` collection, `src/lib/public-form.ts`, `src/instrumentation.ts`, and the `dar_e_arqam_test` database convention; replace "Hosting: TODO" with a note that `advanced.ipAddress.ipAddressHeaders` must be revisited once hosting is chosen (plan.md risk 1)
- [ ] T061 [P] Update `README.md` with the quickstart.md §1–§4 steps (configure, seed, run, verify)
- [ ] T062 Run `npm run lint` and `npx tsc --noEmit`; fix any findings (no raw values in `src/components/admin/**`, no `any`, no unused exports)
- [ ] T063 Run the full gate: `npm test` (once with `MONGODB_URI` set so `[DB]` suites execute, once unset to confirm they skip with the notice) and `npx playwright test` — all 001 and 002 specs pass; confirm `admin-layout.spec.ts` ran at all four widths
- [ ] T064 Walk `specs/002-foundation/quickstart.md` end-to-end on a clean `.env.local` (including starting `next dev` with `BETTER_AUTH_SECRET` unset to see the named-variable failure) and tick each step; record any discrepancy back into quickstart.md

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: T001 first (packages); T002–T004 in parallel after it.
- **Foundational (Phase 2)**: depends on Phase 1. Internal order: T005 → {T006, T007, T008} → {T009, T010, T014, T016, T018} → {T011, T013, T017, T019, T020} → T012; the T021 → T022 → T023 chain is independent of the auth chain and can run alongside it. **Blocks all stories.**
- **US1 (Phase 3)**: after Phase 2. T024 → T025; T026 also needs T015/T017.
- **US2 (Phase 4)**: after Phase 2. Its e2e (T035) logs in as the admin seeded by US1's script, but its code (T027–T034) does not depend on US1 code.
- **US3 (Phase 5)**: after US2 (needs `/admin` pages and the login flow to redirect back to).
- **US4 (Phase 6)**: after US3 (replaces the temporary strip/placeholders from T033/T038).
- **US5 (Phase 7)**: after Phase 2 for code (T049–T051); T052 needs US2's login page.
- **US6 (Phase 8)**: after Phase 2 only — fully independent of US1–US5.
- **Polish (Phase 9)**: after every story you intend to ship.

### User Story Dependencies

| Story | Depends on | Reason |
|---|---|---|
| US1 Account setup | Foundational | — |
| US2 Login/logout | Foundational (+ US1 data for e2e) | e2e logs in as the seeded admin |
| US3 Protected area | US2 | redirects return to pages US2 created |
| US4 Admin layout | US3 | upgrades US2/US3's temporary layout and placeholders |
| US5 Abuse protection | Foundational (+ US2 for e2e) | hooks are code-independent; e2e uses the form |
| US6 Building blocks | Foundational | independent |

### Parallel Opportunities

- Phase 1: T002, T003, T004 together.
- Phase 2: {T006, T007, T008} together; then {T009, T010, T014, T016, T018} together; then {T011, T013, T017, T019, T020} together; the T021 → T022 → T023 chain alongside all of it.
- US2: T027 first, then T028 ‖ T029; T030 after both; T031 ‖ T032; T034 with T033.
- US3: T036 ‖ T037 ‖ T038.
- US4: T041 ‖ T042 ‖ T045 → T043 → T044 → T046; T047 alongside T043.
- US6: T053 ‖ T055 ‖ T057 → their three test files in parallel → T059.
- US5 and US6 can be worked by a second developer as soon as Phase 2 lands.

---

## Parallel Example: Phase 2 second wave

```bash
# After T005–T008 land, launch together (different files, no shared state):
Task: "T009 Create src/lib/log.ts"
Task: "T010 Create src/models/throttle.ts"
Task: "T014 Create src/test/db.ts + vitest.config.ts environment globs"
Task: "T016 Create src/lib/auth.ts"
Task: "T018 Create src/lib/validation/login.ts and return-path.ts"
Task: "T021 Create src/components/site-shell/public-shell.tsx"
```

## Parallel Example: User Story 6

```bash
Task: "T053 Create src/lib/soft-delete.ts"
Task: "T055 Create src/lib/public-form.ts"
Task: "T057 Create src/app/api/health/route.ts"
# then
Task: "T054 soft-delete.test.ts"  Task: "T056 public-form.test.ts"  Task: "T058 health/route.test.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 → Phase 2 (including the `(public)` move and a green 001 suite).
2. Phase 3 (US1): the seed command and its tests.
3. **STOP and VALIDATE**: one admin exists, re-run is a no-op, `--reset` works, the sign-up route is 400.

### Incremental Delivery

1. + US2 → the admin can log in/out (temporary strip layout) → demo.
2. + US3 → the area is closed at page and API level → demo.
3. + US4 → real dashboard shell at all four widths → demo (the milestone later features build on).
4. + US5 → lockout → demo.
5. + US6 → primitives ready for 003/004/007.
6. Phase 9 gates.

### Parallel Team Strategy

After Phase 2: Developer A takes US1 → US2 → US3 → US4 (sequential chain); Developer B takes US6 then US5 code (T049–T051), joining A for T052 once the login page exists.

---

## Notes

- `[DB]` test files must use `describeWithDb` from T014 so a machine without `MONGODB_URI` still gets a green (skipped-with-notice) run.
- Never put a raw color/size in `src/components/admin/**`; add a token in `src/app/globals.css` first (Constitution V).
- Every new `src/app/admin/**/page.tsx` and `src/app/api/admin/**/route.ts` calls `requireAdminSession` itself — the layout and `proxy.ts` are not the guard (Constitution III; research.md §2).
- Commit after each checkpoint; commit the 001 work **before** T022 so the move is recorded as renames.
