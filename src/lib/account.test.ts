// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";

const ADMIN_EMAIL = "account-last-changed@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function getAuthInstance() {
  const { getAuth } = await import("@/lib/auth");
  return getAuth();
}

async function seedAdmin(): Promise<string> {
  const auth = await getAuthInstance();
  const ctx = await auth.$context;
  const hash = await ctx.password.hash(ADMIN_PASSWORD);
  const user = await ctx.internalAdapter.createUser(
    { email: ADMIN_EMAIL, name: "account-last-changed", emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({ userId: user.id, providerId: "credential", accountId: user.id, password: hash });
  return user.id;
}

const tick = () => new Promise((resolve) => setTimeout(resolve, 20));

describeWithDb("getPasswordChangedAt", ["user", "account", "session", "throttles"], () => {
  it("returns only a Date, and null for an unknown account", async () => {
    const { getPasswordChangedAt } = await import("@/lib/account");
    const userId = await seedAdmin();

    const value = await getPasswordChangedAt(userId);
    expect(Object.prototype.toString.call(value)).toBe("[object Date]");
    expect(value && "password" in (value as object)).toBe(false);

    expect(await getPasswordChangedAt("000000000000000000000000")).toBeNull();
    // First test in the file also pays for a fresh Atlas connection when
    // run after another file's describeWithDb disconnected.
  }, 60_000);

  it("advances after a panel password change (auth.api.changePassword)", async () => {
    const { getPasswordChangedAt } = await import("@/lib/account");
    const auth = await getAuthInstance();
    const userId = await seedAdmin();
    const before = await getPasswordChangedAt(userId);

    const signIn = await auth.api.signInEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      headers: new Headers({ "x-forwarded-for": "198.51.100.60" }),
      returnHeaders: true,
    });
    const cookie = signIn.headers
      .getSetCookie()
      .map((c) => c.split(";")[0])
      .join("; ");
    await tick();
    await auth.api.changePassword({
      body: { currentPassword: ADMIN_PASSWORD, newPassword: "a-brand-new-password-2026", revokeOtherSessions: true },
      headers: new Headers({ cookie }),
    });

    const after = await getPasswordChangedAt(userId);
    expect(after!.getTime()).toBeGreaterThan(before!.getTime());
  }, 30_000);

  it("advances after the setup command's reset path (internalAdapter.updatePassword)", async () => {
    const { getPasswordChangedAt } = await import("@/lib/account");
    const auth = await getAuthInstance();
    const ctx = await auth.$context;
    const userId = await seedAdmin();
    const before = await getPasswordChangedAt(userId);

    await tick();
    // The exact call scripts/seed-admin.ts makes for --reset.
    await ctx.internalAdapter.updatePassword(userId, await ctx.password.hash("a-reset-password-2026"));

    const after = await getPasswordChangedAt(userId);
    expect(after!.getTime()).toBeGreaterThan(before!.getTime());
  }, 30_000);
});
