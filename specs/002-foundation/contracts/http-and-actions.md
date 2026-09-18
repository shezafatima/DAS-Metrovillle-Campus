# Contract: HTTP routes and Server Actions — Foundation (002)

All admin data requests verify the session on the server (Constitution
III, FR-017). Public routes never require a session. Every error body is
generic; no route ever returns stack traces, connection details, or
password/session material.

## Namespaces (from `docs/architecture.md`)

| Prefix | Auth | Owner |
|---|---|---|
| `/api/auth/*` | Better Auth's own rules | Better Auth handler (`src/app/api/auth/[...all]/route.ts`) |
| `/api/admin/*` | session required → else `401` | Application |
| `/api/public/*` | none; rate limit + honeypot | Application (no routes in this feature; the wrapper is delivered) |
| `/api/health` | none | Application |

---

## Server Actions (login page)

### `login(prevState, formData)` — `src/app/admin/login/actions.ts`

Input (FormData): `email`, `password`, `next?`, plus the honeypot field
(name from `src/lib/honeypot.ts`).

| Condition | Result |
|---|---|
| Honeypot filled | Returns the generic wrong-credentials state without calling auth (not counted as a failure). |
| Zod validation fails (bad email shape, empty password) | `{ error: "generic" }` — same copy as wrong credentials; never says which field. |
| `auth.api.signInEmail` → `APIError` 401 | `{ error: "generic" }` — copy: "The email or password is incorrect." |
| `auth.api.signInEmail` → `APIError` 429 (`LOGIN_BLOCKED` or Better Auth rate limit) | `{ error: "blocked" }` — copy: "Too many attempts. Please try again later." |
| Any other error (DB unreachable, unexpected) | `{ error: "unavailable" }` — copy: "The service is temporarily unavailable. Please try again later." Error is logged server-side without the password. |
| Success | Session cookie set by `nextCookies()`; `redirect(safeAdminReturnPath(next))`. |

Timing: the action does no extra work on the failure branches; Better
Auth's dummy hash on unknown email keeps the 401 paths comparable (FR-009).

### `logout()` — `src/app/admin/(dashboard)/actions.ts`

Calls `auth.api.signOut({ headers })`; always `redirect("/admin/login")`,
even when no session exists (spec edge case "logout with no session").

---

## Route handlers

### `GET /api/admin/session`

The reference admin route that every later `/api/admin/*` route copies.

| Session | Status | Body |
|---|---|---|
| valid | `200` | `{ "email": "<admin email>" }` |
| absent / expired / invalid | `401` | `{ "error": "unauthorized" }` |

Headers: `Cache-Control: no-store`. Session is read with
`requireAdminSession()` from the DAL, never from the client.

### `GET /api/health`

| Data store | Status | Body |
|---|---|---|
| ping succeeds within 2 s | `200` | `{ "status": "ok" }` |
| ping fails / times out / connection error | `503` | `{ "status": "unavailable" }` |

Headers: `Cache-Control: no-store`. No other fields ever (FR-032).

### `/api/auth/*` (Better Auth)

Mounted via `toNextJsHandler(auth)`. Behaviour relevant to this feature:

| Endpoint | Expected |
|---|---|
| `POST /api/auth/sign-up/email` | `400` `EMAIL_PASSWORD_SIGN_UP_DISABLED` — proves FR-001 for the API path. |
| `POST /api/auth/sign-in/email` | Subject to the same lockout hooks as the Server Action: `429` once a key is blocked. Otherwise `401` generic or `200` + cookie. |
| `GET /api/auth/get-session` | `200` session JSON or `null` body when none. |
| `POST /api/auth/sign-out` | Clears the cookie. |

---

## Public-form protection wrapper (delivered, not yet mounted)

`protectPublicForm(request, { name, max = 5, windowSeconds = 600 })` in
`src/lib/public-form.ts`:

| Case | Behaviour |
|---|---|
| Honeypot field present and non-empty | Returns `{ kind: "honeypot" }`; caller responds `200` with the same body it would send on success and stores nothing. |
| Rate limit exceeded for `form:<name>:ip:<ip>` | Returns `{ kind: "limited", retryAfterSeconds }`; caller responds `429` with `Retry-After` and `{ "error": "too_many_requests" }`. |
| Otherwise | Returns `{ kind: "ok" }` and the caller proceeds. |

---

## Page-level redirects (`src/proxy.ts`, matcher `/admin/:path*`)

| Request | Session cookie | Result |
|---|---|---|
| `/admin/**` except `/admin/login` | absent | `307` → `/admin/login?next=<original path>` |
| `/admin/**` except `/admin/login` | present | pass through (page does the authoritative check and redirects if the cookie is stale) |
| `/admin/login` | present | pass through (page checks the real session and redirects to `/admin` if valid; a stale cookie shows the form) |
| `/admin/login` | absent | pass through |

The proxy only inspects cookie presence (`getSessionCookie`) and never
touches the database (Next.js guidance; research §2).

---

## Data Access Layer (`src/lib/dal.ts`)

| Function | Behaviour |
|---|---|
| `getAdminSession()` | `auth.api.getSession({ headers })` → session or `null`. Never throws for "no session". |
| `requireAdminSession()` | For pages: `redirect("/admin/login?next=<current path>")` when null. For route handlers: pass `{ mode: "api" }` to get `null` back and respond `401`. |
