import { test, expect, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import * as fs from "node:fs";
import * as path from "node:path";

// 021: the contact page is one card, two halves: details + map on navy (left), the form inside the gold travelling
// border (right). From 1024px they sit side by side; below that the details and map come first, then the form.

interface ContactTokens {
  form: {
    inputStyle: { height: string; border: string };
  };
}

function loadTokens(width: number): ContactTokens {
  const file = path.join(__dirname, "..", "research", "tokens", `contact-page-${width}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ContactTokens;
}

const WIDTHS: Array<{ w: number; h: number }> = [
  { w: 375, h: 900 },
  { w: 640, h: 900 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
];

const details = (page: Page) => page.locator("section[aria-labelledby='contact-details-heading']");
const formHalf = (page: Page) => page.locator("#contact-form");

for (const { w, h } of WIDTHS) {
  test(`contact page at ${w}px — no horizontal scroll, order, map contained`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowing).toBe(false);

    const left = (await details(page).boundingBox())!;
    const right = (await formHalf(page).boundingBox())!;
    if (w >= 1024) {
      // Side by side: details on the left, form on the right, same top, equal columns.
      expect(right.x).toBeGreaterThan(left.x + left.width - 2);
      expect(Math.abs(left.y - right.y)).toBeLessThan(2);
      expect(Math.abs(left.width - right.width)).toBeLessThan(2);
    } else {
      // Stacked: details (with the map) first, then the form, both full width.
      expect(right.y).toBeGreaterThanOrEqual(left.y + left.height - 2);
      expect(Math.abs(left.x - right.x)).toBeLessThan(2);
      expect(Math.abs(left.width - right.width)).toBeLessThan(2);
    }

    // The map sits inside the navy half and never overflows it.
    const map = (await page.locator("#contact-map").boundingBox())!;
    expect(map.x).toBeGreaterThanOrEqual(left.x);
    expect(map.x + map.width).toBeLessThanOrEqual(left.x + left.width + 1);
    expect(map.y).toBeGreaterThan(left.y);
    expect(map.y + map.height).toBeLessThanOrEqual(left.y + left.height + 1);

    // The form: every control stays inside the right half; Send spans the message field's width.
    const messageBox = (await page.locator("#contact-message").boundingBox())!;
    const sendBox = (await page.getByRole("button", { name: "Send" }).boundingBox())!;
    expect(messageBox.x + messageBox.width).toBeLessThanOrEqual(right.x + right.width + 1);
    expect(Math.abs(sendBox.width - messageBox.width)).toBeLessThan(2);

    // Name/Email share a row once the form itself is wide enough (container query, 448px).
    const nameBox = (await page.locator("#contact-name").boundingBox())!;
    const emailBox = (await page.locator("#contact-email").boundingBox())!;
    if (messageBox.width >= 448) expect(Math.abs(nameBox.y - emailBox.y)).toBeLessThan(2);
    else expect(emailBox.y).toBeGreaterThan(nameBox.y);

    // The form itself is unchanged: input and button styles still match the 008 extraction.
    const tokens = loadTokens(w >= 1024 ? 1440 : w >= 768 ? 768 : 375);
    const inputHeight = await page.locator("#contact-name").evaluate((el) => getComputedStyle(el).height);
    expect(inputHeight).toBe(tokens.form.inputStyle.height);
    const inputBorder = await page.locator("#contact-name").evaluate((el) => getComputedStyle(el).borderTop);
    expect(inputBorder).toBe(tokens.form.inputStyle.border);
    // The Send button uses the navy --color-cta-hover (ACCESSIBLE_SUBMIT_CLASS): white on the reference red is 3.68:1,
    // which axe fails on this page.
    const buttonBg = await page
      .getByRole("button", { name: "Send" })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(buttonBg).toBe("rgb(25, 25, 144)");

    await page.screenshot({ path: `test-results/contact-${w}.png`, fullPage: true });
  });
}

// Constitution VIII "reference breakpoints": the halves split exactly at 1024px.
test("on a 375px phone the form fields are at least 280px wide", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 900 });
  await page.goto("/contact");
  await page.waitForLoadState("networkidle");
  const field = page.getByPlaceholder("Name");
  await expect(field).toBeVisible();
  expect((await field.boundingBox())!.width).toBeGreaterThanOrEqual(280);
});

test("the card splits into two columns at 1024px and stacks below", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.goto("/contact");
  const stacked = (await formHalf(page).boundingBox())!.y > (await details(page).boundingBox())!.y + 10;
  expect(stacked).toBe(true);

  await page.setViewportSize({ width: 1025, height: 900 });
  await page.reload();
  const tops = [(await details(page).boundingBox())!.y, (await formHalf(page).boundingBox())!.y];
  expect(Math.abs(tops[0]! - tops[1]!)).toBeLessThan(2);
});

test.describe("contact card — details half", () => {
  test("navy background, white text, decorative yellow icon circles", async ({ page }) => {
    await page.goto("/contact");
    const half = details(page);
    expect(await half.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(18, 18, 145)");
    expect(await half.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(255, 255, 255)");
    const circles = half.locator("li > span[aria-hidden='true']");
    await expect(circles).toHaveCount(4);
    for (const circle of await circles.all()) {
      expect(await circle.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 0)");
      await expect(circle.locator("svg")).toHaveCount(1);
    }
  });

  test("every social link has an accessible name", async ({ page }) => {
    await page.goto("/contact");
    const links = details(page).locator("ul.mt-auto a");
    expect(await links.count()).toBeGreaterThan(0);
    for (const link of await links.all()) {
      expect(((await link.textContent()) ?? "").trim()).not.toBe("");
    }
  });
});

test.describe("contact card — glowing form border", () => {
  const frame = (page: Page) => page.locator("#contact-form .about-value-card");
  const spin = (page: Page) => frame(page).locator(".about-glow-ring .about-glow-spin");
  const playState = (page: Page) => spin(page).evaluate((el) => getComputedStyle(el).animationPlayState);

  test("runs, then pauses on pointer over and on focus, and resumes", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 1000 });
    await page.goto("/contact");
    await expect(frame(page)).toHaveAttribute("data-glow-paused", "false");
    expect(await playState(page)).toBe("running");

    await frame(page).hover();
    await expect(frame(page)).toHaveAttribute("data-glow-paused", "true");
    expect(await playState(page)).toBe("paused");

    await page.mouse.move(2, 2);
    await expect(frame(page)).toHaveAttribute("data-glow-paused", "false");
    expect(await playState(page)).toBe("running");

    await page.locator("#contact-name").focus();
    await expect(frame(page)).toHaveAttribute("data-glow-paused", "true");
    expect(await playState(page)).toBe("paused");

    await page.locator("#contact-name").blur();
    await expect(frame(page)).toHaveAttribute("data-glow-paused", "false");
  });

  test("pauses while off screen", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 300 });
    await page.goto("/contact");
    await frame(page).scrollIntoViewIfNeeded();
    await expect(frame(page)).toHaveAttribute("data-offscreen", "false");
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    await expect(frame(page)).toHaveAttribute("data-offscreen", "true");
    expect(await playState(page)).toBe("paused");
  });

  test("reduced motion: no movement, a static gold border", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/contact");
    const ring = frame(page).locator(".about-glow-ring");
    expect(await ring.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 215, 0)");
    expect(await spin(page).evaluate((el) => getComputedStyle(el).display)).toBe("none");
  });
});

test("axe finds no violations on /contact (at 375 and 1440)", async ({ page }) => {
  for (const width of [375, 1440]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");
    const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
  }
});
