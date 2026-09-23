import { test, expect } from "@playwright/test";
import * as fs from "node:fs";
import * as path from "node:path";

interface SignupTokens {
  bandBackground: string | null;
}

function loadTokens(width: number): SignupTokens {
  const file = path.join(__dirname, "..", "research", "tokens", `signup-${width}.json`);
  return JSON.parse(fs.readFileSync(file, "utf-8")) as SignupTokens;
}

// Widths per spec.md FR-011 / Constitution VIII. No horizontal scroll,
// band background matches the extracted token, and the field/button
// layout matches the clarified narrow-width requirement (spec.md
// Clarifications: 375 single column, 768 three-in-a-row + button
// below, 1024/1440 all four in one row).
for (const width of [375, 768, 1024, 1440]) {
  test(`signup band at ${width}px — no horizontal scroll, band colour, layout`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1200 });
    await page.goto("/");

    const section = page.locator("#signup");
    await section.scrollIntoViewIfNeeded();

    const overflowing = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(overflowing).toBe(false);

    const tokens = loadTokens(width);
    const bandBackground = await section.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bandBackground).toBe(tokens.bandBackground);

    const nameBox = await page.getByRole("textbox", { name: "Name" }).boundingBox();
    const emailBox = await page.getByRole("textbox", { name: "Email" }).boundingBox();
    const phoneBox = await page.getByRole("textbox", { name: "Phone" }).boundingBox();
    const buttonBox = await page.getByRole("button", { name: "Signup" }).boundingBox();
    expect(nameBox).not.toBeNull();
    expect(emailBox).not.toBeNull();
    expect(phoneBox).not.toBeNull();
    expect(buttonBox).not.toBeNull();

    if (width === 375) {
      // Single column: each field directly below the previous one, same
      // left edge, strictly increasing top.
      expect(Math.round(nameBox!.x)).toBe(Math.round(emailBox!.x));
      expect(Math.round(emailBox!.x)).toBe(Math.round(phoneBox!.x));
      expect(emailBox!.y).toBeGreaterThan(nameBox!.y);
      expect(phoneBox!.y).toBeGreaterThan(emailBox!.y);
      expect(buttonBox!.y).toBeGreaterThan(phoneBox!.y);
    } else if (width === 768) {
      // Three fields share one row; the button sits on its own row
      // below, spanning roughly the same width as the row of fields.
      expect(Math.abs(nameBox!.y - emailBox!.y)).toBeLessThan(2);
      expect(Math.abs(emailBox!.y - phoneBox!.y)).toBeLessThan(2);
      expect(buttonBox!.y).toBeGreaterThan(nameBox!.y);
      const rowWidth = phoneBox!.x + phoneBox!.width - nameBox!.x;
      expect(buttonBox!.width).toBeGreaterThan(rowWidth * 0.9);
    } else {
      // 1024 / 1440: all four share one row.
      expect(Math.abs(nameBox!.y - emailBox!.y)).toBeLessThan(2);
      expect(Math.abs(emailBox!.y - phoneBox!.y)).toBeLessThan(2);
      expect(Math.abs(phoneBox!.y - buttonBox!.y)).toBeLessThan(2);
    }

    await section.screenshot({ path: `test-results/signup-${width}.png` });
  });
}
