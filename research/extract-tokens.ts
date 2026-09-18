/**
 * Design token extraction script for das.edu.pk (research/TASK.md).
 *
 * Usage: npx tsx research/extract-tokens.ts [pageName ...]
 * With no arguments, runs all pages x all viewports.
 *
 * Launches via Playwright's `channel: 'chrome'`, which drives the system-
 * installed Google Chrome instead of downloading a Playwright-managed
 * Chromium build (this environment has no network access to
 * cdn.playwright.dev, but das.edu.pk itself is reachable).
 */
import { chromium, type Page, type Browser } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");

const PAGES: { name: string; url: string }[] = [
  { name: "home", url: "https://das.edu.pk/" },
  { name: "about", url: "https://das.edu.pk/about/overview/" },
  { name: "salient-features", url: "https://das.edu.pk/about/salent-features/" },
  { name: "management", url: "https://das.edu.pk/about/management/" },
  { name: "campuses", url: "https://das.edu.pk/campuses-list/" },
  { name: "academics", url: "https://das.edu.pk/academics/academics-overview/" },
  { name: "admission", url: "https://das.edu.pk/admission/" },
  { name: "photo-gallery", url: "https://das.edu.pk/resources/photo-gallery/" },
  { name: "our-books", url: "https://das.edu.pk/resources/our-books/" },
  { name: "news", url: "https://das.edu.pk/news/" },
  { name: "contact", url: "https://das.edu.pk/contact/" },
];

const VIEWPORTS: { name: string; width: number; height: number }[] = [
  { name: "1440", width: 1440, height: 900 },
  { name: "1024", width: 1024, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "375", width: 375, height: 800 },
];

// Third-party widget containers to exclude from color/font/spacing scans.
const THIRD_PARTY_SELECTORS = [
  '[id*="tawk" i]',
  '[class*="tawk" i]',
  '[class*="crisp" i]',
  '[id*="crisp" i]',
  '[class*="zopim" i]',
  '[class*="elfsight" i]',
  '[class*="gmap" i]',
  '[id*="gmap" i]',
  'iframe',
  '[class*="grecaptcha" i]',
  '.grecaptcha-badge',
];

// Read as raw text (never imported/required) so tsx's esbuild transform never
// touches it — see the comment at the top of that file for why.
const BROWSER_EXTRACT_SOURCE = fs.readFileSync(path.join(__dirname, "extract-tokens.browser.js"), "utf-8");

async function closeOverlays(page: Page) {
  const closeSelectors = [
    '.cli-modal button.cli_setting_btn',
    '[class*="cookie" i] button[class*="accept" i]',
    '[class*="cookie" i] button[class*="close" i]',
    '[class*="gdpr" i] button',
    '[aria-label="Close" i]',
    '.modal.show .close',
    '[class*="popup" i] [class*="close" i]',
  ];
  for (const sel of closeSelectors) {
    try {
      const el = page.locator(sel).first();
      if (await el.isVisible({ timeout: 500 }).catch(() => false)) {
        await el.click({ timeout: 1000 }).catch(() => {});
      }
    } catch {
      /* selector not present — expected on most pages */
    }
  }
  await page.keyboard.press("Escape").catch(() => {});
}

// NOTE on `new Function(...)` usage throughout this file: tsx's esbuild
// transform injects `__name(fn, "fn")` helper calls into compiled output.
// Playwright's page.evaluate()/locator.evaluate() serialize a passed-in
// function via `.toString()` and re-run the source in the browser, where
// that helper doesn't exist ("ReferenceError: __name is not defined").
// `new Function(...)` builds a function from a plain string at runtime,
// bypassing the compile step entirely, so it serializes cleanly.

const SLOW_SCROLL_FN = new Function(`
  return (async () => {
    const step = 350;
    const max = document.body.scrollHeight;
    for (let y = 0; y < max; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 70));
    }
    window.scrollTo(0, 0);
  })();
`);

async function slowScroll(page: Page) {
  await page.evaluate(SLOW_SCROLL_FN as unknown as () => Promise<void>);
  await page.waitForTimeout(500);
}

const GET_INTERACTIVE_STYLE_FN = new Function(
  "el",
  `
  const s = getComputedStyle(el);
  return { color: s.color, backgroundColor: s.backgroundColor, transform: s.transform, boxShadow: s.boxShadow };
`
);

async function extractHoverStates(page: Page) {
  const targets: { key: string; selector: string }[] = [
    { key: "mainMenuItem", selector: ".fusion-main-menu > ul > li > a" },
    { key: "button", selector: ".fusion-button" },
    { key: "footerLink", selector: ".fusion-footer-widget-area a, footer a" },
    { key: "card", selector: ".fusion-content-boxes .fusion-content-box, .flip-box-front-inner" },
  ];
  const results: Record<string, unknown> = {};
  for (const { key, selector } of targets) {
    try {
      const locator = page.locator(selector).first();
      if (!(await locator.isVisible({ timeout: 500 }).catch(() => false))) {
        results[key] = { found: false };
        continue;
      }
      const before = await locator.evaluate(GET_INTERACTIVE_STYLE_FN as unknown as (el: Element) => unknown);
      await locator.hover({ timeout: 2000 }).catch(() => {});
      await page.waitForTimeout(250);
      const after = await locator.evaluate(GET_INTERACTIVE_STYLE_FN as unknown as (el: Element) => unknown);
      results[key] = { found: true, before, after };
    } catch (e) {
      results[key] = { found: false, error: String(e) };
    }
  }
  return results;
}

type PageResult =
  | { ok: true; page: string; viewport: string; url: string; data: unknown }
  | { ok: false; page: string; viewport: string; url: string; error: string };

async function extractOne(browser: Browser, pageDef: { name: string; url: string }, vp: { name: string; width: number; height: number }): Promise<PageResult> {
  const context = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await context.newPage();
  try {
    const response = await page.goto(pageDef.url, { waitUntil: "load", timeout: 45000 });
    if (!response || !response.ok()) {
      throw new Error(`HTTP ${response?.status() ?? "no response"} loading ${pageDef.url}`);
    }
    // Best-effort: some pages never fully settle (chat widgets/analytics beacons
    // poll continuously), so a page that loaded but never reaches network-idle
    // is not treated as a failure — it already rendered.
    await page.waitForLoadState("networkidle", { timeout: 20000 }).catch(() => {});
    await closeOverlays(page);
    await slowScroll(page);
    await closeOverlays(page);

    const domData = await page.evaluate(`(${BROWSER_EXTRACT_SOURCE})(${JSON.stringify(THIRD_PARTY_SELECTORS)})`);
    const hover = await extractHoverStates(page);

    return {
      ok: true,
      page: pageDef.name,
      viewport: vp.name,
      url: pageDef.url,
      data: { ...domData, hover },
    };
  } catch (e) {
    return { ok: false, page: pageDef.name, viewport: vp.name, url: pageDef.url, error: e instanceof Error ? e.message : String(e) };
  } finally {
    await context.close();
  }
}

async function main() {
  const requestedNames = process.argv.slice(2);
  const pagesToRun = requestedNames.length ? PAGES.filter((p) => requestedNames.includes(p.name)) : PAGES;
  if (!pagesToRun.length) {
    console.error("No matching pages for:", requestedNames);
    process.exit(1);
  }

  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome", headless: true });
  const failures: PageResult[] = [];

  try {
    for (const pageDef of pagesToRun) {
      for (const vp of VIEWPORTS) {
        const label = `${pageDef.name}-${vp.name}`;
        process.stdout.write(`Extracting ${label} ... `);
        const result = await extractOne(browser, pageDef, vp);
        if (!result.ok) {
          console.log(`FAILED: ${result.error}`);
          failures.push(result);
          // Per TASK.md rules: stop and report if a page can't be reached / doesn't render.
          console.error(`\nSTOPPING: page "${pageDef.name}" (${pageDef.url}) failed at viewport ${vp.name}px: ${result.error}`);
          await browser.close();
          process.exitCode = 1;
          return;
        }
        fs.writeFileSync(path.join(OUT_DIR, `${label}.json`), JSON.stringify(result, null, 2));
        console.log("done");
      }
    }
  } finally {
    await browser.close();
  }

  console.log(`\nExtraction complete. ${pagesToRun.length * VIEWPORTS.length} files written to ${OUT_DIR}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
