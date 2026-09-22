/**
 * Focused token extraction for the news cards and banner (003 news,
 * research.md §12 — Constitution V gate before any news UI is built).
 * `research/extract-tokens.ts`'s page-level aggregates don't capture
 * per-element values (card title size, meta line, "Read More", card
 * border, banner height); this script targets those elements
 * specifically on https://das.edu.pk/news/.
 *
 * Usage: npx tsx research/extract-news-tokens.ts
 *
 * Launches via Playwright's `channel: 'chrome'` — see extract-tokens.ts
 * for why (no Playwright-managed Chromium download in this sandbox).
 */
import { chromium } from "playwright";
import * as fs from "node:fs";
import * as path from "node:path";

const OUT_DIR = path.join(__dirname, "tokens");
const URL = "https://das.edu.pk/news/";

// Read as raw text (never imported/required) so tsx's esbuild transform
// never touches it — see the comment at the top of that file for why.
const BROWSER_EXTRACT_SOURCE = fs.readFileSync(
  path.join(__dirname, "extract-news-tokens.browser.js"),
  "utf-8",
);

const VIEWPORTS = [
  { name: "375", width: 375, height: 900 },
  { name: "768", width: 768, height: 1000 },
  { name: "1024", width: 1024, height: 1000 },
  { name: "1440", width: 1440, height: 1000 },
];

interface NewsCardTokens {
  viewport: string;
  url: string;
  columns: number;
  gapBetweenColumnsPx: number | null;
  cardTitle: { fontSize: string; lineHeight: string; fontWeight: string; color: string } | null;
  cardMeta: { fontSize: string; lineHeight: string; color: string } | null;
  cardExcerpt: { fontSize: string; lineHeight: string; color: string } | null;
  cardReadMore: { fontSize: string; lineHeight: string; color: string; fontWeight: string } | null;
  cardWrapperPadding: string | null;
  cardBorder: { top: string; bottom: string; sides: string; radius: string; shadow: string } | null;
  cardImage: { renderedWidth: number; renderedHeight: number; aspectRatio: number } | null;
  banner: {
    heightPx: number;
    backgroundColor: string;
    titleFontSize: string;
    titleColor: string;
    breadcrumbFontSize: string;
    breadcrumbColor: string;
  } | null;
}

async function extractAt(browser: import("playwright").Browser, viewport: { name: string; width: number; height: number }): Promise<NewsCardTokens> {
  const page = await browser.newPage({ viewport: { width: viewport.width, height: viewport.height } });
  await page.goto(URL, { waitUntil: "load", timeout: 45000 });
  await page.waitForTimeout(2000); // let the isotope/masonry layout settle

  const data = (await page.evaluate(`(${BROWSER_EXTRACT_SOURCE})()`)) as {
    columns: number;
    gapX: number | null;
    titleStyle: Record<string, string> | null;
    metaStyle: Record<string, string> | null;
    excerptStyle: Record<string, string> | null;
    readMoreStyle: Record<string, string> | null;
    wrapperPadding: string | null;
    wrapperBorder: { top: string; bottom: string; sides: string; radius: string; shadow: string } | null;
    cardImage: { renderedWidth: number; renderedHeight: number } | null;
    bannerHeight: number | null;
    bannerBg: string | null;
    bannerTitleFontSize: string | null;
    bannerTitleColor: string | null;
    breadcrumbFontSize: string | null;
    breadcrumbColor: string | null;
  };

  await page.close();

  return {
    viewport: viewport.name,
    url: URL,
    columns: data.columns,
    gapBetweenColumnsPx: data.gapX,
    cardTitle: data.titleStyle as NewsCardTokens["cardTitle"],
    cardMeta: data.metaStyle as NewsCardTokens["cardMeta"],
    cardExcerpt: data.excerptStyle as NewsCardTokens["cardExcerpt"],
    cardReadMore: data.readMoreStyle as NewsCardTokens["cardReadMore"],
    cardWrapperPadding: data.wrapperPadding,
    cardBorder: data.wrapperBorder,
    cardImage:
      data.cardImage && data.cardImage.renderedWidth > 0
        ? {
            renderedWidth: data.cardImage.renderedWidth,
            renderedHeight: data.cardImage.renderedHeight,
            aspectRatio:
              Math.round((data.cardImage.renderedWidth / data.cardImage.renderedHeight) * 1000) / 1000,
          }
        : null,
    banner:
      data.bannerHeight !== null
        ? {
            heightPx: Math.round(data.bannerHeight),
            backgroundColor: data.bannerBg ?? "",
            titleFontSize: data.bannerTitleFontSize ?? "",
            titleColor: data.bannerTitleColor ?? "",
            breadcrumbFontSize: data.breadcrumbFontSize ?? "",
            breadcrumbColor: data.breadcrumbColor ?? "",
          }
        : null,
  };
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const browser = await chromium.launch({ channel: "chrome" });
  for (const viewport of VIEWPORTS) {
    const tokens = await extractAt(browser, viewport);
    const outFile = path.join(OUT_DIR, `news-cards-${viewport.name}.json`);
    fs.writeFileSync(outFile, JSON.stringify(tokens, null, 2) + "\n");
    console.log(`Wrote ${outFile}`);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
