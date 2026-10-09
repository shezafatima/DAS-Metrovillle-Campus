"use server";

import { headers } from "next/headers";
import { isAPIError } from "better-auth/api";
import { getAuth } from "@/lib/auth";
import { getAuthRequestHeaders, requireAdminAccess, type AccessDenial } from "@/lib/dal";
import { getPasswordChangedAt } from "@/lib/account";
import { validateChangePassword, type ChangePasswordErrorKey } from "@/lib/validation/account";
import { passwordChangeKey } from "@/lib/password-change-lockout";
import { clearKeys } from "@/lib/rate-limit";
import { logSecurityEvent } from "@/lib/log";

/**
 * Account page actions (010, contracts/account-actions.md). Like the 002
 * login action, every result is a copy key only: never a field value,
 * hash, token, or Better Auth error text. The account acted on always
 * comes from the session — neither action reads a user id or email from
 * the form.
 */
export type ChangePasswordState =
  | { status: "idle" }
  | { status: "success"; passwordChangedAt: string }
  | { status: "changed_others_remain"; passwordChangedAt: string }
  | { status: "changed_signed_out" }
  | { status: "unconfirmed" }
  | {
      status: "error";
      error: ChangePasswordErrorKey | AccessDenial | "wrong_current" | "blocked" | "unavailable";
    };

export type SignOutOthersState =
  | { status: "idle" }
  | { status: "success" }
  | { status: "error"; error: AccessDenial | "unavailable" };

function sourceIp(requestHeaders: Headers): string | undefined {
  return requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? undefined;
}

function errorName(err: unknown): string {
  return err instanceof Error ? err.name : typeof err;
}

export async function changePassword(
  _prevState: ChangePasswordState,
  formData: FormData,
): Promise<ChangePasswordState> {
  // 011: the main admin controls every password (Constitution III). Only a main
  // admin changes a password here, and only their OWN: the account acted on is
  // always the session's, never an id or email from the form. A content manager
  // is refused with `forbidden` — the server enforces it, not the hidden form.
  const access = await requireAdminAccess("main_admin");
  if (!access.ok) return { status: "error", error: access.reason };
  const { userId, email } = access.session;

  // Kept for the saved-check probe: it must ask about the *old* token.
  const originalHeaders = await headers();
  const ip = sourceIp(originalHeaders);

  const input = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };
  const invalid = validateChangePassword(input);
  if (invalid) return { status: "error", error: invalid };
  const currentPassword = input.currentPassword as string;
  const newPassword = input.newPassword as string;

  const auth = await getAuth();
  try {
    // Deletes every session and gives this device a new one (nextCookies).
    // The lockout hooks (password-change-lockout.ts) run around this call.
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: true },
      headers: await getAuthRequestHeaders(),
    });
  } catch (err) {
    if (isAPIError(err) && err.statusCode < 500) {
      if (err.statusCode === 429) return { status: "error", error: "blocked" };
      if (err.statusCode === 401) return { status: "error", error: "unauthorized" };
      const code = (err.body as { code?: unknown } | undefined)?.code;
      if (code === "INVALID_PASSWORD") return { status: "error", error: "wrong_current" };
      if (code === "PASSWORD_TOO_SHORT") return { status: "error", error: "too_short" };
      if (code === "PASSWORD_TOO_LONG") return { status: "error", error: "too_long" };
      // Any other 4xx is refused before anything is written.
      console.error("changePassword refused:", errorName(err));
      return { status: "error", error: "unavailable" };
    }
    console.error("changePassword failed:", errorName(err));
    return savedCheck({ userId, email, ip, newPassword, originalHeaders });
  }

  // No revalidatePath: the session cookie write already makes Next
  // re-render this page in the same response (research §13), and the
  // client updates the date from the returned state.
  const changedAt = (await getPasswordChangedAt(userId).catch(() => null)) ?? new Date();
  logSecurityEvent({ type: "password_changed", ip, email, outcome: "ok" });
  return { status: "success", passwordChangedAt: changedAt.toISOString() };
}

/**
 * After an unexpected failure, report only what is true (FR-011).
 * Better Auth writes the password, then deletes sessions, then creates
 * this device's new one — so ask the store instead of guessing which
 * step failed.
 */
async function savedCheck({
  userId,
  email,
  ip,
  newPassword,
  originalHeaders,
}: {
  userId: string;
  email: string;
  ip: string | undefined;
  newPassword: string;
  originalHeaders: Headers;
}): Promise<ChangePasswordState> {
  try {
    const auth = await getAuth();
    const ctx = await auth.$context;
    const account = await ctx.internalAdapter.findCredentialAccount(userId);
    const saved = Boolean(account?.password) && (await ctx.password.verify({ hash: account!.password!, password: newPassword }));
    if (!saved) return { status: "error", error: "unavailable" };

    // The after hook's success branch didn't run on a thrown error.
    await clearKeys([passwordChangeKey(userId)]).catch(() => {});
    const changedAt = account?.updatedAt ? new Date(account.updatedAt) : new Date();

    // Is the *old* session still alive? If it was deleted, every session
    // was; if the probe itself fails, "others may still be signed in"
    // stays true either way.
    const stillSignedIn = await auth.api
      .getSession({ headers: originalHeaders, query: { disableRefresh: true } })
      .then((result) => Boolean(result?.session))
      .catch(() => true);

    if (stillSignedIn) {
      logSecurityEvent({ type: "password_changed", ip, email, outcome: "sessions_not_revoked" });
      return { status: "changed_others_remain", passwordChangedAt: changedAt.toISOString() };
    }
    logSecurityEvent({ type: "password_changed", ip, email, outcome: "current_session_lost" });
    return { status: "changed_signed_out" };
  } catch (err) {
    console.error("changePassword saved-check failed:", errorName(err));
    logSecurityEvent({ type: "password_change_unconfirmed", ip, email });
    return { status: "unconfirmed" };
  }
}

/** Takes no input: the only account it can act on is the session's own. Any signed-in role may sign out their own other devices. */
export async function signOutOtherDevices(): Promise<SignOutOthersState> {
  const access = await requireAdminAccess("any");
  if (!access.ok) return { status: "error", error: access.reason };
  const { session } = access;

  const ip = sourceIp(await headers());
  try {
    const auth = await getAuth();
    await auth.api.revokeOtherSessions({ headers: await getAuthRequestHeaders() });
  } catch (err) {
    if (isAPIError(err) && err.statusCode === 401) return { status: "error", error: "unauthorized" };
    console.error("signOutOtherDevices failed:", errorName(err));
    return { status: "error", error: "unavailable" };
  }
  logSecurityEvent({ type: "other_sessions_revoked", ip, email: session.email });
  return { status: "success" };
}
