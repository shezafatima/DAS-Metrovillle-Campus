import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedCareerApplications, clearCareerApplications } from "./helpers/careers";

/**
 * US3 — What counts as new (spec.md). Exercises the notification rule
 * purely through the API and the Applications "opened" marker — no bell or
 * sidebar UI involved (that's US1/US2's own specs).
 */
test.describe("admin notifications — what counts as new", () => {
  test.beforeEach(async () => {
    await clearMessages();
    await clearCareerApplications();
    await clearAdminNotificationStates();
  });

  test("counts a new message and a new application, excludes deleted ones", async ({ page, request }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: new Date(Date.now() - 60 * 60_000) });

    await seedMessages([{ name: "Ali", email: "ali@example.com", subject: "Hi", body: "Hello", status: "new" }]);
    await seedCareerApplications([
      { name: "Sara", email: "sara@example.com", phone: "+923001234567", createdAt: new Date() },
    ]);
    await seedMessages([
      { name: "Deleted", email: "deleted@example.com", subject: "Gone", body: "x", status: "new", deletedAt: new Date() },
    ]);
    await seedCareerApplications([
      {
        name: "DeletedApplication",
        email: "deleted-application@example.com",
        phone: "+923001234568",
        sources: ["home"],
        createdAt: new Date(),
        deletedAt: new Date(),
      },
    ]);

    const response = await page.request.get("/api/admin/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.messagesNew).toBe(1);
    expect(body.applicationsNew).toBe(1);

    // A fresh, unauthenticated request context — no admin session cookie.
    const unauth = await request.get("/api/admin/notifications");
    expect(unauth.status()).toBe(401);
  });

  test("opening the Applications list resets the new-application count", async ({ page }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
    await seedCareerApplications([
      { name: "Sara", email: "sara2@example.com", phone: "+923001234567", createdAt: new Date() },
    ]);

    let response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).applicationsNew).toBe(1);

    // Wait for the specific "opened" POST, not general network idleness —
    // NotificationsProvider polls continuously, so the page never goes
    // network-idle.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/admin/careers/opened") && r.status() === 200),
      page.goto("/admin/careers"),
    ]);

    response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).applicationsNew).toBe(0);
  });

  test("an application made after the list was last opened counts as new, and an older one does not", async ({ page }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    const opened = new Date(Date.now() - 60 * 60_000);
    await seedAdminNotificationState({ adminId, careersLastOpenedAt: opened });

    await seedCareerApplications([
      {
        name: "Earlier",
        email: "earlier@example.com",
        phone: "+923001234569",
        createdAt: new Date(opened.getTime() - 60_000), // older than "opened": not new
      },
    ]);
    let response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).applicationsNew).toBe(0);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/admin/careers/opened") && r.status() === 200),
      page.goto("/admin/careers"),
    ]);

    // A new application arrives after the list was opened.
    await seedCareerApplications([
      { name: "Later", email: "later@example.com", phone: "+923001234570", createdAt: new Date(Date.now() + 5_000) },
    ]);

    response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).applicationsNew).toBe(1);
  });

  test("the three notification endpoints reject requests without a session", async ({ request }) => {
    expect((await request.get("/api/admin/notifications")).status()).toBe(401);
    expect((await request.post("/api/admin/notifications/read")).status()).toBe(401);
    expect((await request.post("/api/admin/careers/opened")).status()).toBe(401);
  });
});
