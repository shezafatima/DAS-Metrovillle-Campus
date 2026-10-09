import { test, expect } from "@playwright/test";
import { contactInfo, footerContent, portalLinks } from "../src/content/site-shell";

/**
 * The footer (001, redesigned 2026-10-08): white, four columns on desktop (two at tablet, one on a phone), a thin divider
 * and a bottom bar. Links are navy; hover and keyboard focus use the yellow as a highlight. No sign-in, no database
 * (contact details are whatever Settings holds, or the content-file starting values).
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
  test(`footer at ${width}px`, async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/about", { timeout: 120_000 });
    const footer = page.getByRole("contentinfo");
    await footer.scrollIntoViewIfNeeded();

    // White background, no headings, each link group a named nav.
    expect(await footer.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(255, 255, 255)");
    await expect(footer.locator("h1, h2, h3, h4, h5, h6")).toHaveCount(0);
    await expect(footer.getByRole("navigation", { name: "Quick Links" })).toBeVisible();
    await expect(footer.getByRole("navigation", { name: "Portal Links" })).toBeVisible();
    await expect(footer.getByRole("group", { name: "Contact Us" })).toBeVisible();

    // Columns: four in a row from 1024px, 2x2 at tablet width, one stacked on phones, in this order.
    const columns = await footer.locator(":scope > div:first-child > *").evaluateAll((els) =>
      els.map((e) => {
        const r = e.getBoundingClientRect();
        return { x: Math.round(r.x), y: Math.round(r.y) };
      }),
    );
    expect(columns).toHaveLength(4);
    if (width >= 1024) {
      expect(new Set(columns.map((c) => c.y)).size).toBe(1);
      expect(new Set(columns.map((c) => c.x)).size).toBe(4);
      expect([...columns].sort((a, b) => a.x - b.x)).toEqual(columns); // in order, left to right
    } else if (width >= 768) {
      expect(columns[0].y).toBe(columns[1].y);
      expect(columns[2].y).toBe(columns[3].y);
      expect(columns[2].y).toBeGreaterThan(columns[0].y);
      expect(columns[0].x).toBe(columns[2].x);
    } else {
      expect(new Set(columns.map((c) => c.x)).size).toBe(1);
      expect([...columns].sort((a, b) => a.y - b.y)).toEqual(columns); // stacked in order
    }

    // Quick Links (the main pages and Careers; no Campuses) and Portal Links (the six, with their targets).
    const quick = footer.getByRole("navigation", { name: "Quick Links" }).getByRole("link");
    expect(await quick.evaluateAll((els) => els.map((e) => [e.textContent, e.getAttribute("href")]))).toEqual(footerContent.quickLinks.map((l) => [l.label, l.href]));
    for (const link of portalLinks) await expect(footer.getByRole("navigation", { name: "Portal Links" }).getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);

    // Contact Us: address, a tel: link, a mailto: link, the timings, and Get directions.
    const contact = footer.getByRole("group", { name: "Contact Us" });
    await expect(contact.getByText(contactInfo.address)).toBeVisible();
    await expect(contact.getByRole("link", { name: contactInfo.phone })).toHaveAttribute("href", `tel:${contactInfo.phone}`);
    await expect(contact.getByRole("link", { name: contactInfo.email })).toHaveAttribute("href", `mailto:${contactInfo.email}`);
    if (contactInfo.officeHours) await expect(contact.getByText(contactInfo.officeHours)).toBeVisible();
    await expect(contact.getByRole("link", { name: footerContent.directions.label })).toHaveAttribute("href", "/contact");

    // Brand column: the logo, the description, and social links that open in a new tab safely.
    await expect(footer.getByRole("img", { name: footerContent.logo.alt })).toBeVisible();
    await expect(footer.getByText(footerContent.description)).toBeVisible();
    const socials = footer.locator('a[target="_blank"]').filter({ has: page.locator("svg") });
    expect(await socials.count()).toBeGreaterThan(0);
    for (const a of await socials.all()) expect(await a.getAttribute("rel")).toBe("noopener noreferrer");

    // Bottom bar: a generated current year, centred, small, and the developer credit link.
    const year = new Date().getFullYear();
    const copyright = footer.getByText(footerContent.copyright(year));
    await expect(copyright).toBeVisible();
    expect(await copyright.evaluate((el) => getComputedStyle(el).textAlign)).toBe("center");
    await expect(footer.getByRole("link", { name: footerContent.credit.name })).toHaveAttribute("href", footerContent.credit.href);
    // The thin divider above the bottom bar.
    expect(await copyright.evaluate((el) => getComputedStyle(el.parentElement!.parentElement!).borderTopWidth)).toBe("1px");

    // Contrast, measured: navy links and headings, muted text and the bottom bar on white; navy on the yellow highlight.
    const colours = await footer.evaluate((el) => {
      const read = (selector: string) => getComputedStyle(el.querySelector(selector)!).color;
      return {
        heading: read("#footer-quick-links"),
        link: read("nav a"),
        muted: read("p.leading-relaxed"),
      };
    });
    const bottomColour = await copyright.evaluate((el) => getComputedStyle(el.parentElement!).color);
    const ratio = {
      navyLink: contrast(colours.link, "rgb(255, 255, 255)"),
      heading: contrast(colours.heading, "rgb(255, 255, 255)"),
      muted: contrast(colours.muted, "rgb(255, 255, 255)"),
      bottom: contrast(bottomColour, "rgb(255, 255, 255)"),
      onYellow: contrast(colours.link, "rgb(255, 255, 0)"),
    };
    console.log(`CONTRAST ${width}px navy-on-white=${ratio.navyLink.toFixed(2)}:1 muted-on-white=${ratio.muted.toFixed(2)}:1 bottom-bar=${ratio.bottom.toFixed(2)}:1 navy-on-yellow=${ratio.onYellow.toFixed(2)}:1`);
    expect(ratio.navyLink).toBeGreaterThanOrEqual(7);
    expect(ratio.heading).toBeGreaterThanOrEqual(7);
    expect(ratio.muted).toBeGreaterThanOrEqual(4.5);
    expect(ratio.bottom).toBeGreaterThanOrEqual(4.5);
    expect(ratio.onYellow).toBeGreaterThanOrEqual(7);

    expect(await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth)).toBe(false);
  });
}

test("a footer link turns yellow behind navy text on hover and shows a visible outline on keyboard focus", async ({ page }) => {
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/about", { timeout: 120_000 });
  const link = page.getByRole("contentinfo").getByRole("navigation", { name: "Quick Links" }).getByRole("link", { name: "News" });
  await link.scrollIntoViewIfNeeded();
  const style = () => link.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, colour: getComputedStyle(el).color, outline: getComputedStyle(el).outlineStyle, outlineWidth: getComputedStyle(el).outlineWidth, outlineColour: getComputedStyle(el).outlineColor }));
  const rest = await style();
  expect(rest.bg).toBe("rgba(0, 0, 0, 0)");
  await link.hover();
  await expect.poll(async () => (await style()).bg).toBe("rgb(255, 255, 0)");
  expect((await style()).colour).toBe("rgb(18, 18, 145)");
  await page.mouse.move(2, 2);
  // Keyboard focus: tab to the link from the one before it.
  await page.getByRole("contentinfo").getByRole("navigation", { name: "Quick Links" }).getByRole("link", { name: "Resources" }).focus();
  await page.keyboard.press("Tab");
  await expect(link).toBeFocused();
  const focused = await style();
  expect(focused.bg).toBe("rgb(255, 255, 0)");
  expect(focused.outline).toBe("solid");
  expect(parseFloat(focused.outlineWidth)).toBeGreaterThanOrEqual(2);
  await expect.poll(async () => (await style()).outlineColour).toBe("rgb(18, 18, 145)"); // (the colour transition has to finish)
});
