import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// 017 About: five anchored sections. The server is `next dev`, so the team
// placeholders show by default; the cookie below makes it behave as production.

const PRODUCTION_COOKIE = { name: "e2e-production-content", value: "1", domain: "localhost", path: "/" };
const storyText = readFileSync(path.join(process.cwd(), "docs/content-source/about/our-story.txt"), "utf8").split("\n");

const headerHeight = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
const clearOfHeader = async (page: Page, id: string) => {
  const header = await headerHeight(page);
  await expect
    .poll(async () => (await page.locator(`section#${id}`).evaluate((el) => el.getBoundingClientRect().top)) >= header - 1)
    .toBe(true);
};
const aboutLinks = async (page: Page) =>
  (await page.getByRole("navigation", { name: "Main menu" }).locator('a[href^="/about#"]').allTextContents()).map((t) => t.trim());

test.describe("US1 content", () => {
  test("shows the banner and the sections with the client's text", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("About Us");
    const ids = await page.locator("main section").evaluateAll((els) => els.map((e) => e.id));
    expect(ids.slice(0, 3)).toEqual(["our-story", "vision-mission", "core-values"]);
    for (const id of ids) {
      const section = page.locator(`section#${id}`);
      await expect(section.getByRole("heading", { level: 2 })).toHaveCount(1);
    }
    await expect(page.locator("#our-story")).toContainText(storyText[3].split(",")[0]);
    await expect(page.locator("[lang='ur']")).toHaveCount(0);
    const main = await page.locator("main").innerText();
    for (const gone of [
      "Knowledge That Inspires",
      "Excellence Rooted in Values",
      "Creating Thinkers with Integrity",
      "Where Intelligence Meets Character",
      "(Page No 1)",
      "Welcome Note",
    ]) {
      expect(main).not.toContain(gone);
    }
  });

  test("backgrounds alternate", async ({ page }) => {
    await page.goto("/about");
    const bgs = await page.locator("main section").evaluateAll((els) => els.map((e) => e.getAttribute("data-background")));
    expect(bgs).toEqual(["surface", "navy", "muted", "surface", "muted"]);
  });

  for (const [width, panelsSideBySide, columns] of [
    [1440, true, 3],
    [768, true, 2],
    [375, false, 1],
  ] as const) {
    test(`Vision & Mission and Core Values layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/about");
      const panels = page.locator("#vision-mission article");
      const a = (await panels.nth(0).boundingBox())!;
      const b = (await panels.nth(1).boundingBox())!;
      if (panelsSideBySide) expect(Math.abs(a.y - b.y)).toBeLessThanOrEqual(2);
      else expect(b.y).toBeGreaterThan(a.y + a.height - 1);
      const lefts = await page.locator("#core-values ul > li").evaluateAll((els) =>
        new Set(els.map((e) => Math.round(e.getBoundingClientRect().left))).size,
      );
      expect(lefts).toBe(columns);
    });
  }
});

test.describe("Core Values glow", () => {
  test("each card starts its loop at a different point, and the glow pauses off screen", async ({ page }) => {
    await page.goto("/about");
    const delays = await page.locator("#core-values li").evaluateAll((els) =>
      els.map((e) => getComputedStyle(e.querySelector(".about-glow-spin")!).animationDelay),
    );
    expect(new Set(delays).size).toBe(6);
    await page.locator("#core-values").scrollIntoViewIfNeeded();
    await expect(page.locator("#core-values ul")).toHaveAttribute("data-offscreen", "false");
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(page.locator("#core-values ul")).toHaveAttribute("data-offscreen", "true");
  });

  test("reduced motion: no movement, a static yellow border", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/about");
    const ring = page.locator("#core-values li .about-glow-ring").first();
    expect(await ring.evaluate((e) => getComputedStyle(e).backgroundColor)).toBe("rgb(255, 215, 0)");
    expect(await page.locator("#core-values li .about-glow-spin").first().evaluate((e) => getComputedStyle(e).display)).toBe("none");
  });
});

test.describe("US2 navigation", () => {
  test.use({ viewport: { width: 1440, height: 800 } });

  test("desktop dropdown lists the sections in order and every link lands clear of the header", async ({ page }) => {
    test.setTimeout(120_000);
    await page.goto("/contact");
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await nav.getByRole("link", { name: "About", exact: true }).hover();
    expect(await aboutLinks(page)).toEqual([
      "Our Story",
      "Vision & Mission",
      "Core Values",
      "Our Management Team",
      "Messages",
    ]);
    for (const [label, id] of [
      ["Our Story", "our-story"],
      ["Vision & Mission", "vision-mission"],
      ["Core Values", "core-values"],
      ["Our Management Team", "management-team"],
      ["Messages", "messages"],
    ]) {
      await page.goto("/contact");
      // Retry: the first hover can land before the page is interactive.
      await expect(async () => {
        await nav.getByRole("link", { name: "About", exact: true }).hover();
        await nav.getByRole("link", { name: label, exact: true }).click({ timeout: 3000 });
        await expect(page).toHaveURL(`/about#${id}`, { timeout: 2000 });
      }).toPass({ timeout: 20_000 });
      await clearOfHeader(page, id);
    }
  });

  test("Careers is not in the About dropdown", async ({ page }) => {
    await page.goto("/contact");
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await nav.getByRole("link", { name: "About", exact: true }).hover();
    expect(await aboutLinks(page)).not.toContain("Careers");
  });

  test("direct load of /about#messages lands clear of the header", async ({ page }) => {
    await page.goto("/about#messages");
    await clearOfHeader(page, "messages");
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 700 } });
    test("tapping Core Values closes the menu and lands clear of the header", async ({ page }) => {
      await page.goto("/contact");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await menu.getByRole("button", { name: "About" }).click();
      await menu.getByRole("link", { name: "Core Values" }).click();
      await expect(menu).toBeHidden();
      await clearOfHeader(page, "core-values");
    });
  });
});

test.describe("US4 messages", () => {
  test("three full messages, no toggle, with JavaScript off too", async ({ page }) => {
    await page.goto("/about");
    const articles = page.locator("#messages article");
    await expect(articles).toHaveCount(3);
    await expect(articles.locator("h3")).toHaveText(["Khairullah Aziz", "Ijaz Afzal", "Faiza Zeeshan"]);
    await expect(page.locator("#messages").getByRole("button")).toHaveCount(0);
  });

  test.describe("no JavaScript", () => {
    test.use({ javaScriptEnabled: false });
    test("all three bodies are visible", async ({ page }) => {
      await page.goto("/about");
      for (const text of ["Every child has unique abilities", "Education is more than academic achievement", "A positive learning environment"]) {
        await expect(page.locator("#messages")).toContainText(text);
      }
    });
  });

  test("photo sides alternate at 1440 and the photo is above the text at 375", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/about");
    const lefts = await page.locator("#messages article").evaluateAll((els) =>
      els.map((a) => {
        const photo = a.querySelector('[data-testid="message-photo"]')!.getBoundingClientRect();
        const text = a.querySelector('[data-testid="message-text"]')!.getBoundingClientRect();
        return photo.left < text.left;
      }),
    );
    expect(lefts).toEqual([true, false, true]);
    await page.setViewportSize({ width: 375, height: 800 });
    const stacked = await page.locator("#messages article").evaluateAll((els) =>
      els.map((a) => {
        const photo = a.querySelector('[data-testid="message-photo"]')!.getBoundingClientRect();
        const text = a.querySelector('[data-testid="message-text"]')!.getBoundingClientRect();
        return photo.bottom <= text.top + 1;
      }),
    );
    expect(stacked).toEqual([true, true, true]);
  });
});

test.describe("US5 team", () => {
  test("development shows three labelled placeholders with one photo ratio", async ({ page }) => {
    await page.goto("/about");
    const cards = page.locator('#management-team [data-placeholder="true"]');
    await expect(cards).toHaveCount(3);
    for (let i = 0; i < 3; i++) await expect(cards.nth(i)).toContainText("Placeholder");
    const ratios = await cards.evaluateAll((els) =>
      els.map((e) => {
        const r = e.querySelector("div")!.getBoundingClientRect();
        return r.width / r.height;
      }),
    );
    for (const ratio of ratios) expect(Math.abs(ratio - 0.8)).toBeLessThan(0.008);
  });

  test.describe("production rule (test cookie)", () => {
    test.beforeEach(async ({ context }) => {
      await context.addCookies([PRODUCTION_COOKIE]);
    });

    test("the team section, menu entries, search result and placeholder text are gone", async ({ page }) => {
      await page.setViewportSize({ width: 1440, height: 800 });
      await page.goto("/about");
      await expect(page.locator("#management-team")).toHaveCount(0);
      const bgs = await page.locator("main section").evaluateAll((els) => els.map((e) => e.getAttribute("data-background")));
      expect(bgs).toEqual(["surface", "navy", "muted", "surface"]);
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "About", exact: true }).hover();
      expect(await aboutLinks(page)).toEqual(["Our Story", "Vision & Mission", "Core Values", "Messages"]);
      await page.getByRole("button", { name: "Search" }).first().click();
      await page.getByRole("combobox").fill("management");
      await expect(page.getByText("No pages found")).toBeVisible();
      const text = await page.locator("main").innerText();
      for (const gone of ["Placeholder", "Short description", "Designation"]) expect(text).not.toContain(gone);
    });

    test("/about#management-team loads without an error", async ({ page }) => {
      const res = await page.goto("/about#management-team");
      expect(res?.status()).toBe(200);
    });

    test("the mobile About group has 4 links", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 700 });
      await page.goto("/about");
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await menu.getByRole("button", { name: "About" }).click();
      await expect(menu.locator('a[href^="/about#"]')).toHaveCount(4);
    });
  });
});

test.describe("layout and accessibility", () => {
  for (const width of [375, 768, 1024, 1440]) {
    test(`no sideways scroll, sections in order, readable line length at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/about");
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
      const ids = await page.locator("main section").evaluateAll((els) => els.map((e) => e.id));
      expect(ids).toEqual(["our-story", "vision-mission", "core-values", "management-team", "messages"]);
      const ok = await page.evaluate(() => {
        const probe = document.createElement("span");
        probe.style.cssText = "position:absolute;visibility:hidden;width:75ch";
        document.body.appendChild(probe);
        const max = probe.getBoundingClientRect().width;
        probe.remove();
        return [...document.querySelectorAll("#our-story p, #messages p")].every((p) => p.getBoundingClientRect().width <= max + 1);
      });
      expect(ok).toBe(true);
    });
  }

  for (const production of [false, true]) {
    test(`axe scan (${production ? "production" : "development"} view)`, async ({ page, context }) => {
      if (production) await context.addCookies([PRODUCTION_COOKIE]);
      await page.goto("/about");
      const results = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      const bad = results.violations.filter((v) => v.impact === "serious" || v.impact === "critical");
      expect(bad.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("structure: labelled sections, hidden icons, alt text, unique ids", async ({ page }) => {
    await page.goto("/about");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    const problems = await page.evaluate(() => {
      const out: string[] = [];
      document.querySelectorAll("main section").forEach((s) => {
        const label = s.getAttribute("aria-labelledby");
        const h2 = label ? document.getElementById(label) : null;
        if (!h2 || h2.tagName !== "H2") out.push(`section ${s.id} not labelled by an h2`);
      });
      document.querySelectorAll("main svg").forEach((svg) => {
        if (svg.getAttribute("aria-hidden") !== "true") out.push("svg not aria-hidden");
      });
      document.querySelectorAll("main img").forEach((img) => {
        if (!img.hasAttribute("alt")) out.push("img without alt");
      });
      const ids = [...document.querySelectorAll("[id]")].map((e) => e.id);
      if (new Set(ids).size !== ids.length) out.push("duplicate ids");
      return out;
    });
    expect(problems).toEqual([]);
  });
});
