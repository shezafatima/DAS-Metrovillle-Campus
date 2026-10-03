import { test, expect } from "@playwright/test";
import { clearCareerApplications, seedCareerApplications } from "./helpers/careers";
import { loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";

// Runs in the "admin" Playwright project (serial). Real sessions, real
// permissions: the careers CV download must be reachable only by a signed-in
// admin who holds the `careers` permission (Constitution III and V).

test.describe("careers — CV download access", () => {
  test.beforeEach(async () => {
    await resetUsers();
    await clearCareerApplications();
  });

  test("no session is refused, a content manager without careers is refused, one with careers gets the file as a download", async ({
    browser,
    request,
  }) => {
    const [{ id }] = await seedCareerApplications([{ name: "Ayesha Khan" }]);
    const url = `/api/admin/careers/${id}/cv`;

    // 1. No session.
    const anonymous = await request.get(url);
    expect(anonymous.status()).toBe(401);
    expect(await anonymous.json()).toEqual({ error: "unauthorized" });

    // 2. A content manager holding every grant except `careers`.
    const withoutCareers = await seedActiveUser({
      email: "cm-without-careers@example.test",
      permissions: ["news", "messages", "settings", "pages"],
    });
    const denied = await loginSeeded(browser, withoutCareers);
    const forbidden = await denied.context.request.get(url);
    expect(forbidden.status()).toBe(403);
    expect(await forbidden.json()).toEqual({ error: "forbidden" });
    expect(forbidden.headers()["content-type"]).not.toContain("pdf");
    await denied.context.close();

    // 3. A content manager holding `careers`.
    const withCareers = await seedActiveUser({
      email: "cm-with-careers@example.test",
      permissions: ["careers"],
    });
    const allowed = await loginSeeded(browser, withCareers);
    const download = await allowed.context.request.get(url);
    expect(download.status()).toBe(200);
    expect(download.headers()["content-type"]).toBe("application/pdf");
    expect(download.headers()["content-disposition"]).toMatch(/^attachment; filename="cv-ayesha-khan-\d{4}-\d{2}-\d{2}\.pdf"$/);
    expect(download.headers()["x-content-type-options"]).toBe("nosniff");
    expect(download.headers()["cache-control"]).toBe("private, no-store");
    expect((await download.body()).subarray(0, 5).toString()).toBe("%PDF-");
    await allowed.context.close();
  });

  test("a stored CV is not reachable by any address on the site, only through the checked route", async ({ request }) => {
    const [{ key }] = await seedCareerApplications([{ name: "Ayesha Khan" }]);

    for (const address of [`/${key}`, `/.data/e2e-documents/${key}`, `/documents/${key}`, `/api/public/${key}`]) {
      const response = await request.get(address);
      expect(response.status(), address).toBe(404);
    }
  });

  test("an unknown or malformed id gets the same 404 for a permitted admin", async ({ browser }) => {
    const manager = await seedActiveUser({ email: "cm-careers-404@example.test", permissions: ["careers"] });
    const session = await loginSeeded(browser, manager);
    for (const id of ["507f1f77bcf86cd799439011", "not-an-id"]) {
      const response = await session.context.request.get(`/api/admin/careers/${id}/cv`);
      expect(response.status(), id).toBe(404);
      expect(await response.json()).toEqual({ error: "not_found" });
    }
    await session.context.close();
  });
});
