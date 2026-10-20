import { expect, type Locator, type Page } from "@playwright/test";

/**
 * Layout checks shared by the 014b specs (Constitution XI, spec FR-006).
 *
 * 640 px is the reference theme's own mobile-menu breakpoint
 * (research/design-tokens.md, "Container widths & breakpoints"); the others
 * are the project's four widths. At 375 and 640 px we expect the phone layout.
 */
export const LAYOUT_WIDTHS = [375, 640, 768, 1024, 1440] as const;
export type LayoutWidth = (typeof LAYOUT_WIDTHS)[number];

const HEIGHT = 900;

/** Resizes the viewport to a width in `LAYOUT_WIDTHS` (the height is fixed, so only the width varies). */
export async function setLayoutWidth(page: Page, width: LayoutWidth): Promise<void> {
  await page.setViewportSize({ width, height: HEIGHT });
}

/** The page must not scroll sideways: the document is no wider than the viewport. */
export async function expectNoHorizontalScroll(page: Page): Promise<void> {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth, `horizontal scroll: document is ${scrollWidth}px wide in a ${innerWidth}px viewport`).toBeLessThanOrEqual(innerWidth);
}

const BLOCK_SELECTOR = "h1, h2, h3, h4, h5, h6, p, li, td, th, dt, dd, a, button, select, input, textarea, label";

/**
 * No two visible text blocks or controls inside `section` may have intersecting
 * bounding boxes. An element is never compared with its own ancestors or
 * descendants (a link inside a paragraph is allowed to sit inside its box), and
 * boxes that only touch along an edge do not count.
 */
export async function expectNoOverlap(page: Page, section: Locator): Promise<void> {
  const overlaps = await section.evaluate((root, selector) => {
    const describe = (element: Element) => {
      const text = (element.textContent ?? "").trim().replace(/\s+/g, " ").slice(0, 40);
      return `${element.tagName.toLowerCase()}${element.id ? `#${element.id}` : ""} "${text}"`;
    };
    const visible = Array.from(root.querySelectorAll(selector)).filter((element) => {
      const style = getComputedStyle(element);
      const box = element.getBoundingClientRect();
      return style.visibility !== "hidden" && style.display !== "none" && box.width > 0 && box.height > 0 && style.opacity !== "0";
    });
    const found: string[] = [];
    for (let i = 0; i < visible.length; i++) {
      for (let j = i + 1; j < visible.length; j++) {
        const a = visible[i];
        const b = visible[j];
        if (a.contains(b) || b.contains(a)) continue;
        const ra = a.getBoundingClientRect();
        const rb = b.getBoundingClientRect();
        // A 1px tolerance: neighbouring boxes can differ by sub-pixel rounding.
        const overlapX = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
        const overlapY = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
        if (overlapX > 1 && overlapY > 1) found.push(`${describe(a)} overlaps ${describe(b)}`);
      }
    }
    return found;
  }, BLOCK_SELECTOR);
  expect(overlaps, `overlapping content:\n${overlaps.join("\n")}`).toEqual([]);
}
