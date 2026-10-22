import { test, expect } from "@playwright/test";
import { contactInfo } from "../src/content/site-shell";

// This file runs in the "forms" project. It never submits the contact
// form, so it needs no rate-limit isolation (forwardedFor).

const DETAILS = "section[aria-labelledby='contact-details-heading']";

test.describe("contact — details and map (US5, 021 card)", () => {
  test("the Write Us column is gone; the details half has one heading", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByText("WRITE US")).toHaveCount(0);
    await expect(page.getByRole("link", { name: "Click this link to view inquiry form" })).toHaveCount(0);
    await expect(page.locator(DETAILS).getByRole("heading", { level: 2 })).toHaveText("Get in touch");
  });

  test("the phone and email links have exact tel:/mailto: hrefs", async ({ page }) => {
    await page.goto("/contact");
    const details = page.locator(DETAILS);
    await expect(details.getByRole("link", { name: contactInfo.phone })).toHaveAttribute(
      "href",
      `tel:${contactInfo.phone}`,
    );
    await expect(details.getByRole("link", { name: contactInfo.email })).toHaveAttribute(
      "href",
      `mailto:${contactInfo.email}`,
    );
  });

  test("office hours and address match contactInfo and carry data-placeholder", async ({ page }) => {
    await page.goto("/contact");
    const details = page.locator(DETAILS);
    await expect(details.locator("[data-placeholder]", { hasText: contactInfo.officeHours })).toBeVisible();
    await expect(details.locator("[data-placeholder]", { hasText: contactInfo.address })).toBeVisible();
    // The address is shown once: the caption under the map is gone.
    await expect(page.locator("main").getByText(contactInfo.address, { exact: true })).toHaveCount(1);
  });

  test("the map is inside the details half; scrolling into view sets the iframe src", async ({ page }) => {
    await page.goto("/contact");
    const mapArea = page.locator(`${DETAILS} #contact-map`);
    await mapArea.scrollIntoViewIfNeeded();
    const iframe = mapArea.locator("iframe");
    await expect(iframe).toHaveAttribute("src", new RegExp(encodeURIComponent(contactInfo.address)), {
      timeout: 10000,
    });
    await expect(iframe).toHaveAttribute("src", /output=embed/);
    await expect(iframe).toHaveAttribute("title", `Map showing ${contactInfo.address}`);
  });

  test("Open in Google Maps link is correct and visible even when the map provider is blocked", async ({ page }) => {
    await page.route("https://maps.google.com/**", (route) => route.abort());
    await page.goto("/contact");
    const link = page.locator(DETAILS).getByRole("link", { name: "Open in Google Maps" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", contactInfo.mapUrl);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("SC-012: the map is not requested until scrolled into view, at 375x400", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 400 });
    const mapRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://maps.google.com")) mapRequests.push(request.url());
    });

    await page.goto("/contact");
    const mapArea = page.locator("#contact-map");
    const box = await mapArea.boundingBox();
    if (!box || box.y <= 400) {
      throw new Error("map area is visible on first load at 375x400 — lazy-load test needs a shorter viewport");
    }

    expect(mapRequests).toHaveLength(0);
    await expect(mapArea.locator("iframe")).toHaveCount(0);

    await mapArea.scrollIntoViewIfNeeded();
    await expect(mapArea.locator("iframe")).toHaveCount(1, { timeout: 5000 });
    await expect.poll(() => mapRequests.length, { timeout: 5000 }).toBeGreaterThan(0);
  });

  test("SC-012: scrolling the map into view causes no layout shift, at 375x700", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 400 });
    await page.addInitScript(() => {
      const w = window as unknown as { __cls: number; __measureCls: boolean };
      w.__cls = 0;
      w.__measureCls = false;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ hadRecentInput: boolean; value: number }>) {
          if (!entry.hadRecentInput && w.__measureCls) w.__cls += entry.value;
        }
      }).observe({ type: "layout-shift", buffered: false });
    });

    await page.goto("/contact");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);
    // The sticky header resizes with scroll position (header-scroll.spec.ts); scroll past its threshold first so
    // the measurement isolates the map's own contribution.
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(500);

    const snapshot = () =>
      page.evaluate(() => ({
        mapHeight: document.getElementById("contact-map")?.getBoundingClientRect().height ?? null,
        docHeight: document.documentElement.scrollHeight,
      }));
    const before = await snapshot();

    await page.evaluate(() => {
      const w = window as unknown as { __cls: number; __measureCls: boolean };
      w.__cls = 0;
      w.__measureCls = true;
    });
    await page.locator("#contact-map").scrollIntoViewIfNeeded();
    await page.locator("#contact-map iframe").waitFor({ state: "attached" });
    await page.waitForTimeout(1000);
    await page.evaluate(() => {
      (window as unknown as { __measureCls: boolean }).__measureCls = false;
    });

    const after = await snapshot();
    const cls = await page.evaluate(() => (window as unknown as { __cls: number }).__cls);
    expect(after.mapHeight).toBe(before.mapHeight);
    expect(after.docHeight).toBe(before.docHeight);
    expect(cls).toBe(0);
  });
});
