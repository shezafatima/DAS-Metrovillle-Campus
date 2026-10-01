// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "news-create-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Annual Sports Day",
    bodyHtml: "<p>Join us for sports day.</p>",
    category: "events",
    publishDate: "2026-09-21",
    ...overrides,
  };
}

function postRequest(body: unknown) {
  return new Request("http://localhost/api/admin/news", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

describeWithDb("POST /api/admin/news", ["news", "user", "account", "session"], () => {
  beforeEach(() => {
    vi.doUnmock("next/headers");
    vi.resetModules();
  });

  it("returns 401 without a session", async () => {
    vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
    const { POST } = await import("./route");
    const response = await POST(postRequest(validBody()));
    expect(response.status).toBe(401);
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  it("creates a post with a generated slug for an authorized admin", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(postRequest(validBody({ title: "Winter Break Notice" })));
    expect(response.status).toBe(201);
    const body = await response.json();
    expect(body.slug).toBe("winter-break-notice");
    expect(typeof body.id).toBe("string");
  });

  it("returns 400 with a title field message for an empty title", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(postRequest(validBody({ title: "" })));
    expect(response.status).toBe(400);
    const body = await response.json();
    expect(body.error).toBe("validation");
    expect(body.fields.title).toBeDefined();
  });

  it("returns 502 when cover verification is unavailable", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.doMock("@/lib/cloudinary", () => ({
      verifyNewsCover: async () => ({ ok: false, reason: "unavailable" }),
    }));
    vi.resetModules();
    const { POST } = await import("./route");

    const response = await POST(
      postRequest(
        validBody({
          coverImage: {
            url: "https://res.cloudinary.com/demo/image/upload/v1/news/covers/x.jpg",
            publicId: "news/covers/x",
            width: 100,
            height: 100,
            alt: "Alt text",
          },
        }),
      ),
    );
    expect(response.status).toBe(502);
    vi.doUnmock("@/lib/cloudinary");
  });

  it("returns 409 for a taken hand-typed slug", async () => {
    await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
    const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
    vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
    vi.resetModules();
    const { POST } = await import("./route");

    await POST(postRequest(validBody({ slug: "shared-slug" })));
    const response = await POST(postRequest(validBody({ slug: "shared-slug", title: "Other" })));
    expect(response.status).toBe(409);
    const body = await response.json();
    expect(body.fields.slug).toBeDefined();
  });
});
