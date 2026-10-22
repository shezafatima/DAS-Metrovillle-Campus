import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import { schoolApp } from "../src/content/resources";

/**
 * Resources > School App (023): a navy band with the app's text, features and two buttons, a CSS phone with the
 * screenshot, and (from 1024px) a QR code. The QR's decoding is proved in school-app-section.test.tsx.
 */

/** WCAG contrast ratio of two "rgb(r, g, b)" strings. */
function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const [r, g, bl] = rgb.match(/\d+/g)!.slice(0, 3).map((v) => {
      const c = Number(v) / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

for (const width of [375, 640, 768, 1024, 1440]) {
  test(`School App section at ${width}px: no sideways scroll, QR only from 1024px, stacked below it`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/resources", { timeout: 120_000 });
    const section = page.locator("#mobile-apps");
    await section.scrollIntoViewIfNeeded();
    await expect(section.getByRole("heading", { level: 2, name: schoolApp.heading })).toBeVisible();

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

    const qr = page.getByTestId("app-qr");
    const phone = page.getByTestId("phone-mockup");
    const buttons = section.getByRole("link", { name: /Get it on Google Play/ });
    await expect(phone).toBeVisible();
    if (width >= 1024) {
      await expect(qr).toBeVisible();
      await expect(qr.getByRole("img", { name: schoolApp.qr.label })).toBeVisible();
      await expect(qr.getByText(schoolApp.qr.caption)).toBeVisible();
      // Text on the left, phone (and QR) on the right.
      expect((await buttons.boundingBox())!.x).toBeLessThan((await phone.boundingBox())!.x);
    } else {
      await expect(qr).toBeHidden();
      // Stacked: buttons, then the phone below them.
      const b = (await buttons.boundingBox())!;
      expect((await phone.boundingBox())!.y).toBeGreaterThan(b.y + b.height);
    }
  });
}

test("School App: contrast measured, links tested, axe passes on /resources", async ({ page, context }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/resources", { timeout: 120_000 });
  const section = page.locator("#mobile-apps");
  await section.scrollIntoViewIfNeeded();

  // Contrast, measured: white on the navy band; navy on the gold circles and the gold button.
  const colours = await section.evaluate((el) => {
    const read = (node: Element | null, prop: "color" | "backgroundColor") => getComputedStyle(node!)[prop];
    return {
      band: read(el, "backgroundColor"),
      heading: read(el.querySelector("h2"), "color"),
      line: read(el.querySelector("h2 + p"), "color"),
      eyebrow: read(el.querySelector("p"), "color"),
      circleBg: read(el.querySelector("li span"), "backgroundColor"),
      circleIcon: read(el.querySelector("li span"), "color"),
      buttonBg: read(el.querySelector("a[href*='play.google.com']"), "backgroundColor"),
      buttonText: read(el.querySelector("a[href*='play.google.com']"), "color"),
      webText: read(el.querySelector("a[href*='kamboh.net']"), "color"),
    };
  });
  expect(contrast(colours.heading, colours.band)).toBeGreaterThanOrEqual(7);
  expect(contrast(colours.line, colours.band)).toBeGreaterThanOrEqual(7);
  expect(contrast(colours.webText, colours.band)).toBeGreaterThanOrEqual(7);
  expect(contrast(colours.eyebrow, colours.band)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colours.circleIcon, colours.circleBg)).toBeGreaterThanOrEqual(4.5);
  expect(contrast(colours.buttonText, colours.buttonBg)).toBeGreaterThanOrEqual(4.5);

  // Both links: right address, new tab, safe rel, and the name says it is external. Each opens a tab (stubbed, no network).
  await context.route(/play\.google\.com|kamboh\.net/, (route) => route.fulfill({ status: 200, contentType: "text/html", body: "<title>stub</title>" }));
  for (const [name, href] of [
    [/Get it on Google Play/, schoolApp.android.href],
    [/Login on web/, schoolApp.web.href],
  ] as const) {
    const link = section.getByRole("link", { name });
    await expect(link).toHaveAttribute("href", href);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAttribute("rel", "noopener noreferrer");
    await expect(link).toHaveAccessibleName(/opens external site in a new tab/);
    const [popup] = await Promise.all([context.waitForEvent("page"), link.click()]);
    expect(popup.url()).toBe(href);
    await popup.close();
  }

  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("the menu lists School App under Resources and its link lands on the section", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { timeout: 120_000 });
  const nav = page.getByRole("navigation", { name: /main|primary/i }).first();
  await nav.getByRole("link", { name: "Resources", exact: true }).hover();
  await nav.getByRole("link", { name: "School App", exact: true }).click();
  await expect(page).toHaveURL("/resources#mobile-apps");
  await expect(page.locator("#mobile-apps")).toBeInViewport();
});
