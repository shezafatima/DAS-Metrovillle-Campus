// @vitest-environment node
import { expect, it, vi } from "vitest";
import { describeWithDb } from "@/test/db";
import { seedRegistration } from "@/test/registration-seed";
import { StudentRegistration } from "@/models/student-registration";
import { getNotificationsSummary, listNotificationItems } from "@/lib/notifications/queries";
import { markRegistrationsOpened } from "@/lib/notifications/state";
import { PERMISSION_KEYS } from "@/lib/permissions";

vi.setConfig({ testTimeout: 120_000, hookTimeout: 120_000 });

const minutesAgo = (n: number) => new Date(Date.now() - n * 60_000);

const MAIN = { userId: "main-1", role: "main_admin" as const, permissions: [] as string[] };
const MANAGER = { userId: "manager-1", role: "content_manager" as const, permissions: [...PERMISSION_KEYS] as string[] };

describeWithDb("registration notifications (013 FR-039)", ["studentRegistrations", "adminNotificationStates", "messages", "careerApplications"], () => {
  it("the main admin sees a count and items with the reference and class only", async () => {
    await markRegistrationsOpened(MAIN.userId, minutesAgo(10));
    await seedRegistration({ createdAt: minutesAgo(1), studentName: "Zartasha Testchild", className: "Class 1", medicalHistory: "PeanutAllergyMarker" });
    const summary = await getNotificationsSummary(MAIN);
    expect(summary.registrationsNew).toBe(1);
    const item = summary.items.find((entry) => entry.kind === "registration");
    expect(item?.title).toMatch(/^Registration [2-9A-HJKMNP-Z]{8}$/);
    expect(item?.description).toBe("Class 1");
    expect(item?.href).toMatch(/^\/admin\/registrations\/[a-f0-9]{24}$/);
    const text = JSON.stringify(summary);
    expect(text).not.toContain("Zartasha");
    expect(text).not.toContain("PeanutAllergyMarker");
  });

  it("a registration older than the last visit, or deleted, is not new", async () => {
    await markRegistrationsOpened(MAIN.userId, minutesAgo(10));
    await seedRegistration({ createdAt: minutesAgo(60) });
    await seedRegistration({ createdAt: minutesAgo(1), deletedAt: new Date() });
    expect((await getNotificationsSummary(MAIN)).registrationsNew).toBe(0);
  });

  it("a content manager holding every permission gets 0, no items, and no query on registrations", async () => {
    await seedRegistration({ createdAt: minutesAgo(1) });
    const find = vi.spyOn(StudentRegistration, "find");
    const count = vi.spyOn(StudentRegistration, "countDocuments");
    const summary = await getNotificationsSummary(MANAGER);
    expect(summary.registrationsNew).toBe(0);
    expect(summary.items.some((entry) => entry.kind === "registration")).toBe(false);
    expect(await listNotificationItems(MANAGER.userId, 10, { messages: true, applications: true, registrations: false })).toEqual([]);
    expect(find).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
    find.mockRestore();
    count.mockRestore();
  });
});
