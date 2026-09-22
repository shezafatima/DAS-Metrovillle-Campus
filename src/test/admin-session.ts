/**
 * Shared by every admin-route DB test that needs a real, valid session
 * cookie (not a mocked DAL) — same approach as
 * src/app/api/admin/session/route.test.ts: seed a real admin via
 * Better Auth's internal adapter, sign in for real, and hand back the
 * `Set-Cookie` value to attach to a mocked `next/headers`.
 */
export async function seedTestAdmin(email: string, password: string): Promise<void> {
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(email);
  if (existing) return;
  const hash = await ctx.password.hash(password);
  const user = await ctx.internalAdapter.createUser(
    { email, name: "route-test", emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
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
