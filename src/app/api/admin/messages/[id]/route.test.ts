// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Message } from "@/models/message";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "messages-id-route-test@example.com";
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

function patchRequest(body: unknown) {
  return new Request("http://localhost/x", {
    method: "PATCH",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describeWithDb("PATCH & DELETE /api/admin/messages/[id]", ["messages", "user", "account", "session"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("PATCH returns 401 without a session", async () => {
    vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
    const { PATCH } = await import("./route");
    const response = await PATCH(patchRequest({ status: "read" }), ctx(UNKNOWN_ID));
    expect(response.status).toBe(401);
  });

  it("DELETE returns 401 without a session", async () => {
    vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
    const { DELETE } = await import("./route");
    const response = await DELETE(new Request("http://localhost/x"), ctx(UNKNOWN_ID));
    expect(response.status).toBe(401);
  });

  it("PATCH updates the status and returns 200", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { PATCH } = await import("./route");

    const id = doc._id.toString();
    const response = await PATCH(patchRequest({ status: "responded" }), ctx(id));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.status).toBe("responded");

    const after = await Message.findById(id);
    expect(after!.status).toBe("responded");
  });

  it("PATCH returns 400 for an unknown status or non-JSON body", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { PATCH } = await import("./route");

    const id = doc._id.toString();
    const badStatus = await PATCH(patchRequest({ status: "archived" }), ctx(id));
    expect(badStatus.status).toBe(400);
    expect((await badStatus.json()).fields.status).toBeDefined();

    const badJson = await PATCH(
      new Request("http://localhost/x", { method: "PATCH", body: "not json" }),
      ctx(id),
    );
    expect(badJson.status).toBe(400);
  });

  it("PATCH returns 404 for an unknown or deleted id", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    await Message.softDeleteById(doc._id);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { PATCH } = await import("./route");

    for (const id of [UNKNOWN_ID, doc._id.toString()]) {
      const response = await PATCH(patchRequest({ status: "read" }), ctx(id));
      expect(response.status).toBe(404);
    }
  });

  it("DELETE soft-deletes a live message, then 404s on a second call and a malformed id", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { DELETE } = await import("./route");

    const id = doc._id.toString();
    const first = await DELETE(new Request("http://localhost/x"), ctx(id));
    expect(first.status).toBe(200);
    expect(await first.json()).toEqual({ id, deleted: true });
    expect(await Message.findById(id)).toBeNull();

    const second = await DELETE(new Request("http://localhost/x"), ctx(id));
    expect(second.status).toBe(404);

    const malformed = await DELETE(new Request("http://localhost/x"), ctx("not-an-id"));
    expect(malformed.status).toBe(404);
  });

  it("after a delete, markMessageRead and setMessageStatus (via PATCH) both 404", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    const doc = await createMessageDoc();
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { DELETE, PATCH } = await import("./route");

    const id = doc._id.toString();
    await DELETE(new Request("http://localhost/x"), ctx(id));
    const patchResponse = await PATCH(patchRequest({ status: "read" }), ctx(id));
    expect(patchResponse.status).toBe(404);
  });
});
