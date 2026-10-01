> **Revised 2026-09-30 (owner decision: the main admin controls every password; Constitution III amended, v2.0.0).**
> There is no forced first-login password change, no temporary-password state, no 7-day expiry and no `/admin/set-password` page. A content manager cannot change any password; only a main admin can, and a main admin changes their own on the Account page. Anything below that says otherwise is superseded.

# Contract: DAL access API (`src/lib/dal.ts`, `src/lib/permissions.ts`)

This replaces `requireAdminSession`. `getAdminSession` and `getAuthRequestHeaders` stay.

```ts
// src/lib/permissions.ts: pure, importable from client components
export const PERMISSION_KEYS = ["news", "messages", "careers", "settings", "pages"] as const;
export type Permission = (typeof PERMISSION_KEYS)[number];
export type Role = "main_admin" | "content_manager";
export type Access = Permission | "main_admin" | "any";

export function canAccess(user: { role: Role; permissions: readonly string[] }, access: Access): boolean;
//   main_admin → true for every access
//   content_manager → access === "any" || permissions.includes(access); never "main_admin"

// src/lib/dal.ts
export interface AdminSession {
  userId: string;
  email: string;
  sessionId: string;
  role: Role;
  permissions: Permission[];     // unknown keys dropped
}

/** null for no session, AND for a disabled or deleted account (FR-012). Reads fresh on every call. */
export function getAdminSession(): Promise<AdminSession | null>;

export type AccessDenial = "unauthorized" | "forbidden";

/** Pure: the only decision function. */
export function decideAccess(session: AdminSession | null, access: Access): AccessDenial | null;

/** Pages: redirects on denial (login / /admin?denied=1), else returns the session. */
export function requireAdminPage(access: Access): Promise<AdminSession>;

/** Routes + actions: never redirects. Logs access_denied for forbidden. */
export function requireAdminAccess(
  access: Access,
): Promise<{ ok: true; session: AdminSession } | { ok: false; reason: AccessDenial }>;

// src/lib/route-errors.ts (added)
export function forbiddenResponse(): Response; // 403 { error: forbidden }
export function accessErrorResponse(reason: AccessDenial): Response; // 401 | 403
```

**Call-site shape**

```ts
// route handler
const access = await requireAdminAccess("news");
if (!access.ok) return accessErrorResponse(access.reason);
const { session } = access;

// page
const session = await requireAdminPage("messages");

// server action
const access = await requireAdminAccess("main_admin");
if (!access.ok) return { status: "error", error: access.reason };
```

**Guarantees**
- `access` has no default. Omitting it is a type error.
- `decideAccess` order: `null` → unauthorized; `!canAccess` → forbidden.
- No function accepts a user id to check someone else's access. The subject is always the request's own session.
