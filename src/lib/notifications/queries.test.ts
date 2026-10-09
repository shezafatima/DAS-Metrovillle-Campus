// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";
import { CareerApplication } from "@/models/career-application";
import { seedApplication } from "@/test/career-applications";
import { countNewApplications, listNotificationItems, getNotificationsSummary } from "@/lib/notifications/queries";
import { markCareersOpened } from "@/lib/notifications/state";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

async function seedMessage(overrides: Partial<Record<string, unknown>> = {}) {
  return Message.create({
    name: "Sara Ahmed",
    email: "sara@example.com",
    subject: "Admission enquiry",
    body: "Hello",
    status: "new",
    ...overrides,
  });
}

describeWithDb(
  "notifications queries",
  ["messages", "careerApplications", "adminNotificationStates"],
  () => {
    it("countNewApplications is 0 for a fresh admin with only pre-existing applications", async () => {
      await seedApplication({ createdAt: minutesAgo(60) });
      const count = await countNewApplications("admin-fresh");
      expect(count).toBe(0);
    });

    it("counts an application made after the last-opened moment", async () => {
      await markCareersOpened("admin-a", minutesAgo(10));
      await seedApplication({ createdAt: minutesAgo(1) });
      expect(await countNewApplications("admin-a")).toBe(1);
    });

    it("excludes a deleted application even if newer than last-opened", async () => {
      await markCareersOpened("admin-b", minutesAgo(10));
      const { id } = await seedApplication({ createdAt: minutesAgo(1) });
      await CareerApplication.softDeleteById(id);
      expect(await countNewApplications("admin-b")).toBe(0);
    });

    it("excludes a pending application (its CV was never confirmed)", async () => {
      await markCareersOpened("admin-pending", minutesAgo(10));
      await seedApplication({ createdAt: minutesAgo(1), storedAt: null });
      expect(await countNewApplications("admin-pending")).toBe(0);
    });

    it("an application older than last-opened is not new, and stays not new", async () => {
      await markCareersOpened("admin-c", minutesAgo(30));
      await seedApplication({ createdAt: minutesAgo(60) });
      expect(await countNewApplications("admin-c")).toBe(0);
    });

    it("listNotificationItems merges and caps at the limit across both kinds", async () => {
      await markCareersOpened("admin-d", minutesAgo(120));
      for (let i = 0; i < 7; i++) {
        await seedMessage({ email: `m${i}@example.com`, createdAt: minutesAgo(20 - i) });
      }
      for (let i = 0; i < 7; i++) {
        await seedApplication({ createdAt: minutesAgo(19 - i) });
      }

      const items = await listNotificationItems("admin-d", 10);
      expect(items).toHaveLength(10);
      const timestamps = items.map((i) => new Date(i.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
      expect(items[0]!.kind).toBe("application"); // the most recently seeded application is the newest
      expect(items.some((i) => i.kind === "message")).toBe(true);
    });

    it("listNotificationItems excludes deleted messages and applications", async () => {
      await markCareersOpened("admin-e", minutesAgo(60));
      const msg = await seedMessage({ createdAt: minutesAgo(1) });
      await Message.softDeleteById(msg._id.toString());
      const application = await seedApplication({ createdAt: minutesAgo(1) });
      await CareerApplication.softDeleteById(application.id);

      const items = await listNotificationItems("admin-e", 10);
      expect(items).toHaveLength(0);
    });

    it("message items link to their detail page; application items link to that application", async () => {
      await markCareersOpened("admin-f", minutesAgo(60));
      const msg = await seedMessage({ createdAt: minutesAgo(1) });
      const application = await seedApplication({ createdAt: minutesAgo(1), name: "Ayesha Khan", qualification: "M.Ed" });

      const items = await listNotificationItems("admin-f", 10);
      const messageItem = items.find((i) => i.kind === "message")!;
      const applicationItem = items.find((i) => i.kind === "application")!;
      expect(messageItem.href).toBe(`/admin/messages/${msg._id.toString()}`);
      expect(applicationItem.href).toBe(`/admin/careers/${application.id}`);
      expect(applicationItem.title).toBe("Ayesha Khan");
      expect(applicationItem.description).toBe("M.Ed");
    });

    it("getNotificationsSummary combines the two counts and the merged items for a main admin", async () => {
      await markCareersOpened("admin-g", minutesAgo(60));
      await seedMessage({ createdAt: minutesAgo(1) });
      await seedApplication({ createdAt: minutesAgo(1) });

      const summary = await getNotificationsSummary({ userId: "admin-g", role: "main_admin", permissions: [] });
      expect(summary.messagesNew).toBe(1);
      expect(summary.applicationsNew).toBe(1);
      expect(summary.items).toHaveLength(2);
    });

    describe("permission-aware summary (011 FR-010)", () => {
      async function seedBoth(adminId: string) {
        await markCareersOpened(adminId, minutesAgo(60));
        await seedMessage({ createdAt: minutesAgo(1) });
        await seedApplication({ createdAt: minutesAgo(1) });
      }
      const manager = (userId: string, permissions: string[]) => ({
        userId,
        role: "content_manager" as const,
        permissions,
      });

      it("a content manager with no grants gets nothing, and neither collection is queried", async () => {
        await seedBoth("cm-none");
        const messageFind = vi.spyOn(Message, "find");
        const applicationFind = vi.spyOn(CareerApplication, "find");
        const messageCount = vi.spyOn(Message, "countDocuments");
        const applicationCount = vi.spyOn(CareerApplication, "countDocuments");

        const summary = await getNotificationsSummary(manager("cm-none", []));

        expect(summary).toEqual({ messagesNew: 0, applicationsNew: 0, items: [] });
        expect(messageFind).not.toHaveBeenCalled();
        expect(applicationFind).not.toHaveBeenCalled();
        expect(messageCount).not.toHaveBeenCalled();
        expect(applicationCount).not.toHaveBeenCalled();
        vi.restoreAllMocks();
      });

      it("with only `messages`: message count and items, no applications", async () => {
        await seedBoth("cm-msg");
        const summary = await getNotificationsSummary(manager("cm-msg", ["messages"]));
        expect(summary.messagesNew).toBe(1);
        expect(summary.applicationsNew).toBe(0);
        expect(summary.items.map((i) => i.kind)).toEqual(["message"]);
      });

      it("with only `careers`: application count and items, no messages", async () => {
        await seedBoth("cm-car");
        const summary = await getNotificationsSummary(manager("cm-car", ["careers"]));
        expect(summary.messagesNew).toBe(0);
        expect(summary.applicationsNew).toBe(1);
        expect(summary.items.map((i) => i.kind)).toEqual(["application"]);
      });

      it("grants for unrelated sections (news, settings) reveal nothing", async () => {
        await seedBoth("cm-news");
        const summary = await getNotificationsSummary(manager("cm-news", ["news", "settings", "pages"]));
        expect(summary).toEqual({ messagesNew: 0, applicationsNew: 0, items: [] });
      });
    });
  },
);
