import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { LAYOUT_WIDTHS, expectNoHorizontalScroll, expectNoOverlap, setLayoutWidth } from "./helpers/layout";
import { EXAMINATION_FIXTURE, bulkSyllabus, clearSettings, seedExamination, seedSyllabi } from "./helpers/settings";

/**
 * 014b: the admin-managed sections of the public Academics page (Syllabi, Examination). Their admin panels are
 * covered by the admin-settings-* specs; here is what a visitor sees. Serial `forms` project (it seeds Settings).
 */

const axe = async (page: Page) => (await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze()).violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`);

const tab = (page: Page, name: string) => page.getByRole("tab", { name, exact: true });
const hashOf = (page: Page) => page.evaluate(() => window.location.hash);

test.describe("Syllabi on /academics (014b US4)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterAll(async () => {
    await clearSettings();
  });

  test("has a tab per level, the first selected, and arrow keys, Home and End move between them", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 4));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(page.getByRole("tablist", { name: "Class" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByRole("tab")).toHaveText(["Play Group", "Nursery", "PREP", "Class 1"]);
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true");

    await tab(page, "Play Group").focus();
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Nursery")).toHaveAttribute("aria-selected", "true");
    await expect(tab(page, "Nursery")).toBeFocused();
    await expect(page.getByRole("tabpanel")).toContainText("Nursery English topic 1");
    await page.keyboard.press("End");
    await expect(tab(page, "Class 1")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowRight");
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("ArrowLeft");
    await expect(tab(page, "Class 1")).toHaveAttribute("aria-selected", "true");
    await page.keyboard.press("Home");
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true");
  });

  test("a level shows its subjects, group sub-headings, intro paragraphs and bulleted topics", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi([
      {
        name: "Class 4",
        subjects: [
          { name: "ENGLISH", groups: [{ heading: "Reading", intro: "First paragraph.\n\nSecond paragraph.", topics: ["Comprehension", "Grammar"] }, { topics: ["A group with no heading"] }] },
          { name: "SCIENCE", groups: [{ intro: "Only an intro", topics: [] }] },
        ],
      },
    ]);
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    const panel = page.getByRole("tabpanel");
    await expect(panel.getByRole("heading", { level: 3 })).toHaveText(["ENGLISH", "SCIENCE"], { timeout: 90_000 });
    await expect(panel.getByRole("heading", { level: 4 })).toHaveText(["Reading"]);
    await expect(panel.getByText("First paragraph.")).toBeVisible();
    await expect(panel.getByText("Second paragraph.")).toBeVisible();
    await expect(panel.getByRole("listitem")).toHaveText(["Comprehension", "Grammar", "A group with no heading"]);
    await expect(page.getByRole("heading", { level: 2, name: "Syllabi" })).toBeVisible();
  });

  test("#syllabi opens the first level and brings the section into view", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 4));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
    await expect(page.locator("#syllabi")).toBeInViewport();
  });

  test("a level link opens that level; choosing another replaces the address without adding a history entry", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus());
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi-class-4", { timeout: 180_000 });
    await expect(tab(page, "Class 4")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
    await expect(page.getByRole("tabpanel")).toContainText("Class 4 English topic 1");
    await expect(page.locator("#syllabi")).toBeInViewport();

    const before = await page.evaluate(() => window.history.length);
    await tab(page, "Class 5").click();
    expect(await hashOf(page)).toBe("#syllabi-class-5");
    expect(await page.evaluate(() => window.history.length)).toBe(before);
    await page.reload();
    await expect(tab(page, "Class 5")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
  });

  test("a link to a level that does not exist opens the first level", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 3));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi-class-99", { timeout: 180_000 });
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
  });

  test("a renamed level has a new link, and its old link opens the first level", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 2));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi-nursery", { timeout: 180_000 });
    await expect(tab(page, "Nursery")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
    await seedSyllabi(bulkSyllabus().slice(0, 2).map((level) => (level.name === "Nursery" ? { ...level, name: "Pre-Nursery" } : level)));
    await page.goto("/academics#syllabi-nursery", { timeout: 180_000 });
    await expect(tab(page, "Play Group")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
    await page.goto("/academics#syllabi-pre-nursery", { timeout: 180_000 });
    await expect(tab(page, "Pre-Nursery")).toHaveAttribute("aria-selected", "true", { timeout: 90_000 });
  });

  test("on phones a labelled level picker replaces the tab row, and choosing a level shows its content", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 4));
    for (const width of [375, 640] as const) {
      await setLayoutWidth(page, width);
      await page.goto("/academics#syllabi", { timeout: 180_000 });
      const picker = page.getByLabel("Choose a class");
      await expect(picker).toBeVisible({ timeout: 90_000 });
      await expect(page.getByRole("tablist")).toBeHidden();
      await expect(picker.locator("option")).toHaveText(["Play Group", "Nursery", "PREP", "Class 1"]);
      await picker.selectOption({ label: "PREP" });
      await expect(page.locator("#syllabi-prep-panel")).toBeVisible();
      await expect(page.locator("#syllabi-prep-panel")).toContainText("PREP English topic 1");
      expect(await hashOf(page)).toBe("#syllabi-prep");
    }
    await setLayoutWidth(page, 768);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(page.getByRole("tablist", { name: "Class" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByLabel("Choose a class")).toBeHidden();
  });

  test("no sideways scroll and no overlapping content at 375, 640, 768, 1024 and 1440", async ({ page }) => {
    test.setTimeout(400_000);
    await seedSyllabi(bulkSyllabus());
    for (const width of LAYOUT_WIDTHS) {
      await setLayoutWidth(page, width);
      await page.goto("/academics#syllabi", { timeout: 180_000 });
      await expect(page.locator("#syllabi")).toBeVisible({ timeout: 90_000 });
      await expectNoHorizontalScroll(page);
      await expectNoOverlap(page, page.locator("#syllabi"));
    }
  });

  test("axe finds no violations on /academics with the syllabi shown", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 4));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(page.getByRole("tablist")).toBeVisible({ timeout: 90_000 });
    expect(await axe(page)).toEqual([]);
    await setLayoutWidth(page, 375);
    await expect(page.getByLabel("Choose a class")).toBeVisible();
    expect(await axe(page)).toEqual([]);
  });

  test("with no syllabi the section, its menu entry and its search result are absent, and the old address opens the page at the top", async ({ page }) => {
    test.setTimeout(300_000);
    await setLayoutWidth(page, 1440);
    await page.goto("/academics/syllabi", { timeout: 180_000 });
    await expect(page).toHaveURL(/\/academics(#syllabi)?$/);
    await expect(page.locator("#syllabi")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await nav.getByRole("link", { name: "Academics", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Syllabi" })).toHaveCount(0);
    expect(await page.evaluate(() => window.scrollY)).toBe(0);

    await seedSyllabi(bulkSyllabus().slice(0, 2));
    await page.goto("/academics", { timeout: 180_000 });
    await expect(page.locator("#syllabi")).toBeVisible();
    await nav.getByRole("link", { name: "Academics", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Syllabi" })).toHaveAttribute("href", "/academics#syllabi");
  });

  test("a level with no subject is not a tab, and markup typed by an admin is shown as text", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi([
      { name: "Empty level", subjects: [] },
      { name: "Class 1", subjects: [{ name: "<b>English</b>", groups: [{ topics: ["<script>alert(1)</script>"] }] }] },
    ]);
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#syllabi", { timeout: 180_000 });
    await expect(page.getByRole("tab")).toHaveText(["Class 1"], { timeout: 90_000 });
    await expect(page.getByRole("heading", { level: 3, name: "<b>English</b>" })).toBeVisible();
    await expect(page.getByText("<script>alert(1)</script>")).toBeVisible();
  });
});

test.describe("Examination on /academics (014b US5)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterAll(async () => {
    await clearSettings();
  });

  test("shows each block as a card in order, with its paragraphs", async ({ page }) => {
    test.setTimeout(300_000);
    await seedExamination(EXAMINATION_FIXTURE);
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#examination", { timeout: 180_000 });
    const cards = page.getByTestId("examination-card");
    await expect(cards).toHaveCount(4, { timeout: 90_000 });
    await expect(cards.locator("h3")).toHaveText(EXAMINATION_FIXTURE.map((block) => block.heading));
    await expect(cards.nth(1).locator("p")).toHaveText(["Formal mid-year examination is held at the end of the first term and an annual examination at the conclusion of the final term.", "The term marks reflect a student's all round progress."]);
    await expect(page.getByRole("heading", { level: 2, name: "Examination" })).toBeVisible();
  });

  test("one column on phones and two from tablet width", async ({ page }) => {
    test.setTimeout(400_000);
    await seedExamination(EXAMINATION_FIXTURE);
    for (const width of LAYOUT_WIDTHS) {
      await setLayoutWidth(page, width);
      await page.goto("/academics#examination", { timeout: 180_000 });
      const cards = page.getByTestId("examination-card");
      await expect(cards).toHaveCount(4, { timeout: 90_000 });
      const boxes = await cards.evaluateAll((els) => els.map((el) => { const r = el.getBoundingClientRect(); return { x: Math.round(r.x), y: Math.round(r.y) }; }));
      const columns = new Set(boxes.map((box) => box.x)).size;
      expect(columns, `${width}px`).toBe(width >= 768 ? 2 : 1);
      await expectNoHorizontalScroll(page);
      await expectNoOverlap(page, page.locator("#examination"));
    }
  });

  test("markup typed into a block is shown as text", async ({ page }) => {
    test.setTimeout(300_000);
    await seedExamination([{ heading: "<b>Bold</b> heading", body: "<script>alert(1)</script>" }]);
    await setLayoutWidth(page, 1024);
    await page.goto("/academics#examination", { timeout: 180_000 });
    await expect(page.getByRole("heading", { level: 3, name: "<b>Bold</b> heading" })).toBeVisible({ timeout: 90_000 });
    await expect(page.getByText("<script>alert(1)</script>")).toBeVisible();
  });

  test("axe finds no violations on /academics with the examination blocks and the syllabi shown", async ({ page }) => {
    test.setTimeout(300_000);
    await seedExamination(EXAMINATION_FIXTURE);
    await seedSyllabi(bulkSyllabus().slice(0, 3));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics", { timeout: 180_000 });
    await expect(page.locator("#examination")).toBeVisible({ timeout: 90_000 });
    expect(await axe(page)).toEqual([]);
    await setLayoutWidth(page, 375);
    expect(await axe(page)).toEqual([]);
  });

  test("with no blocks the section, its menu entry and its search result are absent; the old address opens the page at the top", async ({ page }) => {
    test.setTimeout(300_000);
    await setLayoutWidth(page, 1440);
    await page.goto("/academics/examinations", { timeout: 180_000 });
    await expect(page).toHaveURL(/\/academics(#examination)?$/);
    await expect(page.locator("#examination")).toHaveCount(0);
    const nav = page.getByRole("navigation", { name: "Main menu" });
    await nav.getByRole("link", { name: "Academics", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Examination" })).toHaveCount(0);

    await seedExamination(EXAMINATION_FIXTURE.slice(0, 2));
    await page.goto("/academics", { timeout: 180_000 });
    await expect(page.locator("#examination")).toBeVisible();
    await nav.getByRole("link", { name: "Academics", exact: true }).hover();
    await expect(nav.getByRole("link", { name: "Examination" })).toHaveAttribute("href", "/academics#examination");
  });

  test("the sections keep the page's order: overview, Syllabi, Examination, then the rest", async ({ page }) => {
    test.setTimeout(300_000);
    await seedSyllabi(bulkSyllabus().slice(0, 2));
    await seedExamination(EXAMINATION_FIXTURE.slice(0, 2));
    await setLayoutWidth(page, 1024);
    await page.goto("/academics", { timeout: 180_000 });
    await expect(page.locator("#examination")).toBeVisible({ timeout: 90_000 });
    const ids = await page.locator("main section[id]").evaluateAll((els) => els.map((el) => el.id));
    expect(ids.slice(0, 4)).toEqual(["academic-overview", "syllabi", "examination", "teachers-training"]);
  });
});
