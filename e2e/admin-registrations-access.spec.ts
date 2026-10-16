import { expect, test } from "@playwright/test";
import { clearNotificationState, clearRegistrations, findExports, findRegistrations, loginAsAdmin, seedRegistrations } from "./helpers/registrations";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { PERMISSION_KEYS } from "../src/lib/permissions";

// 013 US4: registrations are for the main admin only. A content manager with
// EVERY permission gets 404 on the pages and 403 on the routes, sees nothing in
// the sidebar, the bell or the Overview, and nothing changes. Serial `admin` project.

const SEEDED = ["Zartasha Testchild", "PeanutAllergyMarker"];

test.describe("registrations — main admin only (013 US4)", () => {
  test.beforeEach(async () => {
    test.setTimeout(240_000);
    await resetUsers();
    await clearRegistrations();
    await clearNotificationState();
  });

  test.afterAll(async () => {
    await clearRegistrations();
  });

  test("pages: no session → sign-in; content manager with every permission → not found; main admin → rendered", async ({ browser, request, page }) => {
    const [{ id }] = await seedRegistrations([{ studentName: SEEDED[0], medicalHistory: SEEDED[1] }]);
    const pages = ["/admin/registrations", `/admin/registrations/${id}`, "/admin/registrations/deleted"];

    // 1. No session: the proxy sends the visitor to sign in.
    for (const path of pages) {
      const response = await request.get(path, { maxRedirects: 0 });
      expect([302, 303, 307, 308], path).toContain(response.status());
      expect(response.headers()["location"], path).toContain("/admin/login");
    }

    // 2. A content manager holding every permission: the not-found page, never the denied redirect, never the data.
    const manager = await seedActiveUser({ email: "cm-every-permission@example.test", permissions: [...PERMISSION_KEYS] });
    const denied = await loginSeeded(browser, manager);
    for (const path of pages) {
      const response = await denied.page.goto(path);
      expect(response?.status(), path).toBe(404);
      expect(denied.page.url(), path).not.toContain("denied=1");
      const text = await denied.page.locator("body").innerText();
      for (const value of SEEDED) expect(text, path).not.toContain(value);
    }
    await denied.context.close();

    // 3. The main admin.
    await loginAsAdmin(page);
    for (const path of pages) {
      const response = await page.goto(path);
      expect(response?.status(), path).toBe(200);
    }
  });

  test("routes: each is refused for a content manager with every permission and changes nothing", async ({ browser }) => {
    const [{ id }, { id: deletedId }] = await seedRegistrations([{ studentName: SEEDED[0] }, { studentName: "Deleted One", deletedAt: new Date() }]);
    const manager = await seedActiveUser({ email: "cm-routes@example.test", permissions: [...PERMISSION_KEYS] });
    const denied = await loginSeeded(browser, manager);
    const api = denied.context.request;

    const attempts: Array<[string, () => Promise<{ status(): number; text(): Promise<string> }>]> = [
      ["PATCH", () => api.patch(`/api/admin/registrations/${id}`, { data: { status: "admitted" } })],
      ["DELETE", () => api.delete(`/api/admin/registrations/${id}`)],
      ["restore", () => api.post(`/api/admin/registrations/${deletedId}/restore`)],
      ["export", () => api.get("/api/admin/registrations/export")],
      ["opened", () => api.post("/api/admin/registrations/opened")],
    ];
    for (const [name, attempt] of attempts) {
      const response = await attempt();
      expect(response.status(), name).toBe(403);
      const text = await response.text();
      for (const value of SEEDED) expect(text, name).not.toContain(value);
    }

    const stored = await findRegistrations({ withDeleted: true });
    expect(stored.find((doc) => String(doc._id) === id)).toMatchObject({ status: "new", deletedAt: null });
    expect(stored.find((doc) => String(doc._id) === deletedId)?.deletedAt).toBeInstanceOf(Date);
    expect(await findExports()).toHaveLength(0);
    await denied.context.close();
  });

  test("routes: no session gets 401", async ({ request }) => {
    const { id } = (await seedRegistrations([{ studentName: SEEDED[0] }]))[0];
    for (const response of [
      await request.patch(`/api/admin/registrations/${id}`, { data: { status: "admitted" } }),
      await request.delete(`/api/admin/registrations/${id}`),
      await request.post(`/api/admin/registrations/${id}/restore`),
      await request.get("/api/admin/registrations/export"),
      await request.post("/api/admin/registrations/opened"),
    ]) {
      expect(response.status()).toBe(401);
    }
    expect((await findRegistrations())[0].status).toBe("new");
  });

  test("a content manager never sees Registrations in the sidebar, the bell or the Overview; guessing a real id is still a 404", async ({ browser }) => {
    const manager = await seedActiveUser({ email: "cm-nothing-visible@example.test", permissions: [...PERMISSION_KEYS] });
    const { context, page } = await loginSeeded(browser, manager);
    // The first read of the notification state fixes "now" as the baseline, so seed after it.
    await page.goto("/admin");
    const [{ id }] = await seedRegistrations([{ studentName: SEEDED[0], medicalHistory: SEEDED[1], createdAt: new Date(Date.now() + 1000) }]);
    await page.goto("/admin");

    await expect(page.getByRole("link", { name: "Registrations" })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Registrations");

    const summary = await context.request.get("/api/admin/notifications");
    expect(summary.status()).toBe(200);
    const body = await summary.json();
    expect(body.registrationsNew).toBe(0);
    expect(body.items.some((item: { kind: string }) => item.kind === "registration")).toBe(false);

    await page.getByRole("button", { name: "Notifications" }).click();
    await expect(page.getByRole("dialog")).not.toContainText("Registration");

    const guessed = await page.goto(`/admin/registrations/${id}`);
    expect(guessed?.status()).toBe(404);
    await context.close();
  });

  test("the main admin sees the sidebar item with its badge, the bell item and the Overview card", async ({ browser }) => {
    const { context, page } = await adminSession(browser);
    await page.goto("/admin");
    await seedRegistrations([{ studentName: SEEDED[0], className: "Class 1", createdAt: new Date(Date.now() + 1000) }]);

    const item = page.getByRole("link", { name: "Registrations" }).locator("..");
    await expect(item.getByText("1", { exact: true })).toBeVisible({ timeout: 30_000 });
    const summary = await (await context.request.get("/api/admin/notifications")).json();
    expect(summary.registrationsNew).toBe(1);
    expect(summary.items.find((entry: { kind: string }) => entry.kind === "registration")?.title).toMatch(/^Registration [2-9A-HJKMNP-Z]{8}$/);
    await page.goto("/admin");
    await expect(page.getByText("Registrations", { exact: true }).first()).toBeVisible();
    await context.close();
  });
});
