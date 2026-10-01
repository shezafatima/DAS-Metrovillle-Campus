// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isAPIError } from "better-auth/api";
import { describeWithDb } from "@/test/db";

const ADMIN_EMAIL = "password-change-lockout@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";
const NEW_PASSWORD = "a-brand-new-password-2026";

async function getAuthInstance() {
  const { getAuth } = await import("@/lib/auth");
  return getAuth();
}

async function seedAdmin(): Promise<string> {
  const auth = await getAuthInstance();
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(ADMIN_EMAIL);
  if (existing) return existing.user.id;
  const hash = await ctx.password.hash(ADMIN_PASSWORD);
  const user = await ctx.internalAdapter.createUser(
    { email: ADMIN_EMAIL, name: "password-change-lockout", emailVerified: true },
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

function signIn(password: string, ip: string) {
  return getAuthInstance().then((auth) =>
    auth.api
      .signInEmail({
        body: { email: ADMIN_EMAIL, password },
        headers: new Headers({ "x-forwarded-for": ip }),
        returnHeaders: true,
      })
      .catch((e: unknown) => e),
  );
}

/** Signs in and returns request headers carrying that session's cookie. */
async function sessionHeaders(ip: string, password = ADMIN_PASSWORD): Promise<Headers> {
  const result = await signIn(password, ip);
  if (isAPIError(result) || result instanceof Error) throw result;
  const cookie = (result as { headers: Headers }).headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  return new Headers({ cookie, "x-forwarded-for": ip });
}

function changePassword(headers: Headers, currentPassword: string, newPassword = NEW_PASSWORD) {
  return getAuthInstance().then((auth) =>
    auth.api
      .changePassword({ body: { currentPassword, newPassword, revokeOtherSessions: true }, headers })
      .catch((e: unknown) => e),
  );
}

async function throttleRow(userId: string) {
  const { Throttle } = await import("@/models/throttle");
  return Throttle.findOne({ key: `password-change:user:${userId}` }).lean();
}

function expectCode(result: unknown, status: number, code: string) {
  expect(isAPIError(result) && result.statusCode).toBe(status);
  expect(isAPIError(result) && result.body?.code).toBe(code);
}

describeWithDb("password-change lockout", ["user", "account", "session", "throttles"], () => {
  it("blocks after 5 wrong current passwords, even with the correct one, and changes nothing", async () => {
    await seedAdmin();
    const headers = await sessionHeaders("198.51.100.10");

    for (let i = 0; i < 5; i++) {
      expectCode(await changePassword(headers, "wrong-current-password"), 400, "INVALID_PASSWORD");
    }
    expectCode(await changePassword(headers, ADMIN_PASSWORD), 429, "PASSWORD_CHANGE_BLOCKED");

    // The password is unchanged: the old one still signs in, the new one doesn't.
    expect(isAPIError(await signIn(ADMIN_PASSWORD, "198.51.100.11"))).toBe(false);
    expect(isAPIError(await signIn(NEW_PASSWORD, "198.51.100.12"))).toBe(true);
  }, 60_000);

  it("stays blocked after logging back in with a new session (keyed to the account, not the session)", async () => {
    await seedAdmin();
    const first = await sessionHeaders("198.51.100.20");
    for (let i = 0; i < 5; i++) await changePassword(first, "wrong-current-password");

    // Login itself is unaffected by the password-change block (FR-010a)…
    const second = await sessionHeaders("198.51.100.21");
    // …but the fresh session is still blocked (FR-010, US1 sc.14).
    expectCode(await changePassword(second, ADMIN_PASSWORD), 429, "PASSWORD_CHANGE_BLOCKED");
  }, 60_000);

  it("a login block does not stop a logged-in admin changing the password (FR-010a)", async () => {
    await seedAdmin();
    const headers = await sessionHeaders("198.51.100.30");

    const lockedIp = "198.51.100.31";
    for (let i = 0; i < 5; i++) await signIn("wrong-login-password", lockedIp);
    const blockedLogin = await signIn(ADMIN_PASSWORD, lockedIp);
    expect(isAPIError(blockedLogin) && blockedLogin.statusCode).toBe(429);

    const changed = await changePassword(headers, ADMIN_PASSWORD);
    expect(isAPIError(changed)).toBe(false);
  }, 60_000);

  it("a successful change clears a count still below the limit", async () => {
    const userId = await seedAdmin();
    const headers = await sessionHeaders("198.51.100.40");
    for (let i = 0; i < 3; i++) await changePassword(headers, "wrong-current-password");
    expect((await throttleRow(userId))?.count).toBe(3);

    expect(isAPIError(await changePassword(headers, ADMIN_PASSWORD))).toBe(false);
    expect(await throttleRow(userId)).toBeNull();
  }, 60_000);

  it("a too-short new password is never counted", async () => {
    const userId = await seedAdmin();
    const headers = await sessionHeaders("198.51.100.50");
    expectCode(await changePassword(headers, "wrong-current-password", "short"), 400, "PASSWORD_TOO_SHORT");
    expect(await throttleRow(userId)).toBeNull();
  }, 30_000);
});

describe("password-change-lockout (no DB required)", () => {
  it("keys the counter by account id only", async () => {
    const { passwordChangeKey } = await import("./password-change-lockout");
    expect(passwordChangeKey("abc123")).toBe("password-change:user:abc123");
  });
});
