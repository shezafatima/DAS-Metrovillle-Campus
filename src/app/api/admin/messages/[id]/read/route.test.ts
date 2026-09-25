// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Message } from "@/models/message";

const ADMIN_EMAIL = "messages-read-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";
const UNKNOWN_ID = "507f1f77bcf86cd799439011";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createMessageDoc(overrides: Record<string, unknown> = {}) {
  const now = new Date();
  return Message.create({
    name: "Ali Khan",
    email: "ali@example.com",
    phone: null,
    subject: "Admission",
    body: "Body.",
    status: "new",
    statusChangedAt: null,
    createdAt: now,
    ...overrides,
  });
}

describeWithDb("POST /api/admin/messages/[id]/read", ["messages", "user", "account", "session"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("returns 401 without a session", async () => {
    vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
    const { POST } = await import("./route");
    const response = await POST(new Request("http://localhost/x"), ctx(UNKNOWN_ID));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("marks a new message read", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { POST } = await import("./route");

    const id = doc._id.toString();
    const response = await POST(new Request("http://localhost/x"), ctx(id));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id, status: "read", changed: true });
  });

  it("returns changed: false for an already-read message", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc({ status: "read" });
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { POST } = await import("./route");

    const id = doc._id.toString();
    const response = await POST(new Request("http://localhost/x"), ctx(id));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ id, status: "read", changed: false });
  });

  it("returns 404 for a malformed, unknown or deleted id", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    await Message.softDeleteById(doc._id);
    vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
    vi.resetModules();
    const { POST } = await import("./route");

    for (const id of ["not-an-id", UNKNOWN_ID, doc._id.toString()]) {
      const response = await POST(new Request("http://localhost/x"), ctx(id));
      expect(response.status).toBe(404);
    }
  });
});
