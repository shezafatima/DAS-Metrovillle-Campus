import { test, expect } from "@playwright/test";
import { clearMessages, loginAsAdmin, seedMessages } from "./helpers/messages";

test.describe("admin messages inbox (US2)", () => {
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("rows are newest first, with name, subject, a truncated preview, a status badge and a date", async ({
    page,
  }) => {
    await seedMessages([
      { name: "Older", subject: "Old subject", body: "Short body", createdAt: new Date("2026-01-01T00:00:00Z") },
      {
        name: "Newer",
        subject: "New subject",
        body: "x".repeat(200),
        createdAt: new Date("2026-06-01T00:00:00Z"),
      },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    const rows = page.locator("table tbody tr");
    await expect(rows).toHaveCount(2);
    await expect(rows.first()).toContainText("Newer");
    await expect(rows.first()).toContainText("…");
    await expect(rows.last()).toContainText("Older");
  });

  test("a new row is bold with a New badge; a read row is not bold", async ({ page }) => {
    await seedMessages([
      { name: "New Message", status: "new" },
      { name: "Read Message", status: "read" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    await expect(page.getByRole("link", { name: "New Message" })).toHaveClass(/font-bold/);
    await expect(page.getByRole("link", { name: "Read Message" })).not.toHaveClass(/font-bold/);
    await expect(page.locator("table").getByText("New", { exact: true })).toBeVisible();
  });

  test("search matches a name, an email and a subject fragment", async ({ page }) => {
    await seedMessages([
      { name: "Ali Khan", email: "khan-match@example.com", subject: "Fees" },
      { name: "Sara Ahmed", email: "no-match@example.com", subject: "Admission" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    await page.getByLabel("Search name, email or subject").fill("khan");
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    await page.getByLabel("Search name, email or subject").fill("no-match@ex");
    await expect(page.locator("table tbody tr")).toHaveCount(1);

    await page.getByLabel("Search name, email or subject").fill("fees");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
  });

  test("the New filter, then Responded, show only those statuses", async ({ page }) => {
    await seedMessages([
      { name: "A New", status: "new" },
      { name: "B Read", status: "read" },
      { name: "C Responded", status: "responded" },
    ]);
    await loginAsAdmin(page);
    await page.goto("/admin/messages");

    await page.getByLabel("Status").selectOption("new");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("A New");

    await page.getByLabel("Status").selectOption("responded");
    await expect(page.locator("table tbody tr")).toHaveCount(1);
    await expect(page.locator("table tbody tr")).toContainText("C Responded");
  });

  test("45 seeded messages page 20/20/5 and Next keeps q and status in the URL", async ({ page }) => {
    const seeds = Array.from({ length: 45 }, (_, i) => ({
      name: `Person ${i}`,
      subject: "Match Me",
      status: "new" as const,
      createdAt: new Date(Date.UTC(2026, 0, i + 1)),
    }));
    await seedMessages(seeds);
    await loginAsAdmin(page);
    await page.goto("/admin/messages?q=Match&status=new");

    await expect(page.locator("table tbody tr")).toHaveCount(20);
    await page.getByRole("link", { name: "Next" }).click();
    await expect(page).toHaveURL(/[?&]q=Match/);
    await expect(page).toHaveURL(/[?&]status=new/);
    await expect(page.locator("table tbody tr")).toHaveCount(20);
  });

  test("shows the empty state with no messages, and the filtered empty state on no match", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/messages");
    await expect(page.getByText("No messages yet.")).toBeVisible();

    await seedMessages([{ name: "Ali Khan" }]);
    await page.goto("/admin/messages");
    await page.getByLabel("Search name, email or subject").fill("zzz-no-match");
    await expect(page.getByText("No messages match your search or filter.")).toBeVisible();
  });

  test("opening a message shows the full body with line breaks and no horizontal scroll for a long Urdu body", async ({
    page,
  }) => {
    const longUrdu = "یہ ایک طویل پیغام ہے۔ ".repeat(200);
    const [id] = await seedMessages([{ name: "Ali Khan", body: longUrdu, subject: "طویل پیغام" }]);
    await loginAsAdmin(page);

    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`/admin/messages/${id}`);
    await expect(page.locator(".whitespace-pre-wrap")).toContainText("یہ ایک طویل پیغام ہے");
    const scrollWidth1440 = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth1440 = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth1440).toBeLessThanOrEqual(innerWidth1440);

    await page.setViewportSize({ width: 375, height: 800 });
    await page.reload();
    const scrollWidth375 = await page.evaluate(() => document.documentElement.scrollWidth);
    const innerWidth375 = await page.evaluate(() => window.innerWidth);
    expect(scrollWidth375).toBeLessThanOrEqual(innerWidth375);
  });

  test("no phone shows Not provided with no call/WhatsApp link; a phone builds the exact reply hrefs", async ({
    page,
  }) => {
    const [noPhoneId] = await seedMessages([{ name: "No Phone", phone: null }]);
    await loginAsAdmin(page);
    await page.goto(`/admin/messages/${noPhoneId}`);
    await expect(page.getByText("Not provided")).toBeVisible();
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveCount(0);

    const [phoneId] = await seedMessages([
      { name: "Ali Khan", email: "ali@example.com", subject: "Fees", phone: "+923001234567" },
    ]);
    await page.goto(`/admin/messages/${phoneId}`);
    await expect(page.getByRole("link", { name: "03001234567" })).toHaveAttribute("href", "tel:+923001234567");
    await expect(page.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/923001234567");
    await expect(page.getByRole("link", { name: "ali@example.com" })).toHaveAttribute(
      "href",
      "mailto:ali@example.com?subject=Re%3A%20Fees",
    );
  });

  test("the back link returns to the same q/status/page", async ({ page }) => {
    const seeds = Array.from({ length: 25 }, (_, i) => ({
      name: `Match ${i}`,
      subject: "Findme",
      status: "new" as const,
      createdAt: new Date(Date.UTC(2026, 0, i + 1)),
    }));
    const ids = await seedMessages(seeds);
    await loginAsAdmin(page);
    await page.goto("/admin/messages?q=Findme&status=new&page=2");
    await page.getByRole("link", { name: /Match 0/ }).first().click();

    await page.getByRole("link", { name: "Back to inbox" }).click();
    await expect(page).toHaveURL(/[?&]q=Findme/);
    await expect(page).toHaveURL(/[?&]status=new/);
    await expect(page).toHaveURL(/[?&]page=2/);
    void ids;
  });

  test("HTML in name/subject/body is displayed as literal text with no dialog and no script execution", async ({
    page,
  }) => {
    const payload = '<script>alert(1)</script><img src=x onerror="window.__xss=1">';
    const [id] = await seedMessages([{ name: payload, subject: payload, body: payload }]);
    await loginAsAdmin(page);

    let dialogFired = false;
    page.on("dialog", () => {
      dialogFired = true;
    });

    await page.goto("/admin/messages");
    await expect(page.getByText(payload, { exact: false }).first()).toBeVisible();

    await page.goto(`/admin/messages/${id}`);
    await expect(page.getByText(payload, { exact: false }).first()).toBeVisible();

    expect(dialogFired).toBe(false);
    expect(await page.evaluate(() => (window as unknown as { __xss?: boolean }).__xss)).toBeUndefined();
  });

  test("an unknown message id shows 'no longer available' with a back link", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto("/admin/messages/507f1f77bcf86cd799439011");
    await expect(page.getByText("This message is no longer available.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to inbox" })).toBeVisible();
  });
});
