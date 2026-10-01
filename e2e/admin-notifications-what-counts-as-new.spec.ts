import { test, expect } from "@playwright/test";
import { loginAsAdmin, getAdminUserId, seedAdminNotificationState, clearAdminNotificationStates } from "./helpers/notifications";
import { seedMessages, clearMessages } from "./helpers/messages";
import { seedSignups, clearSignups, touchSignupLastSignupAt } from "./helpers/signups";

/**
 * US3 — What counts as new (spec.md). Exercises the notification rule
 * purely through the API and the Signups "opened" marker — no bell or
 * sidebar UI involved (that's US1/US2's own specs).
 */
test.describe("admin notifications — what counts as new", () => {
  test.beforeEach(async () => {
    await clearMessages();
    await clearSignups();
    await clearAdminNotificationStates();
  });

  test("counts a new message and a new signup, excludes deleted ones", async ({ page, request }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });

    await seedMessages([{ name: "Ali", email: "ali@example.com", subject: "Hi", body: "Hello", status: "new" }]);
    await seedSignups([
      { name: "Sara", email: "sara@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() },
    ]);
    await seedMessages([
      { name: "Deleted", email: "deleted@example.com", subject: "Gone", body: "x", status: "new", deletedAt: new Date() },
    ]);
    await seedSignups([
      {
        name: "DeletedSignup",
        email: "deleted-signup@example.com",
        phone: "+923001234568",
        sources: ["home"],
        lastSignupAt: new Date(),
        deletedAt: new Date(),
      },
    ]);

    const response = await page.request.get("/api/admin/notifications");
    expect(response.status()).toBe(200);
    const body = await response.json();
    expect(body.messagesNew).toBe(1);
    expect(body.signupsNew).toBe(1);

    // A fresh, unauthenticated request context — no admin session cookie.
    const unauth = await request.get("/api/admin/notifications");
    expect(unauth.status()).toBe(401);
  });

  test("opening the Signups list resets the new-signup count", async ({ page }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: new Date(Date.now() - 60 * 60_000) });
    await seedSignups([
      { name: "Sara", email: "sara2@example.com", phone: "+923001234567", sources: ["home"], lastSignupAt: new Date() },
    ]);

    let response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).signupsNew).toBe(1);

    // Wait for the specific "opened" POST, not general network idleness —
    // NotificationsProvider polls continuously, so the page never goes
    // network-idle.
    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/admin/signups/opened") && r.status() === 200),
      page.goto("/admin/signups"),
    ]);

    response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).signupsNew).toBe(0);
  });

  test("a repeat submission counts as new again after being seen", async ({ page }) => {
    await loginAsAdmin(page);
    const adminId = await getAdminUserId();
    const opened = new Date(Date.now() - 60 * 60_000);
    await seedAdminNotificationState({ adminId, signupsLastOpenedAt: opened });

    const [seeded] = await seedSignups([
      {
        name: "Repeat",
        email: "repeat@example.com",
        phone: "+923001234569",
        sources: ["home"],
        lastSignupAt: new Date(opened.getTime() - 60_000), // older than "opened" — not new
      },
    ]);
    let response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).signupsNew).toBe(0);

    await Promise.all([
      page.waitForResponse((r) => r.url().includes("/api/admin/signups/opened") && r.status() === 200),
      page.goto("/admin/signups"),
    ]);

    // Simulate a repeat submission (004's upsert bumps lastSignupAt on the same record).
    await touchSignupLastSignupAt(seeded._id, new Date());

    response = await page.request.get("/api/admin/notifications");
    expect((await response.json()).signupsNew).toBe(1);
  });

  test("the three notification endpoints reject requests without a session", async ({ request }) => {
    expect((await request.get("/api/admin/notifications")).status()).toBe(401);
    expect((await request.post("/api/admin/notifications/read")).status()).toBe(401);
    expect((await request.post("/api/admin/signups/opened")).status()).toBe(401);
  });
});
