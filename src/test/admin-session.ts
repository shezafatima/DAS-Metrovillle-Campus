import type { Permission, Role } from "@/lib/permissions";

/**
 * Shared by every admin-route DB test that needs a real, valid session
 * cookie (not a mocked DAL) — same approach as
 * src/app/api/admin/session/route.test.ts: seed a real admin via
 * Better Auth's internal adapter, sign in for real, and hand back the
 * `Set-Cookie` value to attach to a mocked `next/headers`.
 *
 * 011: accounts carry a role and grants. The default is `main_admin`, so
 * every pre-011 route test keeps its meaning; pass options (or use
 * seedTestContentManager) for the wrong-permission cases.
 */
export interface SeedUserOptions {
  role?: Role;
  permissions?: Permission[];
  disabledAt?: Date | null;
  deletedAt?: Date | null;
}

export async function seedTestAdmin(email: string, password: string, opts: SeedUserOptions = {}): Promise<string> {
  const { getAuth } = await import("@/lib/auth");
  const { ensureUserEmailIndex } = await import("@/lib/users/indexes");
  await ensureUserEmailIndex();
  const auth = await getAuth();
  const ctx = await auth.$context;

  const fields = {
    role: opts.role ?? "main_admin",
    permissions: opts.permissions ?? [],
    disabledAt: opts.disabledAt ?? null,
    deletedAt: opts.deletedAt ?? null,
  };

  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) {
    await ctx.internalAdapter.updateUser(existing.user.id, fields);
    return existing.user.id;
  }
  const hash = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser(
    { email, name: "route-test", emailVerified: true, ...fields },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
  return user.id;
}

/** A content manager holding exactly `permissions` (none by default). */
export function seedTestContentManager(
  email: string,
  password: string,
  permissions: Permission[] = [],
  opts: Omit<SeedUserOptions, "role" | "permissions"> = {},
): Promise<string> {
  return seedTestAdmin(email, password, { ...opts, role: "content_manager", permissions });
}

/** Signs in and returns the session cookie header value (e.g. `"better-auth.session_token=..."`). */
export async function getTestSessionCookie(email: string, password: string): Promise<string> {
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const { headers: setHeaders } = await auth.api.signInEmail({
    body: { email, password },
    returnHeaders: true,
  });
  const cookie = setHeaders.getSetCookie()[0]?.split(";")[0];
  if (!cookie) throw new Error("[test/admin-session] sign-in did not return a session cookie");
  return cookie;
}
