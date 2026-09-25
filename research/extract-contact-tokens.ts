/**
 * Per-element token extraction for the Contact page (008-contact-messages,
 * Constitution V gate before any public contact UI is built). Captures
 * the banner, the four detail columns, the map heading/area and the
 * form band on https://das.edu.pk/contact/ at 375/768/1024/1440, and
 * downloads the banner + four column icon images into
 * public/images/contact/.
 *
 * Usage: npx tsx research/extract-contact-tokens.ts
 *
 * Launches via Playwright's `channel: 'chrome'` — see extract-tokens.ts
 * for why (no Playwright-managed Chromium download in this sandbox).
 */
import { chromium, type Page } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";
import * as https from "node:https";

const OUT_DIR = path.join(__dirname, "tokens");
const IMAGES_DIR = path.join(__dirname, "..", "public", "images", "contact");
const PAGE_URL = "https://das.edu.pk/contact/";

const BROWSER_EXTRACT_SOURCE = fs.readFileSync(path.join(__dirname, "extract-contact-tokens.browser.js"), "utf-8");

const VIEWPORTS = [
  { name: "375", width: 375, height: 1400 },
  { name: "768", width: 768, height: 1400 },
  { name: "1024", width: 1024, height: 1400 },
  { name: "1440", width: 1440, height: 1400 },
];

const GET_BUTTON_STYLE_SOURCE = `
function getBtnStyle(el) {
  var s = getComputedStyle(el);
  return { backgroundColor: s.backgroundColor, color: s.color };
}
`;

async function extractButtonHover(page: Page) {
  const locator = page.locator("input.wpcf7-submit, .wpcf7-form-control.wpcf7-submit").first();
  try {
    await locator.scrollIntoViewIfNeeded({ timeout: 5000 });
    if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false))) return null;
    const evalFn = new Function("el", `${GET_BUTTON_STYLE_SOURCE}\nreturn getBtnStyle(el);`) as (
      el: Element,
    ) => unknown;
    const before = (await locator.evaluate(evalFn as unknown as (el: Element) => unknown)) as Record<
      string,
      string
    >;
    await locator.hover({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    const after = (await locator.evaluate(evalFn as unknown as (el: Element) => unknown)) as Record<
      string,
      string
    >;
    return { before, after };
  } catch {
    return null;
  }
}

async function extractAt(browser: import("playwright").Browser, viewport: { name: string; width: number; height: number }) {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(PAGE_URL, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(800);

  const data = await page.evaluate(`(${BROWSER_EXTRACT_SOURCE})()`);
  const buttonHover = await extractButtonHover(page);

  await page.close();
  return { viewport: viewport.name, url: PAGE_URL, ...(data as object), buttonHover };
}

function downloadFile(url: string, destWithoutExt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          downloadFile(res.headers.location, destWithoutExt).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          reject(new Error(`GET ${url} -> ${res.statusCode}`));
          return;
        }
        const ext = path.extname(new URL(url).pathname) || ".jpg";
        const dest = `${destWithoutExt}${ext}`;
        const file = fs.createWriteStream(dest);
        res.pipe(file);
        file.on("finish", () => file.close(() => resolve(dest)));
      })
      .on("error", reject);
  });
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(IMAGES_DIR, { recursive: true });

  const browser = await chromium.launch({ channel: "chrome" });
  const results: Array<Awaited<ReturnType<typeof extractAt>>> = [];
  for (const viewport of VIEWPORTS) {
    const tokens = await extractAt(browser, viewport);
    const outFile = path.join(OUT_DIR, `contact-page-${viewport.name}.json`);
    fs.writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
    console.log(`Wrote ${outFile}`);
    results.push(tokens);
  }
  await browser.close();

  const last = results[results.length - 1] as unknown as {
    banner?: { bannerImageUrl?: string | null };
    columns?: Array<{ imgSrc?: string | null }>;
  };
  const bannerUrl: string | null = last.banner?.bannerImageUrl ?? null;
  const columnUrls: Array<{ name: string; src: string | null }> = [
    { name: "by-phone", src: last.columns?.[0]?.imgSrc ?? null },
    { name: "by-email", src: last.columns?.[1]?.imgSrc ?? null },
    { name: "visit-us", src: last.columns?.[2]?.imgSrc ?? null },
    { name: "write-us", src: last.columns?.[3]?.imgSrc ?? null },
  ];

  if (bannerUrl) {
    const dest = await downloadFile(bannerUrl, path.join(IMAGES_DIR, "banner"));
    console.log(`Downloaded banner -> ${dest}`);
  } else {
    console.warn("No banner image URL found");
  }

  for (const { name, src } of columnUrls) {
    if (!src) {
      console.warn(`No image URL found for ${name}`);
      continue;
    }
    const dest = await downloadFile(src, path.join(IMAGES_DIR, name));
    console.log(`Downloaded ${name} -> ${dest}`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
