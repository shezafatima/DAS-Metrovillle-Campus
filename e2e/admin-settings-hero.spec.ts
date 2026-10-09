import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast, stubCloudinaryUpload } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

const TITLE = settingsCopy.groups.hero.title;
const IMAGE = path.join(__dirname, "fixtures", "cover.jpg");

const rows = (page: Page) => page.getByTestId("list-item");

/** Adds a slide through the right-hand panel, with a stubbed desktop-image upload. */
async function addSlide(
  page: Page,
  { alt, heading, buttonLabel, buttonLink }: { alt: string; heading?: string; buttonLabel?: string; buttonLink?: string },
) {
  await page.getByRole("button", { name: "Add slide" }).click();
  const panel = page.getByRole("dialog", { name: "Add slide" });
  await expect(panel).toBeVisible();
  await panel.getByTestId("image-input-desktop").setInputFiles(IMAGE);
  await expect(panel.getByRole("button", { name: settingsCopy.list.replaceImage })).toBeVisible({ timeout: 30_000 });
  await panel.getByLabel(settingsCopy.fields.hero.alt).fill(alt);
  if (heading) await panel.getByLabel(settingsCopy.fields.hero.heading).fill(heading);
  if (buttonLabel) await panel.getByLabel(settingsCopy.fields.hero.buttonLabel).fill(buttonLabel);
  if (buttonLink) await panel.getByLabel(settingsCopy.fields.hero.buttonLink).fill(buttonLink);
  await panel.getByRole("button", { name: settingsCopy.list.done }).click();
  await expect(panel).toBeHidden();
}

async function storedAlts(): Promise<{ alt: string; visible: boolean; deleted: boolean }[]> {
  const stored = await readSettingsGroup("hero");
  const slides = (stored?.data.slides ?? []) as { alt: string; visible: boolean; deletedAt: unknown }[];
  return slides.map((s) => ({ alt: s.alt, visible: s.visible, deleted: Boolean(s.deletedAt) }));
}

test.describe("settings — hero slides (005 US3)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("the starting slide cannot be hidden or deleted: it is the only visible one", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "hero");

    await expect(rows(page)).toHaveCount(1);
    await expect(page.getByRole("button", { name: "Hide slide 1" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete slide: slide 1" })).toBeDisabled();
    await expect(rows(page).first().getByText(settingsCopy.list.lastVisibleReason)).toBeVisible();
    await expect(page.getByRole("button", { name: "Move slide 1 up" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Move slide 1 down" })).toBeDisabled();
  });

  test("add two slides, reorder them, hide one, save, and it all persists; the last visible slide can never be removed", async ({
    browser,
  }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    await stubCloudinaryUpload(page, { width: 1920, height: 700 });
    await openGroup(page, "hero");

    await addSlide(page, { alt: "Slide two" });
    await addSlide(page, { alt: "Slide three", heading: "Welcome", buttonLabel: "Apply", buttonLink: "/admission" });
    await expect(rows(page)).toHaveCount(3);

    // Reorder with the up button: slide three moves above slide two.
    await page.getByRole("button", { name: "Move slide 3 up" }).click();
    await expect(rows(page).nth(1)).toContainText("Welcome");
    await expect(page.getByTestId("list-announcement")).toContainText("moved to position 2 of 3");
    // Up is unavailable on the first row and down on the last.
    await expect(page.getByRole("button", { name: "Move slide 1 up" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Move slide 3 down" })).toBeDisabled();

    // Hide the original placeholder slide (allowed: two others are visible).
    await page.getByRole("button", { name: "Hide slide 1" }).click();
    await expect(rows(page).first()).toContainText(settingsCopy.list.hidden);

    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, TITLE)).toBeVisible({ timeout: 60_000 });

    expect(await storedAlts()).toEqual([
      { alt: "Dar-e-Arqam Schools", visible: false, deleted: false },
      { alt: "Slide three", visible: true, deleted: false },
      { alt: "Slide two", visible: true, deleted: false },
    ]);

    // Reload: order and visibility persisted.
    await openGroup(page, "hero");
    await expect(rows(page)).toHaveCount(3);
    await expect(rows(page).first()).toContainText(settingsCopy.list.hidden);
    await expect(rows(page).nth(1)).toContainText("Welcome");
    await expect(rows(page).nth(2)).toContainText("Slide two");

    // Hide slide three; slide two is now the last visible one and cannot be hidden or deleted.
    await page.getByRole("button", { name: "Hide slide 2" }).click();
    await expect(page.getByRole("button", { name: "Hide slide 3" })).toBeDisabled();
    await expect(page.getByRole("button", { name: "Delete slide: slide 3" })).toBeDisabled();
    await expect(rows(page).nth(2).getByText(settingsCopy.list.lastVisibleReason)).toBeVisible();
  });

  test("deleting a slide asks first, and it is kept as deleted (soft delete)", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    await stubCloudinaryUpload(page, { width: 1920, height: 700 });
    await openGroup(page, "hero");
    await addSlide(page, { alt: "Second slide" });
    // A slide that was never saved has nothing to keep, so save it first.
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, TITLE)).toBeVisible({ timeout: 60_000 });

    await page.getByRole("button", { name: "Delete slide: slide 2" }).click();
    const dialog = page.getByRole("alertdialog");
    await expect(dialog).toContainText(settingsCopy.deleteSlide.title);
    // Cancelling changes nothing.
    await dialog.getByRole("button", { name: settingsCopy.deleteSlide.cancel }).click();
    await expect(rows(page)).toHaveCount(2);

    await page.getByRole("button", { name: "Delete slide: slide 2" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: settingsCopy.deleteSlide.confirm }).click();
    await expect(rows(page)).toHaveCount(1);

    await page.getByRole("button", { name: "Save" }).click();
    await expect.poll(async () => (await storedAlts()).some((s) => s.deleted), { timeout: 60_000 }).toBe(true);

    const stored = await storedAlts();
    expect(stored).toHaveLength(2);
    expect(stored.find((s) => s.alt === "Second slide")).toMatchObject({ deleted: true });
    await openGroup(page, "hero");
    await expect(rows(page)).toHaveCount(1);
  });

  test("the slide panel validates: alt text, a desktop image, and a button label with its link", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await stubCloudinaryUpload(page);
    await openGroup(page, "hero");

    await page.getByRole("button", { name: "Add slide" }).click();
    const panel = page.getByRole("dialog", { name: "Add slide" });
    await panel.getByRole("button", { name: settingsCopy.list.done }).click();
    await expect(panel.getByText(settingsCopy.errors.imageRequired)).toBeVisible();
    await expect(panel.getByText(settingsCopy.errors.required)).toBeVisible();
    await expect(panel).toBeVisible();

    await panel.getByTestId("image-input-desktop").setInputFiles(IMAGE);
    await expect(panel.getByRole("button", { name: settingsCopy.list.replaceImage })).toBeVisible({ timeout: 30_000 });
    await panel.getByLabel(settingsCopy.fields.hero.alt).fill("Alt text");
    await panel.getByLabel(settingsCopy.fields.hero.buttonLabel).fill("Apply");
    await panel.getByRole("button", { name: settingsCopy.list.done }).click();
    await expect(panel.getByText(settingsCopy.errors.buttonPair)).toBeVisible();

    await panel.getByLabel(settingsCopy.fields.hero.buttonLink).fill("/admission");
    await panel.getByRole("button", { name: settingsCopy.list.done }).click();
    await expect(panel).toBeHidden();
    await expect(rows(page)).toHaveCount(2);
  });

  test("closing the panel with changes asks first; nothing typed closes at once", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "hero");

    await page.getByRole("button", { name: "Add slide" }).click();
    const panel = page.getByRole("dialog", { name: "Add slide" });
    await panel.getByRole("button", { name: settingsCopy.list.cancel }).click();
    await expect(panel).toBeHidden();

    await page.getByRole("button", { name: "Add slide" }).click();
    await panel.getByLabel(settingsCopy.fields.hero.alt).fill("Typed");
    const prompts: string[] = [];
    page.once("dialog", (dialog) => {
      prompts.push(dialog.message());
      void dialog.dismiss();
    });
    await panel.getByRole("button", { name: settingsCopy.list.cancel }).click();
    await expect(panel).toBeVisible();
    expect(prompts).toEqual([settingsCopy.list.panelUnsaved]);
    page.once("dialog", (dialog) => void dialog.accept());
    await panel.getByRole("button", { name: settingsCopy.list.cancel }).click();
    await expect(panel).toBeHidden();
    await expect(rows(page)).toHaveCount(1);
  });

  test("the display time takes whole seconds from 3 to 15", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "hero");
    const field = page.getByLabel(settingsCopy.fields.hero.displaySeconds);
    await expect(field).toHaveValue("5");

    await field.fill("2");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.errors.displaySeconds)).toBeVisible();

    await field.fill("8");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, TITLE)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("hero"))?.data.displaySeconds).toBe(8);
  });

  test("on a phone the panel is full width and the list has no sideways scroll", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await page.setViewportSize({ width: 375, height: 800 });
    await openGroup(page, "hero");

    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole("button", { name: "Add slide" }).click();
    const panel = page.getByRole("dialog", { name: "Add slide" });
    await expect(panel).toBeVisible();
    const box = await panel.boundingBox();
    expect(box?.width ?? 0).toBeGreaterThanOrEqual(370);
  });
});
