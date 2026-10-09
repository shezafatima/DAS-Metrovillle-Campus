import { test, expect } from "@playwright/test";
import { seedPosts } from "./helpers/news";
import { openHome, resetHome, stubImages } from "./helpers/home";
import { homeContent } from "../src/content/home";

/**
 * The Latest News section (006): a full-width yellow band with the heading on the left and the supporting text on the
 * right from 1024px (stacked and left-aligned below), navy text, no stroke; and restyled cards (one link each, equal
 * heights, aligned footers, a one-line excerpt, Urdu mirrored). Seeds News directly, so it lives in the serial admin
 * project like the other home specs. No sign-in.
 */
const today = () => {
  const d = new Date();
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};
const daysAgo = (n: number) => new Date(today().getTime() - n * 86_400_000);

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

const LONG_TITLE = "A deliberately long news headline that keeps going so that it needs more than three lines to fit on a narrow card";
const LONG_BODY = "word ".repeat(80);

test.beforeEach(async () => {
  await resetHome();
  await seedPosts([
    { title: "Short title", slug: "short-title", status: "published", publishDate: today(), category: "events", bodyHtml: "<p>A short excerpt.</p>" },
    { title: LONG_TITLE, slug: "long-title", status: "published", publishDate: daysAgo(1), category: "head-office", bodyHtml: `<p>${LONG_BODY}</p>` },
    { title: "فکر اقبال اور تعلیمی نظام", slug: "urdu-post", status: "published", language: "ur", publishDate: daysAgo(2), category: "achievements", bodyHtml: `<p>${"تعلیم ".repeat(60)}</p>` },
  ]);
});

for (const width of [375, 768, 1024, 1440]) {
  test(`news header band and cards at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await stubImages(page);
    await page.setViewportSize({ width, height: 900 });
    await openHome(page);
    const news = page.getByTestId("latest-news");
    const band = page.getByTestId("latest-news-band");
    await band.scrollIntoViewIfNeeded();
    const heading = page.locator("#latest-news-heading");
    const line = band.getByText(homeContent.latestNews.line);
    await expect(heading).toHaveText(homeContent.latestNews.heading);
    expect(await heading.evaluate((el) => el.tagName)).toBe("H2");
    await expect(line).toBeVisible();

    // A full-width yellow band, navy text, nothing else in it (no stroke, no divider, no pill).
    const bg = await band.evaluate((el) => getComputedStyle(el).backgroundColor);
    const [colour, lineColour] = await Promise.all([heading.evaluate((el) => getComputedStyle(el).color), line.evaluate((el) => getComputedStyle(el).color)]);
    expect(bg).toBe("rgb(255, 255, 0)");
    expect(colour).toBe("rgb(18, 18, 145)");
    expect(lineColour).toBe("rgb(18, 18, 145)");
    await expect(band.getByTestId("heading-stroke")).toHaveCount(0);
    // Only the decorative "News" pill: white, navy text and icon, a faint navy border, not a link or button, left of the heading.
    await expect(band.locator("a, button, img")).toHaveCount(0);
    const pill = band.locator("span").filter({ hasText: homeContent.latestNews.label });
    await expect(pill).toHaveCount(1);
    await expect(pill.locator("svg")).toHaveCount(1);
    const pillStyle = await pill.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, colour: getComputedStyle(el).color, border: getComputedStyle(el).borderTopColor, radius: getComputedStyle(el).borderTopLeftRadius }));
    expect(pillStyle.bg).toBe("rgb(255, 255, 255)");
    expect(pillStyle.colour).toBe("rgb(18, 18, 145)");
    expect(pillStyle.border).toMatch(/\/ 0\.25\)$/); // navy at 25% opacity (Chrome prints the mix as lab(...))
    expect(parseFloat(pillStyle.radius)).toBeGreaterThan(9000 / 1000); // fully rounded
    const [pillBox, headingBoxForPill] = [await pill.boundingBox(), await heading.boundingBox()];
    expect(pillBox!.y + pillBox!.height).toBeLessThanOrEqual(headingBoxForPill!.y + 1); // above the heading
    const firstCard = await news.getByTestId("home-news-card").first().boundingBox();
    expect(Math.abs(pillBox!.x - firstCard!.x)).toBeLessThanOrEqual(1); // on the left, in line with the cards, at every width
    const pillRatio = contrast(pillStyle.colour, pillStyle.bg);
    console.log(`CONTRAST ${width}px pill navy-on-white=${pillRatio.toFixed(2)}:1`);
    expect(pillRatio).toBeGreaterThanOrEqual(7);
    const [bandBox, headingBox, lineBox] = [await band.boundingBox(), await heading.boundingBox(), await line.boundingBox()];
    expect(Math.round(bandBox!.width)).toBe(width);
    expect(headingBox!.y - bandBox!.y).toBeGreaterThanOrEqual(24);
    expect(bandBox!.y + bandBox!.height - Math.max(headingBox!.y + headingBox!.height, lineBox!.y + lineBox!.height)).toBeGreaterThanOrEqual(24);

    // From 1024px the heading wraps to exactly two lines (a width limit on the column, with balanced wrapping).
    const headingLines = await heading.evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    if (width >= 1024) {
      expect(headingLines).toBe(2);
      expect(await heading.evaluate((el) => getComputedStyle(el).textWrapStyle)).toBe("balance");
    }
    // Stacked at every width: the heading first, the supporting text under it, with a comfortable line length.
    expect(lineBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height - 1);
    expect(lineBox!.width).toBeLessThanOrEqual(60 * 12); // 60ch at the supporting text's size

    // The heading and the supporting text are centred (the pill above keeps its left position).
    expect(await heading.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    expect(await line.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    expect(Math.abs(lineBox!.x + lineBox!.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect(Math.abs(headingBox!.x + headingBox!.width / 2 - width / 2)).toBeLessThanOrEqual(2);

    console.log(`CONTRAST ${width}px navy-on-yellow heading=${contrast(colour, bg).toFixed(2)}:1 text=${contrast(lineColour, bg).toFixed(2)}:1`);
    expect(contrast(colour, bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(lineColour, bg)).toBeGreaterThanOrEqual(7);

    // The join with the section above leaves no gap, and the cards keep their own background.
    const join = await page.evaluate(() => {
      const above = document.querySelector('[data-testid="why-choose"]')!.closest("section")!.getBoundingClientRect();
      const yellow = document.querySelector('[data-testid="latest-news-band"]')!.getBoundingClientRect();
      const section = document.querySelector('[data-testid="latest-news"]')!;
      return { gap: yellow.top - above.bottom, sameWidth: yellow.left === above.left && yellow.right === above.right, bg: getComputedStyle(section).backgroundColor };
    });
    expect(Math.abs(join.gap)).toBeLessThanOrEqual(0.5);
    expect(join.sameWidth).toBe(true);
    expect(join.bg).toBe("rgb(247, 245, 244)");

    // Cards: one link each (no nested anchors or buttons), the stored text, in the right order and shape.
    const cards = news.getByTestId("home-news-card");
    await expect(cards).toHaveCount(3);
    await expect(cards.locator("a, button")).toHaveCount(0);
    expect(await cards.evaluateAll((els) => els.map((e) => e.tagName + ":" + e.getAttribute("href")))).toEqual(["A:/news/short-title", "A:/news/long-title", "A:/news/urdu-post"]);
    await expect(cards.locator("h3")).toHaveText(["Short title", LONG_TITLE, "فکر اقبال اور تعلیمی نظام"]);

    // The visible cards (3 at 1024+, 1 below): equal heights, footers on one line, a one-line excerpt, a title of at most three lines.
    const visible = await cards.evaluateAll((els) =>
      els
        .map((el) => {
          const r = el.getBoundingClientRect();
          const footer = el.querySelector("div[dir] > div:last-child")!.getBoundingClientRect();
          const excerpt = el.querySelector("div[dir] > p:nth-of-type(2)") as HTMLElement;
          const title = el.querySelector("h3") as HTMLElement;
          const lineHeight = parseFloat(getComputedStyle(title).lineHeight);
          return {
            inView: r.right > 0 && r.left < window.innerWidth,
            height: Math.round(r.height),
            footerBottom: Math.round(footer.bottom),
            footerTop: Math.round(footer.top),
            excerptHeight: Math.round(excerpt.getBoundingClientRect().height),
            excerptTruncated: excerpt.scrollWidth > excerpt.clientWidth,
            titleLines: Math.round(title.getBoundingClientRect().height / lineHeight),
          };
        })
        .filter((c) => c.inView),
    );
    expect(visible.length).toBe(width >= 1024 ? 3 : 1);
    if (width >= 1024) {
      expect(new Set(visible.map((c) => c.height)).size).toBe(1); // equal heights
      expect(new Set(visible.map((c) => c.footerBottom)).size).toBe(1); // aligned footers
      expect(new Set(visible.map((c) => c.footerTop)).size).toBe(1);
    }
    for (const c of visible) expect(c.titleLines).toBeLessThanOrEqual(3);
    const [longCard, urduCard] = [cards.nth(1), cards.nth(2)];
    const longTitleLines = await longCard.locator("h3").evaluate((el) => Math.round(el.getBoundingClientRect().height / parseFloat(getComputedStyle(el).lineHeight)));
    expect(longTitleLines).toBeLessThanOrEqual(3); // never more than three lines
    if (width <= 375) expect(longTitleLines).toBe(3); // and this long a title fills all three on a phone
    const excerpt = longCard.locator("div[dir] > p").nth(1);
    expect(await excerpt.evaluate((el) => el.getBoundingClientRect().height < parseFloat(getComputedStyle(el).lineHeight) * 1.6)).toBe(true); // one line
    expect(await excerpt.evaluate((el) => el.scrollWidth > el.clientWidth)).toBe(true); // cut with an ellipsis (CSS only)
    expect(await excerpt.evaluate((el) => getComputedStyle(el).textOverflow)).toBe("ellipsis");

    // Category as plain text, "Read More" as styled text with an arrow (neither is a link); the cover has a fixed 5:4 ratio.
    const first = cards.first();
    await expect(first.locator("div[dir] > div:last-child")).toContainText("Events");
    await expect(first.locator("div[dir] > div:last-child")).toContainText("Read More");
    const cover = await first.locator('[data-variant="home"], .aspect-home-news-card').first().boundingBox();
    expect(Math.abs(cover!.width / cover!.height - 5 / 4)).toBeLessThan(0.02);

    // Urdu is mirrored: right-to-left text, the footer row flipped, the ellipsis on the left.
    await expect(urduCard.locator("div[dir]").first()).toHaveAttribute("dir", "rtl");
    await urduCard.scrollIntoViewIfNeeded();
    const mirrored = await urduCard.evaluate((el) => {
      const footer = el.querySelector("div[dir] > div:last-child") as HTMLElement;
      const [cat, more] = Array.from(footer.children) as HTMLElement[];
      const ex = el.querySelector("div[dir] > p:nth-of-type(2)") as HTMLElement;
      return { catRight: cat.getBoundingClientRect().left > more.getBoundingClientRect().left, direction: getComputedStyle(ex).direction, align: getComputedStyle(ex).textAlign };
    });
    expect(mirrored.catRight).toBe(true); // the category is on the right, "Read More" on the left
    expect(mirrored.direction).toBe("rtl");

    // The button below the cards is outlined and goes to /news.
    const all = news.getByRole("link", { name: homeContent.latestNews.viewAll.label });
    await expect(all).toHaveAttribute("href", "/news");
    expect(await all.evaluate((el) => getComputedStyle(el).borderTopWidth)).toBe("2px");
    expect(await all.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("hovering a card zooms the cover and colours the title; keyboard focus shows a ring", async ({ page }) => {
  test.setTimeout(300_000);
  await stubImages(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openHome(page);
  const card = page.getByTestId("latest-news").getByTestId("home-news-card").first();
  await card.scrollIntoViewIfNeeded();
  const title = card.locator("h3");
  const before = await title.evaluate((el) => getComputedStyle(el).color);
  await card.hover();
  await expect.poll(() => title.evaluate((el) => getComputedStyle(el).color)).toBe("rgb(18, 18, 145)");
  expect(before).not.toBe("rgb(18, 18, 145)");
  await page.mouse.move(5, 5);
  await card.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(card).toBeFocused();
  expect(await card.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe("none");
});
