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
import { FORM_UI_WIDTHS, contrast, paintedBackground, record, shot, typingSpace } from "./helpers/form-ui";

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
      // A text area spans the full width of its card's field grid (the card itself has padding).
      const section = await page.locator("fieldset", { hasText: "Contact & address" }).locator("div.grid").boundingBox();
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

// 026: the shared form UI. Numbered section cards, the progress list (1024px and up) or bar (below), the error
// summary, the submitting state, field icons, focus and contrast. Screenshots and measurements go to test-results/form-ui.
test.describe("registration form shared UI (026)", () => {
  test.use({ extraHTTPHeaders: forwardedFor(151) });

  test.beforeEach(async ({ context }) => {
    test.setTimeout(300_000);
    await clearRegistrations();
    await clearRegistrationRateLimit();
    await openAdmission();
    await setNow(context, OPEN_NOW);
  });

  test.afterAll(async () => {
    await closeAdmission();
    await clearRegistrations();
  });

  for (const width of FORM_UI_WIDTHS) {
    test(`layout, progress, targets, icons, error and submitting states at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openRegistrationPage(page);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);

      // Six numbered cards, each a fieldset whose legend is only the title.
      await expect(page.locator("fieldset > legend")).toHaveText(["Student", "Parents", "Contact & address", "Health", "Reference", "Remarks"]);
      const badges = await page.locator(".registration-badge").evaluateAll((els) => els.map((e) => getComputedStyle(e, "::before").content));
      // The number is a CSS counter (the browser reports the expression, not the digit); six badges, one per card.
      expect(badges).toEqual(Array(6).fill("counter(registration-section)"));

      // Progress: a bar under the header below 1024px, a sticky list beside the cards from 1024px.
      const bar = page.getByTestId("progress-bar");
      const list = page.getByTestId("progress-list");
      const header = page.getByRole("banner");
      await page.evaluate(() => window.scrollTo(0, 0));
      if (width < 1024) {
        await expect(bar).toBeVisible();
        await expect(bar).toContainText("Section 1 of 6 · Student");
        await expect(list).toBeHidden();
      } else {
        await expect(list).toBeVisible();
        await expect(bar).toBeHidden();
        const nav = page.getByRole("navigation", { name: "Registration progress" });
        await expect(nav.getByRole("link", { name: /^Student/ })).toHaveAttribute("aria-current", "step");
        await expect(nav).toContainText("0 of 4 sections complete");
        await expect(nav.getByText("Optional")).toHaveCount(2);
      }

      // Scrolling to the Parents card makes it the current section.
      await page.evaluate(() => document.getElementById("registration-section-parents")!.scrollIntoView({ block: "start" }));
      if (width < 1024) {
        await expect(bar).toContainText("Section 2 of 6 · Parents");
      } else {
        await expect(page.getByRole("navigation", { name: "Registration progress" }).getByRole("link", { name: /^Parents/ })).toHaveAttribute("aria-current", "step");
        // The list is sticky: it is still on screen after scrolling a long way down.
        const box = (await list.boundingBox())!;
        expect(box.y).toBeGreaterThanOrEqual(0);
        expect(box.y + box.height).toBeLessThanOrEqual(900);
      }

      // A focused field far down the page is never hidden by the header or the bar.
      await page.locator("#registration-address").focus();
      const focused = (await page.locator("#registration-address").boundingBox())!;
      const headerBox = (await header.boundingBox())!;
      const barBox = width < 1024 ? (await bar.boundingBox())! : null;
      const clearOf = Math.max(headerBox.y + headerBox.height, barBox ? barBox.y + barBox.height : 0);
      expect(focused.y).toBeGreaterThanOrEqual(clearOf - 1);

      // Touch targets: at least 44px tall.
      const targets = ["#registration-studentName", "#registration-className", "#registration-email", 'label:has(input[type="radio"])', 'label[for="registration-consent"]', 'button[type="submit"]'];
      for (const selector of targets) {
        const target = page.locator(selector).first();
        await target.scrollIntoViewIfNeeded();
        expect((await target.boundingBox())!.height, selector).toBeGreaterThanOrEqual(43.5);
      }

      // Icons: only on email, the mobile numbers and the date of birth. Text never overlaps the icon, the icon is not
      // a target, and there is still room to type at this width.
      for (const id of ["email", "fatherMobile", "motherMobile", "emergencyPhone", "dateOfBirth"]) {
        const input = page.locator(`#registration-${id}`);
        await input.scrollIntoViewIfNeeded();
        const space = await typingSpace(input);
        record(`registration typing width ${width}px ${id}`, Math.round(space.typing));
        expect(space.iconRight, id).toBeLessThanOrEqual(space.paddingLeft);
        expect(space.iconIgnoresPointer, id).toBe(true);
        expect(space.iconIsHitTarget, id).toBe(false);
        expect(space.typing, id).toBeGreaterThanOrEqual(width <= 375 ? 180 : 220);
      }
      for (const id of ["studentName", "fatherName", "address", "remarks", "medicalHistory"]) {
        expect(await page.locator(`#registration-${id}`).locator("xpath=..").locator("svg").count(), id).toBe(0);
      }

      await page.evaluate(() => window.scrollTo(0, 0));
      await page.screenshot({ path: shot(`registration-${width}`), fullPage: true });

      // Error state: the summary takes focus, lists the problems as links, and a link moves focus to its field.
      await page.getByRole("button", { name: SUBMIT }).click();
      const summary = page.getByTestId("error-summary");
      await expect(summary).toBeVisible();
      await expect(summary).toBeFocused();
      await expect(summary).toHaveAccessibleName("Please fix the following");
      expect(await summary.getByRole("link").count()).toBeGreaterThanOrEqual(8);
      // The site scrolls smoothly: let a focus-driven scroll finish before the picture.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: shot(`registration-error-${width}`) });
      await summary.getByRole("link").first().click();
      await expect(page.locator("#registration-studentName")).toBeFocused();
      const afterLink = (await page.locator("#registration-studentName").boundingBox())!;
      expect(afterLink.y).toBeGreaterThanOrEqual(clearOf - 1);

      // Submitting state: "Submitting…" with a spinner, disabled, and one request however fast it is clicked.
      let requests = 0;
      await page.route("**/api/public/registrations", async (route) => {
        requests += 1;
        await new Promise((resolve) => setTimeout(resolve, 2500));
        await route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ ok: true, reference: "K7MQ2XRT" }) });
      });
      await fillValidRegistration(page);
      const submit = page.locator('button[type="submit"]');
      await submit.scrollIntoViewIfNeeded();
      await submit.dblclick();
      await expect(submit).toBeDisabled();
      await expect(submit).toHaveText("Submitting…");
      await expect(submit.locator("svg")).toHaveCount(1);
      await expect(submit).toHaveAttribute("aria-busy", "true");
      // The site scrolls smoothly: let a focus-driven scroll finish before the picture.
      await page.waitForTimeout(1200);
      await page.screenshot({ path: shot(`registration-submitting-${width}`) });
      await expect(page.getByText("K7MQ2XRT")).toBeVisible({ timeout: 30_000 });
      expect(requests).toBe(1);
    });
  }

  test("a section turns done as its required fields become valid, and the count is of required sections only", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openRegistrationPage(page);
    const nav = page.getByRole("navigation", { name: "Registration progress" });
    const item = (title: RegExp) => nav.getByRole("link", { name: title });
    await expect(item(/^Student/)).not.toHaveAttribute("data-status", "done");
    await page.locator("#registration-studentName").fill("Zartasha Testchild");
    await page.locator("#registration-dateOfBirth").fill("2020-05-01");
    await page.locator("#registration-className").selectOption("Class 1");
    await expect(item(/^Student/)).toHaveAttribute("data-status", "done");
    await expect(nav).toContainText("1 of 4 sections complete");
    // Optional: not done until filled in validly; never counted.
    await page.locator("#registration-referenceName").fill("Ali Khan");
    await expect(item(/^Reference/)).not.toHaveAttribute("data-status", "done");
    await page.locator("#registration-referenceClass").fill("Class 2");
    await page.locator("#registration-referenceRelation").fill("Cousin");
    await expect(item(/^Reference/)).toHaveAttribute("data-status", "done");
    await expect(nav).toContainText("1 of 4 sections complete");
  });

  test("focus, headers, buttons and outlines are measured for contrast", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await openRegistrationPage(page);
    const white = "rgb(255, 255, 255)";

    // Resting outline of a field (3:1 needed for a control boundary).
    const field = page.locator("#registration-studentName");
    const resting = await field.evaluate((el) => getComputedStyle(el).borderTopColor);
    record("field outline vs white", { colour: resting, ratio: Number(contrast(resting, white).toFixed(2)) });
    expect(contrast(resting, white)).toBeGreaterThanOrEqual(3);

    // Focus: a 2px navy outline plus a soft gold ring.
    await field.focus();
    const focus = await field.evaluate((el) => {
      const style = getComputedStyle(el);
      return { outlineColor: style.outlineColor, outlineWidth: style.outlineWidth, outlineStyle: style.outlineStyle, boxShadow: style.boxShadow };
    });
    record("focus outline", { ...focus, ratioVsWhite: Number(contrast(focus.outlineColor, white).toFixed(2)) });
    expect(focus.outlineStyle).not.toBe("none");
    expect(parseFloat(focus.outlineWidth)).toBeGreaterThanOrEqual(2);
    expect(contrast(focus.outlineColor, white)).toBeGreaterThanOrEqual(3);
    expect(focus.boxShadow).not.toBe("none");

    // Section header: navy text on the navy tint (bg-primary/10), the tint read from the painted pixels.
    const legend = page.locator("fieldset > legend").first();
    const legendText = await legend.evaluate((el) => getComputedStyle(el).color);
    const tint = await paintedBackground(legend);
    record("section header", { text: legendText, tint, ratio: Number(contrast(legendText, tint).toFixed(2)) });
    expect(contrast(legendText, tint)).toBeGreaterThanOrEqual(4.5);
    const badge = page.locator(".registration-badge").first();
    const badgeColours = await badge.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    record("number badge (navy on gold)", { ...badgeColours, ratio: Number(contrast(badgeColours.color, badgeColours.bg).toFixed(2)) });
    expect(contrast(badgeColours.color, badgeColours.bg)).toBeGreaterThanOrEqual(4.5);

    // Submit button: white on navy at rest, navy on gold on hover and on keyboard focus.
    const submit = page.locator('button[type="submit"]');
    await submit.scrollIntoViewIfNeeded();
    const read = () => submit.evaluate((el) => ({ bg: getComputedStyle(el).backgroundColor, color: getComputedStyle(el).color }));
    const idle = await read();
    await submit.hover();
    await page.waitForTimeout(400);
    const hover = await read();
    await page.mouse.move(0, 0);
    await submit.focus();
    await page.waitForTimeout(400);
    const focused = await read();
    for (const [name, state] of [["idle", idle], ["hover", hover], ["focus", focused]] as const) {
      record(`submit button ${name}`, { ...state, ratio: Number(contrast(state.color, state.bg).toFixed(2)) });
      expect(contrast(state.color, state.bg), name).toBeGreaterThanOrEqual(4.5);
    }
    expect(idle.bg).toBe("rgb(25, 25, 144)");
    expect(hover.bg).toBe("rgb(255, 215, 0)");
    expect(focused.bg).toBe("rgb(255, 215, 0)");

    // Error text, and an invalid field's outline in the error colour.
    await submit.click();
    const message = await page.locator("#registration-studentName-error").evaluate((el) => ({ color: getComputedStyle(el).color, bg: getComputedStyle(el).backgroundColor }));
    record("error message", { ...message, ratio: Number(contrast(message.color, message.bg).toFixed(2)) });
    expect(contrast(message.color, message.bg)).toBeGreaterThanOrEqual(4.5);
    expect(await page.locator("#registration-studentName").evaluate((el) => getComputedStyle(el).borderTopColor)).toBe("rgb(179, 38, 30)");
  });

  for (const width of [375, 1440]) {
    test(`axe finds no violations on the form at ${width}px, including with the error summary showing`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await openRegistrationPage(page);
      let result = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
      await page.getByRole("button", { name: SUBMIT }).click();
      await expect(page.getByTestId("error-summary")).toBeFocused();
      // Let smooth scrolling and colour transitions finish: axe would otherwise read a button halfway between two colours.
      await page.mouse.move(0, 0);
      await page.waitForTimeout(1200);
      result = await new AxeBuilder({ page }).include("#registration").withTags(["wcag2a", "wcag2aa"]).analyze();
      expect(result.violations.map((v) => `${v.id} ${JSON.stringify(v.nodes.map((n) => n.target))}`)).toEqual([]);
    });
  }
});
