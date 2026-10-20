import AxeBuilder from "@axe-core/playwright";
import { test, expect } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, seedSettingsGroup, savedToast } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";
import { formatAdmissionDate, karachiToday } from "../src/lib/admission/window";

// 020 US2: Settings → Admission. Dates are relative to today in Pakistan, so the status line is predictable.

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

    const closes = shift(today, 30);
    await page.getByLabel("Opens on").fill(shift(today, -1));
    await page.getByLabel("Closes on").fill(closes);
    await page.getByLabel("Announcement").fill("Admissions are now open for Playgroup, Nursery, Class 1 and Class 2");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.admission.title)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("admission"))?.data).toEqual({
      opensOn: shift(today, -1),
      closesOn: closes,
      announcement: "Admissions are now open for Playgroup, Nursery, Class 1 and Class 2",
      closedMessage: "",
    });
    await expect(status(page)).toHaveText(`Open now until ${formatAdmissionDate(closes)}`, { timeout: 60_000 });
  });

  test("a future window says when it opens; clearing a date makes it Closed", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedSettingsGroup("admission", { opensOn: shift(today, 30), closesOn: shift(today, 60), announcement: "", closedMessage: "" });
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await expect(status(page)).toHaveText(`Opens on ${formatAdmissionDate(shift(today, 30))}`);

    await page.getByLabel("Opens on").fill("");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.admission.title)).toBeVisible({ timeout: 60_000 });
    await expect(status(page)).toHaveText(settingsCopy.admissionStatus.closed, { timeout: 60_000 });
  });

  test("Closes on before Opens on is refused under Closes on and nothing is saved", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "admission");
    await page.getByLabel("Opens on").fill("2027-03-31");
    await page.getByLabel("Closes on").fill("2027-01-01");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.errors.closesBeforeOpens)).toBeVisible({ timeout: 60_000 });
    expect(await readSettingsGroup("admission")).toBeNull();
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
