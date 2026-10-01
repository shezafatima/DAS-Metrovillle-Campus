import { test, expect } from "@playwright/test";
import { clearThrottle } from "./global-setup";
import { loginAs, logoutViaProfileMenu } from "./helpers/account";

// Better Auth's raw HTTP mutation routes, closed in 010 (research §4) so
// the Account page's Server Actions are the only way in (FR-014).
const CLOSED_ROUTES = [
  "/api/auth/change-password",
  "/api/auth/revoke-other-sessions",
  "/api/auth/update-user",
  "/api/auth/change-email",
];

const bodies: Record<string, unknown> = {
  "/api/auth/change-password": {
    currentPassword: "whatever-current-1",
    newPassword: "whatever-new-password-1",
    revokeOtherSessions: true,
  },
  "/api/auth/revoke-other-sessions": {},
  "/api/auth/update-user": { name: "Someone Else" },
  "/api/auth/change-email": { newEmail: "someone-else@example.com" },
};

test.describe("admin account — access is protected (010 FR-014)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
  });

  test("without a session the Account page sends you to login and comes back after", async ({ page }) => {
    await page.goto("/admin/account");
    await expect(page).toHaveURL("/admin/login?next=%2Fadmin%2Faccount");
  });

  test("the raw Better Auth mutation routes are closed, with or without a session", async ({ page, request }) => {
    for (const route of CLOSED_ROUTES) {
      const response = await request.post(route, { data: bodies[route] });
      expect(response.status(), `${route} without a session`).toBe(404);
    }

    await loginAs(page);
    for (const route of CLOSED_ROUTES) {
      const response = await page.request.post(route, { data: bodies[route] });
      expect(response.status(), `${route} with a session`).toBe(404);
    }

    // Nothing changed: still signed in, and the same password still works.
    await page.goto("/admin/account");
    await expect(page).toHaveURL("/admin/account");
    await logoutViaProfileMenu(page);
    await loginAs(page);
  });
});
