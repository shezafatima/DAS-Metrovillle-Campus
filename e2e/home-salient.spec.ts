import { test, expect, type Page } from "@playwright/test";
import { homeContent } from "../src/content/home";

/**
 * The Salient Features section (006 FR-012): the heading, a paragraph and a "Read more" button (left-aligned) beside the
 * four features in a slowly turning circle with the school emblem in the middle (a smaller one on phones). No
 * sign-in, no database.
 */
const { heading, paragraph, readMore, items } = homeContent.salientFeatures;

async function openSection(page: Page) {
  await page.goto("/", { timeout: 120_000 });
  await page.locator("#salient-heading").evaluate((el) => el.scrollIntoView({ block: "center" }));
}

/** Freeze the turning at a point of its cycle (a fraction of one turn). */
async function freezeAt(page: Page, fraction: number) {
  await page.addStyleTag({ content: `.salient-list,.salient-item-inner{animation-play-state:paused!important;animation-delay:-${(70 * fraction).toFixed(2)}s!important}` });
  await page.waitForTimeout(250);
}

/** Net rotation (degrees, -180..180) of an element, accumulated over its ancestors up to the ring. */
const netAngle = (page: Page, selector: string) =>
  page.locator(selector).first().evaluate((el) => {
    let m = new DOMMatrix();
    for (let node: Element | null = el; node && !node.classList.contains("salient-ring"); node = node.parentElement) {
      const t = getComputedStyle(node).transform;
      if (t && t !== "none") m = new DOMMatrix(t).multiply(m);
    }
    return Math.atan2(m.b, m.a) * (180 / Math.PI);
  });

for (const width of [375, 768, 1024, 1440]) {
  test(`salient features at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await openSection(page);
    const section = page.locator("section[aria-labelledby='salient-heading']");
    const h2 = page.locator("#salient-heading");
    const text = section.getByText(paragraph);
    const button = section.getByRole("link", { name: readMore.label });
    const ring = page.getByTestId("salient-ring");

    // Text side: the h2, the new paragraph, a "Read more" button to /about; all left-aligned, at every width.
    await expect(h2).toHaveText(heading);
    expect(await h2.evaluate((el) => el.tagName)).toBe("H2");
    await expect(button).toHaveAttribute("href", readMore.href);
    for (const el of [h2, text]) expect(await el.evaluate((n) => getComputedStyle(n).textAlign)).toMatch(/^(start|left)$/);
    const [h2Box, textBox, buttonBox, ringBox] = [await h2.boundingBox(), await text.boundingBox(), await button.boundingBox(), await ring.boundingBox()];
    expect(Math.abs(textBox!.x - h2Box!.x)).toBeLessThanOrEqual(1);
    expect(Math.abs(buttonBox!.x - h2Box!.x)).toBeLessThanOrEqual(1);
    expect(textBox!.width).toBeLessThanOrEqual(60 * 12);
    expect(await button.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(244, 67, 54)"); // the site's red button

    // The old one-line text and the descriptions are gone; only icon and heading remain on each feature.
    await expect(section.getByText(/reflect the goods/)).toHaveCount(0);
    await expect(section.locator("li p")).toHaveCount(0);
    await expect(section.locator("li h3")).toHaveText(items.map((i) => i.title));

    // Columns: the circle on the LEFT from 1024px, text first (above the circle) when stacked.
    if (width >= 1024) expect(ringBox!.x + ringBox!.width).toBeLessThanOrEqual(h2Box!.x + 1);
    else expect(ringBox!.y).toBeGreaterThan(buttonBox!.y + buttonBox!.height);

    // The section's background is unchanged.
    const [bg, token] = await Promise.all([
      section.evaluate((el) => getComputedStyle(el).backgroundColor),
      page.evaluate(() => {
        const probe = document.createElement("div");
        probe.style.backgroundColor = "var(--color-home-salient-band)";
        document.body.appendChild(probe);
        const value = getComputedStyle(probe).backgroundColor;
        probe.remove();
        return value;
      }),
    ]);
    expect(bg).toBe(token);

    const list = ring.locator("ul");
    const logo = ring.locator("img.salient-logo");
    // A circle that turns, with each item counter-turning: icons and headings stay upright at every moment.
    expect(await list.evaluate((el) => getComputedStyle(el).animationName)).toBe("salient-spin");
    expect(await ring.locator(".salient-item-inner").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("salient-unspin");
    await expect(logo).toBeVisible();
    expect(await logo.getAttribute("alt")).toBe("");
    expect(Math.abs(await netAngle(page, "img.salient-logo"))).toBeLessThan(0.5); // the logo does not turn
    const ringSize = ringBox!.width;
    expect(Math.abs(ringBox!.width - ringBox!.height)).toBeLessThanOrEqual(1);

    for (const fraction of [0, 0.07, 0.13, 0.31, 0.5, 0.77, 0.93]) {
      await freezeAt(page, fraction);
      for (const selector of ["li:nth-child(1) h3", "li:nth-child(2) h3", "li:nth-child(3) h3", "li:nth-child(4) h3"]) {
        const angle = await netAngle(page, `[data-testid="salient-ring"] ${selector}`);
        expect(Math.abs(angle)).toBeLessThan(1); // upright, never sideways or upside down
      }
      // No overlaps, and nothing outside the ring (so nothing clipped by the section edge), whatever the angle.
      const boxes = await ring.getByTestId("salient-item").evaluateAll((els) =>
        els.map((e) => {
          const inner = e.querySelector(".salient-item-inner")!.getBoundingClientRect();
          const title = e.querySelector("h3")!.getBoundingClientRect();
          const icon = e.querySelector("img")!.getBoundingClientRect();
          return { inner: [inner.left, inner.top, inner.right, inner.bottom], content: [Math.min(title.left, icon.left), icon.top, Math.max(title.right, icon.right), title.bottom] };
        }),
      );
      const ringRect = (await ring.boundingBox())!;
      for (const b of boxes) {
        expect(b.content[0]).toBeGreaterThanOrEqual(ringRect.x - 1);
        expect(b.content[2]).toBeLessThanOrEqual(ringRect.x + ringRect.width + 1);
        expect(b.content[1]).toBeGreaterThanOrEqual(ringRect.y - 1);
        expect(b.content[3]).toBeLessThanOrEqual(ringRect.y + ringRect.height + 1);
        expect(b.content[2]).toBeLessThanOrEqual(width + 0.5);
        expect(b.content[0]).toBeGreaterThanOrEqual(-0.5);
      }
      for (let i = 0; i < boxes.length; i++) {
        for (let j = i + 1; j < boxes.length; j++) {
          const [a, c] = [boxes[i].content, boxes[j].content];
          const overlap = a[0] < c[2] && c[0] < a[2] && a[1] < c[3] && c[1] < a[3];
          expect(overlap, `items ${i + 1} and ${j + 1} overlap at ${fraction} of a turn`).toBe(false);
        }
      }
    }
    expect(ringSize).toBeGreaterThan(300);
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("the circle turns, and stops on hover and on focus", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await openSection(page);
  const ring = page.getByTestId("salient-ring");
  const list = ring.locator("ul");
  const angle = () => list.evaluate((el) => { const m = new DOMMatrix(getComputedStyle(el).transform); return Math.atan2(m.b, m.a) * (180 / Math.PI); });
  expect(await list.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
  const a1 = await angle();
  await page.waitForTimeout(1500);
  expect(Math.abs((await angle()) - a1)).toBeGreaterThan(0.5);

  await ring.hover();
  await expect(ring).toHaveAttribute("data-paused", "true");
  expect(await list.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
  const held = await angle();
  await page.waitForTimeout(700);
  expect(await angle()).toBeCloseTo(held, 3);
  // Hover does nothing else: the features are not links and do not change.
  expect(await ring.locator("a")).toHaveCount(0);
  await page.mouse.move(2, 2);
  await expect(ring).toHaveAttribute("data-paused", "false");

  await ring.focus();
  await expect(ring).toHaveAttribute("data-paused", "true");
  await ring.evaluate((el) => (el as HTMLElement).blur());
  await expect(ring).toHaveAttribute("data-paused", "false");
});

test("with reduced motion nothing turns: the items stay at the top, right, bottom and left", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await openSection(page);
  const ring = page.getByTestId("salient-ring");
  expect(await ring.locator("ul").evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await ring.locator(".salient-item-inner").first().evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  const ringBox = (await ring.boundingBox())!;
  const centres = await ring.getByTestId("salient-item").evaluateAll((els) => els.map((e) => { const r = e.getBoundingClientRect(); return [r.x + r.width / 2, r.y + r.height / 2]; }));
  const [cx, cy] = [ringBox.x + ringBox.width / 2, ringBox.y + ringBox.height / 2];
  const dir = centres.map(([x, y]) => (Math.abs(x - cx) < 4 ? (y < cy ? "top" : "bottom") : Math.abs(y - cy) < 4 ? (x > cx ? "right" : "left") : "other"));
  expect(dir).toEqual(["top", "right", "bottom", "left"]);
  await context.close();
});
