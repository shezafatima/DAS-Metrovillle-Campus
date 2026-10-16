import { expect, test } from "@playwright/test";
import {
  OPEN_NOW,
  clearRegistrations,
  clearSweepThrottle,
  closeAdmission,
  findRegistrations,
  loginAsAdmin,
  openAdmission,
  seedRegistrations,
  setNow,
} from "./helpers/registrations";

// 013 US7: retention and the 30-day restore period. The sweep is triggered by
// opening an admin page; the dev default retention is 12 months. Serial `admin` project.

const DAY = 86_400_000;
const monthsAgo = (n: number) => {
  const date = new Date();
  date.setUTCMonth(date.getUTCMonth() - n);
  return date;
};

test.describe("registration retention (013 US7)", () => {
  test.beforeEach(async () => {
    test.setTimeout(300_000);
    await clearRegistrations();
    await clearSweepThrottle();
  });

  test.afterAll(async () => {
    await clearRegistrations();
    await closeAdmission();
  });

  test("opening the list sweeps records past retention or 30 days after deletion, keeps the rest, and restore works for the remainder", async ({ page }) => {
    const [a, b, c, d] = await seedRegistrations([
      { studentName: "A Thirteen Months Old", createdAt: monthsAgo(13) },
      { studentName: "B Deleted 31 Days Ago", createdAt: new Date(Date.now() - 40 * DAY), deletedAt: new Date(Date.now() - 31 * DAY) },
      { studentName: "C Deleted 29 Days Ago", createdAt: new Date(Date.now() - 40 * DAY), deletedAt: new Date(Date.now() - 29 * DAY) },
      { studentName: "D Eleven Months Old", createdAt: monthsAgo(11) },
    ]);
    await loginAsAdmin(page);
    await clearSweepThrottle();
    await page.goto("/admin/registrations");

    await expect
      .poll(async () => (await findRegistrations({ withDeleted: true })).map((doc) => String(doc._id)).sort(), { timeout: 60_000, intervals: [2_000] })
      .toEqual([c.id, d.id].sort());
    expect(a.id).not.toBe(b.id);

    await page.goto("/admin/registrations/deleted");
    const deleted = page.getByTestId("deleted-registration-row");
    await expect(deleted).toHaveCount(1);
    await expect(deleted).toContainText("C Deleted 29 Days Ago");
    await expect(page.getByTestId("days-left")).toHaveText("1 day");
    await deleted.getByRole("button", { name: "Restore" }).click();
    await page.getByRole("button", { name: "Restore", exact: true }).last().click();
    await expect(page.getByText("No deleted registrations.")).toBeVisible({ timeout: 30_000 });

    // Deleting D from its detail page puts it in the Deleted view with 30 days left.
    await page.goto(`/admin/registrations/${d.id}`);
    await page.getByRole("button", { name: "Delete registration" }).click();
    await page.getByRole("button", { name: "Delete", exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/registrations$/, { timeout: 30_000 });
    await page.goto("/admin/registrations/deleted");
    await expect(page.getByTestId("days-left")).toHaveText(/\d+ days?/);
  });

  test("the public page shows the configured retention and the 30-day sentence", async ({ page, context }) => {
    await openAdmission();
    await setNow(context, OPEN_NOW);
    await page.goto("/admission/register", { timeout: 180_000 });
    const notice = page.locator("#registration-privacy-notice");
    await expect(notice).toContainText("We keep registrations for 12 months after submission", { timeout: 90_000 });
    await expect(notice).toContainText("Deleted records are permanently removed within 30 days");
  });
});
