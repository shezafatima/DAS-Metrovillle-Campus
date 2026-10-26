import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, fillStable, openGroup, panel, readSettingsGroup, seedSettingsGroup, savedToast } from "./helpers/settings";
import { levelId, seedClassLevels } from "./helpers/registrations";
import { settingsCopy } from "../src/content/admin";
import { formatAdmissionDate, karachiToday } from "../src/lib/admission/window";

// 020 US2: Settings → Admission. Dates are relative to today in Pakistan, so the status line is predictable.
// 014: the tab has three panels (window, messages, classes), each saved on its own.
const save = (page: import("@playwright/test").Page, key: string) => panel(page, key).getByRole("button", { name: "Save" }).click();
const WINDOW = settingsCopy.panels["admission-window"];
const MESSAGES = settingsCopy.panels["admission-messages"];
const CLASSES = settingsCopy.panels["admission-classes"];

const today = karachiToday(new Date());
function shift(iso: string, days: number) {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + days)).toISOString().slice(0, 10);
}
const status = (page: import("@playwright/test").Page) => page.getByTestId("settings-status");

test.describe("settings — admission (020 US2)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("with nothing saved the status is Closed; saving an open window says until when", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await expect(status(page)).toHaveText(settingsCopy.admissionStatus.closed);
    // 027: with nothing saved, both pickers start at today.
    await expect(page.getByLabel("Opens on")).toHaveAttribute("min", today);
    await expect(page.getByLabel("Closes on")).toHaveAttribute("min", today);

    const closes = shift(today, 30);
    await fillStable(page, "Opens on", today); // 027: not an earlier day, the picker and the server both refuse that
    await fillStable(page, "Closes on", closes);
    await save(page, "admission-window");
    await expect(savedToast(page, WINDOW)).toBeVisible({ timeout: 60_000 });
    await page.getByLabel("Announcement").fill("Admissions are now open for Playgroup, Nursery, Class 1 and Class 2");
    await save(page, "admission-messages");
    await expect(savedToast(page, MESSAGES)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toEqual({
      opensOn: today,
      closesOn: closes,
      announcement: "Admissions are now open for Playgroup, Nursery, Class 1 and Class 2",
      closedMessage: "",
      classes: [],
    });
    await expect(status(page)).toHaveText(`Open now until ${formatAdmissionDate(closes)}`, { timeout: 60_000 });
  });

  test("a future window says when it opens; clearing a date makes it Closed", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSettingsGroup("admission", { opensOn: shift(today, 30), closesOn: shift(today, 60), announcement: "", closedMessage: "" });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await expect(status(page)).toHaveText(`Opens on ${formatAdmissionDate(shift(today, 30))}`);

    await fillStable(page, "Opens on", "");
    await save(page, "admission-window");
    await expect(savedToast(page, WINDOW)).toBeVisible({ timeout: 60_000 });
    await expect(status(page)).toHaveText(settingsCopy.admissionStatus.closed, { timeout: 60_000 });
  });

  test("Closes on before Opens on is refused under Closes on and nothing is saved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await fillStable(page, "Opens on", "2027-03-31");
    await fillStable(page, "Closes on", "2027-01-01");
    await save(page, "admission-window");
    await expect(page.getByText(settingsCopy.errors.closesBeforeOpens)).toBeVisible({ timeout: 60_000 });
    expect(await readSettingsGroup("admission")).toBeNull();
  });

  test("the date pickers start at today; a typed past date is refused under its field; a past opening date already saved does not block other edits (027)", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSettingsGroup("admission", { opensOn: shift(today, -9), closesOn: shift(today, 7), announcement: "", closedMessage: "" });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    // The saved opening date is in the past, so that field has no minimum (a value below it would stop the panel saving); Closes on does.
    await expect(page.getByLabel("Opens on")).not.toHaveAttribute("min", /.+/);
    await expect(page.getByLabel("Closes on")).toHaveAttribute("min", today);

    // The window opened nine days ago: that stays, and the closing date can still be moved.
    await fillStable(page, "Closes on", shift(today, 40));
    await save(page, "admission-window");
    await expect(savedToast(page, WINDOW)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ opensOn: shift(today, -9), closesOn: shift(today, 40) });

    // A past date typed in by hand is refused under its own field, and the stored date is not changed.
    await fillStable(page, "Closes on", shift(today, -2));
    await save(page, "admission-window");
    await expect(page.getByText(settingsCopy.errors.dateInPast).first()).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ closesOn: shift(today, 40) });

    // Today itself is fine.
    await fillStable(page, "Closes on", today);
    await save(page, "admission-window");
    await expect(savedToast(page, WINDOW)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toMatchObject({ closesOn: today });
  });

  test("the dates can be typed from the keyboard, and the page has no axe violations", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    const opens = page.getByLabel("Opens on");
    await opens.focus();
    await page.keyboard.type("01012027"); // en-US date field order: month, day, year
    await expect(opens).not.toHaveValue("");
    const result = await new AxeBuilder({ page }).include("#admin-content").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });
});

test.describe("settings — admission classes (013 US5, 014b: a checklist of Class Levels)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("an open window with no class offered shows the warning; ticking a level and saving removes it", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedClassLevels(["Playgroup", "Class 1"]);
    await seedSettingsGroup("admission", { opensOn: shift(today, -1), closesOn: shift(today, 30), announcement: "", closedMessage: "", classes: [] });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await expect(page.getByTestId("settings-warning")).toHaveText(settingsCopy.admissionWarnings.noClasses);

    const box = panel(page, "admission-classes").getByRole("checkbox", { name: "Playgroup" });
    // A tick made before React has taken the form over is lost, so it is repeated until it holds.
    await expect(async () => {
      await box.check();
      await expect(box).toBeChecked({ timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await save(page, "admission-classes");
    await expect(savedToast(page, CLASSES)).toBeVisible({ timeout: 60_000 });
    const stored = (await readSettingsGroup("admission"))?.data as { classes: Array<{ name: string; levelId: string; deletedAt: unknown }> };
    expect(stored.classes.filter((item) => !item.deletedAt).map((item) => [item.name, item.levelId])).toEqual([["Playgroup", levelId(0)]]);
    await expect(page.getByTestId("settings-warning")).toHaveCount(0, { timeout: 60_000 });
  });

  test("a typed class from before Class Levels existed is listed as not linked and is still offered; linking it ticks the level", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedClassLevels(["Playgroup", "Class 1"]);
    await seedSettingsGroup("admission", {
      opensOn: shift(today, -1),
      closesOn: shift(today, 30),
      announcement: "",
      closedMessage: "",
      classes: [{ id: "00000003-0000-4000-8000-000000000001", name: "class 1", deletedAt: null }],
    });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    // An old item (no level id) is not linked, and the form still offers it, so there is no "no classes" warning.
    const notLinked = panel(page, "admission-classes").getByTestId("not-linked");
    await expect(notLinked).toContainText("class 1");
    await expect(page.getByTestId("settings-warning")).toHaveCount(0);

    const select = notLinked.getByLabel("Link class 1 to a class level");
    await expect(async () => {
      await select.selectOption({ label: "Class 1" });
      await expect(panel(page, "admission-classes").getByTestId("not-linked")).toHaveCount(0, { timeout: 1_000 });
    }).toPass({ timeout: 30_000 });
    await expect(panel(page, "admission-classes").getByRole("checkbox", { name: "Class 1" })).toBeChecked();
    await save(page, "admission-classes");
    await expect(savedToast(page, CLASSES)).toBeVisible({ timeout: 60_000 });
    const stored = (await readSettingsGroup("admission"))?.data as { classes: Array<{ name: string; levelId: string; deletedAt: unknown }> };
    expect(stored.classes.filter((item) => !item.deletedAt).map((item) => [item.name, item.levelId])).toEqual([["Class 1", levelId(1)]]);
  });

  test("a ticked level that was deleted from Class Levels drops out and the tab warns, naming it", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedClassLevels(["Playgroup"]);
    await seedSettingsGroup("admission", {
      opensOn: shift(today, -1),
      closesOn: shift(today, 30),
      announcement: "",
      closedMessage: "",
      classes: [
        { id: "00000002-0000-4000-8000-000000000001", name: "Playgroup", levelId: levelId(0), deletedAt: null },
        { id: "00000002-0000-4000-8000-000000000002", name: "Class 9", levelId: "00000001-0000-4000-8000-0000000000ff", deletedAt: null },
      ],
    });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    const section = panel(page, "admission-classes");
    await expect(section.getByTestId("removed-levels-warning")).toContainText('"Class 9" was removed from Class levels');
    await expect(section.getByRole("checkbox", { name: "Playgroup" })).toBeChecked();
    await expect(section.getByRole("checkbox", { name: "Class 9" })).toHaveCount(0);

    await section.getByRole("button", { name: "Clear this warning" }).click();
    await save(page, "admission-classes");
    await expect(savedToast(page, CLASSES)).toBeVisible({ timeout: 60_000 });
    await expect(page.getByTestId("removed-levels-warning")).toHaveCount(0, { timeout: 60_000 });
  });

  test("no warning while the window is closed, even with no class", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await expect(page.getByTestId("settings-warning")).toHaveCount(0);
  });
});
