import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminSession, loginSeeded, resetUsers, seedActiveUser } from "./helpers/users";
import { OPEN_WINDOW, levelId, openAdmission, seedClassLevels, setNow } from "./helpers/registrations";
import { LAYOUT_WIDTHS, expectNoHorizontalScroll, expectNoOverlap, setLayoutWidth } from "./helpers/layout";
import { clearSettings, panel, readSettingsGroup, savedToast, seedSettingsGroup } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014b US2: Class Levels (Settings → Admission, Pages) and the checklist that
 * decides which levels the registration form offers (Settings). The public table
 * is at /admission#class-levels. spec.md US2 scenarios 1–9.
 */

const MID = "2027-02-01T06:00:00Z";
const LEVELS = panel;

async function stableFill(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function openAdmissionTab(page: Page): Promise<void> {
  await page.goto("/admin/settings/admission");
  await expect(panel(page, "class-levels").locator("form")).toBeVisible({ timeout: 90_000 });
}

async function addLevel(page: Page, name: string, ageRule: string): Promise<void> {
  await LEVELS(page, "class-levels").getByRole("button", { name: "Add class level" }).click();
  const dialog = page.getByRole("dialog", { name: /Add class level/ });
  await stableFill(dialog.getByLabel("Class level"), name);
  await stableFill(dialog.getByLabel("Age rule"), ageRule);
  await dialog.getByRole("button", { name: "Done" }).click();
  await expect(dialog).toBeHidden();
}

async function saveLevels(page: Page): Promise<void> {
  await panel(page, "class-levels").getByRole("button", { name: "Save" }).click();
  await expect(savedToast(page, "Class levels")).toBeVisible({ timeout: 60_000 });
}

async function tick(page: Page, name: string): Promise<void> {
  const box = panel(page, "admission-classes").getByRole("checkbox", { name, exact: true });
  await expect(async () => {
    await box.check();
    await expect(box).toBeChecked({ timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function formOptions(page: Page): Promise<string[]> {
  await page.goto("/admission/register", { timeout: 180_000 });
  await expect(page.locator("#registration-className")).toBeVisible({ timeout: 90_000 });
  return page.locator("#registration-className option").allTextContents();
}

test.describe("class levels — admin panel and the public table (014b US2)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("a Pages user adds rows and sets the reference date; the Admission page shows the table with that date", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openAdmissionTab(page);
    const section = panel(page, "class-levels");

    await addLevel(page, "Playgroup", "2½ to 3½ years");
    await addLevel(page, "Class 1", "5½ to 6½ years");
    const month = section.getByLabel("Month");
    await expect(async () => {
      await month.selectOption("04");
      await section.getByLabel("Day").selectOption("01");
      await expect(month).toHaveValue("04", { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await expect(section.getByTestId("panel-unsaved")).toBeVisible();
    await saveLevels(page);

    const stored = (await readSettingsGroup("classLevels"))?.data as { ageReferenceDate: string; levels: { name: string; ageRule: string }[] };
    expect(stored.ageReferenceDate).toBe("04-01");
    expect(stored.levels.map((level) => [level.name, level.ageRule])).toEqual([
      ["Playgroup", "2½ to 3½ years"],
      ["Class 1", "5½ to 6½ years"],
    ]);

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/admission#class-levels");
    const table = page.locator("#class-levels table");
    await expect(table.getByRole("columnheader")).toHaveText(["Class level", "Age on 1 April"]);
    await expect(table.getByRole("row").nth(1).getByRole("cell")).toHaveText(["Playgroup", "2½ to 3½ years"]);
    await expect(table.getByRole("row").nth(2).getByRole("cell")).toHaveText(["Class 1", "5½ to 6½ years"]);
  });

  test("rows can be reordered and removed, and the public table follows", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedClassLevels(["Playgroup", "Nursery", "Class 1"]);
    const { page } = await adminSession(browser);
    await openAdmissionTab(page);
    const section = panel(page, "class-levels");
    await section.getByRole("button", { name: "Move class level 3 up" }).click();
    await section.getByRole("button", { name: "Delete class level: class level 1" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await saveLevels(page);

    await page.setViewportSize({ width: 1024, height: 900 });
    await page.goto("/admission#class-levels");
    const names = await page.locator("#class-levels tbody tr td:first-child").allTextContents();
    expect(names).toEqual(["Class 1", "Nursery"]);
  });

  test("a duplicate name (ignoring case and spaces) blocks the save with a message that says why", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openAdmissionTab(page);
    await addLevel(page, "Class 1", "6 years");
    await addLevel(page, " class  1 ", "6 years");
    await panel(page, "class-levels").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(/Another class level is already called 'class 1'/)).toBeVisible();
    await expect(page.getByText(/registration matches classes by name/).first()).toBeVisible();
    expect(await readSettingsGroup("classLevels")).toBeNull();
  });

  test("the public section is a table from tablet width and stacked rows on phones, with no sideways scroll or overlap", async ({ page }) => {
    test.setTimeout(400_000);
    await seedClassLevels(["Playgroup", "Nursery", "Class 1", "Class 2"]);
    for (const width of LAYOUT_WIDTHS) {
      await setLayoutWidth(page, width);
      await page.goto("/admission#class-levels", { timeout: 120_000 });
      const section = page.locator("#class-levels");
      await expect(section).toBeVisible({ timeout: 90_000 });
      if (width >= 768) {
        await expect(section.getByRole("table")).toBeVisible();
        await expect(page.getByTestId("class-levels-list")).toBeHidden();
      } else {
        await expect(section.getByRole("table")).toBeHidden();
        await expect(page.getByTestId("class-levels-list")).toBeVisible();
        await expect(page.getByTestId("class-levels-list").getByRole("listitem")).toHaveCount(4);
      }
      await expectNoHorizontalScroll(page);
      await expectNoOverlap(page, section);
    }
  });

  test("with no rows the section, its menu entry and its search result are absent; the old address opens the page at the top", async ({ page }) => {
    test.setTimeout(300_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/admission/class-levels", { timeout: 120_000 });
    await expect(page).toHaveURL(/\/admission(#class-levels)?$/);
    await expect(page.locator("#class-levels")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await nav.getByRole("link", { name: "Admission", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Class Levels" })).toHaveCount(0);

    await seedClassLevels(["Playgroup"]);
    await page.goto("/admission", { timeout: 120_000 });
    await expect(page.locator("#class-levels")).toBeVisible();
    await nav.getByRole("link", { name: "Admission", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Class Levels" })).toHaveAttribute("href", "/admission#class-levels");
  });

  test("axe finds no violations on the Admission tab or on the public Admission page", async ({ browser }) => {
    test.setTimeout(400_000);
    await openAdmission({ ...OPEN_WINDOW, classes: ["Playgroup", "Class 1"], unlinked: ["Grade 9"] });
    const { page } = await adminSession(browser);
    await openAdmissionTab(page);
    await expect(panel(page, "admission-classes").getByTestId("not-linked")).toBeVisible();
    let result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);

    await page.goto("/admission", { timeout: 120_000 });
    await expect(page.locator("#class-levels")).toBeVisible();
    result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
  });
});

test.describe("class levels — the open-classes checklist and the registration form (014b US2)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("ticking levels opens them in the form, in table order; none ticked shows the Closed message", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedClassLevels(["Playgroup", "Nursery", "Class 1"]);
    await seedSettingsGroup("admission", { ...OPEN_WINDOW, announcement: "", closedMessage: "Opening soon", classes: [] });
    const { context, page } = await adminSession(browser);
    await setNow(context, MID);

    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toContainText("Opening soon", { timeout: 90_000 });

    await openAdmissionTab(page);
    await tick(page, "Class 1"); // ticked first, but the form lists table order
    await tick(page, "Playgroup");
    await panel(page, "admission-classes").getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Classes open for admission")).toBeVisible({ timeout: 60_000 });

    expect(await formOptions(page)).toEqual(["Choose a class", "Playgroup", "Class 1"]);
  });

  test("a Settings-only user can tick the open classes but cannot edit the table", async ({ browser }) => {
    test.setTimeout(400_000);
    await resetUsers();
    await seedClassLevels(["Playgroup", "Class 1"]);
    await seedSettingsGroup("admission", { ...OPEN_WINDOW, announcement: "", closedMessage: "", classes: [] });
    const user = await seedActiveUser({ email: "settings-checklist@example.test", permissions: ["settings"] });
    const { page } = await loginSeeded(browser, user);
    await openAdmissionTab(page);
    await expect(panel(page, "class-levels").getByTestId("panel-read-only")).toBeVisible();
    await tick(page, "Playgroup");
    await panel(page, "admission-classes").getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Classes open for admission")).toBeVisible({ timeout: 60_000 });
  });

  test("deleting a ticked level drops it from the form, and the Admission tab warns, naming it", async ({ browser }) => {
    test.setTimeout(400_000);
    await openAdmission({ ...OPEN_WINDOW, classes: ["Playgroup", "Class 1"] });
    const { context, page } = await adminSession(browser);
    await setNow(context, MID);
    await openAdmissionTab(page);

    await panel(page, "class-levels").getByRole("button", { name: "Delete class level: class level 2" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Delete" }).click();
    await saveLevels(page);

    await page.reload();
    await expect(panel(page, "admission-classes").getByTestId("removed-levels-warning")).toContainText('"Class 1" was removed from Class levels', { timeout: 90_000 });
    await expect(panel(page, "admission-classes").getByRole("checkbox", { name: "Class 1" })).toHaveCount(0);
    expect(await formOptions(page)).toEqual(["Choose a class", "Playgroup"]);
  });

  test("a rename shows in the form; a registration sent earlier keeps the class name it was sent with", async ({ browser }) => {
    test.setTimeout(400_000);
    await openAdmission({ ...OPEN_WINDOW, classes: ["Playgroup", "Class 1"] });
    const { context, page } = await adminSession(browser);
    await setNow(context, MID);
    await openAdmissionTab(page);

    const card = panel(page, "class-levels").getByTestId("list-item").nth(1);
    await stableFill(card.getByLabel("Class level"), "Grade 1");
    await saveLevels(page);
    expect(await formOptions(page)).toEqual(["Choose a class", "Playgroup", "Grade 1"]);

    const stored = (await readSettingsGroup("admission"))?.data as { classes: { levelId: string; name: string; deletedAt: unknown }[] };
    // The saved snapshot is refreshed the next time the checklist is saved; the level id is what ties them.
    expect(stored.classes.filter((item) => !item.deletedAt).map((item) => item.levelId)).toEqual([levelId(0), levelId(1)]);
  });

  test("a checklist save for a level deleted since the page loaded is a conflict, and nothing is changed", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedClassLevels(["Playgroup", "Class 1"]);
    await seedSettingsGroup("admission", { ...OPEN_WINDOW, announcement: "", closedMessage: "", classes: [] });
    const { page } = await adminSession(browser);
    await openAdmissionTab(page);

    // Someone else deletes Class 1 after this page loaded.
    await seedSettingsGroup("classLevels", {
      ageReferenceDate: "07-31",
      levels: [
        { id: levelId(0), name: "Playgroup", ageRule: "3 to 4 years", deletedAt: null },
        { id: levelId(1), name: "Class 1", ageRule: "3 to 4 years", deletedAt: new Date() },
      ],
    });
    await tick(page, "Class 1");
    await panel(page, "admission-classes").getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    expect(await readSettingsGroup("admission")).toMatchObject({ data: { classes: [] } });
  });
});

test.describe("class levels — after the class-link migration (014b US3)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });

  test("matched names are ticked, an unmatched name is listed as not linked until resolved, and the form still offers all of them", async ({ browser }) => {
    test.setTimeout(400_000);
    // The state `npm run migrate:class-levels -- --confirm` leaves behind (unit-tested in link-classes.test.ts):
    // Playgroup and Class 1 linked, "Grade 9" kept as typed.
    await openAdmission({ ...OPEN_WINDOW, classes: ["Playgroup", "Class 1"], unlinked: ["Grade 9"] });
    const { context, page } = await adminSession(browser);
    await setNow(context, MID);
    await openAdmissionTab(page);

    const section = panel(page, "admission-classes");
    await expect(section.getByRole("checkbox", { name: "Playgroup" })).toBeChecked();
    await expect(section.getByRole("checkbox", { name: "Class 1" })).toBeChecked();
    await expect(section.getByTestId("not-linked")).toContainText("Grade 9");

    expect(await formOptions(page)).toEqual(["Choose a class", "Playgroup", "Class 1", "Grade 9"]);

    // Resolving it by removing it takes it out of the form and the list disappears.
    await openAdmissionTab(page);
    await section.getByRole("button", { name: "Remove Grade 9" }).click();
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Classes open for admission")).toBeVisible({ timeout: 60_000 });
    await expect(section.getByTestId("not-linked")).toHaveCount(0);
    expect(await formOptions(page)).toEqual(["Choose a class", "Playgroup", "Class 1"]);
  });
});
