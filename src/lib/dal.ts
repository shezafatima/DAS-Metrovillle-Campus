import { headers as nextHeaders } from "next/headers";
import { redirect } from "next/navigation";
import { getAuth } from "@/lib/auth";
import { safeAdminReturnPath } from "@/lib/validation/return-path";

export interface AdminSession {
  email: string;
  sessionId: string;
}

/**
 * The one place that reads whether the current request is an
 * authenticated admin. Returns null for "no session" — it never throws
 * for that case, so callers can distinguish "not logged in" from a real
 * error (Constitution III: every admin route verifies the session on
 * the server, never trusting the client or the page-level proxy alone).
 */
export async function getAdminSession(): Promise<AdminSession | null> {
  const auth = await getAuth();
  const result = await auth.api.getSession({ headers: await nextHeaders() });
  if (!result?.session || !result.user) return null;
  return { email: result.user.email, sessionId: result.session.id };
}

/**
 * `mode: "page"` (default) redirects to `/admin/login`, carrying the
 * current request path (set by src/proxy.ts as the `x-pathname`
 * header) so a successful login returns the admin to the page they
 * asked for (FR-015, FR-016).
 *
 * `mode: "api"` returns null instead of redirecting, so route handlers
 * can respond 401 themselves (FR-017).
 */
export async function requireAdminSession(
  options: { mode?: "page" | "api" } = {},
): Promise<AdminSession | null> {
  const mode = options.mode ?? "page";
  const session = await getAdminSession();
  if (session) return session;

  if (mode === "api") return null;

  const headerList = await nextHeaders();
  const currentPath = headerList.get("x-pathname");
  const next = safeAdminReturnPath(currentPath);
  redirect(`/admin/login?next=${encodeURIComponent(next)}`);
}
