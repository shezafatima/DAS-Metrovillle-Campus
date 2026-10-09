import { test, expect } from "@playwright/test";
import { homeContent } from "../src/content/home";

/**
 * The Progress Dashboard (006 US5): a full-width yellow band, no background photo, with the heading, the four numbers and
 * their icons in navy. The partners ticker below it has little space above and below. No sign-in, no database (the numbers
 * are whatever Settings holds, or its starting values).
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

for (const width of [375, 768, 1024, 1440]) {
  test(`progress dashboard on yellow at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/", { timeout: 120_000 });
    const section = page.getByTestId("progress-dashboard");
    await section.evaluate((el) => el.scrollIntoView({ block: "center" }));

    // Yellow, full width, and no photo.
    const bg = await section.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(255, 255, 0)");
    expect(Math.round((await section.boundingBox())!.width)).toBe(width);
    await expect(section.locator("img")).toHaveCount(0);
    expect(await section.evaluate((el) => getComputedStyle(el).backgroundImage)).toBe("none");

    // The heading, the line, every number, label and icon are navy, and readable.
    const heading = section.getByRole("heading", { level: 2, name: homeContent.progressDashboard.heading });
    await expect(heading).toBeVisible();
    await expect(section.getByText(homeContent.progressDashboard.line)).toBeVisible();
    const colours = await section.evaluate((el) => [
      ...Array.from(el.querySelectorAll("h2, h2 + p, li, li span, li svg")).map((n) => getComputedStyle(n).color),
    ]);
    expect(new Set(colours)).toEqual(new Set(["rgb(18, 18, 145)"]));
    const ratio = contrast("rgb(18, 18, 145)", bg);
    console.log(`CONTRAST ${width}px navy-on-yellow=${ratio.toFixed(2)}:1`);
    expect(ratio).toBeGreaterThanOrEqual(7);

    // Only the number and its main label on each card (no extra text), in order, with a decorative icon.
    expect(await section.locator("li").evaluateAll((els) => els.map((e) => (e.textContent ?? "").replace(/^\d+/, "").trim()))).toEqual(["Students", "Books", "Teachers", "Campuses"]);
    await expect(section.locator("li > span")).toHaveCount(8); // a number and a label on each
    // Four stats, each with an icon (decorative) and a number.
    await expect(section.locator("li")).toHaveCount(4);
    await expect(section.locator("li svg[aria-hidden='true']")).toHaveCount(4);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);

    // The stats sit in a column no wider than the stats token (960px), centred; the band itself stays full width.
    const ul = await section.locator("ul").boundingBox();
    expect(ul!.width).toBeLessThanOrEqual(960.5);
    expect(Math.abs(ul!.x + ul!.width / 2 - width / 2)).toBeLessThanOrEqual(1);
    if (width >= 1024) {
      const items = await section.locator("li").evaluateAll((els) => els.map((e) => e.getBoundingClientRect()));
      expect(items[1].left + items[1].width / 2 - (items[0].left + items[0].width / 2)).toBeLessThanOrEqual(265);
    }

    // The band is short: 2x2 cards on phones, one row of four from 1024px.
    const band = (await section.boundingBox())!;
    expect(band.height).toBeLessThanOrEqual(width >= 1024 ? 430 : width >= 768 ? 600 : 620);

    // Each stat is a frosted-glass card: a translucent white fill, a faint white border, a blur, a soft shadow; same navy text.
    const cards = await section.locator("li").evaluateAll((els) =>
      els.map((e) => {
        const cs = getComputedStyle(e);
        return { bg: cs.backgroundColor, border: cs.borderTopColor, blur: cs.backdropFilter, radius: parseFloat(cs.borderTopLeftRadius), shadow: cs.boxShadow, height: Math.round(e.getBoundingClientRect().height) };
      }),
    );
    expect(cards).toHaveLength(4);
    expect(new Set(cards.map((c) => c.height)).size).toBe(1); // equal heights
    for (const c of cards) {
      expect(c.blur).toContain("blur");
      expect(c.radius).toBeGreaterThanOrEqual(12);
      expect(c.shadow).not.toBe("none");
      expect(c.bg).toMatch(/255 1 1 \/ 0\.4|255, 255, 255, 0\.4|\/ 0\.4\)/);
    }
    // Navy on the card: the translucent white over the yellow band (40% white over yellow), measured.
    const alpha = Number(/(?:\/\s*|,\s*)([\d.]+)\)$/.exec(cards[0].bg)![1]);
    const onCard = `rgb(255, 255, ${Math.round(255 * alpha)})`;
    const cardRatio = contrast("rgb(18, 18, 145)", onCard);
    console.log(`CONTRAST ${width}px navy-on-glass-card=${cardRatio.toFixed(2)}:1`);
    expect(cardRatio).toBeGreaterThanOrEqual(7);

    // The partners section below has room above its heading and below its logos.
    const partners = page.getByTestId("partners");
    const [partnersHeading, strip, box] = [await partners.getByRole("heading", { level: 2 }).boundingBox(), await partners.getByTestId("partner-roll").boundingBox(), await partners.boundingBox()];
    expect(partnersHeading!.y - box!.y).toBeGreaterThanOrEqual(44);
    expect(box!.y + box!.height - (strip!.y + strip!.height)).toBeGreaterThanOrEqual(44);
  });
}
