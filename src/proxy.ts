import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Optimistic, cookie-presence-only redirect (FR-015). Never touches the
 * database — Proxy runs on every matched request, including
 * prefetches, so it must stay cheap; the DAL (src/lib/dal.ts) is the
 * authoritative check every page and API route performs itself
 * (Constitution III, Next.js authentication guide "Optimistic checks
 * with Proxy").
 *
 * Also forwards the requested path as `x-pathname` so a page that
 * falls back to requireAdminSession()'s own redirect (a stale cookie
 * that passes this check but fails real session verification) can
 * still send the admin back to where they started (FR-016).
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname + search);

  if (pathname !== "/admin/login" && !getSessionCookie(request)) {
    const next = encodeURIComponent(pathname + search);
    return NextResponse.redirect(new URL(`/admin/login?next=${next}`, request.url));
  }

  return NextResponse.next({ request: { headers: requestHeaders } });
}

export const config = {
  matcher: ["/admin/:path*"],
};
