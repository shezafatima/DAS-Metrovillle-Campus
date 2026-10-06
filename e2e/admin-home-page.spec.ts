import { test, expect } from "@playwright/test";
import { seedPosts } from "./helpers/news";
import { bookFilesPresent, openHome, resetHome, sectionHeadings, seedHero, seedStats, seedVideo, slide, stubImages } from "./helpers/home";
import { homeContent } from "../src/content/home";

/**
 * The home page (006). Seeds Settings and News directly (the dev server runs
 * with E2E_FRESH_READS=1), so it lives in the serial admin project. No sign-in.
 */
const today = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

test.describe("home — hero and frame (006 US1)", () => {
  test.beforeEach(async () => {
    await resetHome();
  });
  test.afterAll(async () => {
    await resetHome();
  });

  test("the visible Settings slides appear in order and advance; one h1; the shell is there", async ({ page }) => {
    test.setTimeout(300_000);
    await seedHero([slide(1), slide(2), slide(3, { visible: false })], 3);
    await stubImages(page);
    await openHome(page);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.locator("header")).toBeVisible();
    await expect(page.locator("footer")).toBeVisible();

    const slides = page.getByTestId("hero-slide");
    await expect(slides).toHaveCount(2); // the hidden slide is not sent to the page
    await expect(page.locator('[data-testid="hero-slide"][data-active]')).toContainText("Heading 1");
    await expect(page.locator('[data-testid="hero-slide"][data-active]')).toContainText("Heading 2", { timeout: 15_000 });
    await page.getByRole("button", { name: homeContent.hero.goTo(1) }).click();
    await expect(page.locator('[data-testid="hero-slide"][data-active]')).toContainText("Heading 1");
  });

  test("with no visible slides the default slide shows; a single slide has no controls", async ({ page }) => {
    test.setTimeout(300_000);
    await seedHero([slide(1, { visible: false })]);
    await openHome(page);
    await expect(page.getByTestId("hero-slide")).toHaveCount(1);
    await expect(page.getByRole("button", { name: homeContent.hero.next })).toHaveCount(0);
  });

  test("the mobile picture is used at phone width", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedHero([slide(1, { mobile: { url: "https://res.cloudinary.com/e2e/image/upload/v1/settings/hero/mob-1.jpg", publicId: "settings/hero/mob-1", width: 750, height: 900 } })]);
    const context = await browser.newContext({ viewport: { width: 375, height: 800 } });
    const page = await context.newPage();
    await stubImages(page);
    await openHome(page);
    const visible = page.getByTestId("hero-slide").locator("img:visible");
    await expect(visible).toHaveCount(1);
    expect(await visible.getAttribute("src")).toContain("mob-1");
    await context.close();
  });
});

test.describe("home — sections, news, books, stats, links (006 US2–US9)", () => {
  test.beforeEach(async () => {
    await resetHome();
  });
  test.afterAll(async () => {
    await resetHome();
  });

  test("every section appears in the reference order", async ({ page }) => {
    test.setTimeout(300_000);
    await seedPosts([{ title: "Exploring Japan", slug: "exploring-japan", status: "published", publishDate: today() }]);
    await stubImages(page);
    await openHome(page);
    expect(await sectionHeadings(page)).toEqual([
      homeContent.inspiration.heading,
      homeContent.whyChoose.heading,
      homeContent.latestNews.heading,
      // news card titles are h2 in the 003 card
      "Exploring Japan",
      ...(bookFilesPresent() > 0 ? [homeContent.books.heading] : []),
      homeContent.salientFeatures.heading,
      homeContent.progressDashboard.heading,
      expect.stringContaining("Join Over"),
    ]);
    await expect(page.getByTestId("quick-access-card")).toHaveCount(4);
    await expect(page.getByText("Franchise Offer")).toHaveCount(0);
  });

  test("links: Find Us Nearby, the quick-access cards, the icon quick-links and Join Now", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    await expect(page.getByRole("link", { name: homeContent.findUsNearby.cta.label })).toHaveAttribute("href", "/campuses");
    const cards = page.getByTestId("quick-access-card");
    expect(await cards.evaluateAll((els) => els.map((e) => e.getAttribute("href")))).toEqual(homeContent.quickAccess.cards.map((c) => c.href));
    for (const item of homeContent.quickLinks.items) {
      await expect(page.getByRole("link", { name: item.label })).toHaveAttribute("href", item.href);
    }
    const join = page.getByRole("link", { name: "Join Now" });
    await expect(join).toHaveAttribute("href", "/careers");
    await expect(page.locator("#signup")).toBeAttached();
    await expect(page.locator("#signup input")).toHaveCount(0);
    await join.click();
    await expect(page).toHaveURL("/careers", { timeout: 120_000 });
  });

  test("Photo/Videos reaches the gallery anchor on Resources", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    await page.getByRole("link", { name: "Photo / Videos" }).click();
    await expect(page).toHaveURL("/resources#photo-gallery", { timeout: 120_000 });
  });

  test("Why Choose: the video when Settings has one, the text alone when not", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    await expect(page.getByTestId("why-choose")).toContainText(homeContent.whyChoose.heading);
    await expect(page.getByTestId("why-choose-video")).toHaveCount(0);

    await seedVideo("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await stubImages(page);
    await openHome(page);
    const video = page.getByTestId("why-choose-video");
    await expect(video).toBeVisible();
    await expect(video.locator("iframe")).toHaveCount(0); // facade until asked
    await video.getByRole("button", { name: homeContent.whyChoose.video.play }).click();
    await expect(video.locator("iframe")).toHaveAttribute("src", /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/);
  });

  test("Latest News: newest published first, Urdu right-to-left, no-cover placeholder, hidden when empty", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    await expect(page.getByTestId("latest-news")).toHaveCount(0);

    const yesterday = new Date(today().getTime() - 86_400_000);
    await seedPosts([
      { title: "Older post", slug: "older-post", status: "published", publishDate: yesterday },
      { title: "فکر اقبال اور تعلیمی نظام", slug: "urdu-post", status: "published", language: "ur", publishDate: today() },
      { title: "A draft", slug: "a-draft", status: "draft", publishDate: today() },
    ]);
    await openHome(page);
    const news = page.getByTestId("latest-news");
    await expect(news).toBeVisible();
    const titles = news.locator("article h2");
    await expect(titles).toHaveText(["فکر اقبال اور تعلیمی نظام", "Older post"]);
    await expect(titles.first().locator("a")).toHaveAttribute("dir", "rtl");
    await expect(news.getByText("A draft")).toHaveCount(0);
    await expect(news.locator('[aria-hidden="true"][data-variant="card"]').first()).toBeAttached(); // cover placeholder
    await expect(news.getByRole("link", { name: /View all news/ })).toHaveAttribute("href", "/news");
  });

  test("Books: the fixed covers added to public/ show in order under the fixed heading; none hides the section", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    const present = bookFilesPresent();
    const books = page.getByTestId("books");
    if (present === 0) {
      await expect(books).toHaveCount(0);
      return;
    }
    await expect(books.getByRole("heading", { name: homeContent.books.heading })).toBeVisible();
    await expect(books.getByText(homeContent.books.line)).toBeVisible();
    const covers = books.getByTestId("book-cover").locator("img");
    await expect(covers).toHaveCount(present);
    const expected = homeContent.books.covers.map((c) => c.alt).slice(0, 10);
    const shown = await covers.evaluateAll((els) => els.map((e) => e.getAttribute("alt")));
    expect(shown.every((alt) => expected.includes(alt ?? ""))).toBe(true);
    expect(shown).toEqual([...shown].sort((a, b) => expected.indexOf(a ?? "") - expected.indexOf(b ?? ""))); // content order
  });

  test("Progress dashboard: Settings numbers, counted up when seen; final values at once for reduced motion", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedStats({ students: 310000 });
    const context = await browser.newContext({ reducedMotion: "reduce" });
    const page = await context.newPage();
    await openHome(page);
    await expect(page.getByTestId("stat-students").getByTestId("stat-value")).toHaveText("310000");
    await context.close();

    const moving = await browser.newContext();
    const page2 = await moving.newPage();
    await openHome(page2);
    const value = page2.getByTestId("stat-students").getByTestId("stat-value");
    await value.scrollIntoViewIfNeeded();
    await expect(value).toHaveText("310000", { timeout: 15_000 });
    await moving.close();
  });

  test("the page renders every other section with no slides and no news (FR-027)", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    for (const id of ["hero", "careers-cta", "partners", "progress-dashboard"]) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId("latest-news")).toHaveCount(0);
  });

  test("search and sharing: title, description, social image; below-the-fold images are lazy", async ({ page }) => {
    test.setTimeout(300_000);
    await openHome(page);
    await expect(page).toHaveTitle(homeContent.metadata.title);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", homeContent.metadata.description);
    await expect(page.locator('meta[property="og:image"]')).toHaveAttribute("content", /og-home\.png|res\.cloudinary\.com/);
    await expect(page.locator('meta[name="twitter:card"]')).toHaveAttribute("content", "summary_large_image");
    await expect(page.getByTestId("quick-link").first().locator("img")).toHaveAttribute("loading", "lazy");
  });
});
