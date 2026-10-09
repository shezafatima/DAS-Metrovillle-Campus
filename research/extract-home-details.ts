/**
 * Second, targeted extraction pass for the 006 home page: hero slider,
 * flip-box backs, counter labels and icons, the Why Choose video, and the
 * image sources of the quick links, books and partners. Complements
 * research/extract-home-tokens.ts.
 *
 * Usage: npx tsx research/extract-home-details.ts
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");
const SOURCE = fs.readFileSync(path.join(__dirname, "extract-home-details.browser.js"), "utf-8");

async function main() {
  const browser = await chromium.launch({ channel: "chrome" });
  try {
    for (const width of [375, 1440]) {
      const page = await browser.newPage({ viewport: { width, height: 900 } });
      await page.goto("https://das.edu.pk/", { waitUntil: "load", timeout: 90000 });
      await page.waitForLoadState("networkidle", { timeout: 30000 }).catch(() => {});
      await page.evaluate(`(async () => { for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 250)); } await new Promise(r => setTimeout(r, 1500)); window.scrollTo(0, 0); await new Promise(r => setTimeout(r, 500)); })()`);
      const data = await page.evaluate(`(${SOURCE})()`);
      const out = path.join(OUT_DIR, `home-details-${width}.json`);
      fs.writeFileSync(out, JSON.stringify({ width, extractedAt: new Date().toISOString(), ...(data as object) }, null, 2) + "\n");
      console.log(`Wrote ${out}`);
      await page.close();
    }
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
