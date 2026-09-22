// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";

const ADMIN_EMAIL = "news-publish-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";
const UNKNOWN_ID = "507f1f77bcf86cd799439011";

function ctx(id: string) {
  return { params: Promise.resolve({ id }) };
}

async function createDraft(cookie: string): Promise<string> {
  vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
  vi.resetModules();
  const { POST } = await import("../../route");
  const response = await POST(
    new Request("http://localhost/api/admin/news", {
      method: "POST",
      body: JSON.stringify({
        title: "Draft Post",
        bodyHtml: "<p>Body</p>",
        category: "events",
        publishDate: "2026-09-21",
      }),
    }),
  );
  return (await response.json()).id;
}

describeWithDb(
  "POST /api/admin/news/[id]/publish",
  ["news", "user", "account", "session"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.resetModules();
    });

    it("returns 401 without a session", async () => {
      vi.doMock("next/headers", () => ({ headers: async () => new Headers() }));
      const { POST } = await import("./route");
      const response = await POST(new Request("http://localhost"), ctx(UNKNOWN_ID));
      expect(response.status).toBe(401);
    });

    it("returns 404 for an unknown id", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
      vi.resetModules();
      const { POST } = await import("./route");
      const response = await POST(new Request("http://localhost"), ctx(UNKNOWN_ID));
      expect(response.status).toBe(404);
    });

    it("sets status to published for a real post", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const id = await createDraft(cookie);

      vi.doMock("next/headers", () => ({ headers: async () => new Headers({ cookie }) }));
      vi.resetModules();
      const { POST } = await import("./route");
      const response = await POST(new Request("http://localhost"), ctx(id));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.status).toBe("published");
    });
  },
);
