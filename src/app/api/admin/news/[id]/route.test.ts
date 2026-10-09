// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "news-id-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";
const UNKNOWN_ID = "507f1f77bcf86cd799439011";

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    title: "Annual Sports Day",
    bodyHtml: "<p>Join us for sports day.</p>",
    category: "events",
    publishDate: "2026-09-21",
    ...overrides,
  };
}

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createPostForTest(cookie: string) {
  vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
  vi.resetModules();
  const { POST } = await import("../route");
  const response = await POST(
    new Request("http://localhost/api/admin/news", {
      method: "POST",
      body: JSON.stringify(validBody()),
    }),
  );
  const body = await response.json();
  return body.id as string;
}

describeWithDb(
  "/api/admin/news/[id]",
  ["news", "user", "account", "session"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.resetModules();
    });

    it("GET/PUT/DELETE all return 401 without a session", async () => {
      vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
      const { GET, PUT, DELETE } = await import("./route");

      const getRes = await GET(new Request("http://localhost"), ctx(UNKNOWN_ID));
      expect(getRes.status).toBe(401);

      const putRes = await PUT(
        new Request("http://localhost", { method: "PUT", body: JSON.stringify(validBody()) }),
        ctx(UNKNOWN_ID),
      );
      expect(putRes.status).toBe(401);

      const deleteRes = await DELETE(new Request("http://localhost"), ctx(UNKNOWN_ID));
      expect(deleteRes.status).toBe(401);
    });

    it("GET returns 404 for an unknown id, and the created post's DTO once it exists", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const id = await createPostForTest(cookie);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { GET } = await import("./route");

      const notFound = await GET(new Request("http://localhost"), ctx(UNKNOWN_ID));
      expect(notFound.status).toBe(404);

      const found = await GET(new Request("http://localhost"), ctx(id));
      expect(found.status).toBe(200);
      const body = await found.json();
      expect(body.title).toBe("Annual Sports Day");
    });

    it("PUT returns 404 for an unknown id and 200 with the DTO for a real update", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const id = await createPostForTest(cookie);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { PUT } = await import("./route");

      const notFound = await PUT(
        new Request("http://localhost", { method: "PUT", body: JSON.stringify(validBody()) }),
        ctx(UNKNOWN_ID),
      );
      expect(notFound.status).toBe(404);

      const updated = await PUT(
        new Request("http://localhost", {
          method: "PUT",
          body: JSON.stringify(validBody({ title: "Updated Title" })),
        }),
        ctx(id),
      );
      expect(updated.status).toBe(200);
    });

    it("DELETE returns 200 then GET returns 404 afterward", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const id = await createPostForTest(cookie);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { DELETE, GET } = await import("./route");

      const deleteRes = await DELETE(new Request("http://localhost"), ctx(id));
      expect(deleteRes.status).toBe(200);

      const getRes = await GET(new Request("http://localhost"), ctx(id));
      expect(getRes.status).toBe(404);
    });
  },
);
