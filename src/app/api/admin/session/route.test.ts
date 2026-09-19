// @vitest-environment node
import { it, expect, vi } from "vitest";
import { describeWithDb } from "@/test/db";

const ADMIN_EMAIL = "session-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function seedAdmin() {
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const ctx = await auth.$context;
  const existing = await ctx.internalAdapter.findUserByEmail(ADMIN_EMAIL);
  if (existing) return;
  const hash = await ctx.password.hash(ADMIN_PASSWORD);
  const user = await ctx.internalAdapter.createUser(
    { email: ADMIN_EMAIL, name: "session-route-test", emailVerified: true },
    { method: "email-password" },
  );
  await ctx.internalAdapter.linkAccount({
    userId: user.id,
    providerId: "credential",
    accountId: user.id,
    password: hash,
  });
}

describeWithDb("GET /api/admin/session", ["user", "account", "session"], () => {
  it("returns 401 with no cookie", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    const body = await response.json();
    expect(body).toEqual({ error: "unauthorized" });
    vi.doUnmock("next/headers");
  });

  it("returns 200 with the admin's email for a valid session", async () => {
    await seedAdmin();
    const { getAuth } = await import("@/lib/auth");
    const auth = await getAuth();
    const { headers: setHeaders } = await auth.api.signInEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      returnHeaders: true,
    });
    const cookie = setHeaders.getSetCookie()[0]?.split(";")[0];
    expect(cookie).toBeTruthy();

    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ cookie: cookie! }),
    }));
    vi.resetModules();
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body).toEqual({ email: ADMIN_EMAIL });
    vi.doUnmock("next/headers");
  });

  it("returns 401 once the session has expired", async () => {
    await seedAdmin();
    const { getAuth } = await import("@/lib/auth");
    const auth = await getAuth();
    const mongoose = (await import("mongoose")).default;
    const { headers: setHeaders } = await auth.api.signInEmail({
      body: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
      returnHeaders: true,
    });
    const cookie = setHeaders.getSetCookie()[0]?.split(";")[0];

    await mongoose.connection.db!
      .collection("session")
      .updateMany({}, { $set: { expiresAt: new Date(Date.now() - 60_000) } });

    vi.doMock("next/headers", () => ({
      headers: async () => new Headers({ cookie: cookie! }),
    }));
    vi.resetModules();
    const { GET } = await import("./route");
    const response = await GET();
    expect(response.status).toBe(401);
    vi.doUnmock("next/headers");
  });
});
