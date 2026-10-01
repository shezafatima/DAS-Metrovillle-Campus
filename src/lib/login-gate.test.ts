// @vitest-environment node
import { describe, expect, it } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin } from "@/test/admin-session";
import { assertMayLogIn } from "@/lib/login-gate";

const EMAIL = "login-gate@example.test";
const PASSWORD = "a-long-enough-password";

describe("assertMayLogIn (pure)", () => {
  it("allows an ordinary active account and a missing one", () => {
    expect(() => assertMayLogIn({})).not.toThrow();
    expect(() => assertMayLogIn(null)).not.toThrow();
  });

  it("refuses disabled and deleted accounts with the wrong-password 401", () => {
    for (const user of [{ disabledAt: new Date() }, { deletedAt: new Date() }]) {
      try {
        assertMayLogIn(user);
        throw new Error("did not throw");
      } catch (err) {
        const e = err as { statusCode?: number; body?: { code?: string; message?: string } };
        expect(e.statusCode).toBe(401);
        expect(e.body?.code).toBe("INVALID_EMAIL_OR_PASSWORD");
        expect(e.body?.message).toBe("Invalid email or password");
      }
    }
  });
});

async function signIn(password: string) {
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  try {
    await auth.api.signInEmail({ body: { email: EMAIL, password } });
    return { ok: true as const };
  } catch (err) {
    const e = err as { statusCode?: number; body?: { code?: string; message?: string } };
    return { ok: false as const, status: e.statusCode, code: e.body?.code, message: e.body?.message };
  }
}

async function sessionCount(): Promise<number> {
  const mongoose = (await import("mongoose")).default;
  return mongoose.connection.db!.collection("session").countDocuments({});
}

// This is the 011 research §5 spike: it proves the database hook really
// stops the sign-in, with the same answer as a wrong password.
describeWithDb("login gate (real Better Auth sign-in)", ["user", "account", "session"], () => {
  it("lets an active account in", async () => {
    await seedTestAdmin(EMAIL, PASSWORD);
    expect((await signIn(PASSWORD)).ok).toBe(true);
    expect(await sessionCount()).toBe(1);
  });

  it("refuses a disabled account with the same 401 as a wrong password, and writes no session", async () => {
    await seedTestAdmin(EMAIL, PASSWORD, { disabledAt: new Date() });
    const wrong = await signIn("not-the-password");
    const disabled = await signIn(PASSWORD);
    expect(disabled.ok).toBe(false);
    expect(wrong.ok).toBe(false);
    if (!disabled.ok && !wrong.ok) {
      expect(disabled.status).toBe(401);
      expect(disabled).toEqual(wrong);
    }
    expect(await sessionCount()).toBe(0);
  });

  it("refuses a deleted account the same way", async () => {
    await seedTestAdmin(EMAIL, PASSWORD, { deletedAt: new Date() });
    const result = await signIn(PASSWORD);
    expect(result).toMatchObject({ ok: false, status: 401, code: "INVALID_EMAIL_OR_PASSWORD" });
    expect(await sessionCount()).toBe(0);
  });

  it("lets a content manager in with the password the admin set (no forced change)", async () => {
    await seedTestAdmin(EMAIL, PASSWORD, { role: "content_manager", permissions: ["news"] });
    expect((await signIn(PASSWORD)).ok).toBe(true);
  });

  it("keeps session.cookieCache disabled so grants are read fresh on every request (FR-007)", async () => {
    const { getAuth } = await import("@/lib/auth");
    const auth = await getAuth();
    const ctx = await auth.$context;
    expect(ctx.options.session?.cookieCache?.enabled).not.toBe(true);
  });
});
