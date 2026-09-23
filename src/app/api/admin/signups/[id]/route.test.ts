// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Signup } from "@/models/signup";

const ADMIN_EMAIL = "signup-delete-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";
const UNKNOWN_ID = "507f1f77bcf86cd799439011";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

describeWithDb("DELETE /api/admin/signups/[id]", ["signups", "user", "account", "session"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("returns 401 without a session", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/admin/signups/" + UNKNOWN_ID), ctx(UNKNOWN_ID));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("soft-deletes a live record for an authorized admin", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const now = new Date();
    const doc = await Signup.create({
      name: "Ali Khan",
      email: "delete-me@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
    });

    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { DELETE } = await import("./route");

    const id = doc._id.toString();
    const response = await DELETE(new Request("http://localhost/api/admin/signups/" + id), ctx(id));

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id, deleted: true });

    const after = await Signup.findById(id);
    expect(after).toBeNull(); // excluded by the default deletedAt:null filter
  });

  it("returns 404 for the same id deleted twice", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const now = new Date();
    const doc = await Signup.create({
      name: "Ali Khan",
      email: "delete-twice@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: now,
      lastSignupAt: now,
    });

    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { DELETE } = await import("./route");

    const id = doc._id.toString();
    const first = await DELETE(new Request("http://localhost/api/admin/signups/" + id), ctx(id));
    expect(first.status).toBe(200);

    const second = await DELETE(new Request("http://localhost/api/admin/signups/" + id), ctx(id));
    expect(second.status).toBe(404);
    expect(await second.json()).toEqual({ error: "not_found" });
  });

  it("returns 404 for a malformed id", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { DELETE } = await import("./route");

    const response = await DELETE(new Request("http://localhost/api/admin/signups/not-an-id"), ctx("not-an-id"));
    expect(response.status).toBe(404);
  });
});
