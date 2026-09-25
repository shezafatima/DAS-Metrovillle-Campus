import { test, expect } from "@playwright/test";
import { contactInfo } from "../src/content/site-shell";

// This file runs in the "forms" project. It never submits the contact
// form, so it needs no rate-limit isolation (forwardedFor).

test.describe("contact — details and map (US5)", () => {
  test("shows the four column headings in order", async ({ page }) => {
    await page.goto("/contact");
    const headings = page.locator("section[aria-label='Contact details'] h3");
    await expect(headings).toHaveText(["BY PHONE", "BY EMAIL", "VISIT US", "WRITE US"]);
  });

  test("the phone and email links have exact tel:/mailto: hrefs", async ({ page }) => {
    await page.goto("/contact");
    const details = page.locator("section[aria-label='Contact details']");
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
    const details = page.locator("section[aria-label='Contact details']");
    const officeHours = details.locator("[data-placeholder]", { hasText: contactInfo.officeHours });
    await expect(officeHours).toBeVisible();
    const address = details.locator("[data-placeholder]", { hasText: contactInfo.address });
    await expect(address).toBeVisible();
  });

  test("the map heading is visible; scrolling into view sets the iframe src", async ({ page }) => {
    await page.goto("/contact");
    await expect(page.getByRole("heading", { name: "Locate Us on Google Maps" })).toBeVisible();

    const mapArea = page.locator("h2", { hasText: "Locate Us on Google Maps" }).locator("xpath=following-sibling::div[1]");
    await mapArea.scrollIntoViewIfNeeded();
    const iframe = mapArea.locator("iframe");
    await expect(iframe).toHaveAttribute("src", new RegExp(encodeURIComponent(contactInfo.address)), {
      timeout: 10000,
    });
    await expect(iframe).toHaveAttribute("src", /output=embed/);
  });

  test("Open in Google Maps link is correct and visible even when the map provider is blocked", async ({ page }) => {
    await page.route("https://maps.google.com/**", (route) => route.abort());
    await page.goto("/contact");
    const link = page.getByRole("link", { name: "Open in Google Maps" });
    await expect(link).toBeVisible();
    await expect(link).toHaveAttribute("href", contactInfo.mapUrl);
    await expect(link).toHaveAttribute("target", "_blank");
  });

  test("Write Us link jumps to the form and focuses Name", async ({ page }) => {
    await page.goto("/contact");
    await page.getByRole("link", { name: "Click this link to view inquiry form" }).click();
    await expect(page).toHaveURL(/#contact-form$/);
    await expect(page.getByRole("textbox", { name: "Name" })).toBeFocused();
  });

  test("SC-012: the map is not requested until scrolled into view, at 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    const mapRequests: string[] = [];
    page.on("request", (request) => {
      if (request.url().startsWith("https://maps.google.com")) mapRequests.push(request.url());
    });

    await page.goto("/contact");
    const mapArea = page
      .locator("h2", { hasText: "Locate Us on Google Maps" })
      .locator("xpath=following-sibling::div[1]");
    const box = await mapArea.boundingBox();
    if (!box || box.y <= 900) {
      throw new Error("map area is visible on first load at 1440×900 — lazy-load test needs a taller page or a shorter viewport");
    }

    expect(mapRequests).toHaveLength(0);
    await expect(mapArea.locator("iframe")).toHaveCount(0);

    await mapArea.scrollIntoViewIfNeeded();
    await expect(mapArea.locator("iframe")).toHaveCount(1, { timeout: 5000 });
    await expect.poll(() => mapRequests.length, { timeout: 5000 }).toBeGreaterThan(0);
  });

  test("SC-012: scrolling the map into view causes no layout shift, at 1440x900", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.addInitScript(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      (window as unknown as { __measureCls: boolean }).__measureCls = false;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries() as unknown as Array<{ hadRecentInput: boolean; value: number }>) {
          if (entry.hadRecentInput) continue;
          if ((window as unknown as { __measureCls: boolean }).__measureCls) {
            (window as unknown as { __cls: number }).__cls += entry.value;
          }
        }
      }).observe({ type: "layout-shift", buffered: false });
    });

    await page.goto("/contact");
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState("networkidle");
    // A brief settle window past networkidle — hydration/font-metric
    // settling can still shift layout for a moment after both fonts.ready
    // and the network-idle event fire.
    await page.waitForTimeout(500);

    // The site header shrinks/grows based on live scroll position (sticky
    // shrink-on-scroll, FR-016 / header-scroll.spec.ts) — a real,
    // pre-existing reflow unrelated to the map. Scroll past its threshold
    // and take every measurement (including "before") while it stays
    // scrolled, so this test isolates the map's own contribution instead
    // of also capturing the header's unrelated, position-linked resize.
    await page.mouse.wheel(0, 200);
    await page.waitForTimeout(500);

    const mapArea = page
      .locator("h2", { hasText: "Locate Us on Google Maps" })
      .locator("xpath=following-sibling::div[1]");
    const formBand = page.locator("#contact-form");

    // Reconstructing a document-relative Y from rect.top + window.scrollY
    // is only valid if `window` is the element that actually scrolled;
    // comparing the document's total height is a simpler, scroll-container
    // agnostic invariant — if nothing anywhere reflowed, this cannot change.
    function snapshot() {
      return page.evaluate(() => {
        const h2 = Array.from(document.querySelectorAll("h2")).find((h) => h.textContent?.includes("Locate Us"));
        const mapEl = h2?.nextElementSibling as HTMLElement | null;
        return {
          mapHeight: mapEl?.getBoundingClientRect().height ?? null,
          docHeight: document.documentElement.scrollHeight,
        };
      });
    }

    const before = await snapshot();

    await page.evaluate(() => {
      (window as unknown as { __cls: number }).__cls = 0;
      (window as unknown as { __measureCls: boolean }).__measureCls = true;
    });

    await mapArea.scrollIntoViewIfNeeded();
    await page.locator("iframe").first().waitFor({ state: "attached" });
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
