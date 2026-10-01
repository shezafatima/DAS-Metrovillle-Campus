// @vitest-environment node
import { it, expect, vi, beforeEach } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedTestAdmin, getTestSessionCookie } from "@/test/admin-session";
import { Signup } from "@/models/signup";
import { markSignupsOpened } from "@/lib/notifications/state";
import { countNewSignups } from "@/lib/notifications/queries";
import { mockNextHeaders } from "@/test/next-headers";

const ADMIN_EMAIL = "signups-opened-route-test@example.com";
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
  "POST /api/admin/signups/opened",
  ["signups", "adminNotificationStates", "user", "account", "session"],
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

    it("advances the admin's last-opened moment so the new-signup count drops to zero", async () => {
      await seedTestAdmin(ADMIN_EMAIL, ADMIN_PASSWORD);
      const cookie = await getTestSessionCookie(ADMIN_EMAIL, ADMIN_PASSWORD);
      const adminId = await getAdminUserId(ADMIN_EMAIL);

      await markSignupsOpened(adminId, new Date(Date.now() - 60 * 60_000));
      await Signup.create({
        name: "Sara",
        email: "sara@example.com",
        phone: "+923001234567",
        sources: ["home"],
        firstSignupAt: new Date(),
        lastSignupAt: new Date(),
      });
      expect(await countNewSignups(adminId)).toBe(1);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { POST } = await import("./route");

      const response = await POST();
      expect(response.status).toBe(200);
      expect(await response.json()).toEqual({ signupsNew: 0 });

      expect(await countNewSignups(adminId)).toBe(0);
    });
  },
);
