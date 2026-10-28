import type { Page } from "@playwright/test";

/**
 * Waits until the layout can be measured: fonts are loaded, two frames have been drawn, and the page has stopped
 * scrolling. Use it after `scrollIntoView` and before reading positions or sizes.
 */
export async function waitForLayoutSettled(page: Page): Promise<void> {
  await page.evaluate(async () => {
    await document.fonts.ready;
    await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
  });
  await waitForScrollSettled(page);
}

/**
 * Waits until the page has stopped scrolling (the same scroll position for 10
 * frames in a row). The site scrolls smoothly, so a measurement taken right after
 * `scrollIntoView` can run mid-scroll and see positions that are about to change.
 */
export async function waitForScrollSettled(page: Page): Promise<void> {
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        let last = window.scrollY;
        let still = 0;
        const tick = () => {
          still = window.scrollY === last ? still + 1 : 0;
          last = window.scrollY;
          if (still >= 10) resolve();
          else requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
      }),
  );
}
