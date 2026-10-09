import { cookies as nextCookies, headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/log";
import { canAccess, isRole, normalizePermissions, type Access, type Permission, type Role } from "@/lib/permissions";
import { safeAdminReturnPath } from "@/lib/validation/return-path";

export interface AdminSession {
  email: string;
  sessionId: string;
  /** Better Auth's user id — keys per-admin state (009), e.g. adminNotificationStates. */
  userId: string;
  role: Role;
  /** Only known keys (011). A main admin's stored list is irrelevant: canAccess grants everything. */
  permissions: Permission[];
}

/** Why a request was refused (011 contracts/dal-access.md). */
export type AccessDenial = "unauthorized" | "forbidden";

/**
 * The request headers to hand Better Auth, with the `cookie` header
 * rebuilt from `cookies()` (010 research §13).
 *
 * After a Server Action sets a cookie, Next re-renders the page in the
 * same response, and `synchronizeMutableCookies` updates `cookies()` but
 * not `headers()` — so the raw header still carries the old value. After
 * a password change that old value is a deleted session token, and the
 * layout would treat the admin as logged out. On an ordinary request
 * `cookies()` is parsed from that same header, so nothing else changes.
 */
export async function getAuthRequestHeaders(): Promise<Headers> {
  const requestHeaders = new Headers(await nextHeaders());
  const cookieHeader = (await nextCookies())
    .getAll()
    .map((cookie) => `${cookie.name}=${cookie.value}`)
    .join("; ");
  if (cookieHeader) {
    requestHeaders.set("cookie", cookieHeader);
  } else {
    requestHeaders.delete("cookie");
  }
  return requestHeaders;
}

/**
 * The one place that reads who the current request is and what they may
 * do. Returns null for "no session" — and equally for a disabled or
 * deleted account, whatever sessions it still holds (011 FR-012). It
 * never throws for that case, so callers can tell "not logged in" from a
 * real error (Constitution III: every admin route verifies the session
 * on the server, never trusting the client or the page-level proxy).
 *
 * Role and grants come from the user record Better Auth loads with the
 * session. `session.cookieCache` is off (see auth.ts), so every call
 * reads current values: a permission change applies on the very next
 * request, in every browser (011 FR-007).
 *
 * A missing or unknown role falls back to `content_manager` with no
 * grants — the least privilege.
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await getAuthRequestHeaders() });
  if (!result?.session || !result.user) return null;

  const user = result.user as typeof result.user & {
    role?: unknown;
    permissions?: unknown;
    disabledAt?: unknown;
    deletedAt?: unknown;
  };
  if (user.disabledAt || user.deletedAt) return null;

  return {
    email: user.email,
    sessionId: result.session.id,
    userId: user.id,
    role: isRole(user.role) ? user.role : "content_manager",
    permissions: normalizePermissions(user.permissions),
  };
}

/**
 * The single access decision (011): no session, then the role/grant check.
 * Pure, so the three-case matrix tests exercise exactly the logic every
 * entry point uses.
 */
export function decideAccess(session: AdminSession | null, access: Access): AccessDenial | null {
  if (!session) return "unauthorized";
  if (!canAccess(session, access)) return "forbidden";
  return null;
}

async function logDenied(session: AdminSession, access: Access): Promise<void> {
  const headerList = await nextHeaders();
  logSecurityEvent({
    type: "access_denied",
    email: session.email,
    access,
    // The request path only; never data.
    outcome: headerList.get("x-pathname") ?? "forbidden",
  });
}

/**
 * For pages. Redirects instead of returning on denial:
 * - no session / disabled / deleted → `/admin/login?next=…`, carrying the
 *   current request path (set by src/proxy.ts as `x-pathname`) so a
 *   successful login returns the admin to where they started (002 FR-016);
 * - a missing permission → `/admin?denied=1` (the overview shows why).
 */
export async function requireAdminPage(access: Access): Promise<AdminSession> {
  const session = await getAdminSession();
  const denial = decideAccess(session, access);
  if (!denial) return session!;

  if (denial === "unauthorized") {
    const headerList = await nextHeaders();
    const next = safeAdminReturnPath(headerList.get("x-pathname"));
    redirect(`/admin/login?next=${encodeURIComponent(next)}`);
  }
  await logDenied(session!, access);
  redirect("/admin?denied=1");
}

/**
 * For route handlers and Server Actions. Never redirects — callers turn
 * a refusal into a 401/403 response (`accessErrorResponse`) or an action
 * result key. A missing permission is logged; a missing session is not
 * (that is not an access decision about anyone).
 */
export async function requireAdminAccess(
  access: Access,
): Promise<{ ok: true; session: AdminSession } | { ok: false; reason: AccessDenial }> {
  const session = await getAdminSession();
  const denial = decideAccess(session, access);
  if (!denial) return { ok: true, session: session! };
  if (denial !== "unauthorized") await logDenied(session!, access);
  return { ok: false, reason: denial };
}
