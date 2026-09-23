import { test, expect } from "@playwright/test";
import { clearThrottle } from "./global-setup";
import { clearSignups, findSignupByEmail, seedSignups } from "./helpers/signups";

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

test.describe("signup — one record per person (US2)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
    await clearSignups();
  });

  test("a repeat signup with different casing/spacing updates the same record and shows the same thank-you", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you!");
    const first = await findSignupByEmail("ali@example.com");
    const firstSignupAt = first!.firstSignupAt.getTime();

    await page.getByRole("button", { name: "Sign up someone else" }).click();
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Ahmed Khan");
    await page.getByRole("textbox", { name: "Email" }).fill(" ALI@example.com ");
    await page.getByRole("textbox", { name: "Phone" }).fill("+92 300 1234567");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you!");

    const record = await findSignupByEmail("ali@example.com");
    expect(record).not.toBeNull();
    expect(record!.name).toBe("Ali Ahmed Khan");
    expect(record!.lastSignupAt.getTime()).toBeGreaterThan(firstSignupAt);
    expect(record!.firstSignupAt.getTime()).toBe(firstSignupAt);
    expect(record!.sources).toEqual(["home"]);
  });

  test("signing up from a second page adds it to the existing record's pages", async ({ page }) => {
    await seedSignups([{ name: "Ali Khan", email: "ali@example.com", phone: "+923001234567", sources: ["resources"] }]);

    await page.goto("/");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
    await page.getByRole("button", { name: "Signup" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you!");

    const record = await findSignupByEmail("ali@example.com");
    expect(record!.sources.slice().sort()).toEqual(["home", "resources"]);
  });
});

test.describe("signup — spam and abuse protection (US5)", () => {
  test.beforeEach(async () => {
    await clearThrottle();
    await clearSignups();
  });

  test("the 6th submission from one source is refused with typed values kept; the 5 before it succeed", async ({
    page,
  }) => {
    await page.goto("/");
    for (let i = 0; i < 5; i++) {
      await page.getByRole("textbox", { name: "Name" }).fill(`Person ${i}`);
      await page.getByRole("textbox", { name: "Email" }).fill(`person-${i}@example.com`);
      await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
      await page.getByRole("button", { name: "Signup" }).click();
      await expect(page.getByRole("status")).toContainText("Thank you!");
      await page.getByRole("button", { name: "Sign up someone else" }).click();
    }

    await page.getByRole("textbox", { name: "Name" }).fill("Person 5");
    await page.getByRole("textbox", { name: "Email" }).fill("person-5@example.com");
    await page.getByRole("textbox", { name: "Phone" }).fill("03001234567");
    await page.getByRole("button", { name: "Signup" }).click();

    // Next.js renders its own empty role="alert" route announcer, so
    // narrow to the banner by its text rather than by role alone.
    await expect(page.getByRole("alert").filter({ hasText: "Please try again shortly." })).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Person 5");
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("person-5@example.com");

    expect(await findSignupByEmail("person-5@example.com")).toBeNull();
  });

  test("a submission with the honeypot filled returns the normal thank-you response and stores nothing", async ({
    page,
  }) => {
    const response = await page.request.post("/api/public/signups", {
      data: {
        name: "Bot",
        email: "bot@example.com",
        phone: "03001234567",
        source: "home",
        website_url: "http://spam.example",
      },
    });
    expect(response.status()).toBe(200);
    expect(await response.json()).toEqual({ ok: true });
    expect(await findSignupByEmail("bot@example.com")).toBeNull();
  });

  test("the honeypot field is invisible and unreachable to a genuine visitor", async ({ page }) => {
    await page.goto("/");
    const honeypot = page.locator('input[name="website_url"]');
    await expect(honeypot).toHaveAttribute("tabindex", "-1");
    await expect(honeypot).not.toBeInViewport();
    await expect(page.getByRole("textbox", { name: "Website" })).toHaveCount(0);
  });
});
