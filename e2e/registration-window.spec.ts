import { expect, test, type BrowserContext, type Page } from "@playwright/test";
import {
  CLASSES,
  OPEN_WINDOW,
  VALID_VALUES,
  clearRegistrations,
  clearRegistrationRateLimit,
  closeAdmission,
  fillValidRegistration,
  findRegistrations,
  forwardedFor,
  levelId,
  openAdmission,
  setNow,
} from "./helpers/registrations";
import { seedSettingsGroup } from "./helpers/settings";

// 013 US2 and US5: the page, the server and the Apply Now link all follow the
// Pakistan-time window and the class list. The e2e-now cookie stands in for
// "now" (test server only), and the browser runs in America/New_York so a
// local-time bug cannot hide. Serial `forms` project.

test.describe.configure({ mode: "serial" });
test.use({ timezoneId: "America/New_York" });

const WINDOW = { opensOn: "2027-01-01", closesOn: "2027-03-31" };

// 2027-01-01 00:00 PKT is 2026-12-31T19:00:00Z; the last second of 2027-03-31 PKT is 2027-03-31T18:59:59Z.
const BEFORE_OPEN = "2026-12-31T18:59:59Z";
const AT_OPEN = "2026-12-31T19:00:00Z";
const LAST_SECOND = "2027-03-31T18:59:59Z";
const AFTER_CLOSE = "2027-03-31T19:00:00Z";
const MID = "2027-02-01T06:00:00Z";

function body(overrides: Record<string, unknown> = {}) {
  return { ...VALID_VALUES, vaccinated: "yes", consent: true, ...overrides };
}

async function post(page: Page, ip: number, data: unknown, context: BrowserContext) {
  void context;
  return page.request.post("/api/public/registrations", { data, headers: forwardedFor(ip) });
}

test.describe("registration window (013 US2)", () => {
  test.beforeEach(async () => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
  });

  test.afterAll(async () => {
    await closeAdmission();
    await clearRegistrations();
  });

  test("closed with a closed message: the message, no form and no inputs in the DOM", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, closedMessage: "Admissions for the new session will open soon" });
    await setNow(context, AFTER_CLOSE);
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toHaveText("Admissions for the new session will open soon", { timeout: 90_000 });
    await expect(page.locator("form")).toHaveCount(0);
    await expect(page.locator("#registration-main input, #registration-studentName")).toHaveCount(0);
    await expect(page.locator("main input, main textarea, main select")).toHaveCount(0);
  });

  test("closed with no message shows the default line", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, closedMessage: "" });
    await setNow(context, AFTER_CLOSE);
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toHaveText("Admissions are currently closed.", { timeout: 90_000 });
  });

  test("a direct POST while closed is refused with 403 and stores nothing, even with an invalid body", async ({ page, context }) => {
    await openAdmission(WINDOW);
    await setNow(context, AFTER_CLOSE);
    // The e2e-now cookie travels with the page's request context.
    const valid = await post(page, 160, body(), context);
    expect(valid.status()).toBe(403);
    expect(await valid.json()).toEqual({ error: "closed", message: "Admissions are closed. Please check the Admission page for dates." });
    const invalid = await post(page, 161, {}, context);
    expect(invalid.status()).toBe(403);
    expect(await findRegistrations()).toHaveLength(0);
  });

  test("Opens on: refused one second before 00:00 Pakistan time, accepted at 00:00:00", async ({ page, context }) => {
    await openAdmission(WINDOW);
    await setNow(context, BEFORE_OPEN);
    expect((await post(page, 162, body(), context)).status()).toBe(403);
    await setNow(context, AT_OPEN);
    expect((await post(page, 163, body(), context)).status()).toBe(200);
    expect(await findRegistrations()).toHaveLength(1);
  });

  test("Closes on: accepted at 23:59:59 Pakistan time, refused at 00:00:00 the next day", async ({ page, context }) => {
    await openAdmission(WINDOW);
    await setNow(context, LAST_SECOND);
    expect((await post(page, 164, body(), context)).status()).toBe(200);
    await setNow(context, AFTER_CLOSE);
    expect((await post(page, 165, body(), context)).status()).toBe(403);
    expect(await findRegistrations()).toHaveLength(1);
  });

  test("the window closes while the form is open: the closed banner shows and the values are kept", async ({ page, context }) => {
    await openAdmission(WINDOW);
    await setNow(context, LAST_SECOND);
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.locator("#registration-studentName")).toBeVisible({ timeout: 90_000 });
    await fillValidRegistration(page);
    await setNow(context, AFTER_CLOSE);
    await page.getByRole("button", { name: "Submit registration" }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("Admissions are closed");
    await expect(page.locator("#registration-studentName")).toHaveValue("Zartasha Testchild");
    expect(await findRegistrations()).toHaveLength(0);
  });

  test("Apply Now links to the form exactly while registration is open", async ({ page, context }) => {
    await openAdmission(WINDOW);
    const cases: [string, number][] = [
      [BEFORE_OPEN, 0],
      [AT_OPEN, 1],
      [MID, 1],
      [LAST_SECOND, 1],
      [AFTER_CLOSE, 0],
    ];
    for (const [instant, count] of cases) {
      await setNow(context, instant);
      await page.goto("/admission", { timeout: 180_000 });
      const apply = page.getByTestId("admission-apply");
      await expect(apply, instant).toHaveCount(count);
      if (count === 1) await expect(apply).toHaveAttribute("href", "/admission/register");
    }
  });
});

test.describe("classes drive the form (013 US5)", () => {
  test.beforeEach(async () => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
  });

  test.afterAll(async () => {
    await closeAdmission();
  });

  test("an open window with an empty class list hides the form, hides Apply Now and refuses a direct POST", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: [] });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("form")).toHaveCount(0);
    await page.goto("/admission", { timeout: 180_000 });
    await expect(page.getByTestId("admission-apply")).toHaveCount(0);
    expect((await post(page, 166, body(), context)).status()).toBe(403);
  });

  const classOptions = async (page: import("@playwright/test").Page) => {
    await expect(page.locator("#registration-className")).toBeVisible({ timeout: 90_000 });
    return page.locator("#registration-className option").allTextContents();
  };

  test("the class select lists exactly the ticked Class Levels, in Class Levels order (014b)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Nursery", "Playgroup", "Class 1", "Class 2"] });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    expect(await classOptions(page)).toEqual(["Choose a class", "Nursery", "Playgroup", "Class 1", "Class 2"]);
    void CLASSES;
  });

  test("a level that exists but is not ticked is not offered, and the order is the table's, not the tick order (014b)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Playgroup", "Nursery", "Class 1"] });
    // Untick Nursery: the admission list keeps only the first and the last level.
    await seedSettingsGroup("admission", {
      ...OPEN_WINDOW,
      announcement: "",
      closedMessage: "",
      classes: [
        { id: "00000002-0000-4000-8000-000000000009", name: "Class 1", levelId: levelId(2), deletedAt: null },
        { id: "00000002-0000-4000-8000-000000000008", name: "Playgroup", levelId: levelId(0), deletedAt: null },
      ],
    });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    expect(await classOptions(page)).toEqual(["Choose a class", "Playgroup", "Class 1"]);
  });

  test("a level renamed in Class Levels is offered under its new name (014b)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Playgroup", "Class 1"] });
    await seedSettingsGroup("classLevels", {
      ageReferenceDate: "07-31",
      levels: [
        { id: levelId(0), name: "Pre-School", ageRule: "3 to 4 years", deletedAt: null },
        { id: levelId(1), name: "Class 1", ageRule: "5 to 6 years", deletedAt: null },
      ],
    });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    expect(await classOptions(page)).toEqual(["Choose a class", "Pre-School", "Class 1"]);
  });

  test("a ticked level that was deleted is no longer offered, and with none left the form is closed (014b)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Playgroup", "Class 1"] });
    await seedSettingsGroup("classLevels", {
      ageReferenceDate: "07-31",
      levels: [{ id: levelId(0), name: "Playgroup", ageRule: "3 to 4 years", deletedAt: null }, { id: levelId(1), name: "Class 1", ageRule: "x", deletedAt: new Date() }],
    });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    expect(await classOptions(page)).toEqual(["Choose a class", "Playgroup"]);

    await seedSettingsGroup("classLevels", { ageReferenceDate: "07-31", levels: [] });
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toBeVisible({ timeout: 90_000 });
    await expect(page.locator("form")).toHaveCount(0);
  });

  test("a typed name that is not linked to a level is still offered, after the ticked levels (014b, Clarification 1)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Playgroup", "Class 1"], unlinked: ["Grade 9"] });
    await setNow(context, MID);
    await page.goto("/admission/register", { timeout: 180_000 });
    expect(await classOptions(page)).toEqual(["Choose a class", "Playgroup", "Class 1", "Grade 9"]);
  });

  test("an old submission keeps the class name it was sent with, whatever the level is called later (014b)", async ({ page, context }) => {
    await openAdmission({ ...WINDOW, classes: ["Playgroup", "Class 1"] });
    await setNow(context, MID);
    const sent = await post(page, 167, { ...body(), className: "Class 1" }, context);
    expect(sent.status()).toBe(200);
    await seedSettingsGroup("classLevels", {
      ageReferenceDate: "07-31",
      levels: [{ id: levelId(1), name: "Grade 1", ageRule: "5 to 6 years", deletedAt: null }],
    });
    const rows = await findRegistrations();
    expect(rows.map((row) => row.className)).toEqual(["Class 1"]);
  });
});
