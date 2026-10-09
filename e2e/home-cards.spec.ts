import { test, expect, type Page } from "@playwright/test";
import { homeContent } from "../src/content/home";

// The quick-access cards are a looping coverflow (006 FR-008): one centred card, one on each side, auto-advance
// with no buttons or dots, swipe on touch, arrow keys, and a card that is a button (never one big link).

const cards = homeContent.quickAccess.cards;
const AUTO_MS = 3000;

const card = (page: Page, i: number) => page.locator(`[data-qa-index="${i}"]`);
const centreIndex = (page: Page) => page.locator('[data-centre="true"]').getAttribute("data-qa-index").then(Number);
const flipped = (page: Page, i: number) => card(page, i).getAttribute("data-flipped");

async function openCards(page: Page) {
  await page.goto("/", { timeout: 120_000 });
  // Centre it: the sticky header would otherwise cover the top of the card.
  await card(page, 0).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await expect(card(page, 0)).toHaveAttribute("data-centre", "true");
}

/** One touch gesture through the browser's input pipeline: press, move in steps, release. */
async function touch(page: Page, from: { x: number; y: number }, dx: number, steps = 6) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let s = 1; s <= steps; s++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (dx * s) / steps, y: from.y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

async function centreOf(page: Page, i: number) {
  const box = (await card(page, i).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

for (const width of [375, 1440]) {
  test.describe(`quick-access cards at ${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    test("one centred larger card, a faded card on each side, the fourth parked; no buttons or dots; no sideways scroll", async ({ page }) => {
      test.setTimeout(300_000);
      await openCards(page);
      await expect(page.getByTestId("quick-access-card")).toHaveCount(4);
      const geometry = async (i: number) =>
        card(page, i).evaluate((el) => ({ width: el.getBoundingClientRect().width, opacity: Number(getComputedStyle(el).opacity) }));
      const [centre, right, left, far] = [await geometry(0), await geometry(1), await geometry(3), await geometry(2)];
      expect(centre.opacity).toBe(1);
      expect(right.width).toBeLessThan(centre.width);
      expect(left.width).toBeLessThan(centre.width);
      expect(right.opacity).toBeGreaterThan(0);
      expect(right.opacity).toBeLessThan(1);
      expect(left.opacity).toBeLessThan(1);
      expect(far.opacity).toBe(0);
      await expect(page.locator('section[aria-label="Quick links"] button:not([data-testid="quick-access-flip"])')).toHaveCount(0);
      expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
    });

    test("content is unchanged: every card keeps its title, text and a Read More link to its page, in the accessibility tree", async ({ page }) => {
      test.setTimeout(300_000);
      await openCards(page);
      for (const [i, c] of cards.entries()) {
        await expect(card(page, i).getByRole("heading", { name: c.title })).toHaveCount(1);
        await expect(card(page, i).getByText(c.text).first()).toBeAttached();
        const link = page.getByRole("link", { name: `${homeContent.quickAccess.readMore}: ${c.title}` });
        await expect(link).toHaveAttribute("href", c.href);
      }
      // The card itself is a button, not a link.
      await expect(card(page, 0).getByRole("button", { name: homeContent.quickAccess.flip(cards[0].title) })).toHaveAttribute("aria-expanded", "false");
    });
  });
}

test.describe("quick-access heading", () => {
  test.use({ viewport: { width: 1440, height: 700 } });

  test("has a heading, and a three-line yellow stroke that is hidden from assistive tech and draws in when scrolled to", async ({ page }) => {
    test.setTimeout(300_000);
    await page.goto("/", { timeout: 120_000 });
    await expect(page.getByRole("heading", { level: 2, name: homeContent.quickAccess.heading })).toBeVisible();
    const stroke = page.locator('section[aria-label="Quick links"]').getByTestId("heading-stroke");
    await expect(stroke).toHaveAttribute("aria-hidden", "true");
    await expect(stroke.locator("path")).toHaveCount(3);
    // The stroke sits under the heading, at its own width.
    const [h, s] = [await page.locator("#quick-access-heading").boundingBox(), await stroke.boundingBox()];
    expect(s!.y).toBeGreaterThanOrEqual(h!.y + h!.height - 1);
    expect(Math.abs(s!.width - h!.width)).toBeLessThanOrEqual(2);
    // Drawn when it scrolls into view (the hero fills the first screen, so it starts undrawn).
    await expect(stroke).toHaveAttribute("data-drawn", "false");
    await stroke.scrollIntoViewIfNeeded();
    await expect(stroke).toHaveAttribute("data-drawn", "true");
    await expect.poll(() => stroke.locator("path").last().evaluate((el) => getComputedStyle(el).strokeDashoffset)).toBe("0px");
  });
});

test.describe("quick-access cards on a mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("hover flips the centre card and shows its link; leaving turns it back; auto-advance waits meanwhile", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await card(page, 0).hover();
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    await expect(page.getByTestId("quick-access-link").first()).toBeVisible();
    await page.waitForTimeout(AUTO_MS + 1500);
    expect(await centreIndex(page)).toBe(0); // never advances away from a flipped card
    await page.mouse.move(5, 5);
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "false");
  });

  test("auto-advances on its own, one card at a time, and loops past the last card", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await page.mouse.move(5, 5);
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * 2 }).toBe(1);
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * 4 }).toBe(3);
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * 3 }).toBe(0);
  });

  test("a click on a side card brings it to the centre", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    const side = card(page, 1).getByTestId("quick-access-flip");
    await side.hover(); // over the carousel, so auto-advance is paused and cannot race the click
    await side.click();
    await expect(card(page, 1)).toHaveAttribute("data-centre", "true");
    await page.mouse.move(5, 5);
    expect(await flipped(page, 1)).toBe("false");
  });
});

test.describe("quick-access cards on a keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Tab reaches the centre card, focus reveals the back, arrows move between cards and keep focus", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await card(page, 0).getByTestId("quick-access-flip").focus();
    await page.keyboard.press("Tab"); // leaves and re-enters so the focus ring (focus-visible) is keyboard-driven
    await page.keyboard.press("Shift+Tab");
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    // Only the centre card is a tab stop.
    await expect(card(page, 1).getByTestId("quick-access-flip")).toHaveAttribute("tabindex", "-1");
    await page.keyboard.press("ArrowRight");
    await expect(card(page, 1)).toHaveAttribute("data-centre", "true");
    await expect(card(page, 1).getByTestId("quick-access-flip")).toBeFocused();
    await expect(card(page, 1)).toHaveAttribute("data-flipped", "true");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(card(page, 3)).toHaveAttribute("data-centre", "true"); // loops backwards past the first card
    await page.keyboard.press("Tab"); // on to the back's link
    await expect(card(page, 3).getByTestId("quick-access-link")).toBeFocused();
    await expect(card(page, 3)).toHaveAttribute("data-flipped", "true");
  });

  test("with reduced motion the back cross-fades in (no turn) and nothing advances by itself", async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openCards(page);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(AUTO_MS + 1500);
    expect(await centreIndex(page)).toBe(0);
    await card(page, 0).hover();
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    const style = await card(page, 0).evaluate((el) => ({
      inner: getComputedStyle(el.querySelector(".qa-inner")!).transform,
      back: getComputedStyle(el.querySelector(".qa-back")!).opacity,
      front: getComputedStyle(el.querySelector(".qa-front")!).opacity,
    }));
    expect(style.inner).toBe("none");
    await expect.poll(async () => Number(await card(page, 0).locator(".qa-back").evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
    await expect.poll(async () => Number(await card(page, 0).locator(".qa-front").evaluate((el) => getComputedStyle(el).opacity))).toBe(0);
    expect(style.back).toBeDefined();
  });
});

test.describe("quick-access cards on touch", () => {
  test("first tap flips the card without navigating; a second tap on its link follows it", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openCards(page);
    await page.touchscreen.tap((await centreOf(page, 0)).x, (await centreOf(page, 0)).y);
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    await expect(page).toHaveURL(/\/$/); // the first tap never navigates
    const link = card(page, 0).getByTestId("quick-access-link");
    await expect(link).toBeVisible();
    await page.waitForTimeout(800); // let the flip finish, so the link's position is final
    const box = (await link.boundingBox())!;
    await page.touchscreen.tap(box.x + box.width / 2, box.y + box.height / 2);
    await expect(page).toHaveURL(new RegExp(`${cards[0].href}$`), { timeout: 120_000 });
    await context.close();
  });

  test("a small wobble still flips; a real drag changes the slide and never also flips", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openCards(page);
    const from = await centreOf(page, 0);

    await touch(page, from, 6); // a wobble under the threshold: a tap
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    expect(await centreIndex(page)).toBe(0);
    const top = (await card(page, 0).boundingBox())!;
    await page.touchscreen.tap(top.x + top.width / 2, top.y + 12); // tap the back, away from its link: turns it back over
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "false");

    await touch(page, from, -140); // a real swipe left: the next card comes to the centre
    await expect.poll(() => centreIndex(page)).toBe(1);
    for (let i = 0; i < 4; i++) expect(await flipped(page, i)).toBe("false");

    await touch(page, from, 140); // and back
    await expect.poll(() => centreIndex(page)).toBe(0);
    for (let i = 0; i < 4; i++) expect(await flipped(page, i)).toBe("false");
    await context.close();
  });

  test("a touch pauses auto-advance and it resumes after a few seconds", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openCards(page);
    const from = await centreOf(page, 0);
    await touch(page, from, -140); // swipe to card 1 and touch-pause
    await expect.poll(() => centreIndex(page)).toBe(1);
    await page.waitForTimeout(AUTO_MS - 500);
    expect(await centreIndex(page)).toBe(1); // still held, not advanced by the original timer
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * 3 }).toBe(2); // resumed
    await context.close();
  });
});
