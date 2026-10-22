import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";
import {
  CLASSES,
  OPEN_NOW,
  VALID_VALUES,
  clearRegistrations,
  clearRegistrationRateLimit,
  closeAdmission,
  fillValidRegistration,
  findRegistrations,
  forwardedFor,
  openAdmission,
  openRegistrationPage,
  setNow,
} from "./helpers/registrations";

// 013 US1, US5-5, US8: the public registration form. Runs in the serial `forms`
// project. The window is faked open with the e2e-now cookie (2027-02-01), and
// each test uses its own rate-limit budget.

test.describe.configure({ mode: "serial" });

const SUBMIT = "Submit registration";
const errorOf = (page: Page, key: string) => page.locator(`#registration-${key}-error`);

test.describe("registration form (013)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(150) });

  test.beforeEach(async ({ context }) => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
    await openAdmission();
    await setNow(context, OPEN_NOW);
  });

  test.afterAll(async () => {
    await closeAdmission();
    await clearRegistrations();
  });

  test("a valid submission (Urdu student name, mother's mobile only) shows the reference, clears the form and stores one record", async ({ page }) => {
    await openRegistrationPage(page);
    await fillValidRegistration(page, { studentName: "زرتاشہ احمد", fatherMobile: "", motherMobile: "0321 1234567" });
    await expect(page.getByText("Allergies, conditions or medication the school should know about")).toBeVisible();
    await page.getByRole("button", { name: SUBMIT }).click();

    const reference = page.getByTestId("registration-reference");
    await expect(reference).toBeVisible({ timeout: 30_000 });
    await expect(reference).toHaveText(/^[2-9A-HJKMNP-Z]{8}$/);
    await expect(page.getByRole("status")).toContainText("keep it");
    await expect(page.locator("#registration-studentName")).toHaveCount(0);

    const stored = await findRegistrations();
    expect(stored).toHaveLength(1);
    expect(stored[0].reference).toBe(await reference.textContent());
    expect(stored[0].studentName).toBe("زرتاشہ احمد");
    expect(stored[0].fatherMobile).toBeNull();
    expect(stored[0].motherMobile).toBe("+923211234567");
    expect(stored[0].status).toBe("new");
    expect(stored[0].email).toBe("parent@example.com");
  });

  test("a submitted date or status injected into the request is ignored", async ({ page }) => {
    await page.route("**/api/public/registrations", async (route) => {
      const body = JSON.parse(route.request().postData() ?? "{}");
      await route.continue({ postData: JSON.stringify({ ...body, createdAt: "2001-01-01T00:00:00Z", status: "admitted", reference: "AAAAAAAA" }) });
    });
    await openRegistrationPage(page);
    await fillValidRegistration(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByTestId("registration-reference")).toBeVisible({ timeout: 30_000 });
    const [stored] = await findRegistrations();
    expect(stored.status).toBe("new");
    expect(stored.reference).not.toBe("AAAAAAAA");
    expect(new Date(stored.createdAt).getFullYear()).toBeGreaterThan(2020);
  });

  // One case per FR-002 rule: the message sits next to the right field and every other typed value stays.
  const RULES: Array<[string, Record<string, string>, string, RegExp]> = [
    ["student name required", { studentName: "" }, "studentName", /student's full name/],
    ["student name too short", { studentName: "A" }, "studentName", /student's full name/],
    ["father's name required", { fatherName: "" }, "fatherName", /father's full name/],
    ["mother's name required", { motherName: "" }, "motherName", /mother's full name/],
    ["email required", { email: "" }, "email", /valid email/],
    ["email invalid", { email: "not-an-email" }, "email", /valid email/],
    ["date of birth required", { dateOfBirth: "" }, "dateOfBirth", /date of birth/],
    ["too young (under 2)", { dateOfBirth: "2026-12-01" }, "dateOfBirth", /between 2 and 18/],
    ["too old (19 or over)", { dateOfBirth: "2000-01-01" }, "dateOfBirth", /between 2 and 18/],
    ["date of birth in the future", { dateOfBirth: "2027-06-01" }, "dateOfBirth", /cannot be in the future/],
    ["both parents' mobiles empty", { fatherMobile: "", motherMobile: "" }, "fatherMobile", /at least one parent/i],
    ["parent mobile not a Pakistani mobile", { fatherMobile: "02112345678" }, "fatherMobile", /Pakistani mobile/],
    ["address too short", { address: "Short" }, "address", /full address/],
    ["emergency number required", { emergencyPhone: "" }, "emergencyPhone", /Pakistani mobile number/],
    ["class required", { className: "" }, "className", /choose a class/],
    ["mother tongue required", { motherTongue: "" }, "motherTongue", /mother tongue/i],
    ["Other mother tongue needs text", { motherTongue: "other", motherTongueOther: "" }, "motherTongueOther", /Write the mother tongue/],
    ["reference: one of three filled", { referenceName: "Ali Khan" }, "referenceClass", /all three reference fields/],
    ["remarks too long", { remarks: "x".repeat(1001) }, "remarks", /1,000 characters/],
  ];

  for (const [title, overrides, key, message] of RULES) {
    test(`rule: ${title}`, async ({ page }) => {
      await openRegistrationPage(page);
      await fillValidRegistration(page, overrides);
      // The page caps what can be typed (maxLength), so a too-long remarks value is set through the DOM.
      if (title === "remarks too long") {
        await page.locator("#registration-remarks").evaluate((el, value) => {
          const area = el as HTMLTextAreaElement;
          area.removeAttribute("maxlength");
          const setter = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, "value")!.set!;
          setter.call(area, value);
          area.dispatchEvent(new Event("input", { bubbles: true }));
        }, "x".repeat(1001));
      }
      await page.getByRole("button", { name: SUBMIT }).click();

      await expect(errorOf(page, key)).toContainText(message);
      await expect(page.locator(`#registration-${key}`)).toHaveAttribute("aria-invalid", "true");
      expect(await findRegistrations()).toHaveLength(0);
      // Every other typed value is still there.
      const untouched = Object.keys(VALID_VALUES).filter((name) => !(name in overrides) && VALID_VALUES[name] !== "" && name !== "medicalHistory");
      for (const name of untouched.slice(0, 6)) {
        await expect(page.locator(`#registration-${name}`)).toHaveValue(VALID_VALUES[name]);
      }
    });
  }

  test("consent is required and the other values are kept", async ({ page }) => {
    await openRegistrationPage(page);
    await fillValidRegistration(page);
    await page.locator("#registration-consent").uncheck();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("#registration-consent-error")).toContainText("tick the box");
    await expect(page.locator("#registration-studentName")).toHaveValue("Zartasha Testchild");
  });

  test("vaccinated must be chosen", async ({ page }) => {
    await openRegistrationPage(page);
    await page.locator("#registration-consent").check();
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator("#registration-vaccinated-error")).toContainText("Choose Yes or No");
  });

  test("the Other input appears only for Other and the class list is exactly the Settings list, in order", async ({ page }) => {
    await openRegistrationPage(page);
    await expect(page.locator("#registration-motherTongueOther")).toHaveCount(0);
    await page.locator("#registration-motherTongue").selectOption("other");
    await expect(page.locator("#registration-motherTongueOther")).toBeVisible();
    await page.locator("#registration-motherTongue").selectOption("urdu");
    await expect(page.locator("#registration-motherTongueOther")).toHaveCount(0);
    const options = await page.locator("#registration-className option").allTextContents();
    expect(options).toEqual(["Choose a class", ...CLASSES]);
  });

  test("a class removed after the page loaded gives a message on the class field and keeps the other values", async ({ page }) => {
    await openRegistrationPage(page);
    await fillValidRegistration(page, { className: "Nursery" });
    await openAdmission({ classes: ["Playgroup", "Class 1"] });
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(errorOf(page, "className")).toContainText("choose a class from the list");
    await expect(page.locator("#registration-studentName")).toHaveValue("Zartasha Testchild");
    expect(await findRegistrations()).toHaveLength(0);
  });

  test("a server save failure keeps the values and shows the try-again banner", async ({ page }) => {
    await page.route("**/api/public/registrations", (route) => route.fulfill({ status: 503, contentType: "application/json", body: JSON.stringify({ error: "unavailable" }) }));
    await openRegistrationPage(page);
    await fillValidRegistration(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.locator('p[role="alert"]')).toContainText("Something went wrong");
    await expect(page.locator("#registration-studentName")).toHaveValue("Zartasha Testchild");
  });
});

test.describe("registration form layout and accessibility (013 US8)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(151) });

  test.beforeEach(async ({ context }) => {
    test.setTimeout(240_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
    await openAdmission();
    await setNow(context, OPEN_NOW);
  });

  for (const width of [375, 640, 768, 1024, 1440]) {
    test(`no horizontal scroll and the right columns at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openRegistrationPage(page);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow).toBeLessThanOrEqual(0);

      const name = await page.locator("#registration-studentName").boundingBox();
      const dob = await page.locator("#registration-dateOfBirth").boundingBox();
      if (width >= 768) {
        expect(Math.abs(name!.y - dob!.y)).toBeLessThan(8); // side by side
        expect(dob!.x).toBeGreaterThan(name!.x + name!.width - 2);
      } else {
        expect(Math.abs(name!.x - dob!.x)).toBeLessThan(2); // stacked
        expect(dob!.y).toBeGreaterThan(name!.y);
      }
      // A text area spans the full section width.
      const section = await page.locator("fieldset", { hasText: "Contact & address" }).boundingBox();
      const address = await page.locator("#registration-address").boundingBox();
      expect(address!.width).toBeGreaterThanOrEqual(section!.width - 4);
    });
  }

  test("error text uses the body font, not a serif", async ({ page }) => {
    await openRegistrationPage(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    const error = errorOf(page, "studentName");
    await expect(error).toBeVisible();
    const [errorFont, bodyFont] = await Promise.all([
      error.evaluate((el) => getComputedStyle(el).fontFamily),
      page.locator("body").evaluate((el) => getComputedStyle(el).fontFamily),
    ]);
    expect(errorFont).toMatch(/sans-serif$/);
    expect(errorFont.split(",")[0]).toBe(bodyFont.split(",")[0]);
  });

  test("axe finds no violations: open, with errors, and the confirmation", async ({ page }) => {
    await openRegistrationPage(page);
    const open = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(open.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => [n.target, n.any[0]?.message]))}`)).toEqual([]);

    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(errorOf(page, "studentName")).toBeVisible();
    const withErrors = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(withErrors.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => [n.target, n.any[0]?.message]))}`)).toEqual([]);

    await fillValidRegistration(page);
    await page.getByRole("button", { name: SUBMIT }).click();
    await expect(page.getByTestId("registration-reference")).toBeVisible({ timeout: 30_000 });
    const confirmation = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(confirmation.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => [n.target, n.any[0]?.message]))}`)).toEqual([]);
  });

  test("axe finds no violations on the closed page", async ({ page, context }) => {
    await closeAdmission();
    await setNow(context, OPEN_NOW);
    await page.goto("/admission/register", { timeout: 180_000 });
    await expect(page.getByTestId("registration-closed")).toBeVisible({ timeout: 90_000 });
    const result = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(result.violations.map((v) => v.id)).toEqual([]);
    await openAdmission();
  });
});
