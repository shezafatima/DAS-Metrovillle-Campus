import { expect, test } from "@playwright/test";
import {
  OPEN_NOW,
  clearRegistrations,
  clearRegistrationRateLimit,
  closeAdmission,
  fillValidRegistration,
  findRegistrations,
  openAdmission,
  openRegistrationPage,
  setNow,
} from "./helpers/registrations";

// 013 US6: the honeypot, the 5-per-10-minutes limit and "siblings are never
// blocked". The admin-side duplicate flag has its own cases in
// admin-registrations.spec.ts. Serial `forms` project; each run uses its own address.

test.describe.configure({ mode: "serial" });

const runAddress = `203.0.113.${100 + Math.floor(Math.random() * 100)}`;
const SUBMIT = "Submit registration";

test.describe("registration — abuse protection (013 US6)", () => {
  test.use({ extraHTTPHeaders: { "X-Forwarded-For": runAddress } });

  test.beforeEach(async ({ context }) => {
    test.setTimeout(300_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
    await openAdmission();
    await setNow(context, OPEN_NOW);
  });

  test.afterAll(async () => {
    await closeAdmission();
    await clearRegistrations();
    await clearRegistrationRateLimit();
  });

  test("a filled honeypot shows the normal confirmation and stores nothing", async ({ page }) => {
    await openRegistrationPage(page);
    await fillValidRegistration(page);
    // The field is hidden from people; fill it through the DOM like a bot would.
    await page.locator("#registration-website").evaluate((el) => {
      const input = el as HTMLInputElement;
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")!.set!;
      setter.call(input, "http://spam.example");
      input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByTestId("registration-reference")).toHaveText(/^[2-9A-HJKMNP-Z]{8}$/, { timeout: 30_000 });
    expect(await findRegistrations()).toHaveLength(0);
  });

  test("siblings with the same parents, email and phones are both saved", async ({ page }) => {
    await openRegistrationPage(page);
    await fillValidRegistration(page, { studentName: "Elder Sibling", dateOfBirth: "2019-03-01" });
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByTestId("registration-reference")).toBeVisible({ timeout: 30_000 });

    await openRegistrationPage(page);
    await fillValidRegistration(page, { studentName: "Younger Sibling", dateOfBirth: "2021-03-01" });
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByTestId("registration-reference")).toBeVisible({ timeout: 30_000 });

    expect(await findRegistrations()).toHaveLength(2);
  });

  test("the sixth submission within ten minutes shows the rate-limit banner and keeps the values", async ({ page }) => {
    for (let i = 0; i < 5; i += 1) {
      await openRegistrationPage(page);
      await fillValidRegistration(page, { studentName: `Limit Child ${i}` });
      await page.getByRole("button", { name: SUBMIT }).click();
      await expect(page.getByTestId("registration-reference")).toBeVisible({ timeout: 30_000 });
    }
    await openRegistrationPage(page);
    await fillValidRegistration(page, { studentName: "Sixth Child" });
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("Too many attempts", { timeout: 30_000 });
    await expect(page.locator("#registration-studentName")).toHaveValue("Sixth Child");
    expect(await findRegistrations()).toHaveLength(5);
  });
});
