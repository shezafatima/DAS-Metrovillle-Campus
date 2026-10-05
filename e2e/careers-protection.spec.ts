import { test, expect, type Page } from "@playwright/test";
import { FIXTURE_PDF, clearCareerApplications, findCareerApplications } from "./helpers/careers";

// 012 US6: the honeypot and the submission limit on the public application
// form. Runs in the serial `forms` project. The limit counters persist for
// ten minutes, so each run uses its own address (TEST-NET-3) to stay repeatable.

const runAddress = `203.0.113.${100 + Math.floor(Math.random() * 100)}`;

async function fill(page: Page, email: string, phone: string) {
  await page.getByRole("textbox", { name: "Full name" }).fill("Ayesha Khan");
  await page.getByRole("textbox", { name: "Email" }).fill(email);
  await page.getByRole("textbox", { name: "Mobile number" }).fill(phone);
  await page.getByRole("textbox", { name: "Highest qualification" }).fill("M.Ed");
  await page.locator("#careers-cv").setInputFiles(FIXTURE_PDF);
  await page.getByRole("checkbox").check();
}

test.describe("careers — abuse protection", () => {
  test.use({ extraHTTPHeaders: { "X-Forwarded-For": runAddress } });
  test.beforeEach(async () => {
    test.setTimeout(180_000);
    await clearCareerApplications();
  });

  test("a filled honeypot shows the normal confirmation and stores nothing", async ({ page }) => {
    await page.goto("/careers");
    await fill(page, "bot@example.com", "03001110000");
    // The field is hidden from people; fill it through the DOM like a bot would.
    await page.locator("#careers-website").evaluate((el) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "http://spam.example");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15_000 });
    expect(await findCareerApplications({ email: "bot@example.com" })).toHaveLength(0);
  });

  test("repeated submissions hit the rate limit and the typed values stay", async ({ page }) => {
    for (let i = 0; i < 5; i++) {
      await page.goto("/careers");
      await fill(page, `limit${i}@example.com`, `0300222000${i}`);
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15_000 });
    }

    await page.goto("/careers");
    await fill(page, "limit5@example.com", "03002220005");
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "Too many attempts" })).toBeVisible({ timeout: 15_000 });
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("limit5@example.com");
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Ayesha Khan");
    expect(await findCareerApplications({ email: "limit5@example.com" })).toHaveLength(0);
  });
});
