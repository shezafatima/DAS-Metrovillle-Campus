import AxeBuilder from "@axe-core/playwright";
import { test, expect, type Page } from "@playwright/test";
import { admissionProcedure } from "../src/content/admission";

// 020 US1: /admission shows Admission Procedure then Uniform; the procedure is the reference text word for word.

const headerHeight = (page: Page) => page.getByRole("banner").evaluate((el) => el.getBoundingClientRect().height);
const clearOfHeader = async (page: Page, id: string) => {
  const header = await headerHeight(page);
  await expect.poll(async () => (await page.locator(`#${id}`).evaluate((el) => el.getBoundingClientRect().top)) >= header - 1).toBe(true);
};

test.describe("admission page structure and procedure (020 US1)", () => {
  test("one h1, then Admission Procedure and Uniform, in that order", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/admission", { timeout: 180_000 });
    await expect(page.getByRole("heading", { level: 1 })).toHaveCount(1);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Admission");
    const ids = await page.locator("main section[id]").evaluateAll((els) => els.map((el) => el.id));
    expect(ids).toEqual(["admission-procedure", "uniform"]);
    await expect(page.locator("main").getByRole("heading", { level: 2 })).toHaveText(["Admission Procedure", "Uniform"]);
  });

  test("the four steps, lists and fee table are as on the reference", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/admission", { timeout: 180_000 });
    const section = page.locator("#admission-procedure");
    await expect(section.getByRole("heading", { level: 3 })).toHaveText(admissionProcedure.sections.map((s) => s.heading));

    const steps = section.getByTestId("procedure-steps");
    await expect(steps).toHaveCount(1);
    await expect(steps.locator(":scope > li")).toHaveCount(7);
    await expect(steps.locator(":scope > li").nth(1).locator("ul > li")).toHaveCount(4); // documents to attach

    const rules = section.locator("h4", { hasText: "Rules of Payment" }).locator("xpath=following-sibling::ol[1]");
    await expect(rules.locator("li")).toHaveCount(6);

    const fees = section.getByTestId("fee-table");
    await expect(fees.locator("tr")).toHaveCount(5);
    await expect(fees.locator('th[scope="row"]')).toHaveText(["A", "B", "C", "D", "E"]);
    await expect(fees).toHaveAccessibleName("The following fees are payable:");

    // Every procedure string is on the page (the word-for-word comparison itself is src/content/admission/fidelity.test.ts).
    const text = (await section.innerText()).replace(/\s+/g, " ");
    for (const s of admissionProcedure.sections) expect(text).toContain(s.intro);

    // The reference's promotional ending and next-step buttons are not shown (spec V3, V4).
    for (const absent of ["Success", "Apply Below!", "500,000"]) await expect(section.getByText(absent, { exact: false })).toHaveCount(0);
  });

  test("an axe scan of the page has no violations", async ({ page }) => {
    test.setTimeout(240_000);
    await page.goto("/admission", { timeout: 180_000 });
    const result = await new AxeBuilder({ page }).include("main").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  test.describe("desktop menu", () => {
    test.use({ viewport: { width: 1440, height: 800 } });
    test("Admission → Admission Procedure lands on the section, clear of the header", async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto("/contact", { timeout: 180_000 });
      const nav = page.getByRole("navigation", { name: "Main menu" });
      await nav.getByRole("link", { name: "Admission", exact: true }).hover();
      await nav.getByRole("link", { name: "Admission Procedure" }).click();
      await expect(page).toHaveURL("/admission#admission-procedure");
      await clearOfHeader(page, "admission-procedure");
    });
  });

  test.describe("mobile menu", () => {
    test.use({ viewport: { width: 375, height: 700 } });
    test("Admission → Admission Procedure lands on the section", async ({ page }) => {
      test.setTimeout(240_000);
      await page.goto("/contact", { timeout: 180_000 });
      await page.getByRole("button", { name: "Open menu" }).click();
      const menu = page.getByRole("navigation", { name: "Mobile menu" });
      await menu.getByRole("button", { name: "Admission" }).click();
      await menu.getByRole("link", { name: "Admission Procedure" }).click();
      await expect(page).toHaveURL("/admission#admission-procedure");
      await clearOfHeader(page, "admission-procedure");
    });
  });
});
