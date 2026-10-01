import type { BetterAuthPlugin } from "better-auth";
import { APIError, createAuthMiddleware, getIP, getSessionFromCtx } from "better-auth/api";
import { PASSWORD_CHANGE_POLICY, clearKeys, isBlocked, recordFailure } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/log";

const CHANGE_PASSWORD_PATH = "/change-password";

/**
 * Keyed by the account only — never the source address or the session —
 * so logging out and back in, another device, or ending sessions can't
 * reset it (010 FR-010). The prefix never overlaps login's
 * `login:ip:*` / `login:email:*` keys, so neither lockout can trip or
 * clear the other (FR-010a).
 */
export function passwordChangeKey(userId: string): string {
  return `password-change:user:${userId}`;
}

function requestIp(headers: Headers | undefined, options: Parameters<typeof getIP>[1]): string {
  return getIP(headers ?? new Headers(), options) ?? "unknown";
}

/**
 * Account-page lockout for Better Auth's built-in change-password
 * (010 research §3), modelled on login-lockout.ts. As hooks, they cover
 * both the Server Action (auth.api.changePassword) and — were it ever
 * re-enabled — the HTTP route, since both go through this pipeline.
 */
export const passwordChangeLockoutBefore = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== CHANGE_PASSWORD_PATH) return;

  // The endpoint's own session middleware hasn't run yet at hook time.
  // No session → return and let the endpoint answer 401 itself.
  const session = await getSessionFromCtx(ctx, { disableRefresh: true });
  if (!session) return;

  if (await isBlocked(passwordChangeKey(session.user.id))) {
    logSecurityEvent({ type: "password_change_blocked", ip: requestIp(ctx.headers, ctx.context.options), email: session.user.email });
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many attempts. Please try again later.",
      code: "PASSWORD_CHANGE_BLOCKED",
    });
  }
});

export const passwordChangeLockoutAfter = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== CHANGE_PASSWORD_PATH) return;

  // The session resolved before the change — still in memory even when
  // a successful change has since deleted it from the store.
  const session = ctx.context.session ?? (await getSessionFromCtx(ctx, { disableRefresh: true }));
  if (!session) return;
  const key = passwordChangeKey(session.user.id);

  const returned = ctx.context.returned;
  if (returned instanceof APIError) {
    const code = (returned.body as { code?: unknown } | undefined)?.code;
    // Only a wrong current password counts — a too-short new password
    // or a blocked attempt must never add to the count.
    if (returned.statusCode !== 400 || code !== "INVALID_PASSWORD") return;

    const ip = requestIp(ctx.headers, ctx.context.options);
    logSecurityEvent({ type: "password_change_failed", ip, email: session.user.email });
    const { blocked } = await recordFailure({ key, ...PASSWORD_CHANGE_POLICY });
    if (blocked) {
      logSecurityEvent({ type: "password_change_blocked", ip, email: session.user.email });
    }
    return;
  }
  if (returned instanceof Error) return;

  // Success clears a count still below the limit. It can never clear an
  // active block: a blocked attempt is refused by the before hook first.
  await clearKeys([key]);
});

/**
 * Registered as a plugin (rather than composed into `hooks.before/after`)
 * so 002's login lockout hooks stay exactly as they were: plugin hooks
 * run through the same pipeline with the same context, each behind its
 * own path matcher. Must be listed before nextCookies(), which expects
 * to be the last plugin.
 */
export function passwordChangeLockout() {
  const matchesChangePassword = (ctx: { path?: string }) => ctx.path === CHANGE_PASSWORD_PATH;
  return {
    id: "password-change-lockout",
    hooks: {
      before: [{ matcher: matchesChangePassword, handler: passwordChangeLockoutBefore }],
      after: [{ matcher: matchesChangePassword, handler: passwordChangeLockoutAfter }],
    },
  } satisfies BetterAuthPlugin;
}
