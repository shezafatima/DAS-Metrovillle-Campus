import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

interface ContactTokens {
  columns: Array<{
    headingStyle: { "font-size": string };
    subtitleStyle: { "font-size": string; "letter-spacing": string } | null;
  }>;
  form: {
    bandStyle: { "background-color": string };
    inputStyle: { height: string; border: string };
    buttonStyle: { "background-color": string };
  };
}

function loadTokens(width: number): ContactTokens {
  const file = path.join(__dirname, "..", "research", "tokens", `contact-page-${width}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as ContactTokens;
}

const WIDTHS: Array<{ w: number; h: number }> = [
  { w: 375, h: 900 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
];

for (const { w, h } of WIDTHS) {
  test(`contact page at ${w}px — no horizontal scroll, layout, tokens`, async ({ page }) => {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/contact");
    await page.waitForLoadState("networkidle");

    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowing).toBe(false);

    // Detail columns: 4 side by side at >=1024, stacked at 768/375.
    const headings = page.locator("section[aria-label='Contact details'] h3");
    const boxes = await headings.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
    if (w >= 1024) {
      for (const top of boxes) expect(Math.abs(top - boxes[0]!)).toBeLessThan(2);
    } else {
      expect(boxes[1]).toBeGreaterThan(boxes[0]!);
      expect(boxes[2]).toBeGreaterThan(boxes[1]!);
      expect(boxes[3]).toBeGreaterThan(boxes[2]!);
    }

    // Form: Name/Email share a row, Phone/Subject share a row, at >=768; stacked at 375.
    const nameBox = await page.locator("#contact-name").boundingBox();
    const emailBox = await page.locator("#contact-email").boundingBox();
    const phoneBox = await page.locator("#contact-phone").boundingBox();
    const subjectBox = await page.locator("#contact-subject").boundingBox();
    const sendBox = await page.getByRole("button", { name: "Send" }).boundingBox();

    if (w >= 768) {
      expect(Math.abs(nameBox!.y - emailBox!.y)).toBeLessThan(2);
      expect(Math.abs(phoneBox!.y - subjectBox!.y)).toBeLessThan(2);
      expect(phoneBox!.y).toBeGreaterThan(nameBox!.y);
    } else {
      expect(emailBox!.y).toBeGreaterThan(nameBox!.y);
      expect(phoneBox!.y).toBeGreaterThan(emailBox!.y);
      expect(subjectBox!.y).toBeGreaterThan(phoneBox!.y);
    }

    // Send is full width at every size — matches the message textarea's
    // width, which already spans the full form grid at every breakpoint.
    const messageBox = await page.locator("#contact-message").boundingBox();
    expect(Math.abs(sendBox!.width - messageBox!.width)).toBeLessThan(2);

    // Computed styles match the extraction tokens.
    const tokens = loadTokens(w);
    const bandBg = await page.locator("#contact-form").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bandBg).toBe(tokens.form.bandStyle["background-color"]);

    const inputHeight = await page.locator("#contact-name").evaluate((el) => getComputedStyle(el).height);
    expect(inputHeight).toBe(tokens.form.inputStyle.height);
    const inputBorder = await page
      .locator("#contact-name")
      .evaluate((el) => getComputedStyle(el).borderTop);
    expect(inputBorder).toBe(tokens.form.inputStyle.border);

    const buttonBg = await page
      .getByRole("button", { name: "Send" })
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(buttonBg).toBe(tokens.form.buttonStyle["background-color"]);

    const firstHeadingSize = await headings.first().evaluate((el) => getComputedStyle(el).fontSize);
    expect(firstHeadingSize).toBe(tokens.columns[0]!.headingStyle["font-size"]);

    const subtitle = page.locator("section[aria-label='Contact details'] h5").first();
    if ((await subtitle.count()) > 0) {
      const subtitleSize = await subtitle.evaluate((el) => getComputedStyle(el).fontSize);
      const subtitleLetterSpacing = await subtitle.evaluate((el) => getComputedStyle(el).letterSpacing);
      const tokenSubtitle = tokens.columns.find((c) => c.subtitleStyle)?.subtitleStyle;
      if (tokenSubtitle) {
        expect(subtitleSize).toBe(tokenSubtitle["font-size"]);
        expect(subtitleLetterSpacing).toBe(tokenSubtitle["letter-spacing"]);
      }
    }

    // Map space reserved before scroll (FR-024a).
    const mapArea = page
      .locator("h2", { hasText: "Locate Us on Google Maps" })
      .locator("xpath=following-sibling::div[1]");
    const mapHeight = await mapArea.evaluate((el) => getComputedStyle(el).height);
    expect(mapHeight).toBe("552px");

    await page.screenshot({ path: `test-results/contact-${w}.png`, fullPage: true });
  });
}

// Constitution VIII "reference breakpoints": around the ~1024px collapse.
test("contact details columns collapse exactly around 1024px", async ({ page }) => {
  await page.setViewportSize({ width: 1023, height: 900 });
  await page.goto("/contact");
  const headings1023 = page.locator("section[aria-label='Contact details'] h3");
  const tops1023 = await headings1023.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  expect(tops1023[1]).toBeGreaterThan(tops1023[0]!);

  await page.setViewportSize({ width: 1025, height: 900 });
  await page.reload();
  const headings1025 = page.locator("section[aria-label='Contact details'] h3");
  const tops1025 = await headings1025.evaluateAll((els) => els.map((el) => el.getBoundingClientRect().top));
  for (const top of tops1025) expect(Math.abs(top - tops1025[0]!)).toBeLessThan(2);
});
