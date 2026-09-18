# Data Model: Foundation (002)

**Feature**: `002-foundation` | **Date**: 2026-09-17
**Store**: one MongoDB database (Atlas Flex) reached through one cached
Mongoose connection (`src/lib/db.ts`). Two owners share it:

| Owner | Collections | Rule |
|---|---|---|
| Better Auth | `user`, `session`, `account`, `verification`, `rateLimit` | App code never defines Mongoose models for these or writes to them (architecture doc). The seed script is the one sanctioned exception and goes through Better Auth's own internal adapter. |
| Application (Mongoose) | `throttle` | Defined in `src/models/`. Uses the shared plugins where relevant. |

Later features add `news`, `message`, `signup` under the application
owner and adopt the soft-delete plugin defined here.

---

## Better Auth-owned entities (shape as Better Auth 1.7 creates them)

### Admin → `user`

| Field | Type | Notes |
|---|---|---|
| `_id` | string id | Better Auth generated |
| `email` | string | Stored lower-cased and trimmed. **Unique index** (created by the seed script if absent) — this is what makes FR-006 hold under concurrency. |
| `name` | string | Set to the local part of the email by the seed script; not shown anywhere yet. |
| `emailVerified` | boolean | Seed sets `true`; no verification flow exists. |
| `createdAt`, `updatedAt` | Date | |

Invariant: **exactly one document** at all times (FR-006). Enforced by the
unique email index plus the seed script's existence check; no code path
other than the seed script can insert here because `disableSignUp: true`.

### Credential → `account`

| Field | Type | Notes |
|---|---|---|
| `userId` | ref user | |
| `providerId` | `"credential"` | |
| `accountId` | string | = userId for credential accounts |
| `password` | string | scrypt hash produced by `ctx.password.hash` (FR-007). Never logged, never returned. |

### Session → `session`

| Field | Type | Notes |
|---|---|---|
| `token` | string | Cookie value; never logged (FR-034). |
| `userId` | ref user | |
| `expiresAt` | Date | `createdAt + 7 days`, pushed forward on a visit ≥ 1 day after the last refresh (rolling, Clarification 1). |
| `ipAddress`, `userAgent` | string | Better Auth populates. |

Lifecycle: created on successful sign-in → refreshed on visits → ends on
`signOut`, on `expiresAt` passing, or when the seed script's `--reset`
calls `deleteUserSessions` (Clarification 3). An expired row is treated as
absent by `getSession` (FR-018).

### `rateLimit` (Better Auth built-in, `storage: "database"`)

Key/count/lastRequest rows for the HTTP `/api/auth/*` surface. Not used by
application code; listed so nobody mistakes it for the lockout store.

---

## Application-owned entities

### Throttle entry → `throttle` (`src/models/throttle.ts`)

One generic fixed-window counter used by both the login lockout (US5) and
public-form rate limiting (US6).

| Field | Type | Constraints | Notes |
|---|---|---|---|
| `key` | string | **unique index** | Namespaced: `login:ip:<ip>`, `login:email:<email>`, `form:<name>:ip:<ip>` |
| `count` | number | ≥ 0 | Failures (login) or requests (forms) inside the current window |
| `windowStart` | Date | | Start of the current fixed window |
| `blockedUntil` | Date \| null | | Login only: set when `count` reaches the key's threshold; absolute, so a restart never extends it (FR-028) |
| `expiresAt` | Date | **TTL index** (`expireAfterSeconds: 0`) | `max(windowStart + window, blockedUntil)`; Mongo deletes the row after this |

Policies (constants in `src/lib/rate-limit.ts`, values from spec
Clarification 2 and Assumptions):

| Policy | Key | Threshold | Window | Block |
|---|---|---|---|---|
| Login per source | `login:ip:*` | 5 failures | 15 min | 15 min |
| Login per account | `login:email:*` | 20 failures | 15 min | 15 min |
| Public form (default) | `form:<name>:ip:*` | 5 requests | 10 min | none (refuse until window ends) |

State transitions for a login key:

```
(absent) --failure--> counting(count=1, windowStart=now)
counting --failure (count+1 < threshold)--> counting
counting --failure (count+1 == threshold)--> blocked(blockedUntil=now+15m)
counting --window elapsed--> (absent)   [TTL]
blocked  --any attempt before blockedUntil--> blocked (attempt refused, not counted)
blocked  --blockedUntil passed--> (absent)   [TTL]
any      --successful login--> (absent)   [explicit delete of both keys, FR-029]
```

Atomicity: increments use a single `findOneAndUpdate` with `$inc` and
conditional `$set`, upsert `true`, so concurrent failures cannot lose a
count.

---

## Shared plugin: soft delete (`src/lib/soft-delete.ts`)

Not an entity, but a schema contract every later data-bearing model adopts.

| Adds | Detail |
|---|---|
| Field `deletedAt` | `Date \| null`, default `null`, indexed |
| Default query filter | `find`, `findOne`, `countDocuments`, `findOneAndUpdate`, `updateOne`, `updateMany`, `aggregate` get `{ deletedAt: null }` unless `.setOptions({ withDeleted: true })` |
| Static `softDeleteById(id)` | sets `deletedAt = now`; returns the doc or `null` |
| Static `restoreById(id)` | sets `deletedAt = null` (must query `withDeleted`); returns the doc or `null` |

Invariant (FR-030): a soft-deleted record never appears in a normal read
and comes back byte-identical (other than `deletedAt`) after restore.

---

## Validation schemas (`src/lib/validation/`)

| Schema | Fields | Rules |
|---|---|---|
| `loginSchema` | `email`, `password`, `next?` | email: trim → lowercase → `z.email()`; password: non-empty string (no length rule at login — never hint at the policy); `next`: optional string, validated separately by `safeAdminReturnPath` |
| `envSchema` | `MONGODB_URI`, `BETTER_AUTH_SECRET`, `BETTER_AUTH_URL`, `MONGODB_DB_NAME?` | URI non-empty; secret ≥ 32 chars; URL `z.url()`; db name defaults to `dar_e_arqam` |
| `seedEnvSchema` | `ADMIN_EMAIL`, `ADMIN_PASSWORD` | email as above; password `min(12)` with the message "ADMIN_PASSWORD must be at least 12 characters" |

`safeAdminReturnPath(next)` → returns `next` only if it starts with
`/admin/`, contains no `//`, no scheme, no `\`, and is not `/admin/login`;
otherwise `/admin` (FR-016, edge case "return destination tampering").
