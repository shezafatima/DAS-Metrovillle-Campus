/**
 * Focused token extraction for the signup band (004 signup,
 * research.md §11 — Constitution V gate before any public signup UI
 * is built). `research/extract-tokens.ts`'s page-level aggregates
 * don't target this specific band; this script captures the heading,
 * supporting line, inputs and button on https://das.edu.pk/ (the
 * signup section sits near the foot of the home page).
 *
 * Usage: npx tsx research/extract-signup-tokens.ts
 *
 * Launches via Playwright's `channel: 'chrome'` — see extract-tokens.ts
 * for why (no Playwright-managed Chromium download in this sandbox).
 */
import { chromium, type Page } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");
const URL = "https://das.edu.pk/";

// Read as raw text (never imported/required) so tsx's esbuild transform
// never touches it — see extract-news-tokens.ts's comment for why.
const BROWSER_EXTRACT_SOURCE = fs.readFileSync(
  path.join(__dirname, "extract-signup-tokens.browser.js"),
  "utf-8",
);

const VIEWPORTS = [
  { name: "375", width: 375, height: 1200 },
  { name: "768", width: 768, height: 1200 },
  { name: "1024", width: 1024, height: 1200 },
  { name: "1440", width: 1440, height: 1200 },
];

interface RawExtract {
  headingText: string | null;
  headingSpanTexts: string[];
  highlightText: string | null;
  highlightColor: string | null;
  headingStyle: Record<string, string> | null;
  supportingText: string | null;
  supportingStyle: Record<string, string> | null;
  noteText: string | null;
  bandBackground: string | null;
  bandPaddingTop: string | null;
  bandPaddingBottom: string | null;
  inputStyle: Record<string, string> | null;
  inputPlaceholderColor: string | null;
  gapBetweenInputs: number | null;
  buttonStyle: Record<string, string> | null;
  layout: "row" | "stacked";
}

interface SignupTokens extends RawExtract {
  viewport: string;
  url: string;
  buttonHover: { before: Record<string, string>; after: Record<string, string> } | null;
}

const GET_BUTTON_STYLE_FN = new Function(
  "el",
  `
  const s = getComputedStyle(el);
  return { backgroundColor: s.backgroundColor, color: s.color };
`,
);

async function extractButtonHover(page: Page) {
  const locator = page.locator('input[name="your-phone"]').first().locator("xpath=ancestor::form[1]").locator(
    '.wpcf7-form-control.wpcf7-submit, input.wpcf7-submit',
  );
  try {
    if (!(await locator.isVisible({ timeout: 1000 }).catch(() => false))) return null;
    const before = (await locator.evaluate(GET_BUTTON_STYLE_FN as unknown as (el: Element) => unknown)) as Record<
      string,
      string
    >;
    await locator.hover({ timeout: 2000 }).catch(() => {});
    await page.waitForTimeout(250);
    const after = (await locator.evaluate(GET_BUTTON_STYLE_FN as unknown as (el: Element) => unknown)) as Record<
      string,
      string
    >;
    return { before, after };
  } catch {
    return null;
  }
}

async function extractAt(
  browser: import("playwright").Browser,
  viewport: { name: string; width: number; height: number },
): Promise<SignupTokens> {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(URL, { waitUntil: "load", timeout: 45000 });

  // Scroll the signup form into view before reading layout (row vs
  // stacked depends on actual rendered positions, and lazy-loaded
  // content above it can shift layout until scrolled past).
  const nameInput = page.locator('input[name="your-name"]').first();
  await nameInput.scrollIntoViewIfNeeded({ timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(500);

  const data = (await page.evaluate(`(${BROWSER_EXTRACT_SOURCE})()`)) as RawExtract;
  const buttonHover = await extractButtonHover(page);

  await page.close();

  return { viewport: viewport.name, url: URL, ...data, buttonHover };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  for (const viewport of VIEWPORTS) {
    const tokens = await extractAt(browser, viewport);
    const outFile = path.join(OUT_DIR, `signup-${viewport.name}.json`);
    fs.writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
    console.log(`Wrote ${outFile}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
