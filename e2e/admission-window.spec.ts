import AxeBuilder from "@axe-core/playwright";
import { test, expect, type BrowserContext, type Page } from "@playwright/test";
import { seedSettingsGroup } from "./helpers/settings";

// 020 US3: the banner / quiet note above the procedure, switching at 00:00 Pakistan time (UTC+5) with no save
// or redeploy. The e2e-now cookie stands in for "now" on the Playwright dev server only (E2E_FRESH_READS=1).

test.describe.configure({ mode: "serial" });

const SPRING = { opensOn: "2027-01-01", closesOn: "2027-03-31" };

async function at(context: BrowserContext, iso: string) {
  await context.addCookies([{ name: "e2e-now", value: iso, url: "http://localhost:3100" }]);
}
async function open(page: Page) {
  await page.goto("/admission", { timeout: 180_000 });
}
const banner = (page: Page) => page.getByTestId("admission-banner");
const note = (page: Page) => page.getByTestId("admission-closed-note");

test.describe("admission window on the public page (020 US3)", () => {
  test.afterAll(async () => {
    await seedSettingsGroup("admission", { opensOn: "", closesOn: "", announcement: "", closedMessage: "" });
  });

  test("open: the banner shows the announcement and the closing date, above the procedure; no Apply Now", async ({ page, context }) => {
    test.setTimeout(240_000);
    await seedSettingsGroup("admission", { ...SPRING, announcement: "Admissions are now open for Playgroup, Nursery, Class 1 and Class 2", closedMessage: "Opening soon" });
    await at(context, "2027-02-01T06:00:00Z");
    await open(page);
    await expect(banner(page)).toHaveText(/Admissions are now open for Playgroup, Nursery, Class 1 and Class 2\s*Applications close on 31 March 2027/);
    await expect(note(page)).toHaveCount(0);
    await expect(page.getByTestId("admission-apply")).toHaveCount(0); // the registration form does not exist yet
    const [b, firstStep] = [await banner(page).boundingBox(), await page.getByTestId("procedure-step").first().boundingBox()];
    expect(b!.y + b!.height).toBeLessThanOrEqual(firstStep!.y);
    const result = await new AxeBuilder({ page }).include("#admission-procedure").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  test("open without an announcement: only the closing date", async ({ page, context }) => {
    test.setTimeout(240_000);
    await seedSettingsGroup("admission", { ...SPRING, announcement: "", closedMessage: "" });
    await at(context, "2027-02-01T06:00:00Z");
    await open(page);
    await expect(banner(page)).toHaveText("Applications close on 31 March 2027");
  });

  test("switches by itself at midnight Pakistan time on both edges, with no save in between", async ({ page, context }) => {
    test.setTimeout(300_000);
    await seedSettingsGroup("admission", { ...SPRING, announcement: "Open", closedMessage: "Admissions for the new session will open soon" });
    const cases: [string, boolean][] = [
      ["2026-12-31T18:59:59Z", false], // 23:59:59 PKT the day before
      ["2026-12-31T19:00:00Z", true], // 00:00:00 PKT on Opens on
      ["2027-03-31T18:59:59Z", true], // 23:59:59 PKT on Closes on
      ["2027-03-31T19:00:00Z", false], // 00:00:00 PKT the day after
    ];
    for (const [instant, isOpen] of cases) {
      await at(context, instant);
      await open(page);
      await expect(banner(page), instant).toHaveCount(isOpen ? 1 : 0);
      await expect(note(page), instant).toHaveCount(isOpen ? 0 : 1);
      await expect(page.getByTestId("admission-apply"), instant).toHaveCount(0);
    }
  });

  test("closed: the quiet note shows the closed message, and axe passes", async ({ page, context }) => {
    test.setTimeout(240_000);
    await seedSettingsGroup("admission", { opensOn: "", closesOn: "2027-03-31", announcement: "Open", closedMessage: "Admissions for the new session will open soon" });
    await at(context, "2027-02-01T06:00:00Z");
    await open(page);
    await expect(note(page)).toHaveText("Admissions for the new session will open soon");
    await expect(banner(page)).toHaveCount(0);
    const result = await new AxeBuilder({ page }).include("#admission-procedure").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
  });

  test("closed without a message: nothing above the procedure", async ({ page, context }) => {
    test.setTimeout(240_000);
    await seedSettingsGroup("admission", { ...SPRING, announcement: "Open", closedMessage: "" });
    await at(context, "2027-05-01T06:00:00Z");
    await open(page);
    await expect(banner(page)).toHaveCount(0);
    await expect(note(page)).toHaveCount(0);
  });
});
