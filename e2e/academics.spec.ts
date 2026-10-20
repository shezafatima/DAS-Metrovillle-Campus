import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { readFileSync } from "node:fs";
import path from "node:path";

// 018 Academics: three anchored sections. The server is `next dev`, so the
// photo placeholders show by default; the cookies below change that.

const source = (name: string) =>
  readFileSync(path.join(process.cwd(), "docs/content-source/academics", `${name}.txt`), "utf8").split("\n");
const overviewText = source("academic-overview");
const ARABIC_SCRIPT = /[؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿]/;

const WIDTHS = [375, 768, 1024, 1440];
const PRODUCTION_COOKIE = { name: "e2e-production-content", value: "1", domain: "localhost", path: "/" };
const media = (value: "one" | "two" | "three") => ({ name: "e2e-academics-media", value, domain: "localhost", path: "/" });

const IDS = ["academic-overview", "teachers-training", "hifz-e-quran"];

const headerHeight = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
const top = (page: Page, id: string) => page.locator(`section#${id}`).evaluate((el) => el.getBoundingClientRect().top);
const clearOfHeader = async (page: Page, id: string) => {
  const header = await headerHeight(page);
  await expect.poll(async () => (await top(page, id)) >= header - 1).toBe(true);
};

test.describe("US1 content", () => {
  test("has one h1 and the three sections in order, each with one h2", async ({ page }) => {
    await page.goto("/academics");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Academics");
    const ids = await page.locator("main section").evaluateAll((els) => els.map((e) => e.id));
    expect(ids).toEqual(IDS);
    for (const id of ids) {
      const section = page.locator(`section#${id}`);
      const h2 = section.getByRole("heading", { level: 2 });
      await expect(h2).toHaveCount(1);
      const labelledby = await section.getAttribute("aria-labelledby");
      expect(await h2.getAttribute("id")).toBe(labelledby);
    }
  });

  test("backgrounds alternate", async ({ page }) => {
    await page.goto("/academics");
    const bgs = await page.locator("main section").evaluateAll((els) => els.map((e) => e.getAttribute("data-background")));
    expect(bgs).toEqual(["surface", "muted", "surface"]);
  });

  test("shows the client's text and nothing that was left out", async ({ page }) => {
    await page.goto("/academics");
    await expect(page.locator("#academic-overview")).toContainText(overviewText[3].split(",")[0]);
    const items = page.locator("#teachers-training ul > li");
    await expect(items).toHaveCount(8);
    await expect(items.first()).toHaveText("School leadership");
    await expect(items.last()).toHaveText("Curriculum planning guides");
    await expect(page.locator("#hifz-e-quran").getByRole("heading", { level: 2 })).toHaveText("HIFZ-UL-QURAN PROGRAM");
    await expect(page.locator("#hifz-e-quran")).toContainText("15-day observation period");
    const main = await page.locator("main").innerText();
    expect(ARABIC_SCRIPT.test(main)).toBe(false);
    for (const gone of ["Curiosity with Purpose", "Syllabi", "Examination"]) expect(main).not.toContain(gone);
  });

  for (const [width, sideBySide] of [
    [1440, true],
    [768, true],
    [375, false],
  ] as const) {
    test(`the overview text and figure ${sideBySide ? "sit side by side" : "stack"} at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/academics");
      const text = (await page.locator("#academic-overview p").last().boundingBox())!;
      const figure = (await page.locator("#academic-overview figure").boundingBox())!;
      if (sideBySide) expect(figure.x).toBeGreaterThan(text.x + text.width - 1);
      else expect(figure.y).toBeGreaterThanOrEqual(text.y + text.height - 1);
    });
  }
});

test.describe("US2 navigation", () => {
  test.describe("desktop", () => {
    test.use({ viewport: { width: 1440, height: 900 } });

    test("the dropdown lists the three sections and each lands clear of the header", async ({ page }) => {
      await page.goto("/contact");
      const nav = page.getByRole("navigation", { name: "Main menu" });
      const links = nav.locator('a[href^="/academics#"]');
      await nav.getByRole("link", { name: "Academics", exact: true }).hover();
      expect((await links.allTextContents()).map((t) => t.trim())).toEqual(["Academic Overview", "Teachers' Training", "Hifz-e-Quran"]);
      for (const [label, id] of [
        ["Academic Overview", "academic-overview"],
        ["Teachers' Training", "teachers-training"],
        ["Hifz-e-Quran", "hifz-e-quran"],
      ]) {
        await nav.getByRole("link", { name: "Academics", exact: true }).hover();
        await nav.getByRole("link", { name: label, exact: true }).click();
        await expect(page).toHaveURL(`/academics#${id}`);
        await clearOfHeader(page, id);
      }
    });
  });

  test.describe("mobile", () => {
    test.use({ viewport: { width: 375, height: 800 } });

    test("the Academics group lists the same links and Hifz-e-Quran closes the menu and lands clear", async ({ page }) => {
      await page.goto("/contact");
      await page.getByRole("button", { name: /menu/i }).first().click();
      const dialog = page.getByRole("dialog");
      await dialog.getByRole("button", { name: "Academics" }).click();
      const links = dialog.locator('a[href^="/academics#"]');
      expect((await links.allTextContents()).map((t) => t.trim())).toEqual(["Academic Overview", "Teachers' Training", "Hifz-e-Quran"]);
      await links.last().click();
      await expect(page).toHaveURL("/academics#hifz-e-quran");
      await expect(dialog).toBeHidden();
      await clearOfHeader(page, "hifz-e-quran");
    });
  });

  for (const width of WIDTHS) {
    test(`loading each anchor directly lands clear of the header at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      for (const id of IDS) {
        await page.goto(`/academics#${id}`);
        await clearOfHeader(page, id);
      }
    });
  }
});

const STUB_PROVIDERS = /youtube-nocookie\.com|instagram\.com/;
const stubProviders = (page: Page) =>
  page.route(STUB_PROVIDERS, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<html></html>" }));

test.describe("US4 videos", () => {
  test("shows a play button for each video and no player before the click", async ({ page }) => {
    await page.goto("/academics");
    for (const id of ["training-video", "hifz-video"]) {
      await expect(page.getByTestId(id).getByRole("button", { name: /^Play video:/ })).toBeVisible();
    }
    await expect(page.locator("main iframe")).toHaveCount(0);
  });

  test("contacts no YouTube or Instagram host before a click, then loads the right player", async ({ page, context }) => {
    await context.addCookies([media("two")]);
    const hosts: string[] = [];
    page.on("request", (r) => hosts.push(new URL(r.url()).hostname));
    await stubProviders(page);
    await page.goto("/academics");
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForLoadState("networkidle");
    expect(hosts.filter((h) => /youtube|youtube-nocookie|ytimg|instagram|cdninstagram|fbcdn/.test(h))).toEqual([]);

    await page.getByTestId("training-video").getByRole("button").click();
    await expect(page.locator("#teachers-training iframe")).toHaveAttribute("src", /^https:\/\/www\.youtube-nocookie\.com\/embed\//);
    await page.getByTestId("hifz-video").getByRole("button").focus();
    await page.keyboard.press("Enter");
    await expect(page.locator("#hifz-e-quran iframe")).toHaveAttribute("src", /^https:\/\/www\.instagram\.com\/[a-z]+\/[^/]+\/embed\/$/);
  });

  for (const width of WIDTHS) {
    test(`each video frame stays 16:9 at ${width}px, before and after the click`, async ({ page, context }) => {
      await context.addCookies([media("two")]);
      await stubProviders(page);
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/academics");
      const ratio = async (id: string) => {
        const box = (await page.getByTestId(id).locator(".aspect-video").boundingBox())!;
        return box.width / box.height;
      };
      for (const id of ["training-video", "hifz-video"]) {
        expect(Math.abs((await ratio(id)) / (16 / 9) - 1)).toBeLessThan(0.01);
        await page.getByTestId(id).getByRole("button").click();
        expect(Math.abs((await ratio(id)) / (16 / 9) - 1)).toBeLessThan(0.01);
      }
    });
  }
});

test.describe("US5 photos", () => {
  // The owner supplied three real photos (2026-10-12), so no placeholder shows in any mode.
  // The placeholder rules (0, 1 photo; development vs production) are covered by view.test.ts,
  // training-photos.test.tsx and the one-photo fixture test below.
  for (const production of [false, true]) {
    test(`the real training photos show as a collage in ${production ? "production" : "development"}`, async ({ page, context }) => {
      if (production) await context.addCookies([PRODUCTION_COOKIE]);
      await page.goto("/academics");
      const photos = page.getByTestId("training-photos");
      await expect(photos).toHaveAttribute("data-layout", "collage");
      await expect(photos.locator("img")).toHaveCount(3);
      await expect(page.locator("[data-placeholder]")).toHaveCount(0);
      expect(await page.locator("main").innerText()).not.toContain("Placeholder");
      for (const img of await photos.locator("img").all()) {
        expect(await img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      }
    });
  }

  for (const mode of ["two", "three"] as const) {
    for (const production of [false, true]) {
      for (const width of WIDTHS) {
        test(`${mode} sample photos (${production ? "production" : "development"}) lay out cleanly at ${width}px`, async ({ page, context }) => {
          await context.addCookies(production ? [media(mode), PRODUCTION_COOKIE] : [media(mode)]);
          await page.setViewportSize({ width, height: 900 });
          await page.goto("/academics");
          const photos = page.getByTestId("training-photos");
          await expect(photos.locator("img")).toHaveCount(mode === "two" ? 2 : 3);
          await expect(photos.locator("[data-placeholder]")).toHaveCount(0);
          type Box = { x: number; y: number; w: number; h: number };
          const boxes: Box[] = await photos.locator("figure > div").evaluateAll((els) =>
            els.map((e) => {
              const r = e.getBoundingClientRect();
              return { x: r.x, y: r.y, w: r.width, h: r.height };
            }),
          );
          for (const b of boxes) expect(Math.abs(b.w / b.h / (4 / 3) - 1)).toBeLessThan(0.01);
          const text = (await page.locator("#teachers-training ul").boundingBox())!;
          const video = (await page.getByTestId("training-video").boundingBox())!;
          const overlaps = (a: Box, b: { x: number; y: number; width: number; height: number }) =>
            a.x < b.x + b.width && b.x < a.x + a.w && a.y < b.y + b.height && b.y < a.y + a.h;
          for (const b of boxes) {
            expect(overlaps(b, text)).toBe(false);
            expect(overlaps(b, video)).toBe(false);
            // The photos sit in a row below the text and the video.
            expect(b.y).toBeGreaterThanOrEqual(Math.max(text.y + text.height, video.y + video.height) - 1);
          }
          if (width < 768) {
            for (let i = 1; i < boxes.length; i++) expect(boxes[i].y).toBeGreaterThanOrEqual(boxes[i - 1].y + boxes[i - 1].h - 1);
          } else {
            // Side by side, on one line, all the same size.
            for (let i = 1; i < boxes.length; i++) {
              expect(Math.abs(boxes[i].y - boxes[0].y)).toBeLessThanOrEqual(1);
              expect(boxes[i].x).toBeGreaterThan(boxes[i - 1].x + boxes[i - 1].w - 1);
              expect(Math.abs(boxes[i].w - boxes[0].w)).toBeLessThanOrEqual(1);
            }
          }
        });
      }
    }
  }

  test("one sample photo: single in production, collage with placeholders in development", async ({ page, context }) => {
    await context.addCookies([media("one"), PRODUCTION_COOKIE]);
    await page.goto("/academics");
    await expect(page.getByTestId("training-photos")).toHaveAttribute("data-layout", "single");
    await expect(page.getByTestId("training-photos").locator("img")).toHaveCount(1);
    await context.clearCookies();
    await context.addCookies([media("one")]);
    await page.goto("/academics");
    const photos = page.getByTestId("training-photos");
    await expect(photos).toHaveAttribute("data-layout", "collage");
    await expect(photos.locator("img")).toHaveCount(1);
    await expect(photos.locator('[data-placeholder="true"]')).toHaveCount(2);
  });
});

test.describe("layout and accessibility", () => {
  for (const width of WIDTHS) {
    test(`no horizontal scroll and readable line length at ${width}px`, async ({ page, context }) => {
      for (const cookies of [[], [media("three")]]) {
        await context.clearCookies();
        await context.addCookies(cookies);
        await page.setViewportSize({ width, height: 900 });
        await page.goto("/academics");
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
        const chars = await page.locator("main section .max-w-prose p").evaluateAll((els) =>
          els.map((el) => {
            const probe = document.createElement("span");
            probe.style.cssText = "position:absolute;visibility:hidden;width:1ch;font:inherit";
            el.appendChild(probe);
            const ch = probe.getBoundingClientRect().width;
            probe.remove();
            return el.getBoundingClientRect().width / ch;
          }),
        );
        for (const n of chars) expect(n).toBeLessThanOrEqual(75);
      }
    });
  }

  for (const [name, cookies] of [
    ["development", []],
    ["production", [PRODUCTION_COOKIE]],
    ["media fixtures", [media("three")]],
  ] as const) {
    test(`axe finds no violations (${name})`, async ({ page, context }) => {
      await context.addCookies([...cookies]);
      await page.goto("/academics");
      const run = () => new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
      const found = (await run()).violations;
      expect(found.map((v) => `${v.id}: ${v.nodes.map((n) => n.target).join(", ")}`)).toEqual([]);
      if (name === "media fixtures") {
        await stubProviders(page);
        await page.getByTestId("training-video").getByRole("button").click();
        expect((await run()).violations.map((v) => v.id)).toEqual([]);
      }
    });
  }

  test("structure: one h1, labelled sections, decorative svgs hidden, alt on images, unique ids, no Urdu", async ({ page }) => {
    await page.goto("/academics");
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    for (const id of IDS) {
      const labelledby = await page.locator(`section#${id}`).getAttribute("aria-labelledby");
      await expect(page.locator(`section#${id} h2#${labelledby}`)).toHaveCount(1);
    }
    expect(await page.locator("main svg:not([aria-hidden='true'])").count()).toBe(0);
    expect(await page.locator("main img:not([alt])").count()).toBe(0);
    const ids = await page.locator("[id]").evaluateAll((els) => els.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
    await expect(page.locator('[lang="ur"]')).toHaveCount(0);
  });
});
