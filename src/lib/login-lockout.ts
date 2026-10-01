import { APIError, createAuthMiddleware, getIP } from "better-auth/api";
import {
  LOGIN_EMAIL_POLICY,
  LOGIN_IP_POLICY,
  clearKeys,
  isBlocked,
  recordFailure,
} from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/log";

const SIGN_IN_PATH = "/sign-in/email";

function loginIpKey(ip: string): string {
  return `login:ip:${ip}`;
}

function loginEmailKey(email: string): string {
  return `login:email:${email}`;
}

function extractEmail(body: unknown): string | undefined {
  if (typeof body === "object" && body !== null && "email" in body) {
    const raw = (body as { email?: unknown }).email;
    if (typeof raw === "string") return raw.trim().toLowerCase();
  }
  return undefined;
}

/**
 * Dual-key login lockout (spec Clarification 2, FR-027–029). Runs as
 * Better Auth hooks rather than in the login Server Action alone so it
 * also covers the HTTP `/api/auth/sign-in/email` route — hooks fire for
 * every call that goes through dispatchAuthEndpoint, whether it
 * originates from auth.api.signInEmail() or the mounted route handler
 * (research.md §6).
 */
export const loginLockoutBefore = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return;

  const ip = getIP(ctx.headers ?? new Headers(), ctx.context.options) ?? "unknown";
  const email = extractEmail(ctx.body);

  const ipBlocked = await isBlocked(loginIpKey(ip));
  const emailBlocked = email ? await isBlocked(loginEmailKey(email)) : false;

  if (ipBlocked || emailBlocked) {
    logSecurityEvent({ type: "login_blocked", ip, email });
    throw new APIError("TOO_MANY_REQUESTS", {
      message: "Too many attempts. Please try again later.",
      code: "LOGIN_BLOCKED",
    });
  }
});

export const loginLockoutAfter = createAuthMiddleware(async (ctx) => {
  if (ctx.path !== SIGN_IN_PATH) return;

  const ip = getIP(ctx.headers ?? new Headers(), ctx.context.options) ?? "unknown";
  const email = extractEmail(ctx.body);
  const ipKey = loginIpKey(ip);
  const emailKey = email ? loginEmailKey(email) : undefined;

  if (ctx.context.newSession) {
    // Successful login clears both counters (FR-029).
    await clearKeys(emailKey ? [ipKey, emailKey] : [ipKey]);
    // 011: "last login" on the Users page. Only a real sign-in reaches this
    // branch (a password change's new session does not go through
    // /sign-in/email). A failure here must never fail the login.
    try {
      await ctx.context.internalAdapter.updateUser(ctx.context.newSession.user.id, { lastLoginAt: new Date() });
    } catch (err) {
      console.error("lastLoginAt update failed:", err instanceof Error ? err.name : typeof err);
    }
    return;
  }

  const returned = ctx.context.returned;
  const failed = returned instanceof APIError && returned.statusCode === 401;
  if (!failed) return;

  logSecurityEvent({ type: "login_failed", ip, email });

  await recordFailure({
    key: ipKey,
    threshold: LOGIN_IP_POLICY.threshold,
    windowSeconds: LOGIN_IP_POLICY.windowSeconds,
    blockSeconds: LOGIN_IP_POLICY.blockSeconds,
  });
  if (emailKey) {
    await recordFailure({
      key: emailKey,
      threshold: LOGIN_EMAIL_POLICY.threshold,
      windowSeconds: LOGIN_EMAIL_POLICY.windowSeconds,
      blockSeconds: LOGIN_EMAIL_POLICY.blockSeconds,
    });
  }
});
