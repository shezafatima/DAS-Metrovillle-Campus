/**
 * Focused token extraction for the home page sections (006 Home, research
 * R1 — Constitution VII gate before any home UI is built). The page-level
 * aggregates in research/tokens/home-*.json don't break values down per
 * section; this script walks every full-width row of https://das.edu.pk/ and
 * records each section's background, spacing, type, images, buttons, cards,
 * counters and carousels at the four viewports.
 *
 * Usage: npx tsx research/extract-home-tokens.ts
 *
 * Launches via Playwright's `channel: 'chrome'` — see extract-tokens.ts for
 * why (no Playwright-managed Chromium download in this sandbox).
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");
const URL = "https://das.edu.pk/";

// Read as raw text (never imported) so tsx's esbuild transform never touches it.
const BROWSER_EXTRACT_SOURCE = fs.readFileSync(path.join(__dirname, "extract-home-tokens.browser.js"), "utf-8");

const VIEWPORTS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1024", width: 1024, height: 900 },
  { name: "1440", width: 1440, height: 900 },
];

async function extractAt(browser: import("playwright").Browser, viewport: { name: string; width: number; height: number }) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(URL, { waitUntil: "load", timeout: 90000 });
  await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});

  // Scroll slowly to the bottom and back so lazy images, sliders and counters render (TASK.md "Page loading").
  await page.evaluate(`(async () => {
    const step = Math.max(200, Math.floor(window.innerHeight * 0.8));
    for (let y = 0; y < document.body.scrollHeight; y += step) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); }
    await new Promise(r => setTimeout(r, 1500));
    window.scrollTo(0, 0);
    await new Promise(r => setTimeout(r, 500));
  })()`);

  const data = await page.evaluate(`(${BROWSER_EXTRACT_SOURCE})()`);
  await page.close();
  return { viewport: viewport.name, url: URL, extractedAt: new Date().toISOString(), ...(data as object) };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const viewport of VIEWPORTS) {
      const tokens = await extractAt(browser, viewport);
      const outFile = path.join(OUT_DIR, `home-sections-${viewport.name}.json`);
      fs.writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
      console.log(`Wrote ${outFile}`);
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
