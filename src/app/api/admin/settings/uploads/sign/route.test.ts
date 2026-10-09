// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";

const signImageUpload = vi.fn((folder: string) => ({
  cloudName: "demo",
  apiKey: "key",
  timestamp: 1700000000,
  signature: "sig",
  folder,
  allowedFormats: "jpg,png,webp",
  transformation: "c_limit,w_2400,h_2400",
  maxBytes: 5 * 1024 * 1024,
}));

vi.mock("@/lib/cloudinary", () => ({
  SETTINGS_HERO_FOLDER: "settings/hero",
  SETTINGS_GALLERY_FOLDER: "settings/gallery",
  signImageUpload: (folder: string) => signImageUpload(folder),
}));

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/settings/uploads/sign", {
    method: "POST",
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
}

const allowed = {
  requireAdminAccess: async () => ({
    ok: true,
    session: { email: "cm@example.com", sessionId: "s1", userId: "u1", role: "content_manager", permissions: ["settings"] },
  }),
};

beforeEach(() => {
  signImageUpload.mockClear();
  vi.doUnmock("@/lib/dal");
  vi.resetModules();
});

it("returns 401 without a session and signs nothing", async () => {
  vi.doMock("@/lib/dal", () => ({ requireAdminAccess: async () => ({ ok: false, reason: "unauthorized" }) }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "gallery" }));
  expect(response.status).toBe(401);
  expect(signImageUpload).not.toHaveBeenCalled();
});

it('returns 403 for a user without the settings permission, and requires exactly "settings"', async () => {
  const calls: string[] = [];
  vi.doMock("@/lib/dal", () => ({
    requireAdminAccess: async (access: string) => {
      calls.push(access);
      return { ok: false, reason: "forbidden" };
    },
  }));
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind: "gallery" }));
  expect(response.status).toBe(403);
  expect(await response.json()).toEqual({ error: "forbidden" });
  expect(calls).toEqual(["settings"]);
  expect(signImageUpload).not.toHaveBeenCalled();
});

it.each([
  ["hero-desktop", "settings/hero"],
  ["hero-mobile", "settings/hero"],
  ["gallery", "settings/gallery"],
])("signs %s uploads for the %s folder and never returns the secret", async (kind, folder) => {
  vi.doMock("@/lib/dal", () => allowed);
  vi.resetModules();
  const { POST } = await import("./route");
  const response = await POST(postRequest({ kind }));
  expect(response.status).toBe(200);
  expect(response.headers.get("cache-control")).toBe("no-store");
  const body = await response.json();
  expect(body).toMatchObject({ folder, allowedFormats: "jpg,png,webp", maxBytes: 5 * 1024 * 1024 });
  expect(JSON.stringify(body)).not.toMatch(/secret/i);
});

it.each([{ kind: "news-cover" }, { kind: "constructor" }, { kind: 5 }, {}, "not json"])(
  "returns 400 for an unknown or malformed kind (%j)",
  async (body) => {
    vi.doMock("@/lib/dal", () => allowed);
    vi.resetModules();
    const { POST } = await import("./route");
    const response = await POST(postRequest(body));
    expect(response.status).toBe(400);
    expect(signImageUpload).not.toHaveBeenCalled();
  },
);
