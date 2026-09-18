# Research: Foundation (002)

**Feature**: `002-foundation` | **Date**: 2026-09-17
**Purpose**: Resolve every technical unknown in the plan's Technical Context
before design. Each entry records the decision, why, and what was rejected.
Sources were verified against the installed Next.js docs
(`node_modules/next/dist/docs/`), the `better-auth@1.7.5` package tarball,
the Better Auth docs, and the npm registry — not from memory.

---

## 1. Dependency versions (new to the repo, all in the fixed stack)

**Decision**: add `better-auth@1.7.5`, `mongoose@9.10.1`, `zod@4.6.5`
(runtime); `tsx` is already a devDependency for running the seed script.

**Rationale**: All three are named in Constitution II; none is installed
yet (`package.json` has no auth/db/validation packages). Compatibility
verified: `mongoose@9.10.1` depends on `mongodb@~7.6`; `better-auth@1.7.5`
peer-accepts `mongodb ^6 || ^7` and itself depends on `zod ^4.5.4`, so one
`zod` v4 and one `mongodb` driver instance satisfy everything. This meets
`docs/architecture.md`'s rule "never install a different `mongodb` driver
version than Mongoose uses" — the driver is pulled in only by Mongoose and
handed to Better Auth via `mongoose.connection.getClient()`.

**Alternatives considered**: installing `mongodb` directly as a second
dependency (rejected: risks a second driver version); Better Auth's Kysely
or memory adapters (rejected: Mongo adapter is the architecture's choice
and the memory adapter would not persist sessions or blocks across
restarts).

---

## 2. Next.js 16 request-boundary conventions

**Decision**: use `src/proxy.ts` (not `middleware.ts`) for the optimistic
page-level redirect; `route.ts` handlers for `/api/*`; Server Actions for
the login/logout forms; `instrumentation.ts` `register()` for startup env
validation; route groups to split public vs admin layouts.

**Rationale** (from the installed docs):
- `proxy.md`: "The `middleware` file convention is deprecated and has been
  renamed to `proxy`." Proxy defaults to the Node.js runtime and the
  `runtime` segment option is not allowed there. It runs on every matched
  request including prefetches, so the docs recommend an *optimistic*
  cookie-only check with no database access — the authoritative check
  belongs in a Data Access Layer called by pages and handlers.
- `authentication.md` → "Layouts and auth checks": do not rely on a layout
  for enforcement (partial rendering); call `verifySession()` from the DAL
  in every page/handler. The layout may *fetch* the user for the top bar.
- `serverExternalPackages.md`: `mongoose` and `mongodb` are already on the
  automatic server-external list — no `next.config.ts` change needed.
- `generate-metadata.md` → `robots`: `metadata.robots = { index: false,
  follow: false }` on the admin segment emits `<meta name="robots"
  content="noindex, nofollow">` for every admin page.
- `not-found.md`: only root `app/not-found.tsx` handles unmatched URLs, so
  it must stay at the root; a route group cannot own it.

**Alternatives considered**: a second root layout per group (rejected:
would need the experimental `global-not-found.js` to keep a shell-wrapped
404; a single root layout with a `(public)` group layout is simpler);
enforcing auth only in `proxy.ts` (rejected by the docs and by
Constitution III — API routes must verify the session server-side).

---

## 3. Route-group layout split

**Decision**:
- `src/app/layout.tsx` (root) keeps `<html>`, `<body>`, fonts and
  `globals.css` only.
- `src/app/(public)/layout.tsx` renders `SkipLink + Header + <main> +
  Footer` (extracted into `src/components/site-shell/public-shell.tsx`).
  All existing public pages move under `(public)/` (a `git mv`, no code
  change; URLs are unchanged because groups do not affect paths).
- `src/app/not-found.tsx` stays at the root and renders inside
  `<PublicShell>` explicitly so the 404 keeps the public chrome.
- `src/app/admin/layout.tsx` sets admin metadata (`robots: noindex`) and
  nothing visual; `src/app/admin/login/page.tsx` is bare; every protected
  page lives under `src/app/admin/(dashboard)/` whose `layout.tsx` renders
  the sidebar + top bar shell.

**Rationale**: FR-020 requires the admin area to omit the public header
and footer, which the root layout currently hard-codes. Route groups are
the App Router's designed mechanism for this and keep one root layout so
the global 404 still works. The `(dashboard)` group lets `/admin/login`
share admin metadata but not the sidebar.

**Alternatives considered**: reading the pathname in the root layout to
conditionally render the header (rejected: server layouts cannot read the
pathname without a header hack, and it re-couples the shells);
client-side hiding (rejected: ships public chrome into the admin bundle).

---

## 4. Better Auth configuration

**Decision** (`src/lib/auth.ts`):

```ts
betterAuth({
  database: mongodbAdapter(db, { client }),   // from the cached Mongoose connection
  emailAndPassword: { enabled: true, disableSignUp: true, minPasswordLength: 12 },
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  rateLimit: { enabled: true, storage: "database", window: 60, max: 30,
               customRules: { "/sign-in/email": { window: 60, max: 10 } } },
  hooks: { before: lockoutBefore, after: lockoutAfter },
  plugins: [nextCookies()],
  advanced: { ipAddress: { ipAddressHeaders: ["x-forwarded-for", "x-real-ip"] } },
})
```

Verified facts behind each line:
- `mongodbAdapter` is exported from `better-auth/adapters/mongodb`; passing
  `client` enables transactions. Better Auth owns `user`, `session`,
  `account`, `verification`, `rateLimit` collections (architecture doc).
- `disableSignUp: true` makes `signUpEmail` throw
  `EMAIL_PASSWORD_SIGN_UP_DISABLED` for **both** the HTTP route and the
  server-side `auth.api.signUpEmail` call (sign-up.ts source). This
  satisfies FR-001 "no account-creation request available anywhere" and
  means the seed script cannot use `signUpEmail` (see §5).
- `minPasswordLength: 12` enforces FR-004 at the auth layer too; the seed
  script checks first so the message is friendlier.
- `session.expiresIn` 7 days + `updateAge` 1 day gives a rolling window:
  a visit more than a day after the last refresh pushes expiry out to 7
  days from now; no visit for 7 days expires it (spec Clarification 1).
  `updateAge` shorter than 1 day would write the session on nearly every
  request for no user-visible gain.
- Sign-in errors: both "user not found" and "wrong password" throw
  `UNAUTHORIZED` / `INVALID_EMAIL_OR_PASSWORD`, and the not-found path
  performs a dummy `password.hash` to equalise timing (sign-in.ts source).
  FR-009's identical-message and comparable-timing requirements are met by
  the library; the login action maps this one error to the spec's generic
  copy.
- Email is lower-cased by Better Auth on sign-in and sign-up; the Zod
  schema additionally trims (FR-010; architecture "emails lowercased and
  trimmed").
- `nextCookies()` (from `better-auth/next-js`) is required so
  `auth.api.signInEmail` / `signOut` called inside Server Actions set and
  clear the session cookie.
- Built-in `rateLimit` is a *per-IP request counter* over `/api/auth/*`
  only; it does not count failures and does not run for server-side
  `auth.api` calls. It stays on with `storage: "database"` (persists across
  restarts, as the architecture requires for serverless hosting) as
  defence-in-depth for the HTTP surface, but it is **not** the mechanism
  that implements the spec's lockout (see §6).
- `getSessionCookie(request)` from `better-auth/cookies` gives `proxy.ts`
  the cookie-presence check without hard-coding the cookie name or its
  `__Secure-` production prefix.

**Alternatives considered**: not mounting `/api/auth/*` at all (rejected:
`docs/architecture.md` reserves that namespace and the handler is the
supported way to expose sign-out/get-session to any future client; the
lockout in §6 protects it); `cookieCache` (rejected: not needed for a
single admin and adds a stale-session window after reset).

---

## 5. Seeding the single admin with sign-up disabled

**Decision**: `scripts/seed-admin.ts` (run via `tsx`) uses Better Auth's
internal adapter through `await auth.$context`:

1. Validate `ADMIN_EMAIL`/`ADMIN_PASSWORD` with the shared Zod env schema
   (missing → exit 1 naming the variable; password < 12 → exit 1 with the
   minimum).
2. `ctx.internalAdapter.findUserByEmail(email)`:
   - none and no `--reset` → `createUser({ email, name, emailVerified: true },
     { method: "email-password" })` then `linkAccount({ userId,
     providerId: "credential", accountId: userId, password: await
     ctx.password.hash(password) })` — exactly the sequence `signUpEmail`
     performs internally. Exit 0, "created".
   - exists and no `--reset` → exit 0, "already exists, nothing changed".
   - exists and `--reset` → `updatePassword(userId, await
     ctx.password.hash(password))` then `deleteUserSessions(userId)`
     (Clarification 3). Exit 0, "password updated, sessions ended".
   - none and `--reset` → same as create (spec edge case).
3. A unique index on `user.email` (created by the script if absent) plus
   `countTotalUsers()` guard make FR-006 hold under concurrent runs: the
   second concurrent insert fails on the unique index and the script
   reports "already exists".

Verified: `$context` is returned by `betterAuth()` (auth/base.mjs), and
`internal-adapter.ts` exposes `findUserByEmail`, `createUser`,
`linkAccount`, `updatePassword`, `deleteUserSessions`, `countTotalUsers`
with the signatures above.

**Alternatives considered**: the `admin` plugin's `createUser` /
`setUserPassword` / `revokeUserSessions` (rejected: it adds `role`,
`banned`, `banReason`, `banExpires` fields and a family of user-management
endpoints — roles are explicitly out of scope, and the extra endpoints are
attack surface with no consumer); toggling `disableSignUp` off during the
seed (rejected: a race window and a second config path).

---

## 6. Login lockout (spec Clarification 2)

**Decision**: implement the dual-key failure counter as Better Auth
`hooks.before` / `hooks.after` on `ctx.path === "/sign-in/email"`, backed
by one Mongoose collection (`throttle`, see data-model.md):

- **before**: derive `ip` (`getIP(ctx.headers, options)` from
  `better-auth/api`) and `email` (normalised from `ctx.body`). If either
  `login:ip:<ip>` or `login:email:<email>` has `blockedUntil > now`, throw
  `new APIError("TOO_MANY_REQUESTS", { code: "LOGIN_BLOCKED" })`.
- **after**: if `ctx.context.returned instanceof APIError` with status 401
  → increment both keys inside a 15-minute window; when a key reaches its
  threshold (ip 5, email 20) set `blockedUntil = now + 15 min`. If
  `ctx.context.newSession` exists → delete both keys (FR-029). Log the
  event (FR-034).

**Rationale**: hooks run for both the Server Action path (`auth.api.*`
goes through `dispatchAuthEndpoint`, verified in `to-auth-endpoints.mjs`)
and the HTTP `/api/auth/sign-in/email` route, so the lockout cannot be
bypassed by calling the API directly. The collection is in MongoDB, so it
survives restarts (FR-028) and the block's `blockedUntil` timestamp is
absolute, so a restart never extends it (spec edge case). A TTL index on
`expiresAt` cleans up stale rows.

**Alternatives considered**: Better Auth's built-in `rateLimit` (rejected
as the primary mechanism: counts all requests not failures, IP-only, no
per-account key, and does not apply to server-side calls); an in-memory
map (rejected: FR-028); lockout only in the Server Action (rejected: the
HTTP route would bypass it).

---

## 7. Public-form protection primitive (US6)

**Decision**: the same `throttle` collection and a `checkRateLimit({ key,
max, windowSeconds })` helper in `src/lib/rate-limit.ts` serve both the
login lockout and public forms; `src/lib/honeypot.ts` exports the hidden
field name and `isHoneypotTripped(formData)`. A `protectPublicForm(request,
{ name, max, window })` wrapper returns `429` with `Retry-After` when the
limit is hit, and a *successful-looking* `200` with no side effect when
the honeypot is filled (FR-031: "gives no indication of why").

**Rationale**: one storage primitive, one test surface. The wrapper is
exercised in this feature by a throwaway `POST /api/public/_probe` route
that exists only under `NODE_ENV=test` … **rejected** — test-only routes
leak into builds. Instead the wrapper is unit-tested directly with
constructed `Request` objects and a test DB; feature 004/007 add the real
routes.

---

## 8. Soft delete primitive (US6)

**Decision**: `src/lib/soft-delete.ts` exports a Mongoose plugin that adds
`deletedAt: Date | null` (indexed), pre-hooks on `find`, `findOne`,
`countDocuments`, `findOneAndUpdate`, `updateOne`, `updateMany` and
`aggregate` that add `{ deletedAt: null }` unless the query sets
`.setOptions({ withDeleted: true })`, and statics `softDeleteById(id)` /
`restoreById(id)`. Verified against a throwaway test model in Vitest.

**Rationale**: matches `docs/architecture.md` ("`deletedAt: Date | null`,
excluded by default through a shared Mongoose plugin") and Constitution
IV. Query-level filtering means later features cannot forget the filter.

**Alternatives considered**: a `deleted: boolean` flag (rejected: loses
when); a separate archive collection (rejected: restore becomes a move and
unique indexes get complicated).

---

## 9. Health check

**Decision**: `GET /api/health` runs `mongoose.connection.db.admin().ping()`
with a 2-second timeout and returns `200 { status: "ok" }` or `503
{ status: "unavailable" }`, `Cache-Control: no-store`, nothing else. The
handler catches every error and never serialises it (FR-032, SC-009).

**Alternatives considered**: returning version/uptime (rejected: "without
exposing any details").

---

## 10. Environment validation

**Decision**: `src/lib/env.ts` parses `process.env` once with Zod
(`MONGODB_URI`, `BETTER_AUTH_SECRET` ≥ 32 chars, `BETTER_AUTH_URL` url;
`ADMIN_EMAIL`/`ADMIN_PASSWORD` in a separate `seedEnv` schema used only by
the script). `src/instrumentation.ts` `register()` calls it so the app
fails at startup with `Missing required environment variable: X`
(FR-033, spec edge case). Cloudinary variables are not required by this
feature and are left to the feature that uses them.

**Alternatives considered**: lazy validation on first DB access (rejected:
"fail early" is the requirement).

---

## 11. Test strategy for database-backed code

**Decision**: Vitest tests that need MongoDB connect to
`MONGODB_URI` with `MONGODB_DB_NAME=dar_e_arqam_test` (each test file drops
its collections in `beforeEach`) and are skipped with a visible notice when
`MONGODB_URI` is unset. Pure logic (lockout arithmetic, honeypot, env
schema, safe-return-path check) is tested without a DB. Playwright e2e
runs against the dev server with the same test database and seeds the
admin via the script in `globalSetup`.

**Rationale**: `mongodb-memory-server` would be a new dev dependency that
downloads a MongoDB binary at install time; this sandbox has already
needed a workaround for the Playwright CDN, so a network-dependent binary
is a reliability risk, and it is not in the fixed stack. Atlas Flex
supports multiple databases per cluster, so a `_test` database costs
nothing.

---

## 12. Admin visual language

**Decision**: the admin shell uses existing tokens only — `--color-primary`
(sidebar background), `--color-surface`, `--color-text`,
`--color-text-muted`, `--color-neutral-100` (borders), `--color-accent`
(active item indicator), `--font-heading` for titles and `--font-button`
(Open Sans, already loaded) as the admin UI text face because the site's
body face has no web equivalent. No new token is needed for colors; two
layout tokens are added to `@theme` (`--spacing-admin-sidebar: 240px`,
`--spacing-admin-topbar: 56px`) so the shell has no raw values
(Constitution V). Sidebar collapses below Tailwind's `lg` (1024px), the
same gate the public nav already uses, which matches FR-023's breakpoints
exactly (375/768 collapsed, 1024/1440 open).

**Alternatives considered**: shadcn's `sidebar` block (rejected: it pulls
a large component set and its own `--sidebar-*` palette; the spec asks for
a clean standard dashboard and the mobile drawer already has a proven
pattern in `nav-mobile.tsx`).
