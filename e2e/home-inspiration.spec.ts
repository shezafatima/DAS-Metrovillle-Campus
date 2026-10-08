import { test, expect } from "@playwright/test";
import { homeContent } from "../src/content/home";

// The inspiration heading and its supporting line sit in a full-width navy band (white text) that starts right under the
// quick-access cards; the Why Choose block stays on the page background.

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

for (const width of [375, 768, 1024, 1440]) {
  test(`inspiration heading band at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { timeout: 120_000 });
    const band = page.getByTestId("inspiration-band");
    await band.scrollIntoViewIfNeeded();
    const heading = page.locator("#inspiration-heading");
    await expect(heading).toHaveText(homeContent.inspiration.heading);

    // A full-width navy band holding the white heading and the white supporting line.
    const style = await band.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, width: el.getBoundingClientRect().width }));
    const colour = await heading.evaluate((el) => getComputedStyle(el).color);
    expect(style.bg).toBe("rgb(18, 18, 145)");
    expect(colour).toBe("rgb(255, 255, 255)");
    expect(Math.round(style.width)).toBe(width);
    const line = band.getByText(homeContent.inspiration.line);
    await expect(line).toBeVisible();
    const lineColour = await line.evaluate((el) => getComputedStyle(el).color);
    expect(lineColour).toBe("rgb(255, 255, 255)");
    const [bandBox, headingBox, lineBox] = [await band.boundingBox(), await heading.boundingBox(), await line.boundingBox()];
    expect(lineBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height - 1); // the line follows the heading, even when it wraps
    expect(headingBox!.y - bandBox!.y).toBeGreaterThanOrEqual(24); // comfortable padding above
    expect(bandBox!.y + bandBox!.height - (lineBox!.y + lineBox!.height)).toBeGreaterThanOrEqual(24); // and below
    await expect(band.getByTestId("heading-stroke")).toHaveCount(0); // no yellow stroke here
    await expect(band.locator("span[aria-hidden]")).toHaveCount(0); // and no short white rule

    // Contrast, measured from the rendered colours.
    const headingRatio = contrast(colour, style.bg);
    const lineRatio = contrast(lineColour, style.bg);
    console.log(`CONTRAST ${width}px heading white-on-navy=${headingRatio.toFixed(2)}:1 line white-on-navy=${lineRatio.toFixed(2)}:1`);
    expect(headingRatio).toBeGreaterThanOrEqual(7);
    expect(lineRatio).toBeGreaterThanOrEqual(7);

    // The rest of the section is unchanged and sits below the band.
    await expect(page.getByTestId("why-choose")).toContainText(homeContent.whyChoose.heading);
    expect((await page.getByTestId("why-choose").boundingBox())!.y).toBeGreaterThan(bandBox!.y + bandBox!.height);

    // No seam: the band starts exactly where the cards section ends, with nothing in between.
    const join = await page.evaluate(() => {
      const cards = document.querySelector('section[aria-label="Quick links"]')!.getBoundingClientRect();
      const navy = document.querySelector('[data-testid="inspiration-band"]')!.getBoundingClientRect();
      return { gap: navy.top - cards.bottom, cardsRight: cards.right, navyRight: navy.right, cardsLeft: cards.left, navyLeft: navy.left };
    });
    expect(Math.abs(join.gap)).toBeLessThanOrEqual(0.5);
    expect(join.cardsLeft).toBe(join.navyLeft);
    expect(join.cardsRight).toBe(join.navyRight);

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}
