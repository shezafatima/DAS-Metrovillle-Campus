import { test, expect } from "@playwright/test";

/** Every new notifications route rejects a request without an admin session (spec FR-030/SC-003). */
test.describe("admin notifications — protected routes", () => {
  test("GET /api/admin/notifications rejects without a session", async ({ request }) => {
    const response = await request.get("/api/admin/notifications");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  test("POST /api/admin/notifications/read rejects without a session", async ({ request }) => {
    const response = await request.post("/api/admin/notifications/read");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });

  test("POST /api/admin/careers/opened rejects without a session", async ({ request }) => {
    const response = await request.post("/api/admin/careers/opened");
    expect(response.status()).toBe(401);
    expect(await response.json()).toEqual({ error: "unauthorized" });
  });
});
