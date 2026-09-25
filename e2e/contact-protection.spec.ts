import { test, expect } from "@playwright/test";
import { clearMessages, findMessages, forwardedFor } from "./helpers/messages";

test.describe("contact — rate limit (US6)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(60) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("the 6th submission is refused with typed values kept; the 5 before it succeed", async ({ page }) => {
    await page.goto("/contact");
    for (let i = 0; i < 5; i++) {
      await page.getByRole("textbox", { name: "Name" }).fill(`Person ${i}`);
      await page.getByRole("textbox", { name: "Email" }).fill(`person-${i}@example.com`);
      await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
      await page.getByRole("textbox", { name: "Your Message" }).fill("Hello");
      await page.getByRole("button", { name: "Send" }).click();
      await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });
      await page.getByRole("button", { name: "Send another message" }).click();
    }

    await page.getByRole("textbox", { name: "Name" }).fill("Person 5");
    await page.getByRole("textbox", { name: "Email" }).fill("person-5@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
    await page.getByRole("textbox", { name: "Your Message" }).fill("Hello");
    await page.getByRole("button", { name: "Send" }).click();

    // Next.js renders its own empty role="alert" route announcer, so
    // narrow to the banner by its text rather than by role alone.
    await expect(page.getByRole("alert").filter({ hasText: "Too many messages" })).toBeVisible({ timeout: 10000 });
    await expect(page.getByRole("textbox", { name: "Name" })).toHaveValue("Person 5");
    await expect(page.getByRole("textbox", { name: "Subject" })).toHaveValue("Admission");

    expect(await findMessages({ email: "person-5@example.com" })).toHaveLength(0);
  });
});

test.describe("contact — honeypot", () => {
  test.use({ extraHTTPHeaders: forwardedFor(61) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("filling the hidden field shows the thank-you and stores nothing", async ({ page }) => {
    await page.goto("/contact");
    // The honeypot is intentionally visually hidden (off-screen), so a
    // plain .fill() would refuse it as non-actionable, and a raw
    // `el.value = ...` assignment bypasses React's controlled-input value
    // tracking (the dispatched "input" event becomes a no-op for
    // onChange). `force: true` skips the visibility check while still
    // going through Playwright's real input simulation, which React does
    // correctly detect.
    await page.locator('[name="website_url"]').fill("bot", { force: true });

    await page.getByRole("textbox", { name: "Name" }).fill("Bot");
    await page.getByRole("textbox", { name: "Email" }).fill("bot-honeypot@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("spam");
    await page.getByRole("textbox", { name: "Your Message" }).fill("spam message");
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByRole("status")).toContainText("Thank you", { timeout: 10000 });
    expect(await findMessages({ email: "bot-honeypot@example.com" })).toHaveLength(0);
  });
});

test.describe("contact — over-length message", () => {
  test.use({ extraHTTPHeaders: forwardedFor(62) });
  test.beforeEach(async () => {
    await clearMessages();
  });

  test("shows the error-coloured counter and blocks the send", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("textbox", { name: "Name" }).fill("Ali Khan");
    await page.getByRole("textbox", { name: "Email" }).fill("toolong@example.com");
    await page.getByRole("textbox", { name: "Subject" }).fill("Admission");
    await page.getByRole("textbox", { name: "Your Message" }).fill("x".repeat(5001));
    await page.getByRole("button", { name: "Send" }).click();

    await expect(page.getByText("Message must be 5,000 characters or fewer.")).toBeVisible();
    await expect(page.getByText("5,001 / 5,000")).toHaveClass(/text-error/);
    expect(await findMessages({ email: "toolong@example.com" })).toHaveLength(0);
  });
});

test.describe("contact — honeypot keyboard reachability", () => {
  test.use({ extraHTTPHeaders: forwardedFor(63) });

  test("tabbing through the form never focuses the honeypot", async ({ page }) => {
    await page.goto("/contact");
    const honeypot = page.locator("#contact-website");
    const fieldIds = ["contact-name", "contact-email", "contact-phone", "contact-subject", "contact-message"];

    await page.locator(`#${fieldIds[0]}`).focus();
    for (let i = 0; i < 10; i++) {
      await page.keyboard.press("Tab");
      await expect(honeypot).not.toBeFocused();
    }
  });
});
