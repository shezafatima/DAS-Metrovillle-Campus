/**
 * Supplementary pass: transition/animation timing values (TASK.md "Interaction
 * states" requirement) at a single representative viewport (1440 — these are
 * CSS declarations, not layout, so they don't vary by viewport on this site).
 * Kept separate from extract-tokens.ts so the main 44-file run didn't need to
 * be redone. Usage: npx tsx research/extract-transitions.ts
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");
const SOURCE = fs.readFileSync(path.join(__dirname, "extract-transitions.browser.js"), "utf-8");

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

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome", headless: true });
  try {
    for (const p of PAGES) {
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await context.newPage();
      process.stdout.write(`Transitions for ${p.name} ... `);
      try {
        await page.goto(p.url, { waitUntil: "load", timeout: 45000 });
        await page.waitForLoadState("networkidle", { timeout: 15000 }).catch(() => {});
        await page.waitForTimeout(800);
        const data = await page.evaluate(`(${SOURCE})()`);
        fs.writeFileSync(path.join(OUT_DIR, `_transitions-${p.name}.json`), JSON.stringify({ page: p.name, url: p.url, data }, null, 2));
        console.log("done");
      } catch (e) {
        console.log("FAILED:", e instanceof Error ? e.message : String(e));
      } finally {
        await context.close();
      }
    }
  } finally {
    await browser.close();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
