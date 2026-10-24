import { appendFileSync, mkdirSync } from "node:fs";
import sharp from "sharp";
import type { Locator, Page } from "@playwright/test";

/** Screenshots and measurements from the form UI specs (026) go here (test-results is not committed). */
export const SHOT_DIR = process.env.FORM_UI_DIR ?? "test-results/form-ui";

export const FORM_UI_WIDTHS = [375, 640, 768, 1024, 1440];

export function record(key: string, value: unknown): void {
  mkdirSync(SHOT_DIR, { recursive: true });
  appendFileSync(`${SHOT_DIR}/measurements.jsonl`, `${JSON.stringify({ key, value })}\n`);
}

export function shot(name: string): string {
  mkdirSync(SHOT_DIR, { recursive: true });
  return `${SHOT_DIR}/${name}.png`;
}

/** The three numbers of an "rgb(r, g, b)" or "rgba(r, g, b, a)" string. */
export function channels(rgb: string): [number, number, number] {
  // A transparent or non-sRGB value (a colour read mid-transition, say) would be parsed as nonsense and pass by accident.
  const opaque = /^rgb\(/.test(rgb) || /^rgba\([^)]*,\s*1\)$/.test(rgb);
  if (!opaque) throw new Error("not an opaque rgb colour: " + rgb);
  const [r, g, b] = (rgb.match(/[\d.]+/g) ?? ["0", "0", "0"]).slice(0, 3).map(Number);
  return [r, g, b];
}

/** WCAG contrast ratio of two "rgb(...)" strings (opaque). */
export function contrast(a: string, b: string): number {
  const luminance = (rgb: string) => {
    const [r, g, bl] = channels(rgb).map((v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * r + 0.7152 * g + 0.0722 * bl;
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** The colour actually painted near the right edge of an element, read from a screenshot (so tints and blends are real). */
export async function paintedBackground(element: Locator): Promise<string> {
  const png = await element.screenshot();
  const meta = await sharp(png).metadata();
  const { data } = await sharp(png)
    .extract({ left: Math.max(0, (meta.width ?? 20) - 12), top: Math.floor((meta.height ?? 20) / 2), width: 4, height: 2 })
    .raw()
    .toBuffer({ resolveWithObject: true });
  return `rgb(${data[0]}, ${data[1]}, ${data[2]})`;
}

/** For a field with a left icon: the width left for typing, and whether the icon ends before the text starts. */
export async function typingSpace(input: Locator): Promise<{ typing: number; paddingLeft: number; iconRight: number; iconIgnoresPointer: boolean; iconIsHitTarget: boolean }> {
  return input.evaluate((el) => {
    const style = getComputedStyle(el);
    const box = el.getBoundingClientRect();
    const icon = el.parentElement!.querySelector("svg")!;
    const iconBox = icon.getBoundingClientRect();
    const hit = document.elementFromPoint(iconBox.left + iconBox.width / 2, iconBox.top + iconBox.height / 2);
    return {
      typing: el.clientWidth - parseFloat(style.paddingLeft) - parseFloat(style.paddingRight),
      paddingLeft: parseFloat(style.paddingLeft) + parseFloat(style.borderLeftWidth),
      iconRight: iconBox.right - box.left,
      iconIgnoresPointer: getComputedStyle(icon).pointerEvents === "none",
      // The click lands on the input, not the icon.
      iconIsHitTarget: hit === icon,
    };
  });
}

/** Any CSS colour (oklch, oklab, color-mix results) as an opaque "rgb(r, g, b)", by painting it on a canvas in the page. */
export async function toRgb(page: Page, colour: string): Promise<string> {
  return page.evaluate((value) => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const context = canvas.getContext("2d")!;
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, 1, 1);
    context.fillStyle = value;
    context.fillRect(0, 0, 1, 1);
    const [r, g, b] = context.getImageData(0, 0, 1, 1).data;
    return "rgb(" + r + ", " + g + ", " + b + ")";
  }, colour);
}
