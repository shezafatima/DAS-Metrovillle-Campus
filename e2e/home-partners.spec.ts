import { test, expect, type Page } from "@playwright/test";
import { homeContent } from "../src/content/home";

/**
 * The Partners ticker (006 US7): the partners' logos on the grey band, in a slow continuous loop that runs the
 * opposite way to the Books strip (the same strip component). It does not pause on hover (logos may be links), does pause
 * for keyboard focus, and is a plain swipeable row under reduced motion. The cases with fewer than three logos or none are
 * covered by the component's unit tests (the logos come from the content file). No sign-in, no database.
 */
const partners = homeContent.partners.items;
const linked = partners.filter((p) => p.href);

async function openPartners(page: Page) {
  await page.goto("/", { timeout: 120_000 });
  await page.getByTestId("partners").evaluate((el) => el.scrollIntoView({ block: "center" }));
}

for (const width of [375, 768, 1024, 1440]) {
  test(`partners ticker at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await openPartners(page);
    const section = page.getByTestId("partners");
    const roll = page.getByTestId("partner-roll");
    const track = roll.locator("ul");
    const small = width < 768;

    // A centred h2 heads the section, with the shared yellow stroke under it (no pill, no divider), and the section is named by it.
    const heading = section.getByRole("heading", { level: 2, name: homeContent.partners.heading });
    await expect(heading).toBeVisible();
    expect(await heading.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    expect(await section.getAttribute("aria-labelledby")).toBe(await heading.getAttribute("id"));
    const stroke = section.getByTestId("heading-stroke");
    await expect(stroke).toHaveCount(1);
    await expect(stroke).toHaveAttribute("aria-hidden", "true");
    expect(await stroke.locator("g").evaluate((el) => getComputedStyle(el).stroke)).toBe("rgb(255, 255, 0)"); // the yellow
    await expect(section.locator("a, button")).toHaveCount(linked.length); // no pill or other control
    expect(Math.abs((await heading.boundingBox())!.x + (await heading.boundingBox())!.width / 2 - width / 2)).toBeLessThanOrEqual(2);
    expect((await heading.boundingBox())!.y).toBeLessThan((await roll.boundingBox())!.y); // above the strip
    // Proper spacing: the stroke sits under the heading; a clear gap to the strip; room above the heading and below the strip.
    const [headingBox, strokeBox, rollBox, sectionBox] = [await heading.boundingBox(), await stroke.boundingBox(), await roll.boundingBox(), await section.boundingBox()];
    expect(strokeBox!.y).toBeGreaterThanOrEqual(headingBox!.y + headingBox!.height - 1);
    const gapToStrip = rollBox!.y - (strokeBox!.y + strokeBox!.height);
    expect(gapToStrip).toBeGreaterThanOrEqual(40);
    expect(gapToStrip).toBeLessThanOrEqual(64);
    expect(headingBox!.y - sectionBox!.y).toBeGreaterThanOrEqual(width >= 1024 ? 76 : 44);
    expect(sectionBox!.y + sectionBox!.height - (rollBox!.y + rollBox!.height)).toBeGreaterThanOrEqual(width >= 1024 ? 76 : 44);
    // The background is as it was.
    const bg = await section.evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(bg).toBe("rgb(233, 233, 237)");

    // A loop that runs the opposite way to the books strip, at the same slow speed; hovering does not stop it.
    await expect(roll).toHaveAttribute("data-mode", "loop");
    await expect(roll).toHaveAttribute("data-direction", "reverse");
    expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("roll-strip");
    expect(await track.evaluate((el) => getComputedStyle(el).animationDirection)).toBe("reverse");
    const x = () => track.evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m41);
    const first = await x();
    await page.waitForTimeout(800);
    expect(await x()).toBeGreaterThan(first + 5); // moving to the right: the books strip moves to the left
    await roll.hover();
    await expect(roll).toHaveAttribute("data-paused", "false");
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("running");
    const hoverStart = await x();
    await page.waitForTimeout(500);
    expect(await x()).toBeGreaterThan(hoverStart + 3);
    await page.mouse.move(2, 2);
    // Speed: 40px per second (the half of the track, over its duration).
    const speed = await track.evaluate((el) => (el.scrollWidth / 2) / parseFloat(getComputedStyle(el).animationDuration));
    expect(speed).toBeGreaterThan(38);
    expect(speed).toBeLessThan(42);

    // It stops for keyboard focus, and resumes.
    await roll.focus();
    await expect(roll).toHaveAttribute("data-paused", "true");
    expect(await track.evaluate((el) => getComputedStyle(el).animationPlayState)).toBe("paused");
    await roll.evaluate((el) => (el as HTMLElement).blur());
    await expect(roll).toHaveAttribute("data-paused", "false");

    // Each partner once, in order, with its alt text; copies hidden from assistive technology.
    const real = roll.getByTestId("partner-logo");
    await expect(real).toHaveCount(partners.length);
    expect(await real.locator("img").evaluateAll((els) => els.map((e) => e.getAttribute("alt")))).toEqual(partners.map((p) => p.logo.alt));
    for (const p of partners) expect(p.logo.alt.trim().length).toBeGreaterThan(2);
    const copies = roll.getByTestId("partner-logo-copy");
    expect(await copies.count()).toBeGreaterThan(0);
    expect(await copies.evaluateAll((els) => els.every((e) => e.getAttribute("aria-hidden") === "true" && e.querySelector("img")?.getAttribute("alt") === ""))).toBe(true);

    // Links stay as they are today: only the logos with an href are links (none at present), each named after the partner.
    await expect(roll.getByRole("link")).toHaveCount(linked.length);
    for (const p of linked) await expect(roll.getByRole("link", { name: p.name })).toHaveAttribute("href", p.href!);

    // Logos: no taller than the box (the tokens: 120px, 92px on phones), no wider than the cap (270px), contained (never cropped or
    // stretched), and an equal gap between neighbours (88px, 68px on phones). The sizes are read from the tokens.
    const token = (name: string) =>
      page.evaluate((n) => {
        const probe = document.createElement("div");
        probe.style.width = `var(${n})`;
        document.body.appendChild(probe);
        const px = parseFloat(getComputedStyle(probe).width);
        probe.remove();
        return px;
      }, name);
    const [boxH, boxW, gap] = [await token(small ? "--spacing-home-partner-box-h-sm" : "--spacing-home-partner-box-h"), await token("--spacing-home-partner-box-w"), await token(small ? "--spacing-home-partner-gap-sm" : "--spacing-home-partner-gap")];
    const boxes = await real.evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        const img = e.querySelector("img")!;
        return { left: r.left, right: r.right, width: r.width, height: r.height, fit: getComputedStyle(img).objectFit };
      }),
    );
    for (const b of boxes) {
      expect(b.height).toBeLessThanOrEqual(boxH + 0.5);
      expect(b.width).toBeLessThanOrEqual(boxW + 0.5);
      expect(b.fit).toBe("contain");
    }
    for (let i = 1; i < boxes.length; i++) expect(Math.abs(boxes[i].left - boxes[i - 1].right - gap)).toBeLessThan(0.75);

    // The edge fades blend into the section's own background colour (not navy).
    const fades = await roll.locator(".roll-fade").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundImage));
    expect(fades).toHaveLength(2);
    for (const f of fades) {
      expect(f).toContain("rgb(233, 233, 237)");
      expect(f).not.toContain("rgb(18, 18, 145)");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("with reduced motion the partners do not move: a plain, swipeable row of the real logos", async ({ browser }) => {
  test.setTimeout(300_000);
  const context = await browser.newContext({ reducedMotion: "reduce", viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await openPartners(page);
  const roll = page.getByTestId("partner-roll");
  const track = roll.locator("ul");
  expect(await track.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  expect(await roll.evaluate((el) => getComputedStyle(el).overflowX)).toBe("auto");
  expect(await roll.getByTestId("partner-logo-copy").first().evaluate((el) => getComputedStyle(el).display)).toBe("none");
  const before = await track.evaluate((el) => getComputedStyle(el).transform);
  await page.waitForTimeout(1500);
  expect(await track.evaluate((el) => getComputedStyle(el).transform)).toBe(before);
  await context.close();
});
