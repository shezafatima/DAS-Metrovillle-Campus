"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { logSecurityEvent } from "@/lib/log";

/**
 * Ends the session and returns to /admin/login (FR-013). Harmless when
 * there is no session — Better Auth's signOut is a no-op in that case
 * rather than an error (spec edge case "logout with no session").
 */
export async function logout(): Promise<void> {
  const requestHeaders = await headers();
  const ip = requestHeaders.get("x-forwarded-for") ?? requestHeaders.get("x-real-ip") ?? undefined;

  try {
    await auth.api.signOut({ headers: requestHeaders });
  } catch {
    // No session to end — proceed to redirect regardless.
  }
  logSecurityEvent({ type: "logout", ip });
  redirect("/admin/login");
}
