// @vitest-environment node
import { describe, it, expect, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";
import { Signup } from "@/models/signup";
import { countNewSignups, listNotificationItems, getNotificationsSummary } from "@/lib/notifications/queries";
import { markSignupsOpened } from "@/lib/notifications/state";

function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60_000);
}

async function seedSignup(overrides: Partial<Record<string, unknown>> = {}) {
  const now = new Date();
  return Signup.create({
    name: "Ali Khan",
    email: `ali-${Math.random()}@example.com`,
    phone: "+923001234567",
    sources: ["home"],
    firstSignupAt: now,
    lastSignupAt: now,
    ...overrides,
  });
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
  ["messages", "signups", "adminNotificationStates"],
  () => {
    it("countNewSignups is 0 for a fresh admin with only pre-existing signups", async () => {
      await seedSignup({ lastSignupAt: minutesAgo(60) });
      const count = await countNewSignups("admin-fresh");
      expect(count).toBe(0);
    });

    it("counts a signup created after the last-opened moment", async () => {
      await markSignupsOpened("admin-a", minutesAgo(10));
      await seedSignup({ lastSignupAt: minutesAgo(1) });
      const count = await countNewSignups("admin-a");
      expect(count).toBe(1);
    });

    it("excludes a deleted signup even if newer than last-opened", async () => {
      await markSignupsOpened("admin-b", minutesAgo(10));
      const doc = await seedSignup({ lastSignupAt: minutesAgo(1) });
      await Signup.softDeleteById(doc._id.toString());
      const count = await countNewSignups("admin-b");
      expect(count).toBe(0);
    });

    it("a repeat submission after last-opened counts again, even if previously not new", async () => {
      const opened = minutesAgo(30);
      await markSignupsOpened("admin-c", opened);
      const doc = await seedSignup({ lastSignupAt: minutesAgo(60) }); // older than "opened" — not new
      expect(await countNewSignups("admin-c")).toBe(0);

      // Simulate a repeat submission (004's upsert bumps lastSignupAt).
      await Signup.findByIdAndUpdate(doc._id, { lastSignupAt: minutesAgo(1) });
      expect(await countNewSignups("admin-c")).toBe(1);
    });

    it("listNotificationItems merges and caps at the limit across both kinds", async () => {
      await markSignupsOpened("admin-d", minutesAgo(120));
      for (let i = 0; i < 7; i++) {
        await seedMessage({ email: `m${i}@example.com`, createdAt: minutesAgo(20 - i) });
      }
      for (let i = 0; i < 7; i++) {
        await seedSignup({ lastSignupAt: minutesAgo(19 - i) });
      }

      const items = await listNotificationItems("admin-d", 10);
      expect(items).toHaveLength(10);
      const timestamps = items.map((i) => new Date(i.timestamp).getTime());
      expect(timestamps).toEqual([...timestamps].sort((a, b) => b - a));
      expect(items[0]!.kind).toBe("signup"); // the most recently seeded signup is the newest
      expect(items.some((i) => i.kind === "message")).toBe(true);
    });

    it("listNotificationItems excludes deleted messages and signups", async () => {
      await markSignupsOpened("admin-e", minutesAgo(60));
      const msg = await seedMessage({ createdAt: minutesAgo(1) });
      await Message.softDeleteById(msg._id.toString());
      const signup = await seedSignup({ lastSignupAt: minutesAgo(1) });
      await Signup.softDeleteById(signup._id.toString());

      const items = await listNotificationItems("admin-e", 10);
      expect(items).toHaveLength(0);
    });

    it("message items link to their detail page; signup items link to the Signups list", async () => {
      await markSignupsOpened("admin-f", minutesAgo(60));
      const msg = await seedMessage({ createdAt: minutesAgo(1) });
      await seedSignup({ lastSignupAt: minutesAgo(1) });

      const items = await listNotificationItems("admin-f", 10);
      const messageItem = items.find((i) => i.kind === "message")!;
      const signupItem = items.find((i) => i.kind === "signup")!;
      expect(messageItem.href).toBe(`/admin/messages/${msg._id.toString()}`);
      expect(signupItem.href).toBe("/admin/signups");
    });

    it("getNotificationsSummary combines the two counts and the merged items for a main admin", async () => {
      await markSignupsOpened("admin-g", minutesAgo(60));
      await seedMessage({ createdAt: minutesAgo(1) });
      await seedSignup({ lastSignupAt: minutesAgo(1) });

      const summary = await getNotificationsSummary({ userId: "admin-g", role: "main_admin", permissions: [] });
      expect(summary.messagesNew).toBe(1);
      expect(summary.signupsNew).toBe(1);
      expect(summary.items).toHaveLength(2);
    });

    describe("permission-aware summary (011 FR-010)", () => {
      async function seedBoth(adminId: string) {
        await markSignupsOpened(adminId, minutesAgo(60));
        await seedMessage({ createdAt: minutesAgo(1) });
        await seedSignup({ lastSignupAt: minutesAgo(1) });
      }
      const manager = (userId: string, permissions: string[]) => ({
        userId,
        role: "content_manager" as const,
        permissions,
      });

      it("a content manager with no grants gets nothing, and neither collection is queried", async () => {
        await seedBoth("cm-none");
        const messageFind = vi.spyOn(Message, "find");
        const signupFind = vi.spyOn(Signup, "find");
        const messageCount = vi.spyOn(Message, "countDocuments");
        const signupCount = vi.spyOn(Signup, "countDocuments");

        const summary = await getNotificationsSummary(manager("cm-none", []));

        expect(summary).toEqual({ messagesNew: 0, signupsNew: 0, items: [] });
        expect(messageFind).not.toHaveBeenCalled();
        expect(signupFind).not.toHaveBeenCalled();
        expect(messageCount).not.toHaveBeenCalled();
        expect(signupCount).not.toHaveBeenCalled();
        vi.restoreAllMocks();
      });

      it("with only `messages`: message count and items, no signups", async () => {
        await seedBoth("cm-msg");
        const summary = await getNotificationsSummary(manager("cm-msg", ["messages"]));
        expect(summary.messagesNew).toBe(1);
        expect(summary.signupsNew).toBe(0);
        expect(summary.items.map((i) => i.kind)).toEqual(["message"]);
      });

      it("with only `careers`: signup count and items, no messages", async () => {
        await seedBoth("cm-car");
        const summary = await getNotificationsSummary(manager("cm-car", ["careers"]));
        expect(summary.messagesNew).toBe(0);
        expect(summary.signupsNew).toBe(1);
        expect(summary.items.map((i) => i.kind)).toEqual(["signup"]);
      });

      it("grants for unrelated sections (news, settings) reveal nothing", async () => {
        await seedBoth("cm-news");
        const summary = await getNotificationsSummary(manager("cm-news", ["news", "settings", "pages"]));
        expect(summary).toEqual({ messagesNew: 0, signupsNew: 0, items: [] });
      });
    });
  },
);
