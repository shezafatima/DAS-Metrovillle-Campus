import { test, expect, type Page } from "@playwright/test";

// About, Academics, Admission and Resources are single pages whose former sub-routes are
// anchored sections. Old sub-routes redirect permanently; unknown slugs are 404s.

const PAGES: Record<string, string[]> = {
  "/about": ["overview", "salient-features", "management", "messages"],
  "/academics": ["academics-overview", "syllabi", "examinations", "teachers-training", "hifz-e-quran"],
  "/admission": ["admission-procedure", "class-levels", "uniform"],
};

const REDIRECTS: [string, string][] = [
  ...Object.entries(PAGES).flatMap(([page, ids]) => ids.filter((id) => id !== "hifz-e-quran").map((id): [string, string] => [`${page}/${id}`, `${page}#${id}`])),
  ["/hifz-e-quran", "/academics#hifz-e-quran"],
  ["/resources/scarlet-mobile-apps", "/resources#mobile-apps"],
  ["/resources/photo-gallery", "/resources#photo-gallery"],
  ["/resources/prospectus", "/resources"],
  ["/resources/monthly-arqam", "/resources"],
  ["/resources/newsletters", "/resources"],
  ["/resources/useful-links", "/resources"],
  ["/resources/our-books", "/resources"],
  ["/campuses", "/contact"],
];

const headerHeight = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
const top = (page: Page, id: string) => page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top);
/** The section is not hidden under the header. (A short page cannot always scroll its last section to the very top.) */
const clearOfHeader = async (page: Page, id: string) => {
  const header = await headerHeight(page);
  await expect.poll(async () => (await top(page, id)) >= header - 1).toBe(true);
};

test.describe("single pages with anchored sections", () => {
  for (const [path, ids] of Object.entries(PAGES)) {
    test(`${path} has one h1 and an h2 section for each former sub-route`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      for (const id of ids) {
        const section = page.locator(`section#${id}`);
        await expect(section).toHaveCount(1);
        await expect(section.getByRole("heading", { level: 2 })).toHaveCount(1);
      }
    });
  }

  test("/resources has a Mobile Apps placeholder with the LMS App link", async ({ page }) => {
    await page.goto("/resources");
    const section = page.locator("section#mobile-apps");
    await expect(section.getByRole("heading", { level: 2, name: "Mobile Apps" })).toBeVisible();
    await expect(section).toContainText("coming soon");
    await expect(section.getByRole("link", { name: "LMS App" })).toHaveAttribute("href", "/portal/lms-app");
  });

  test("the old sub-routes redirect permanently to their anchors", async ({ request }) => {
    test.setTimeout(120_000);
    for (const [from, to] of REDIRECTS) {
      const res = await request.get(from, { maxRedirects: 0 });
      expect([301, 308], from).toContain(res.status());
      expect(res.headers()["location"], from).toBe(to);
    }
  });

  test("unknown sub-routes are 404s", async ({ request }) => {
    test.setTimeout(180_000);
    for (const path of ["/about/unknown", "/academics/unknown", "/admission/unknown", "/resources/unknown"]) {
      expect((await request.get(path, { timeout: 90_000 })).status(), path).toBe(404);
    }
  });

  test("the real pages stay: careers, contact, news, portal", async ({ request }) => {
    test.setTimeout(180_000);
    for (const path of ["/careers", "/contact", "/news", "/portal/lms-app"]) {
      expect((await request.get(path, { timeout: 90_000 })).status(), path).toBe(200);
    }
  });

  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 700 } });

    test("a dropdown link scrolls to its section, clear of the header, without a reload", async ({ page }) => {
      await page.goto("/academics");
      await page.evaluate(() => { (window as unknown as { __kept: boolean }).__kept = true; });
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "Academics", exact: true }).hover();
      await nav.getByRole("link", { name: "Examinations" }).click();
      await expect(page).toHaveURL("/academics#examinations");
      const header = await headerHeight(page);
      await expect.poll(async () => Math.round(await top(page, "examinations"))).toBe(Math.round(header));
      expect(await page.evaluate(() => (window as unknown as { __kept?: boolean }).__kept)).toBe(true);
    });

    test("from another page the link lands on the section", async ({ page }) => {
      await page.goto("/contact");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "Admission", exact: true }).hover();
      await nav.getByRole("link", { name: "Uniform" }).click();
      await expect(page).toHaveURL("/admission#uniform");
      await clearOfHeader(page, "uniform");
    });

    test("the dropdown opens by keyboard and its anchor links can be followed", async ({ page }) => {
      await page.goto("/about");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      const about = nav.getByRole("link", { name: "About", exact: true });
      // Retry the focus until the page is interactive and the dropdown has opened.
      await expect(async () => {
        await about.blur();
        await about.focus();
        await expect(about).toHaveAttribute("aria-expanded", "true", { timeout: 1000 });
      }).toPass({ timeout: 30_000 });
      await page.keyboard.press("Tab");
      await expect(nav.getByRole("link", { name: "Overview" })).toBeFocused();
      await page.keyboard.press("Enter");
      await expect(page).toHaveURL("/about#overview");
    });

    test("smooth scrolling is on, and off for reduced motion", async ({ page }) => {
      await page.goto("/about");
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("smooth");
      await page.emulateMedia({ reducedMotion: "reduce" });
      expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe("auto");
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 700 } });

    test("tapping an anchor in the mobile menu closes the menu and shows the section", async ({ page }) => {
      await page.goto("/admission");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await menu.getByRole("button", { name: "Admission" }).click();
      await menu.getByRole("link", { name: "Class Levels" }).click();
      await expect(menu).toBeHidden();
      await expect(page).toHaveURL("/admission#class-levels");
      await clearOfHeader(page, "class-levels");
    });
  });
});
