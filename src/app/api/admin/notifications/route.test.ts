// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Message } from "@/models/message";
import { seedApplication } from "@/test/career-applications";
import { markCareersOpened } from "@/lib/notifications/state";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "notifications-get-route-test@example.com";
const ADMIN_PASSWORD = "correct-horse-battery-staple";

async function getAdminUserId(email: string): Promise<string> {
  const { getAuth } = await import("@/lib/auth");
  const auth = await getAuth();
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.findUserByEmail(email);
  if (!user) throw new Error("test admin not found");
  return user.user.id;
}

describeWithDb(
  "GET /api/admin/notifications",
  ["messages", "careerApplications", "adminNotificationStates", "user", "account", "session"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.resetModules();
    });

    it("returns 401 without a session", async () => {
      vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
      const { GET } = await import("./route");

      const response = await GET();
      expect(response.status).toBe(401);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(await response.json()).toEqual({ error: "unauthorized" });
    });

    it("returns the combined counts and items for an authorized admin", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const adminId = await getAdminUserId(ADMIN_EMAIL);

      await markCareersOpened(adminId, new Date(Date.now() - 60 * 60_000));
      await Message.create({ name: "Ali", email: "ali@example.com", subject: "Hi", body: "Hello", status: "new" });
      await seedApplication({ createdAt: new Date() });

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { GET } = await import("./route");

      const response = await GET();
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.messagesNew).toBe(1);
      expect(body.applicationsNew).toBe(1);
      expect(body.items).toHaveLength(2);
    });

    it("returns 503 when the summary lookup fails", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.doMock("@/lib/notifications/queries", () => ({
        getNotificationsSummary: vi.fn().mockRejectedValue(new Error("db down")),
      }));
      vi.resetModules();
      const { GET } = await import("./route");

      const response = await GET();
      expect(response.status).toBe(503);
      expect(await response.json()).toEqual({ error: "unavailable" });
    });
  },
);
