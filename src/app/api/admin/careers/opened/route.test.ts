// @vitest-environment node
import { beforeEach, expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { getTestSessionCookie, seedTestContentManager } from "@/test/admin-session";
import { mockNextHeaders } from "@/test/next-headers";
import { seedApplication } from "@/test/career-applications";
import { countNewApplications } from "@/lib/notifications/queries";
import { markCareersOpened } from "@/lib/notifications/state";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const EMAIL = "careers-opened-manager@example.test";
const PASSWORD = "correct-horse-battery-staple";

async function userIdOf(email: string): Promise<string> {
  const { getAuth } = await import("@/lib/auth");
  const ctx = await (await getAuth()).$context;
  const found = await ctx.internalAdapter.findUserByEmail(email);
  if (!found) throw new Error("test user not found");
  return found.user.id;
}

describeWithDb(
  "POST /api/admin/careers/opened",
  ["careerApplications", "adminNotificationStates", "user", "account", "session"],
  () => {
    beforeEach(() => {
      vi.doUnmock("next/headers");
      vi.resetModules();
    });

    it("answers 401 without a session", async () => {
      vi.doMock("next/headers", () => mockNextHeaders(new Headers()));
      const { POST } = await import("./route");
      const response = await POST();
      expect(response.status).toBe(401);
      expect(await response.json()).toEqual({ error: "unauthorized" });
    });

    it("answers 403 for a content manager without careers", async () => {
      await seedTestContentManager(EMAIL, PASSWORD, ["news", "messages"]);
      const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { POST } = await import("./route");
      expect((await POST()).status).toBe(403);
    });

    it("advances the admin's last-opened moment so the new-application count drops to zero", async () => {
      await seedTestContentManager(EMAIL, PASSWORD, ["careers"]);
      const cookie = await getTestSessionCookie(EMAIL, PASSWORD);
      const adminId = await userIdOf(EMAIL);
      await markCareersOpened(adminId, new Date(Date.now() - 60 * 60_000));
      await seedApplication({ createdAt: new Date() });
      expect(await countNewApplications(adminId)).toBe(1);

      vi.doMock("next/headers", () => mockNextHeaders(new Headers({ cookie })));
      vi.resetModules();
      const { POST } = await import("./route");
      const response = await POST();

      expect(response.status).toBe(200);
      expect(response.headers.get("cache-control")).toBe("no-store");
      expect(typeof (await response.json()).openedAt).toBe("string");
      expect(await countNewApplications(adminId)).toBe(0);
    });
  },
);
