import { test, expect } from "@playwright/test";
import { clearMessages, findMessages, forwardedFor } from "./helpers/messages";

// This file runs in the "forms" Playwright project (serial), alongside
// signup-*.spec.ts. Each describe block below isolates its own
// rate-limit budget with a per-spec X-Forwarded-For (research §16), so
// these specs never interleave with each other's throttle counts.

test.describe("contact — valid send with no phone", () => {
  test.use({ extraHTTPHeaders: forwardedFor(120) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows the thank-you, clears the fields, and stores one new message with no phone", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
    await page.getByRole("textbox", { name: "Your Message" }).fill("What are the fees for class 3?");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveCount(0);

    const docs = await findMessages({ email: "ali@example.com" });
    expect(docs).toHaveLength(1);
    expect(docs[0]!.status).toBe("new");
    expect(docs[0]!.phone).toBeNull();
  });
});

test.describe("contact — empty submit validation", () => {
  test.use({ extraHTTPHeaders: forwardedFor(121) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows the four required messages, no phone message, and stores nothing", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Name is required.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Subject is required.")).toBeVisible();
    await expect(page.getByText("Message is required.")).toBeVisible();
    await expect(page.getByText(/Pakistani mobile number/)).toHaveCount(0);
  });
});

test.describe("contact — malformed email and phone", () => {
  test.use({ extraHTTPHeaders: forwardedFor(122) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows the email and phone format messages and stores nothing", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example");
    await page.getByRole("textbox", { name: "Phone (optional)" }).fill("12345");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
    await page.getByRole("textbox", { name: "Your Message" }).fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeVisible();
    expect(await findMessages({ email: "ali@example" })).toHaveLength(0);
  });
});

for (const [n, phone] of [
  [123, "03001234567"],
  [124, "0300-1234567"],
  [125, "+92 300 1234567"],
  [126, "92 300 1234567"],
] as const) {
  test.describe(`contact — phone format ${phone}`, () => {
    test.use({ extraHTTPHeaders: forwardedFor(n) });
    test.beforeEach(async () => {
      await clearMessages();
    });

    test(`is accepted and stored as +923001234567`, async ({ page }) => {
      const email = `phone-${n}@example.com`;
      await page.goto("/contact");
      await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
      await page.getByRole("textbox", { name: "Email" }).fill(email);
      await page.getByRole("textbox", { name: "Phone (optional)" }).fill(phone);
      await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
      await page.getByRole("textbox", { name: "Your Message" }).fill("Hello");
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

      const docs = await findMessages({ email });
      expect(docs).toHaveLength(1);
      expect(docs[0]!.phone).toBe("+923001234567");
    });
  });
}

test.describe("contact — two messages from the same email, different casing", () => {
  test.use({ extraHTTPHeaders: forwardedFor(127) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("produces two documents", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("First");
    await page.getByRole("textbox", { name: "Your Message" }).fill("First message.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });
    await page.getByRole("button", { name: "Send another message" }).click();

    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ALI@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Second");
    await page.getByRole("textbox", { name: "Your Message" }).fill("Second message.");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

    const docs = await findMessages({ email: "ali@example.com" });
    expect(docs).toHaveLength(2);
  });
});

test.describe("contact — service unavailable", () => {
  test.use({ extraHTTPHeaders: forwardedFor(128) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows the friendly banner and keeps the typed fields", async ({ page }) => {
    await page.route("**/api/public/messages", (route) =>
      route.fulfill({ status: 503, body: '{"error":"unavailable"}' }),
    );
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission enquiry");
    await page.getByRole("textbox", { name: "Your Message" }).fill("Line one\nLine two");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByRole("alert").filter({ hasText: "couldn't send" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Ali Khan");
    await expect(page.getByRole("textbox", { name: "Subject" })).toHaveValue("Admission enquiry");
    await expect(page.getByRole("textbox", { name: "Your Message" })).toHaveValue("Line one\nLine two");
  });
});

test.describe("contact — send another message", () => {
  test.use({ extraHTTPHeaders: forwardedFor(129) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows an empty form", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("ali@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
    await page.getByRole("textbox", { name: "Your Message" }).fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });

    await page.getByRole("button", { name: "Send another message" }).click();
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Subject" })).toHaveValue("");
    await expect(page.getByRole("textbox", { name: "Your Message" })).toHaveValue("");
  });
});
