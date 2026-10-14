import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { waitForScrollSettled } from "./helpers/scroll";

// 019 Resources: Mobile Apps section (US1), menu and anchors (US2). These run in
// the chromium project and do not depend on gallery data.

const [HEADING, BODY] = readFileSync(path.join(process.cwd(), "docs/content-source/resources/mobile-apps.txt"), "utf8")
  .replace(/\r\n/g, "\n")
  .split("\n");
const WIDTHS = [375, 768, 1024, 1440];
const DRIVE = "https://drive.google.com/file/d/15V_ogaFhGTmkaMHTggAcIFiLDDHevpxy/view?usp=sharing";

const cards = (page: Page) => page.locator("[data-testid=app-card]");

test.describe("US1 Mobile Apps", () => {
  test("has the reference heading and body, word for word", async ({ page }) => {
    await page.goto("/resources");
    const section = page.locator("section#mobile-apps");
    await expect(section.getByRole("heading", { level: 2 })).toHaveText(HEADING);
    await expect(section).toContainText(BODY);
  });

  test("has no flyer, and the heading and text use the full section width", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/resources");
    const section = page.locator("section#mobile-apps");
    await expect(section.locator("figure, img")).toHaveCount(0);
    const text = (await section.locator("p").first().boundingBox())!;
    const cardsRow = (await section.locator("ul").boundingBox())!;
    expect(text.width).toBeGreaterThan(cardsRow.width * 0.95);
  });

  for (const [width, columns] of [
    [375, 1],
    [768, 2],
    [1024, 4],
    [1440, 4],
  ] as const) {
    test(`four cards in order, ${columns} column(s) with equal heights at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/resources");
      await expect(cards(page)).toHaveCount(4);
      expect(await cards(page).evaluateAll((els) => els.map((e) => e.getAttribute("data-app-id")))).toEqual([
        "scarlet-english",
        "scarlet-math",
        "scarlet-urdu",
        "lms-app",
      ]);
      const rects = await cards(page).evaluateAll((els) =>
        els.map((e) => {
          const r = e.getBoundingClientRect();
          return { left: Math.round(r.left), top: Math.round(r.top), height: Math.round(r.height) };
        }),
      );
      const firstRow = rects.filter((r) => r.top === rects[0].top);
      expect(new Set(firstRow.map((r) => r.left)).size).toBe(columns);
      for (const row of new Set(rects.map((r) => r.top))) {
        const heights = rects.filter((r) => r.top === row).map((r) => r.height);
        expect(Math.max(...heights) - Math.min(...heights)).toBe(0);
      }
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("only Scarlet English has a link; the others say they are not available", async ({ page }) => {
    await page.goto("/resources");
    const english = cards(page).nth(0);
    await expect(english.locator("a")).toHaveCount(1);
    const link = english.getByRole("link", { name: /Scarlet English/ });
    await expect(link).toHaveAttribute("href", DRIVE);
    await expect(link).toHaveAttribute("target", "_blank");
    expect(await link.getAttribute("rel")).toMatch(/noopener/);
    expect(await link.getAttribute("rel")).toMatch(/noreferrer/);
    await expect(english).toContainText("Installs from outside the Play Store");
    for (const i of [1, 2, 3]) {
      await expect(cards(page).nth(i).locator("a")).toHaveCount(0);
      await expect(cards(page).nth(i)).toContainText("Not available at the moment");
    }
  });

  test("loads nothing from das.edu.pk", async ({ page }) => {
    const hosts: string[] = [];
    page.on("request", (r) => hosts.push(new URL(r.url()).hostname));
    await page.goto("/resources");
    await page.locator("section#mobile-apps").scrollIntoViewIfNeeded();
    await page.waitForLoadState("networkidle");
    expect(hosts.filter((h) => h.endsWith("das.edu.pk"))).toEqual([]);
  });

  for (const width of WIDTHS) {
    test(`no horizontal scroll at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/resources");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    });
  }

  test("passes an axe scan", async ({ page }) => {
    await page.goto("/resources");
    await page.locator("section#mobile-apps").scrollIntoViewIfNeeded();
    const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(results.violations).toEqual([]);
  });
});

const headerBottom = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().bottom);
async function headingClearOfHeader(page: Page, id: string) {
  await waitForScrollSettled(page);
  const header = await headerBottom(page);
  const r = await page.locator(`section#${id} h2`).evaluate((el) => {
    const b = el.getBoundingClientRect();
    return { top: b.top, bottom: b.bottom, vh: window.innerHeight };
  });
  expect(r.top).toBeGreaterThanOrEqual(header - 1);
  expect(r.bottom).toBeLessThanOrEqual(r.vh);
}

test.describe("US2 menu and anchors", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("the dropdown lists Photo Gallery and Mobile Apps; Mobile Apps lands clear of the header", async ({ page }) => {
      await page.goto("/contact");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      const links = nav.locator('a[href^="/resources#"]');
      await nav.getByRole("link", { name: "Resources", exact: true }).hover();
      expect((await links.allTextContents()).map((t) => t.trim())).toEqual(["Photo Gallery", "Mobile Apps"]);
      await nav.getByRole("link", { name: "Mobile Apps", exact: true }).click();
      await expect(page).toHaveURL(/\/resources#mobile-apps$/);
      await headingClearOfHeader(page, "mobile-apps");
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("the Resources group lists the same two; Mobile Apps lands clear of the header", async ({ page }) => {
      await page.goto("/contact");
      await page.getByRole("button", { name: /menu/i }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Resources" }).click();
      const links = dialog.locator('a[href^="/resources#"]');
      expect((await links.allTextContents()).map((t) => t.trim())).toEqual(["Photo Gallery", "Mobile Apps"]);
      await links.last().click();
      await expect(page).toHaveURL(/\/resources#mobile-apps$/);
      await headingClearOfHeader(page, "mobile-apps");
    });
  });

  for (const width of [768, 1024]) {
    test(`loading #mobile-apps directly lands clear of the header at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/resources#mobile-apps");
      await headingClearOfHeader(page, "mobile-apps");
    });
  }

  test("has one h1 and every section h2 is inside an anchor-section", async ({ page }) => {
    await page.goto("/resources");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resources");
    const outside = await page.locator("main h2").evaluateAll((els) => els.filter((e) => !e.closest("section.anchor-section")).length);
    expect(outside).toBe(0);
  });

  test("no public page links to #downloads or #our-books, and /resources has neither section", async ({ request }) => {
    test.setTimeout(180_000);
    for (const url of ["/", "/about", "/academics", "/admission", "/resources", "/news", "/careers", "/contact"]) {
      const html = await (await request.get(url, { timeout: 90_000 })).text();
      expect(html, url).not.toMatch(/href="[^"]*#(downloads|our-books)/);
      if (url === "/resources") expect(html).not.toMatch(/id="(downloads|our-books)"/);
    }
  });
});
