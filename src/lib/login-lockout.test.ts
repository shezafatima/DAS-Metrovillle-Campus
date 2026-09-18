// @vitest-environment node
import { describe, it, expect } from "vitest";
import { isAPIError } from "better-auth/api";
import { describeWithDb } from "@/test/db";
import { clearKeys } from "@/lib/rate-limit";

const ADMIN_EMAIL = "lockout-test-admin@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function seedAdmin() {
  const { auth } = await import("@/lib/auth");
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(ADMIN_EMAIL);
  if (existing) return;
  const hash = await ctx.password.hash(ADMIN_PASSWORD);
  const user = await ctx.internalAdapter.createUser(
    { email: ADMIN_EMAIL, name: "lockout-test", emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
}

function headersFor(ip: string): Headers {
  return new Headers({ "x-forwarded-for": ip });
}

async function attempt(email: string, password: string, ip: string) {
  const { auth } = await import("@/lib/auth");
  return auth.api.signInEmail({ body: { email, password }, headers: headersFor(ip) }).catch((e) => e);
}

describeWithDb("login lockout", ["user", "account", "session", "throttles"], () => {
  it("blocks the same source after 5 failures, even with the correct password", async () => {
    await seedAdmin();
    await clearKeys([`login:ip:198.51.100.1`, `login:email:${ADMIN_EMAIL}`]);

    for (let i = 0; i < 4; i++) {
      const err = await attempt(ADMIN_EMAIL, "wrong-password", "198.51.100.1");
      expect(isAPIError(err) && err.statusCode).toBe(401);
    }
    const fifth = await attempt(ADMIN_EMAIL, "wrong-password", "198.51.100.1");
    expect(isAPIError(fifth) && fifth.statusCode).toBe(401);

    const sixth = await attempt(ADMIN_EMAIL, ADMIN_PASSWORD, "198.51.100.1");
    expect(isAPIError(sixth) && sixth.statusCode).toBe(429);
    expect(isAPIError(sixth) && sixth.body?.code).toBe("LOGIN_BLOCKED");
  });

  it("blocks the account after 20 failures spread across distinct source addresses", async () => {
    await seedAdmin();
    const email = "per-account-lockout@example.com";
    // Seed a distinct admin isn't necessary — the account-key lockout
    // fires on the email string regardless of whether it matches a
    // real account (FR-027 doesn't require account existence).
    await clearKeys([`login:email:${email}`]);

    for (let i = 0; i < 20; i++) {
      await attempt(email, "wrong-password", `203.0.113.${i}`);
    }
    const nextAttempt = await attempt(email, "wrong-password", "203.0.113.250");
    expect(isAPIError(nextAttempt) && nextAttempt.statusCode).toBe(429);
  }, 30_000);

  it("a successful login after the block window elapses clears both counters", async () => {
    await seedAdmin();
    const ip = "198.51.100.2";
    await clearKeys([`login:ip:${ip}`, `login:email:${ADMIN_EMAIL}`]);

    for (let i = 0; i < 5; i++) {
      await attempt(ADMIN_EMAIL, "wrong-password", ip);
    }
    const blocked = await attempt(ADMIN_EMAIL, ADMIN_PASSWORD, ip);
    expect(isAPIError(blocked) && blocked.statusCode).toBe(429);

    // Simulate the block window elapsing (and a restart — the block
    // lives in MongoDB, not process memory, FR-028).
    const { Throttle } = await import("@/models/throttle");
    await Throttle.updateMany(
      { key: { $in: [`login:ip:${ip}`, `login:email:${ADMIN_EMAIL}`] } },
      { $set: { blockedUntil: new Date(Date.now() - 1000) } },
    );

    const afterWindow = await attempt(ADMIN_EMAIL, ADMIN_PASSWORD, ip);
    expect(isAPIError(afterWindow)).toBe(false);

    const ipRow = await Throttle.findOne({ key: `login:ip:${ip}` });
    const emailRow = await Throttle.findOne({ key: `login:email:${ADMIN_EMAIL}` });
    expect(ipRow).toBeNull();
    expect(emailRow).toBeNull();
  }, 30_000);

  it("the HTTP sign-in route is also blocked once the threshold is reached", async () => {
    await seedAdmin();
    const ip = "198.51.100.3";
    await clearKeys([`login:ip:${ip}`, `login:email:${ADMIN_EMAIL}`]);

    for (let i = 0; i < 5; i++) {
      await attempt(ADMIN_EMAIL, "wrong-password", ip);
    }

    const { GET, POST } = await import("@/app/api/auth/[...all]/route");
    void GET; // unused here, imported alongside POST for completeness
    const request = new Request("http://localhost:3000/api/auth/sign-in/email", {
      method: "POST",
      headers: { "content-type": "application/json", "x-forwarded-for": ip },
      body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD }),
    });
    const response = await POST(request);
    expect(response.status).toBe(429);
  });
});

describe("login-lockout (no DB required)", () => {
  it("module exports the expected functions", async () => {
    const { loginLockoutBefore, loginLockoutAfter } = await import("./login-lockout");
    expect(typeof loginLockoutBefore).toBe("function");
    expect(typeof loginLockoutAfter).toBe("function");
  });
});
