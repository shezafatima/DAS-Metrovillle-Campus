import { test, expect } from "@playwright/test";
import { clearThrottle } from "./global-setup";
import { clearSignups, findSignupByEmail } from "./helpers/signups";

// This file runs in the "forms" Playwright project (playwright.config.ts),
// which is already serial (workers: 1, fullyParallel: false) — every
// spec here shares the one source IP's rate-limit budget, so cases must
// not interleave with cases in other files, and clearThrottle() resets
// that budget before the cases that deliberately exhaust it (US5).
test.describe("signup — visitor signs up (US1)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
    await clearSignups();
  });

  test("shows the heading, supporting line, fields, button and note", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /Join Over/ })).toBeVisible();
    await expect(page.getByText("Become Part of Dar-e-Arqam Schools")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Email" })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Phone" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Signup" })).toBeVisible();
    await expect(page.getByText("We will only use these details")).toBeVisible();
  });

  test("submitting empty shows three required messages and stores nothing", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeVisible();

    expect(await findSignupByEmail("nobody@example.com")).toBeNull();
  });

  test("a valid signup shows the thank-you and stores the record", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("Ali@Example.COM");
    await page.getByRole("textbox", { name: "Phone" }).fill("0300-1234567");
    await page.getByRole("button", { name: "Signup" }).click();

    await expect(page.getByRole("status")).toContainText("Thank you!");
    await expect(page.getByRole("textbox", { name: "Name" })).not.toBeVisible();

    const record = await findSignupByEmail("ali@example.com");
    expect(record).not.toBeNull();
    expect(record!.phone).toBe("+923001234567");
    expect(record!.sources).toEqual(["home"]);
    expect(record!.firstSignupAt.getTime()).toBe(record!.lastSignupAt.getTime());
  });
});
