import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { EXAMINATION_FIXTURE, clearSettings, panel, readSettingsGroup, savedToast, seedExamination } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014b US5: the Examination panel (Settings → Academics, Pages): headed blocks of plain text, shown as cards on
 * /academics#examination (the public side is in public-dynamic-sections.spec.ts).
 */

async function stableFill(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function openExamination(page: Page): Promise<Locator> {
  await page.goto("/admin/settings/academics#examination");
  const section = panel(page, "examination");
  await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
  return section;
}

async function addBlock(page: Page, section: Locator, heading: string, body: string): Promise<void> {
  await section.getByRole("button", { name: "Add block" }).click();
  const dialog = page.getByRole("dialog", { name: /Add block/ });
  await stableFill(dialog.getByLabel("Heading"), heading);
  await stableFill(dialog.getByLabel("Text"), body);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
}

const storedBlocks = async () =>
  (((await readSettingsGroup("examination"))?.data.blocks ?? []) as { heading: string; body: string; deletedAt: unknown }[]).filter((block) => !block.deletedAt).map(({ heading, body }) => ({ heading, body }));

test.describe("examination — admin panel (014b US5)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("adds, edits, reorders and removes blocks; saving shows them on the public page in order", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    const section = await openExamination(page);

    await addBlock(page, section, "Nursery, Prep", "All assessments are informal.");
    await addBlock(page, section, "Grade 1 – 7", "Mid-year.\n\nAnnual.");
    await addBlock(page, section, "To be removed", "Gone soon.");
    await section.getByRole("button", { name: "Move block 2 up" }).click();
    await section.getByRole("button", { name: "Delete block: block 3" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    const card = section.getByTestId("list-item").first();
    await stableFill(card.getByLabel("Heading"), "Grade 1 – 7 (edited)");
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Examination")).toBeVisible({ timeout: 60_000 });

    expect(await storedBlocks()).toEqual([
      { heading: "Grade 1 – 7 (edited)", body: "Mid-year.\n\nAnnual." },
      { heading: "Nursery, Prep", body: "All assessments are informal." },
    ]);

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/academics#examination");
    await expect(page.locator("#examination").getByRole("heading", { level: 3 })).toHaveText(["Grade 1 – 7 (edited)", "Nursery, Prep"], { timeout: 90_000 });
    await expect(page.locator("#examination").getByText("Annual.")).toBeVisible();
  });

  test("a blank line in the text starts a new paragraph on the public page; a single line break does not", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await addBlock(page, section, "Paragraphs", "First paragraph.\n\nSecond paragraph\nstill the second.");
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Examination")).toBeVisible({ timeout: 60_000 });
    await page.goto("/academics#examination");
    const paragraphs = page.locator("#examination article p");
    await expect(paragraphs).toHaveText(["First paragraph.", "Second paragraph still the second."], { timeout: 90_000 });
  });

  test("an empty heading or text, and text over 3,000 characters, are refused at their field", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedExamination(EXAMINATION_FIXTURE.slice(0, 1));
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    const card = section.getByTestId("list-item").first();
    await stableFill(card.getByLabel("Heading"), "   ");
    await section.getByRole("button", { name: "Save" }).click();
    await expect(card.getByText(settingsCopy.errors.required).first()).toBeVisible();

    await stableFill(card.getByLabel("Heading"), "Nursery");
    // The text box stops at its limit as you type; a longer value only arrives by paste or script, so the limit is checked on save.
    await card.getByLabel("Text").evaluate((el) => {
      (el as HTMLTextAreaElement).removeAttribute("maxlength");
    });
    await stableFill(card.getByLabel("Text"), "b".repeat(3001));
    await section.getByRole("button", { name: "Save" }).click();
    await expect(card.getByText(settingsCopy.errors.maxLength(3000)).first()).toBeVisible();
    expect((await storedBlocks()).map((block) => block.heading)).toEqual(["Nursery, Prep"]);
  });

  test("no more than 20 blocks", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedExamination(Array.from({ length: 20 }, (_, i) => ({ heading: `Block ${i + 1}`, body: "Text." })));
    const { page } = await adminSession(browser);
    const section = await openExamination(page);
    await expect(section.getByRole("button", { name: "Add block" })).toBeDisabled();
    await expect(section.getByText(settingsCopy.errors.tooMany(20))).toBeVisible();
  });

  test("axe finds no violations on the Academics tab with blocks loaded", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedExamination(EXAMINATION_FIXTURE);
    const { page } = await adminSession(browser);
    await openExamination(page);
    const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
  });
});
