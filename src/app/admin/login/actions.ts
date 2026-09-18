"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isAPIError } from "better-auth/api";
import { auth } from "@/lib/auth";
import { loginSchema } from "@/lib/validation/login";
import { safeAdminReturnPath } from "@/lib/validation/return-path";
import { isHoneypotTripped } from "@/lib/honeypot";
import { logSecurityEvent } from "@/lib/log";

export interface LoginActionState {
  error: "generic" | "blocked" | "unavailable" | null;
}

/**
 * Per contracts/http-and-actions.md — every failure branch resolves to
 * one of exactly three copy keys, and the honeypot/validation-failure
 * paths never call Better Auth at all (so they can't be timed against
 * real credential checks, and don't count toward the lockout).
 */
export async function login(
  _prevState: LoginActionState,
  formData: FormData,
): Promise<LoginActionState> {
  if (isHoneypotTripped(formData)) {
    return { error: "generic" };
  }

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "generic" };
  }

  const { email, password, next } = parsed.data;
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? undefined;

  let redirectTo: string;
  try {
    await auth.api.signInEmail({ body: { email, password }, headers: requestHeaders });
    logSecurityEvent({ type: "login_success", email, ip });
    redirectTo = safeAdminReturnPath(next);
  } catch (err) {
    if (isAPIError(err)) {
      if (err.statusCode === 401) {
        return { error: "generic" };
      }
      if (err.statusCode === 429) {
        return { error: "blocked" };
      }
    }
    // Database unreachable or any other unexpected failure — never leak
    // the underlying error text to the visitor (FR-014, SC-009).
    console.error("login action failed:", err instanceof Error ? err.message : err);
    return { error: "unavailable" };
  }

  redirect(redirectTo);
}
