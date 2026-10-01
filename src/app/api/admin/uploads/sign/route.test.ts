// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/cloudinary", () => ({
  signNewsCoverUpload: () => ({
    cloudName: "demo",
    apiKey: "key",
    timestamp: 1700000000,
    signature: "sig",
    folder: "news/covers",
    allowedFormats: "jpg,png,webp",
    transformation: "c_limit,w_2400,h_2400",
    maxBytes: 5 * 1024 * 1024,
  }),
}));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/uploads/sign", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

beforeEach(() => {
  vi.doUnmock("@/lib/dal");
  vi.resetModules();
});

it("returns 401 without a session", async () => {
  vi.doMock("@/lib/dal", () => ({ requireAdminAccess: async () => ({ ok: false, reason: "unauthorized" }) }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "news-cover" }));
  expect(response.status).toBe(401);
});

it('returns 403 forbidden for a signed-in user without the news permission, and requires exactly "news"', async () => {
  const calls: string[] = [];
  vi.doMock("@/lib/dal", () => ({
    requireAdminAccess: async (access: string) => {
      calls.push(access);
      return { ok: false, reason: "forbidden" };
    },
  }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "news-cover" }));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect(calls).toEqual(["news"]);
});

it("returns the signed payload with every documented key for an authorized request", async () => {
  vi.doMock("@/lib/dal", () => ({
    requireAdminAccess: async () => ({ ok: true, session: { email: "admin@example.com", sessionId: "s1", userId: "u1", role: "content_manager", permissions: ["news"] } }),
  }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "news-cover" }));
  expect(response.status).toBe(200);
  const body = await response.json();
  expect(body).toMatchObject({
    cloudName: "demo",
    apiKey: "key",
    folder: "news/covers",
    allowedFormats: "jpg,png,webp",
    transformation: "c_limit,w_2400,h_2400",
    maxBytes: 5 * 1024 * 1024,
  });
  expect(JSON.stringify(body)).not.toMatch(/secret/i);
});

it("returns 400 for an unknown upload kind", async () => {
  vi.doMock("@/lib/dal", () => ({
    requireAdminAccess: async () => ({ ok: true, session: { email: "admin@example.com", sessionId: "s1", userId: "u1", role: "content_manager", permissions: ["news"] } }),
  }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "something-else" }));
  expect(response.status).toBe(400);
});
