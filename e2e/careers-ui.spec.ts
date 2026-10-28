import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import { FIXTURE_PDF, forwardedFor } from "./helpers/careers";
import { FORM_UI_WIDTHS, channels, contrast, record, shot, toRgb, typingSpace } from "./helpers/form-ui";

// 026: the careers form's shared UI and split card. Runs in the serial `forms` project (careers-*.spec.ts). The
// submitting state stubs the API, so it uses no rate-limit budget and stores nothing.

test.describe.configure({ mode: "serial" });

const inlineError = (page: Page, key: string) => page.locator(`#careers-${key}-error`);

async function fillApplication(page: Page) {
  await page.getByRole("textbox", { name: "Full name" }).fill("Ayesha Khan");
  await page.getByRole("textbox", { name: "Email" }).fill("ayesha@example.com");
  await page.getByRole("textbox", { name: "Mobile number" }).fill("03001234567");
  await page.getByRole("textbox", { name: "Highest qualification" }).fill("M.Ed");
}

async function openCareers(page: Page) {
  await page.goto("/careers", { timeout: 180_000 });
  await expect(page.locator("#careers-name")).toBeVisible({ timeout: 90_000 });
}

test.describe("careers form shared UI (026)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(152) });
  test.beforeEach(() => {
    test.setTimeout(300_000);
  });

  for (const width of FORM_UI_WIDTHS) {
    test(`split card, labels, icons, drop zone, error and submitting states at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openCareers(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      // The page title is the shared banner (the only h1, with the breadcrumb) above the card; the navy panel and the form sit side by side from 1024px, the form first on a phone.
      await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
      await expect(page.getByRole("navigation", { name: "Breadcrumb" })).toHaveText("Home » Careers");
      const [h1Box, cardBox] = [(await page.getByRole("heading", { level: 1 }).boundingBox())!, (await page.locator("#apply").boundingBox())!];
      expect(h1Box.y + h1Box.height).toBeLessThanOrEqual(cardBox.y);
      const why = page.getByRole("heading", { level: 2, name: "Why join us" });
      const next = page.getByRole("heading", { level: 2, name: "What happens next" });
      const apply = page.getByRole("heading", { level: 2, name: "Apply now" });
      await expect(why).toBeVisible();
      await expect(next).toBeVisible();
      const [whyBox, applyBox] = [(await why.boundingBox())!, (await apply.boundingBox())!];
      if (width >= 1024) {
        expect(whyBox.x).toBeLessThan(applyBox.x);
        expect(Math.abs(whyBox.y - applyBox.y)).toBeLessThan(80);
      } else {
        expect(applyBox.y).toBeLessThan(whyBox.y);
      }
      // The panel text is the former introduction and generic placeholders, marked pending approval.
      await expect(page.locator("#apply [data-placeholder]")).toHaveCount(2);

      // The gold glow border is the existing component.
      await expect(page.locator("#apply .about-glow-ring")).toHaveCount(1);

      // Visible labels above their fields.
      for (const [label, id] of [["Full name", "name"], ["Email", "email"], ["Mobile number", "phone"], ["Highest qualification", "qualification"]]) {
        const labelBox = (await page.locator(`label[for="careers-${id}"]`).boundingBox())!;
        const inputBox = (await page.locator(`#careers-${id}`).boundingBox())!;
        expect(labelBox.height, label).toBeGreaterThan(8);
        expect(labelBox.y + labelBox.height, label).toBeLessThanOrEqual(inputBox.y + 1);
        await expect(page.locator(`#careers-${id}`)).not.toHaveAttribute("placeholder", /.+/);
      }

      // Icons: email and mobile only; clear of the text, not targets, and room to type.
      for (const id of ["email", "phone"]) {
        const space = await typingSpace(page.locator(`#careers-${id}`));
        record(`careers typing width ${width}px ${id}`, Math.round(space.typing));
        expect(space.iconRight, id).toBeLessThanOrEqual(space.paddingLeft);
        expect(space.iconIgnoresPointer, id).toBe(true);
        expect(space.iconIsHitTarget, id).toBe(false);
        expect(space.typing, id).toBeGreaterThanOrEqual(width <= 375 ? 180 : 220);
      }
      for (const id of ["name", "qualification"]) {
        expect(await page.locator(`#careers-${id}`).locator("xpath=..").locator("svg").count(), id).toBe(0);
      }

      // Touch targets at least 44px tall.
      for (const selector of ["#careers-name", "#careers-email", 'label[for="careers-consent"]', 'button[type="submit"]', 'label[for="careers-cv"]']) {
        const target = page.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        expect((await target.boundingBox())!.height, selector).toBeGreaterThanOrEqual(43.5);
      }

      // Drop zone before a file: prompt, hint, a real file input underneath.
      await expect(page.getByText("Drag and drop your CV here, or click to choose")).toBeVisible();
      await expect(page.getByText("PDF only, max 4 MB")).toBeVisible();
      await expect(page.locator("#careers-cv")).toHaveAttribute("type", "file");
      await page.screenshot({ path: shot(`careers-${width}`), fullPage: true });

      // Error state: the summary takes focus and lists the problems as links.
      await page.getByRole("button", { name: "Apply" }).click();
      const summary = page.getByTestId("error-summary");
      await expect(summary).toBeVisible();
      await expect(summary).toBeFocused();
      await expect(summary.getByRole("link")).toHaveCount(6);
      await expect(inlineError(page, "cv")).toContainText("Choose your CV as a PDF file.");
      // The site scrolls smoothly: let a focus-driven scroll finish before the picture.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: shot(`careers-error-${width}`) });
      await summary.getByRole("link", { name: "Enter your full name." }).click();
      await expect(page.locator("#careers-name")).toBeFocused();

      // Choosing a file shows a PDF icon, its name, its size and a Remove button.
      await fillApplication(page);
      await page.locator("#careers-cv").setInputFiles(FIXTURE_PDF);
      const chosen = page.getByTestId("chosen-file");
      await expect(chosen).toBeVisible();
      await expect(chosen).toContainText(/\.pdf/i);
      await expect(chosen).toContainText(/\d+(\.\d)? (B|KB|MB)/);
      await expect(chosen.locator("svg")).not.toHaveCount(0);
      const remove = chosen.getByRole("button", { name: /^Remove / });
      expect((await remove.boundingBox())!.height).toBeGreaterThanOrEqual(43.5);
      await chosen.scrollIntoViewIfNeeded();
      // The site scrolls smoothly: let a focus-driven scroll finish before the picture.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: shot(`careers-file-${width}`) });

      // Submitting state: "Submitting…" with a spinner, disabled, and one request however fast it is clicked.
      let requests = 0;
      await page.route("**/api/public/careers", async (route) => {
        requests += 1;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true }) });
      });
      await page.locator("#careers-consent").check();
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.dblclick();
      await expect(submit).toBeDisabled();
      await expect(submit).toHaveText("Submitting…");
      await expect(submit.locator("svg")).toHaveCount(1);
      // The site scrolls smoothly: let a focus-driven scroll finish before the picture.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: shot(`careers-submitting-${width}`) });
      await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 30_000 });
      expect(requests).toBe(1);
    });
  }

  for (const width of FORM_UI_WIDTHS) {
    test(`the panel picture is above the text on a phone or tablet, and below it filling the panel from 1024px, at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openCareers(page);
      const image = page.getByTestId("careers-panel-image");
      const img = image.getByRole("img");
      await expect(img).toHaveAttribute("alt", /graduation cap on a stack of books/);
      await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.complete && el.naturalWidth > 0)).toBe(true);
      expect(await img.evaluate((el) => getComputedStyle(el).objectFit)).toBe("cover");

      const box = async (locator: import("@playwright/test").Locator) => (await locator.boundingBox())!;
      const imageBox = await box(image);
      const why = await box(page.getByRole("heading", { level: 2, name: "Why join us" }));
      const next = await box(page.getByRole("heading", { level: 2, name: "What happens next" }));
      const [panel, form] = [await box(page.locator("#apply .grid > div").nth(0)), await box(page.locator("#apply .grid > div").nth(1))];
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      if (width >= 1024) {
        expect(imageBox.y).toBeGreaterThan(next.y); // below the text
        expect(Math.abs(panel.height - form.height)).toBeLessThanOrEqual(1); // the picture does not make the panel taller than the form
        expect(panel.y + panel.height - (imageBox.y + imageBox.height)).toBeLessThanOrEqual(48); // it fills down to the panel's padding
        expect(imageBox.height).toBeGreaterThan(200);
      } else {
        expect(imageBox.y + imageBox.height).toBeLessThanOrEqual(why.y); // above the text
        expect(imageBox.height).toBeLessThanOrEqual(220); // and smaller
      }
    });
  }

  test("the drop zone works from the keyboard, takes a dropped file, and Remove returns focus to the input", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCareers(page);
    const input = page.locator("#careers-cv");

    // Keyboard: the file input itself takes focus and the zone shows a visible focus ring.
    await input.focus();
    await expect(input).toBeFocused();
    // The ring's colour eases in (a short transition); read it once it has settled.
    await page.waitForTimeout(500);
    const ring = await page.locator('label[for="careers-cv"]').evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineStyle: style.outlineStyle, outlineWidth: style.outlineWidth, outlineColor: style.outlineColor };
    });
    ring.outlineColor = await toRgb(page, ring.outlineColor);
    record("drop zone focus ring", ring);
    expect(ring.outlineStyle).not.toBe("none");
    expect(parseFloat(ring.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(contrast(ring.outlineColor, "rgb(255, 255, 255)")).toBeGreaterThanOrEqual(3);

    // A dropped file.
    const dataTransfer = await page.evaluateHandle(() => {
      const transfer = new DataTransfer();
      transfer.items.add(new File(["%PDF-1.4\n%%EOF\n"], "dropped.pdf", { type: "application/pdf" }));
      return transfer;
    });
    await page.locator('label[for="careers-cv"]').dispatchEvent("drop", { dataTransfer });
    const chosen = page.getByTestId("chosen-file");
    await expect(chosen).toContainText("dropped.pdf");

    // Remove, from the keyboard: Tab to the button, press Enter.
    const remove = chosen.getByRole("button", { name: "Remove dropped.pdf" });
    await remove.focus();
    await page.keyboard.press("Enter");
    await expect(chosen).toHaveCount(0);
    await expect(page.getByText("PDF only, max 4 MB")).toBeVisible();
    await expect(input).toBeFocused();
    expect(await input.evaluate((el) => (el as HTMLInputElement).files?.length ?? 0)).toBe(0);
  });

  test("a wrong file type is still refused by the same check as before", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCareers(page);
    await fillApplication(page);
    await page.locator("#careers-cv").setInputFiles({ name: "resume.pdf", mimeType: "application/pdf", buffer: Buffer.from("not a pdf at all") });
    await page.locator("#careers-consent").check();
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(inlineError(page, "cv")).toContainText("Your CV must be a PDF file.");
    await expect(page.getByTestId("error-summary")).toBeFocused();
  });

  test("the glow pauses while a field has focus and is a static gold ring under reduced motion", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCareers(page);
    const frame = page.locator("#apply [data-glow-paused]");
    await page.mouse.move(0, 0);
    await expect(frame).toHaveAttribute("data-glow-paused", "false");
    await page.locator("#careers-name").focus();
    await expect(frame).toHaveAttribute("data-glow-paused", "true");
    await page.locator("#careers-name").blur();
    await page.emulateMedia({ reducedMotion: "reduce" });
    const ringColour = await page.locator("#apply .about-glow-ring").evaluate((el) => getComputedStyle(el).backgroundColor);
    expect(ringColour).toBe("rgb(255, 215, 0)");
  });

  test("contrast: white on navy in the panel, the drop zone and the Remove button", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openCareers(page);
    const panel = await page.getByRole("heading", { level: 2, name: "Why join us" }).evaluate((el) => {
      const section = el.closest("section")!;
      const root = section.parentElement!;
      return { heading: getComputedStyle(el).color, paragraph: getComputedStyle(section.querySelector("p")!).color, bg: getComputedStyle(root).backgroundColor };
    });
    record("careers panel", { ...panel, headingRatio: Number(contrast(panel.heading, panel.bg).toFixed(2)), paragraphRatio: Number(contrast(panel.paragraph, panel.bg).toFixed(2)) });
    expect(channels(panel.bg)).toEqual([18, 18, 145]);
    expect(contrast(panel.heading, panel.bg)).toBeGreaterThanOrEqual(7);
    expect(contrast(panel.paragraph, panel.bg)).toBeGreaterThanOrEqual(7);

    const zone = await page.locator('label[for="careers-cv"]').evaluate((el) => ({ text: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor, border: getComputedStyle(el).borderTopColor }));
    zone.text = await toRgb(page, zone.text);
    zone.border = await toRgb(page, zone.border);
    record("drop zone", { ...zone, textRatio: Number(contrast(zone.text, zone.bg).toFixed(2)), borderRatio: Number(contrast(zone.border, "rgb(255, 255, 255)").toFixed(2)) });
    expect(contrast(zone.text, zone.bg)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(zone.border, "rgb(255, 255, 255)")).toBeGreaterThanOrEqual(3);

    await page.locator("#careers-cv").setInputFiles(FIXTURE_PDF);
    const remove = page.getByTestId("chosen-file").getByRole("button");
    const idle = await remove.evaluate((el) => ({ text: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
    await remove.hover();
    await page.waitForTimeout(400);
    const hover = await remove.evaluate((el) => ({ text: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
    record("remove button", { idle, hover, idleRatio: Number(contrast(idle.text, "rgb(255, 255, 255)").toFixed(2)), hoverRatio: Number(contrast(hover.text, hover.bg).toFixed(2)) });
    expect(contrast(idle.text, "rgb(255, 255, 255)")).toBeGreaterThanOrEqual(4.5);
    expect(contrast(hover.text, hover.bg)).toBeGreaterThanOrEqual(4.5);
  });

  for (const width of [375, 1440]) {
    test(`axe finds no violations on the careers card at ${width}px, with a file chosen and with the error summary showing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openCareers(page);
      let result = await new AxeBuilder({ page }).include("#apply").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
      await page.getByRole("button", { name: "Apply" }).click();
      await expect(page.getByTestId("error-summary")).toBeFocused();
      // Let smooth scrolling and colour transitions finish: axe would otherwise read a button halfway between two colours.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(1200);
      result = await new AxeBuilder({ page }).include("#apply").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
      await page.locator("#careers-cv").setInputFiles(FIXTURE_PDF);
      // Let smooth scrolling and colour transitions finish: axe would otherwise read a button halfway between two colours.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(1200);
      result = await new AxeBuilder({ page }).include("#apply").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
    });
  }
});
