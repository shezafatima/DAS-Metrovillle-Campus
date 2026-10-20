import { test, expect } from "@playwright/test";

// Resources (019): the page is the Photo Gallery only. Gallery-dependent checks
// live in admin-resources-gallery.spec.ts and the 007 admin-gallery-* specs.

test("has one h1 and every section h2 is inside an anchor-section", async ({ page }) => {
  await page.goto("/resources");
  await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resources");
  const outside = await page.locator("main h2").evaluateAll((els) => els.filter((e) => !e.closest("section.anchor-section")).length);
  expect(outside).toBe(0);
});

test("no public page links to #downloads, #our-books or #mobile-apps, and /resources has none of those sections", async ({ request }) => {
  test.setTimeout(180_000);
  for (const url of ["/", "/about", "/academics", "/admission", "/resources", "/news", "/careers", "/contact"]) {
    const html = await (await request.get(url, { timeout: 90_000 })).text();
    expect(html, url).not.toMatch(/href="[^"]*#(downloads|our-books|mobile-apps)/);
    if (url === "/resources") expect(html).not.toMatch(/id="(downloads|our-books|mobile-apps)"/);
  }
});

test("the old Scarlet Mobile Apps address redirects to /resources", async ({ request }) => {
  const res = await request.get("/resources/scarlet-mobile-apps", { maxRedirects: 0 });
  expect([301, 308]).toContain(res.status());
  expect(res.headers()["location"]).toBe("/resources");
});
