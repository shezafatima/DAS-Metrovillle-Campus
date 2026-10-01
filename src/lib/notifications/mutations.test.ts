// @vitest-environment node
import { it, expect } from "vitest";
import { describeWithDb } from "@/test/db";
import { Message } from "@/models/message";
import { markAllNotificationsRead } from "@/lib/notifications/mutations";
import { countNewSignups } from "@/lib/notifications/queries";

const mainAdmin = (userId: string) => ({ userId, role: "main_admin" as const, permissions: [] });

describeWithDb("notifications mutations", ["messages", "signups", "adminNotificationStates"], () => {
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

  it("advances the admin's signupsLastOpenedAt so the new-signup count drops to zero", async () => {
    const { Signup } = await import("@/models/signup");
    const { markSignupsOpened } = await import("@/lib/notifications/state");
    await markSignupsOpened("admin-2", new Date(Date.now() - 60 * 60_000));
    await Signup.create({
      name: "Ali",
      email: "ali2@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: new Date(),
      lastSignupAt: new Date(),
    });
    expect(await countNewSignups("admin-2")).toBe(1);

    await markAllNotificationsRead(mainAdmin("admin-2"));

    expect(await countNewSignups("admin-2")).toBe(0);
  });

  it("a content manager without `messages` cannot mark messages read (011)", async () => {
    const msg = await Message.create({ name: "Ali", email: "a@example.com", subject: "Hi", body: "Hello", status: "new" });

    await markAllNotificationsRead({ userId: "cm-1", role: "content_manager", permissions: ["news", "careers"] });

    expect((await Message.findById(msg._id))!.status).toBe("new");
  });

  it("a content manager without `careers` does not move their signups marker (011)", async () => {
    const { Signup } = await import("@/models/signup");
    const { markSignupsOpened } = await import("@/lib/notifications/state");
    await markSignupsOpened("cm-2", new Date(Date.now() - 60 * 60_000));
    await Signup.create({
      name: "Ali",
      email: "ali3@example.com",
      phone: "+923001234567",
      sources: ["home"],
      firstSignupAt: new Date(),
      lastSignupAt: new Date(),
    });

    await markAllNotificationsRead({ userId: "cm-2", role: "content_manager", permissions: ["messages"] });

    expect(await countNewSignups("cm-2")).toBe(1);
  });
});
