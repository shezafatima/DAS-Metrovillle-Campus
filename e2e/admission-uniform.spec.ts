import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { uniformContent, uniformTitle } from "../src/content/admission";
import { waitForScrollSettled } from "./helpers/scroll";

// 020 US4: the uniform groups as flip cards on the shared coverflow (the Hifz girls' card is not shown, spec V8).

const groups = uniformContent.uniform;
const TITLES = groups.map(uniformTitle);
const AUTO_MS = 3000;

const section = (page: Page) => page.locator("#uniform");
const card = (page: Page, i: number) => section(page).locator(`[data-qa-index="${i}"]`);
const centreIndex = (page: Page) => section(page).locator('[data-centre="true"]').getAttribute("data-qa-index").then(Number);

async function openCards(page: Page) {
  await page.goto("/admission", { timeout: 180_000 });
  await card(page, 0).evaluate((el) => el.scrollIntoView({ block: "center" }));
  await waitForScrollSettled(page);
  await expect(card(page, 0)).toHaveAttribute("data-centre", "true");
}

async function centreOf(page: Page, i: number) {
  const box = (await card(page, i).boundingBox())!;
  return { x: box.x + box.width / 2, y: box.y + box.height / 2 };
}

/** Waits until card `i` has stopped moving (the same position for 10 frames in a row), i.e. its slide has finished. */
async function waitForCardSettled(page: Page, i: number) {
  await card(page, i).evaluate(
    (el) =>
      new Promise<void>((resolve) => {
        const key = () => {
          const r = el.getBoundingClientRect();
          return `${r.x.toFixed(1)},${r.y.toFixed(1)},${r.width.toFixed(1)}`;
        };
        let last = key();
        let still = 0;
        const tick = () => {
          const now = key();
          still = now === last ? still + 1 : 0;
          last = now;
          if (still >= 10) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}

/**
 * Brings the next card to the centre the way a person would. With room, they click the part of it they can see (not
 * the card's own centre, which can be off screen). Where the carousel clips the neighbour so a mouse cannot reach it
 * (375px), a person uses the keyboard instead: the arrow key moves it, as the keyboard test shows.
 */
async function bringToCentre(page: Page, i: number) {
  const target = card(page, i);
  const nb = (await target.boundingBox())!;
  const centre = (await section(page).locator('[data-centre="true"]').boundingBox())!;
  const left = Math.max(nb.x, centre.x + centre.width);
  const right = Math.min(nb.x + nb.width, page.viewportSize()!.width);
  const at = { x: (left + right) / 2, y: nb.y + nb.height / 2 };
  const reachable =
    right - left > 8 &&
    (await page.evaluate(({ x, y, i }) => document.elementFromPoint(x, y)?.closest("#uniform [data-qa-index]")?.getAttribute("data-qa-index") === String(i), { ...at, i }));
  if (reachable) {
    await target.getByTestId("uniform-flip").click({ position: { x: at.x - nb.x, y: nb.height / 2 } });
  } else {
    await section(page).locator('[data-centre="true"]').getByTestId("uniform-flip").focus();
    await page.keyboard.press("ArrowRight");
  }
}

async function touch(page: Page, from: { x: number; y: number }, dx: number, steps = 6) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [from] });
  for (let s = 1; s <= steps; s++) {
    await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: from.x + (dx * s) / steps, y: from.y }] });
  }
  await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
}

test.describe("uniform cards: content and accessibility (020 US4)", () => {
  test("five cards with full headings in reference order; each list is named by its card; no links", async ({ page }) => {
    test.setTimeout(240_000);
    await openCards(page);
    await expect(section(page).getByTestId("uniform-card")).toHaveCount(groups.length);
    await expect(section(page).getByRole("heading", { level: 3 })).toHaveCount(groups.length);
    for (let i = 0; i < groups.length; i++) {
      await expect(card(page, i).getByRole("heading", { level: 3 })).toHaveAccessibleName(TITLES[i]);
      const list = card(page, i).getByTestId("uniform-items");
      await expect(list).toHaveAccessibleName(TITLES[i]);
      await expect(list.locator("li")).toHaveText(groups[i].items);
      await expect(card(page, i).getByTestId("uniform-flip")).toHaveJSProperty("tagName", "BUTTON");
    }
    await expect(section(page).locator("a")).toHaveCount(0);
    await expect(section(page).getByText("Hifz Students’ Uniform – Girls")).toHaveCount(0);
  });

  test("each photo loads with its alt text on the grey panel; a group without one would show an icon, never an empty image", async ({ page }) => {
    test.setTimeout(240_000);
    await openCards(page);
    for (let i = 0; i < groups.length; i++) {
      const photo = card(page, i).getByTestId("uniform-photo");
      if (groups[i].image) {
        await expect(photo.locator("img")).toHaveAttribute("alt", groups[i].image!.alt);
        await expect.poll(() => photo.locator("img").evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0), { timeout: 60_000 }).toBe(true);
      } else {
        await expect(photo.locator("img")).toHaveCount(0);
        await expect(photo.locator("svg")).toHaveCount(1);
      }
    }
  });

  test("axe finds no violations in the Uniform section", async ({ page }) => {
    test.setTimeout(240_000);
    await openCards(page);
    const result = await new AxeBuilder({ page }).include("#uniform").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("uniform cards on a mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("hover flips the centre card and shows its list; auto-advance waits; leaving turns it back", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await card(page, 0).hover();
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    await expect(card(page, 0).getByTestId("uniform-items")).toBeVisible();
    await page.waitForTimeout(AUTO_MS + 1500);
    expect(await centreIndex(page)).toBe(0); // paused while flipped and hovered
    await page.mouse.move(5, 5);
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "false");
  });

  test("auto-advances one card at a time and loops", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await page.mouse.move(5, 5);
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * 3 }).toBe(1);
    await expect.poll(() => centreIndex(page), { timeout: AUTO_MS * groups.length * 2 }).toBe(0); // looped round
  });
});

test.describe("uniform cards on a keyboard", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("focus reveals the back, arrows move and keep focus, and auto-advance waits while focused", async ({ page }) => {
    test.setTimeout(300_000);
    await openCards(page);
    await card(page, 0).getByTestId("uniform-flip").focus();
    await page.keyboard.press("Shift+Tab");
    await page.keyboard.press("Tab"); // a keyboard focus, so :focus-visible applies
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    await page.keyboard.press("ArrowRight");
    await expect(card(page, 1)).toHaveAttribute("data-centre", "true");
    await expect(card(page, 1).getByTestId("uniform-flip")).toBeFocused();
    await expect(card(page, 1)).toHaveAttribute("data-flipped", "true");
    await page.waitForTimeout(AUTO_MS + 1500);
    expect(await centreIndex(page)).toBe(1);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(card(page, groups.length - 1)).toHaveAttribute("data-centre", "true"); // loops backwards
  });

  test("with reduced motion nothing advances by itself and the back cross-fades", async ({ page }) => {
    test.setTimeout(300_000);
    await page.emulateMedia({ reducedMotion: "reduce" });
    await openCards(page);
    await page.mouse.move(5, 5);
    await page.waitForTimeout(AUTO_MS + 1500);
    expect(await centreIndex(page)).toBe(0);
    await card(page, 0).hover();
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    expect(await card(page, 0).locator(".qa-inner").evaluate((el) => getComputedStyle(el).transform)).toBe("none");
    await expect.poll(async () => Number(await card(page, 0).locator(".qa-back").evaluate((el) => getComputedStyle(el).opacity))).toBe(1);
  });
});

test.describe("uniform cards on touch", () => {
  test("a tap flips and a second tap turns it back; a swipe changes the card without flipping; a tap outside unflips", async ({ browser }) => {
    test.setTimeout(300_000);
    const context = await browser.newContext({ viewport: { width: 375, height: 800 }, hasTouch: true, isMobile: true });
    const page = await context.newPage();
    await openCards(page);
    let c = await centreOf(page, 0);
    await page.touchscreen.tap(c.x, c.y);
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "true");
    await page.waitForTimeout(800);
    await page.touchscreen.tap(c.x, c.y);
    await expect(card(page, 0)).toHaveAttribute("data-flipped", "false");

    await touch(page, c, -140);
    await expect.poll(() => centreIndex(page)).toBe(1);
    for (let i = 0; i < groups.length; i++) await expect(card(page, i)).toHaveAttribute("data-flipped", "false");
    await waitForCardSettled(page, 1); // a person taps once the card has stopped sliding into place...
    await page.waitForTimeout(500); // ...and not in the same instant as the swipe ends: Chrome drops a tap that lands right after a swipe

    c = await centreOf(page, 1);
    await page.touchscreen.tap(c.x, c.y);
    await expect(card(page, 1)).toHaveAttribute("data-flipped", "true");
    await page.touchscreen.tap(5, 5); // outside the carousel
    await expect(card(page, 1)).toHaveAttribute("data-flipped", "false");
    await context.close();
  });
});

// 375/768/1024/1440 plus the reference breakpoints (480, 640, 782, 1280, and either side of the 1024 menu collapse).
for (const width of [375, 480, 640, 768, 782, 1023, 1024, 1025, 1280, 1440]) {
  test(`at ${width}px there is no sideways scroll and every card's list is fully readable`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: "reduce" }); // no auto-advance while measuring
    await openCards(page);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    for (let i = 0; i < groups.length; i++) {
      if (i > 0) {
        await bringToCentre(page, i);
        await expect(card(page, i)).toHaveAttribute("data-centre", "true");
      }
      await card(page, i).hover();
      await expect(card(page, i)).toHaveAttribute("data-flipped", "true");
      const fits = await card(page, i).evaluate((el) => {
        const back = el.querySelector(".qa-back")!.getBoundingClientRect();
        const items = [...el.querySelectorAll('[data-testid="uniform-items"] li')].map((li) => li.getBoundingClientRect());
        const size = parseFloat(getComputedStyle(el.querySelector('[data-testid="uniform-items"]')!).fontSize);
        return { inside: items.every((r) => r.top >= back.top - 0.5 && r.bottom <= back.bottom + 0.5), size };
      });
      expect(fits.inside, `${TITLES[i]} at ${width}px`).toBe(true);
      expect(fits.size).toBeGreaterThanOrEqual(16);
      await page.mouse.move(5, 5);
    }
  });
}
