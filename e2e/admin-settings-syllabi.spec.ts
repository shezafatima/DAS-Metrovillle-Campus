import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Locator, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { bulkSyllabus, clearSettings, clearSettingsChanges, panel, readSettingsChanges, readSettingsGroup, savedToast, seedSyllabi } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

/**
 * 014b US4: the Syllabi panel (Settings → Academics, Pages): nested levels, subjects and groups, one level
 * open at a time, topics one per line, removal that says how many topics go, and a panel that stays usable
 * with the full reference content. The public section is covered in public-dynamic-sections.spec.ts.
 */

async function stableFill(field: Locator, value: string): Promise<void> {
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
}

async function openAcademics(page: Page): Promise<Locator> {
  await page.goto("/admin/settings/academics#syllabi");
  const section = panel(page, "syllabi");
  await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
  return section;
}

async function saveSyllabi(page: Page, section: Locator): Promise<void> {
  await section.getByRole("button", { name: "Save" }).click();
  await expect(savedToast(page, "Syllabi")).toBeVisible({ timeout: 60_000 });
}

/** Adds a level with one subject and one group, filling every field. The new level is the open one. */
async function addLevel(section: Locator, level: string, subject: string, group: { heading: string; intro: string; topics: string }): Promise<void> {
  await section.getByRole("button", { name: "Add level" }).click();
  await stableFill(section.getByLabel("Level name"), level);
  await section.getByRole("button", { name: "Add subject" }).click();
  await stableFill(section.getByLabel("Subject name"), subject);
  await section.getByRole("button", { name: "Add group" }).click();
  await stableFill(section.getByLabel("Group heading (optional)"), group.heading);
  await stableFill(section.getByLabel("Intro (optional)"), group.intro);
  await stableFill(section.getByLabel("Topics"), group.topics);
}

const storedLevels = async () => ((await readSettingsGroup("syllabi"))?.data.levels ?? []) as { name: string; deletedAt: unknown; subjects: { name: string; groups: { heading: string; intro: string; topics: string[] }[] }[] }[];

test.describe("syllabi — admin panel (014b US4)", () => {
  test.beforeEach(async () => {
    await clearSettings();
    await clearSettingsChanges();
  });

  test("builds levels, subjects and groups, reorders them and saves; blank lines and spaces in topics are dropped", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await expect(section.getByText("No levels yet")).toBeVisible();

    await addLevel(section, "Class 4", "English", { heading: "Reading", intro: "First paragraph.\n\nSecond paragraph.", topics: "  Comprehension  \n\n   \nGrammar\n\tVocabulary " });
    await addLevel(section, "Class 5", "Mathematics", { heading: "Fractions", intro: "", topics: "Halves\nQuarters" });
    await expect(section.getByTestId("panel-unsaved")).toBeVisible();

    await section.getByRole("button", { name: "Move level 2 up" }).click();
    await expect(section.getByTestId("syllabus-announcement")).toHaveText("level 2 moved to position 1 of 2");
    await saveSyllabi(page, section);

    const levels = await storedLevels();
    expect(levels.filter((level) => !level.deletedAt).map((level) => level.name)).toEqual(["Class 5", "Class 4"]);
    const class4 = levels.find((level) => level.name === "Class 4")!;
    expect(class4.subjects[0].groups[0]).toMatchObject({ heading: "Reading", intro: "First paragraph.\n\nSecond paragraph.", topics: ["Comprehension", "Grammar", "Vocabulary"] });
    await expect(section.getByTestId("panel-unsaved")).toHaveCount(0);
  });

  test("only one level is open at a time, and the first is open on load", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 3));
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    const rows = section.getByTestId("syllabus-level");
    await expect(rows.nth(0)).toHaveAttribute("data-open", "true");
    await expect(section.getByTestId("syllabus-subject")).toHaveCount(3);

    await section.getByRole("button", { name: /^Nursery/ }).click();
    await expect(rows.nth(1)).toHaveAttribute("data-open", "true");
    await expect(rows.nth(0)).toHaveAttribute("data-open", "false");
    await expect(section.getByTestId("syllabus-subject")).toHaveCount(3);
    await expect(section.getByLabel("Level name")).toHaveValue("Nursery");
  });

  test("removing a level or a subject asks first and says how many topics go; cancelling keeps everything", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 2));
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);

    await section.getByRole("button", { name: "Remove subject: English" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("This removes 16 topics");
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(section.getByTestId("syllabus-subject")).toHaveCount(3);

    await section.getByRole("button", { name: "Remove level: Play Group" }).click();
    await expect(page.getByRole("alertdialog")).toContainText("This removes 48 topics");
    await page.getByRole("alertdialog").getByRole("button", { name: "Cancel" }).click();
    await expect(section.getByTestId("syllabus-level")).toHaveCount(2);
    await expect(section.getByTestId("panel-unsaved")).toHaveCount(0);
  });

  test("removing a subject and saving keeps its previous value in the change record (spec FR-007)", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 1));
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);

    await section.getByRole("button", { name: "Remove subject: Mathematics" }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: "Remove" }).click();
    await saveSyllabi(page, section);

    const changes = await readSettingsChanges("syllabi");
    expect(changes).toHaveLength(1);
    expect(changes[0]).toMatchObject({ panel: "syllabi" });
    expect(changes[0].removed).toMatchObject([{ path: "levels.0.subjects.1", label: "Play Group · Mathematics", value: { name: "Mathematics" } }]);
    expect((changes[0].removed[0].value.groups as { topics: string[] }[]).flatMap((group) => group.topics)).toHaveLength(16);
    expect((await storedLevels())[0].subjects.map((subject) => subject.name)).toEqual(["English", "Science"]);
  });

  test("a group over the limits is refused with a message that says why, and nothing is saved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await addLevel(section, "Class 1", "English", { heading: "", intro: "", topics: Array.from({ length: 101 }, (_, i) => `Topic ${i + 1}`).join("\n") });
    await section.getByRole("button", { name: "Save" }).click();
    await expect(section.getByText(settingsCopy.errors.tooManyLines(100))).toBeVisible();
    expect(await readSettingsGroup("syllabi")).toBeNull();

    await stableFill(section.getByLabel("Topics"), `${"a".repeat(201)}`);
    await section.getByRole("button", { name: "Save" }).click();
    await expect(section.getByText(settingsCopy.errors.lineTooLong(1, 200))).toBeVisible();
  });

  test("a group with neither an intro nor a topic cannot be saved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await section.getByRole("button", { name: "Add level" }).click();
    await stableFill(section.getByLabel("Level name"), "Class 1");
    await section.getByRole("button", { name: "Add subject" }).click();
    await stableFill(section.getByLabel("Subject name"), "English");
    await section.getByRole("button", { name: "Add group" }).click();
    await section.getByRole("button", { name: "Save" }).click();
    await expect(section.getByText(settingsCopy.errors.groupNeedsContent)).toBeVisible();
    expect(await readSettingsGroup("syllabi")).toBeNull();
  });

  test("two levels with the same name only warn; the panel still saves", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await addLevel(section, "Class 1", "English", { heading: "", intro: "", topics: "One" });
    await addLevel(section, "class 1", "English", { heading: "", intro: "", topics: "Two" });
    await expect(section.getByTestId("duplicate-warning").first()).toContainText("Another level is also called");
    await saveSyllabi(page, section);
    expect((await storedLevels()).filter((level) => !level.deletedAt)).toHaveLength(2);
  });

  test("the panel links to the public section", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await expect(section.getByTestId("syllabus-preview")).toHaveAttribute("href", "/academics#syllabi");
    await expect(section.getByTestId("view-on-site")).toHaveAttribute("href", "/academics#syllabi");
  });

  test("two admins editing at once: the second save is a conflict and nothing is overwritten", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedSyllabi(bulkSyllabus().slice(0, 1));
    const a = await adminSession(browser);
    const b = await adminSession(browser);
    const sectionA = await openAcademics(a.page);
    const sectionB = await openAcademics(b.page);

    await stableFill(sectionA.getByLabel("Level name"), "Play Group (A)");
    await saveSyllabi(a.page, sectionA);
    await stableFill(sectionB.getByLabel("Level name"), "Play Group (B)");
    await sectionB.getByRole("button", { name: "Save" }).click();
    await expect(b.page.getByText(settingsCopy.toasts.conflict)).toBeVisible({ timeout: 60_000 });
    expect((await storedLevels())[0].name).toBe("Play Group (A)");
  });

  test("axe finds no violations on the Academics tab, with the reference content loaded", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus());
    const { page } = await adminSession(browser);
    await openAcademics(page);
    const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
  });

  test("stays responsive with the full reference content: no long task while typing, and a save in well under 2 seconds (SC-002)", async ({ browser }, testInfo) => {
    test.setTimeout(400_000);
    await seedSyllabi(bulkSyllabus());
    const { page } = await adminSession(browser);
    const section = await openAcademics(page);
    await page.evaluate(() => {
      const w = window as unknown as { __longTasks: number[] };
      w.__longTasks = [];
      new PerformanceObserver((list) => list.getEntries().forEach((entry) => w.__longTasks.push(entry.duration))).observe({ entryTypes: ["longtask"] });
    });

    // Open another level (closing the first), then type into one of its topics boxes.
    await section.getByRole("button", { name: /^Class 4/ }).click();
    const topics = section.getByLabel("Topics").first();
    await topics.click();
    await page.keyboard.press("Control+End");
    await page.keyboard.type("\nA topic typed while checking responsiveness for fifty characters", { delay: 5 });
    const longest = Math.max(0, ...(await page.evaluate(() => (window as unknown as { __longTasks: number[] }).__longTasks)));
    testInfo.annotations.push({ type: "longest long task while typing (ms)", description: String(Math.round(longest)) });
    expect(longest, "no long task over 200 ms while typing").toBeLessThanOrEqual(200);

    const started = Date.now();
    await section.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, "Syllabi")).toBeVisible({ timeout: 60_000 });
    const elapsed = Date.now() - started;
    testInfo.annotations.push({ type: "save round-trip (ms); the 1 s target is checked by hand on a production build", description: String(elapsed) });
    expect(elapsed, "the save finishes in under 2 s").toBeLessThan(2000);
  });
});
