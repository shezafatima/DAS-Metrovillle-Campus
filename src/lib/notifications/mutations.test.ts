// @vitest-environment node
import { it, expect, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";
import { seedApplication } from "@/test/career-applications";
import { markAllNotificationsRead } from "@/lib/notifications/mutations";
import { countNewApplications } from "@/lib/notifications/queries";
import { markCareersOpened } from "@/lib/notifications/state";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const mainAdmin = (userId: string) => ({ userId, role: "main_admin" as const, permissions: [] });

describeWithDb("notifications mutations", ["messages", "careerApplications", "adminNotificationStates"], () => {
  it("moves every new message to read, and leaves responded messages untouched", async () => {
    const newOne = await Message.create({
      name: "Ali",
      email: "ali@example.com",
      subject: "Hi",
      body: "Hello",
      status: "new",
    });
    const responded = await Message.create({
      name: "Sara",
      email: "sara@example.com",
      subject: "Thanks",
      body: "Thanks",
      status: "responded",
      statusChangedAt: new Date("2026-01-01T00:00:00.000Z"),
    });

    await markAllNotificationsRead(mainAdmin("admin-1"));

    const afterNew = await Message.findById(newOne._id);
    expect(afterNew!.status).toBe("read");
    expect(afterNew!.statusChangedAt).not.toBeNull();

    const afterResponded = await Message.findById(responded._id);
    expect(afterResponded!.status).toBe("responded");
    expect(afterResponded!.statusChangedAt).toEqual(new Date("2026-01-01T00:00:00.000Z"));
  });

  it("advances the admin's careersLastOpenedAt so the new-application count drops to zero", async () => {
    await markCareersOpened("admin-2", new Date(Date.now() - 60 * 60_000));
    await seedApplication({ createdAt: new Date() });
    expect(await countNewApplications("admin-2")).toBe(1);

    await markAllNotificationsRead(mainAdmin("admin-2"));

    expect(await countNewApplications("admin-2")).toBe(0);
  });

  it("never changes or deletes an application", async () => {
    await markCareersOpened("admin-keep", new Date(Date.now() - 60 * 60_000));
    const { id } = await seedApplication({ createdAt: new Date(), name: "Ayesha Khan" });

    await markAllNotificationsRead(mainAdmin("admin-keep"));

    const { CareerApplication } = await import("@/models/career-application");
    const doc = await CareerApplication.findById(id).lean();
    expect(doc?.name).toBe("Ayesha Khan");
    expect(doc?.deletedAt).toBeNull();
  });

  it("a content manager without `messages` cannot mark messages read (011)", async () => {
    const msg = await Message.create({ name: "Ali", email: "a@example.com", subject: "Hi", body: "Hello", status: "new" });

    await markAllNotificationsRead({ userId: "cm-1", role: "content_manager", permissions: ["news", "careers"] });

    expect((await Message.findById(msg._id))!.status).toBe("new");
  });

  it("a content manager without `careers` does not move their applications marker (011)", async () => {
    await markCareersOpened("cm-2", new Date(Date.now() - 60 * 60_000));
    await seedApplication({ createdAt: new Date() });

    await markAllNotificationsRead({ userId: "cm-2", role: "content_manager", permissions: ["messages"] });

    expect(await countNewApplications("cm-2")).toBe(1);
  });
});
