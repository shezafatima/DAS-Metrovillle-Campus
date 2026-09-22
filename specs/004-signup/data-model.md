# Data Model: Signup (004)

**Branch**: `004-signup` | **Date**: 2026-09-22 | **Spec**: [spec.md](./spec.md)

One new collection. Follows the conventions of
`specs/002-foundation/data-model.md` (soft-delete plugin, timestamps)
and `src/models/news-post.ts` (explicit collection name, model
re-use guard, indexes declared in the schema).

## Signup → `signups`

`src/models/signup.ts`

| Field | Type | Required | Rules |
|---|---|---|---|
| `_id` | ObjectId | auto | |
| `name` | String | yes | Trimmed, internal whitespace collapsed to one space by the Zod schema; 1–100 chars; any script (Urdu accepted, stored as typed). |
| `email` | String | yes | Lower-cased and trimmed by the Zod schema; ≤ 254 chars; **unique index** (no partial filter — a soft-deleted record keeps its email reserved, so a re-signup restores rather than duplicates). Natural key for the upsert. |
| `phone` | String | yes | Canonical E.164 `+923XXXXXXXXX` (research §2). Displayed as `03XXXXXXXXX`. |
| `sources` | [String] | yes | Enum of `SIGNUP_SOURCE_KEYS` (`"home"`, `"resources"`); set semantics via `$addToSet`; never empty after creation. |
| `firstSignupAt` | Date | yes | Set once via `$setOnInsert`; never changed by later submissions or by restore. |
| `lastSignupAt` | Date | yes | Set on every accepted submission (create, update, restore). Primary sort key for the admin list. |
| `deletedAt` | Date \| null | plugin | Added by `softDeletePlugin`; `null` = live. Cleared (`$set: null`) by a re-signup. |
| `createdAt` / `updatedAt` | Date | auto | Mongoose `timestamps: true`. `updatedAt` is the tie-breaker sort key. |

### Indexes

| Index | Purpose |
|---|---|
| `{ email: 1 }` unique | Natural key; makes the concurrent-duplicate case resolve to one document (research §1). |
| `{ lastSignupAt: -1, deletedAt: 1 }` | Admin list default order with the plugin's `deletedAt: null` filter. |
| `{ sources: 1, lastSignupAt: -1 }` | Source filter + order (multikey on the array). |

No text index — search is a case-insensitive regex (research §5).

### Statics (from the plugin)

`Signup.softDeleteById(id)` — used by `DELETE /api/admin/signups/[id]`.
`Signup.restoreById(id)` — provided by the plugin but **not used** by
this feature; restore only happens through the re-signup upsert.

## Signup source (fixed list)

`src/lib/signup/sources.ts`

```ts
export const SIGNUP_SOURCES = [
  { key: "home",      label: "Home" },
  { key: "resources", label: "Resources" },
] as const;
export type SignupSource = (typeof SIGNUP_SOURCES)[number]["key"];
export const SIGNUP_SOURCE_KEYS: readonly SignupSource[];
export function isSignupSource(value: unknown): value is SignupSource;
export function sourceLabel(key: SignupSource): string;
```

Naming: `source` is the code/API name; the admin UI and CSV show it
as **Pages** ("pages signed up from" in the spec).

Used by: the Zod schema (`z.enum(SIGNUP_SOURCE_KEYS)`), the model enum,
the `SignupSection` prop type, the admin filter options, the table
badges and the CSV "Pages" column. Adding a page later (e.g. Admission)
is a one-line change here.

## Validation schema (shared client + server)

`src/lib/validation/signup.ts`

```ts
export const signupInputSchema = z.object({
  name:   z.string().trim().transform(collapseSpaces)
            .pipe(z.string().min(1, "Name is required.")
                           .max(100, "Name must be 100 characters or fewer.")),
  email:  z.string().trim().toLowerCase()
            .pipe(z.email("Enter a valid email address.").max(254, "Enter a valid email address.")),
  phone:  z.string().trim()
            .transform((v, ctx) => normalisePakistaniMobile(v) ?? (ctx.addIssue(...), z.NEVER)),
  source: z.enum(SIGNUP_SOURCE_KEYS, { error: "Unknown page." }),
});
export type SignupInput = z.infer<typeof signupInputSchema>;   // post-transform (phone is E.164)
export function fieldErrors(error: z.ZodError): Record<string, string>; // same helper shape as validation/news.ts
```

- The honeypot field `website_url` is **not** part of the schema — it
  is read by `protectPublicForm` before validation and stripped.
- The client runs the same schema before `fetch` so field messages
  appear without a round trip; the server result is authoritative
  (Constitution IV).
- Whitespace-only → `min(1)` fails after trim → "required" message
  (FR-003).

## Upsert (the only write path for the public form)

`src/lib/signup/mutations.ts` — `upsertSignup(input: SignupInput, now = new Date())`

```
Signup.findOneAndUpdate(
  { email: input.email },
  {
    $set:         { name: input.name, phone: input.phone, lastSignupAt: now, deletedAt: null },
    $addToSet:    { sources: input.source },
    $setOnInsert: { firstSignupAt: now },
  },
  { upsert: true, new: true, withDeleted: true, runValidators: true },
)
```

Retry once on `E11000`. Returns `void` to callers on the public path
(nothing about the outcome may reach the visitor); the tested internal
function returns the document for assertions.

`deleteSignup(id)` — `Signup.softDeleteById(id)`; returns `null` for
unknown or already-deleted ids (the plugin's default filter excludes
deleted docs from the match).

## State transitions

```
            submit (new email)
   (none) ─────────────────────▶ live { firstSignupAt = lastSignupAt = now, sources = [src] }

   live   ── submit (same email) ──▶ live { name, phone ← input; lastSignupAt = now; sources ∪= {src} }
   live   ── admin delete ────────▶ deleted { deletedAt = now }
   deleted ─ submit (same email) ──▶ live { deletedAt = null; name, phone ← input; lastSignupAt = now; sources ∪= {src}; firstSignupAt unchanged }
   deleted ─ admin delete ────────▶ 404 (not matched — plugin filter)
```

There is no admin-side edit or restore (spec Out of Scope).

## DTOs (plain objects returned by `src/lib/signup/admin-queries.ts`)

```ts
export interface SignupRow {
  id: string;
  name: string;
  email: string;
  phone: string;        // E.164, for tel: href
  phoneDisplay: string; // "03XXXXXXXXX"
  sources: SignupSource[];
  firstSignupAt: string; // ISO
  lastSignupAt: string;  // ISO
}
export interface Paged<T> { items: T[]; page: number; pageSize: number; total: number; totalPages: number; }
// Paged<T>, escapeRegExp() and ADMIN_PAGE_SIZE live in src/lib/admin-list.ts (moved out of
// src/lib/news/admin-queries.ts by tasks T014); both news and signup import from there.
```

`SignupRow` deliberately omits `createdAt`/`updatedAt`/`deletedAt`;
route handlers return only what the table and CSV need (Constitution
VII: consumer-agnostic, minimal surface).

## Collections touched by tests

`describeWithDb(..., ["signups", "throttle", "user", "account", "session"], ...)`
for route tests; `e2e/global-setup.ts` adds `"signups"` to its wipe list.
