// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Message } from "@/models/message";
import { Signup } from "@/models/signup";
import { markSignupsOpened } from "@/lib/notifications/state";
import { getNotificationsSummary } from "@/lib/notifications/queries";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "notifications-read-route-test@example.com";
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
  "POST /api/admin/notifications/read",
  ["messages", "signups", "adminNotificationStates", "user", "account", "session"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.resetModules();
    });

    it("returns 401 without a session", async () => {
      vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
      const { POST } = await import("./route");

      const response = await POST();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
    });

    it("marks every new message read and clears the signup count", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const adminId = await getAdminUserId(ADMIN_EMAIL);

      await markSignupsOpened(adminId, new Date(Date.now() - 60 * 60_000));
      const msg1 = await Message.create({ name: "Ali", email: "ali@example.com", subject: "Hi", body: "Hello", status: "new" });
      const msg2 = await Message.create({ name: "Bilal", email: "bilal@example.com", subject: "Hi2", body: "Hello2", status: "new" });
      await Signup.create({
        name: "Sara",
        email: "sara@example.com",
        phone: "+923001234567",
        sources: ["home"],
        firstSignupAt: new Date(),
        lastSignupAt: new Date(),
      });

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { POST } = await import("./route");

      const response = await POST();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ messagesNew: 0, signupsNew: 0 });

      expect((await Message.findById(msg1._id))!.status).toBe("read");
      expect((await Message.findById(msg2._id))!.status).toBe("read");

      const summary = await getNotificationsSummary({ userId: adminId, role: "main_admin", permissions: [] });
      expect(summary.messagesNew).toBe(0);
      expect(summary.signupsNew).toBe(0);
    });
  },
);
