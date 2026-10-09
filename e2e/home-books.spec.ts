import { test, expect, type Page } from "@playwright/test";
import fs from "node:fs";
import path from "node:path";
import { homeContent } from "../src/content/home";

/**
 * The Books band (006 FR-011): a full-width navy section with the heading and text on the left from 1024px (stacked
 * below), and the covers rolling on the right. Three or more covers loop; one or two sit in a centred still row; none
 * leaves the text alone. The cases that need a different number of covers move the cover files out of public/ for the
 * length of the test and always put them back. No sign-in, no database.
 */
const BOOKS_DIR = path.join(__dirname, "..", "public", "images", "home", "books");
const HOLD_DIR = path.join(__dirname, "..", ".data", "e2e-books-hold");
const covers = homeContent.books.covers;

const coverFiles = () => fs.readdirSync(BOOKS_DIR).filter((f) => /^book-\d+\.jpg$/.test(f)).sort();

/** Moves every cover file after the first `keep` out of public/ (in the dev server they are re-read on each render). */
function holdBack(keep: number) {
  fs.mkdirSync(HOLD_DIR, { recursive: true });
  for (const file of coverFiles().slice(keep)) fs.renameSync(path.join(BOOKS_DIR, file), path.join(HOLD_DIR, file));
}
function restore() {
  if (!fs.existsSync(HOLD_DIR)) return;
  for (const file of fs.readdirSync(HOLD_DIR)) fs.renameSync(path.join(HOLD_DIR, file), path.join(BOOKS_DIR, file));
}

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

async function openBooks(page: Page) {
  await page.goto("/", { timeout: 120_000 });
  await page.getByTestId("books").evaluate((el) => el.scrollIntoView({ block: "center" }));
}

test.beforeEach(() => restore());
test.afterEach(() => restore());

for (const width of [375, 768, 1024, 1440]) {
  test(`books band with a rolling loop at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    expect(coverFiles().length).toBeGreaterThanOrEqual(3); // the real covers in public/
    await page.setViewportSize({ width, height: 900 });
    await openBooks(page);
    const books = page.getByTestId("books");
    const heading = books.getByRole("heading", { level: 2, name: homeContent.books.heading });
    const text = books.getByText(homeContent.books.line);
    const roll = page.getByTestId("book-roll");
    await expect(heading).toBeVisible();
    await expect(text).toBeVisible();

    // A full-width navy band, white left-aligned text, no stroke or pill.
    const bg = await books.evaluate((el) => getComputedStyle(el).backgroundColor);
    const [headingColour, textColour, align] = await Promise.all([
      heading.evaluate((el) => getComputedStyle(el).color),
      text.evaluate((el) => getComputedStyle(el).color),
      heading.evaluate((el) => getComputedStyle(el).textAlign),
    ]);
    expect(bg).toBe("rgb(18, 18, 145)");
    expect(headingColour).toBe("rgb(255, 255, 255)");
    expect(textColour).toBe("rgb(255, 255, 255)");
    expect(align).toMatch(/^(start|left)$/);
    expect(Math.round((await books.boundingBox())!.width)).toBe(width);
    await expect(books.getByTestId("heading-stroke")).toHaveCount(0);
    console.log(`CONTRAST ${width}px white-on-navy heading=${contrast(headingColour, bg).toFixed(2)}:1 text=${contrast(textColour, bg).toFixed(2)}:1`);
    expect(contrast(headingColour, bg)).toBeGreaterThanOrEqual(7);

    // Side by side from 1024px, stacked (text first) below.
    const [headingBox, rollBox] = [await heading.boundingBox(), await roll.boundingBox()];
    if (width >= 1024) expect(rollBox!.x).toBeGreaterThan(headingBox!.x + headingBox!.width - 1);
    else expect(rollBox!.y).toBeGreaterThan(headingBox!.y + headingBox!.height);

    // It rolls: a transform-only animation that runs, and that moves the track.
    await expect(roll).toHaveAttribute("data-mode", "loop");
    const track = roll.locator("ul");
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("roll-strip");
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const first = await x();
    await page.waitForTimeout(700);
    expect(await x()).toBeLessThan(first - 5);

    // Each book is heard once: the real covers keep their alt text in content order, every copy is aria-hidden.
    const real = roll.getByTestId("book-cover");
    await expect(real).toHaveCount(coverFiles().length);
    const alts = await real.locator("img").evaluateAll((els) => els.map((e) => e.getAttribute("alt")));
    expect(alts).toEqual(covers.map((c) => c.alt).slice(0, alts.length));
    const copies = roll.getByTestId("book-cover-copy");
    expect(await copies.count()).toBeGreaterThan(0);
    expect(await copies.evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true" && e.querySelector("img")?.getAttribute("alt") === ""))).toBe(true);

    // The track is two identical halves (so moving by half is seamless), and each half fills the strip.
    const widths = await track.evaluate((el) => ({ total: el.scrollWidth, items: el.children.length, strip: el.parentElement!.getBoundingClientRect().width }));
    expect(widths.items % 2).toBe(0);
    expect(widths.total / 2).toBeGreaterThanOrEqual(widths.strip);

    // Pause on hover and on keyboard focus; resume on leaving.
    await roll.hover();
    await expect(roll).toHaveAttribute("data-paused", "true");
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
    await page.mouse.move(2, 2);
    await expect(roll).toHaveAttribute("data-paused", "false");
    await roll.focus();
    await expect(roll).toHaveAttribute("data-paused", "true");
    await roll.evaluate((el) => (el as HTMLElement).blur());
    await expect(roll).toHaveAttribute("data-paused", "false");

    // Edge fades in the section's own navy; covers uncropped; no sideways scroll on the page.
    const fades = await roll.locator(".roll-fade").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage));
    expect(fades).toHaveLength(2);
    for (const f of fades) expect(f).toContain("rgb(18, 18, 145)");
    expect(await roll.locator("img").first().evaluate((el) => getComputedStyle(el).objectFit)).toBe("contain");
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("with reduced motion the books do not roll: a plain, swipeable row of the real covers", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await openBooks(page);
  const roll = page.getByTestId("book-roll");
  const track = roll.locator("ul");
  expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await roll.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
  expect(await roll.getByTestId("book-cover-copy").first().evaluate((el) => getComputedStyle(el).display)).toBe("none");
  const before = await track.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(1500);
  expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe(before);
  await context.close();
});

test("with one or two covers the row is still and centred, with no copies and no fade", async ({ page }) => {
  test.setTimeout(300_000);
  for (const keep of [2, 1]) {
    restore();
    holdBack(keep);
    await page.setViewportSize({ width: 1440, height: 900 });
    await openBooks(page);
    const roll = page.getByTestId("book-roll");
    await expect(roll).toHaveAttribute("data-mode", "static");
    const track = roll.locator("ul");
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
    await expect(roll.getByTestId("book-cover")).toHaveCount(keep);
    await expect(roll.getByTestId("book-cover-copy")).toHaveCount(0);
    await expect(roll.locator(".roll-fade")).toHaveCount(0);
    const [rollBox, firstBox, lastBox] = [await roll.boundingBox(), await roll.getByTestId("book-cover").first().boundingBox(), await roll.getByTestId("book-cover").last().boundingBox()];
    const rowCentre = (firstBox!.x + lastBox!.x + lastBox!.width) / 2;
    expect(Math.abs(rowCentre - (rollBox!.x + rollBox!.width / 2))).toBeLessThanOrEqual(14); // centred (the last cover has no trailing gap)
  }
});

test("with no covers the strip is not drawn and the text takes the whole section", async ({ page }) => {
  test.setTimeout(300_000);
  holdBack(0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/", { timeout: 120_000 });
  const books = page.getByTestId("books");
  await expect(books).toBeVisible();
  await expect(books.getByRole("heading", { level: 2, name: homeContent.books.heading })).toBeVisible();
  await expect(books.getByText(homeContent.books.line)).toBeVisible();
  await expect(page.getByTestId("book-roll")).toHaveCount(0);
  await expect(books.getByTestId("book-cover")).toHaveCount(0);
  const [section, column] = [await books.boundingBox(), await books.locator("div.grid > div").first().boundingBox()];
  expect(column!.width).toBeGreaterThan(section!.width * 0.6); // one column: the text spans the section's content width
  expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
});
