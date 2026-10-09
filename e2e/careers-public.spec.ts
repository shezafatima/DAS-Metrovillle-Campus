import { test, expect, type Page } from "@playwright/test";
import { reapplyFrom } from "../src/lib/careers/rules";
import {
  FIXTURE_PDF,
  FIXTURE_RENAMED,
  backdateApplication,
  clearCareerApplications,
  findCareerApplications,
  forwardedFor,
  oversizedPdf,
  seedCareerApplications,
  setStoreUnavailable,
  storeFileExists,
} from "./helpers/careers";

// Runs in the "forms" Playwright project (serial). Each describe isolates
// its own rate-limit budget with a per-spec X-Forwarded-For (TEST-NET-2),
// so these specs never share throttle counts with each other or with the
// contact specs.

async function fillApplication(page: Page, overrides: Partial<Record<"name" | "email" | "phone" | "qualification", string>> = {}) {
  await page.getByRole("textbox", { name: "Full name" }).fill(overrides.name ?? "Ayesha Khan");
  await page.getByRole("textbox", { name: "Email" }).fill(overrides.email ?? "ayesha@example.com");
  await page.getByRole("textbox", { name: "Mobile number" }).fill(overrides.phone ?? "03001234567");
  await page.getByRole("textbox", { name: "Highest qualification" }).fill(overrides.qualification ?? "M.Ed");
}

async function attach(page: Page, file: string | { name: string; mimeType: string; buffer: Buffer }) {
  await page.locator("#careers-cv").setInputFiles(file);
}

async function consentAndSubmit(page: Page) {
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "Apply" }).click();
}

test.describe("careers — apply successfully", () => {
  test.use({ extraHTTPHeaders: forwardedFor(30) });
  test.beforeEach(async () => {
    await clearCareerApplications();
  });

  test("shows the confirmation and stores the application with its CV privately", async ({ page }) => {
    await page.goto("/careers");
    await expect(page.getByRole("heading", { name: "Careers", level: 1 })).toBeVisible();

    await fillApplication(page);
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);

    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveCount(0);

    const docs = await findCareerApplications({ email: "ayesha@example.com" });
    expect(docs).toHaveLength(1);
    expect(docs[0]!.phone).toBe("+923001234567");
    expect(docs[0]!.cv.storedAt).not.toBeNull();
    expect(await storeFileExists(docs[0]!.cv.key)).toBe(true);
  });

  test("accepts an Urdu name and qualification", async ({ page }) => {
    await page.goto("/careers");
    await fillApplication(page, { name: "عائشہ خان", email: "urdu@example.com", phone: "03007654321", qualification: "ایم اے اردو" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);

    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });
    const docs = await findCareerApplications({ email: "urdu@example.com" });
    expect(docs[0]!.name).toBe("عائشہ خان");
    expect(docs[0]!.qualification).toBe("ایم اے اردو");
  });
});

test.describe("careers — validation messages", () => {
  test.use({ extraHTTPHeaders: forwardedFor(31) });
  test.beforeEach(async () => {
    await clearCareerApplications();
  });

  test("an empty submit shows a message next to each field and stores nothing", async ({ page }) => {
    await page.goto("/careers");
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByText("Enter your full name.")).toBeVisible();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Enter a Pakistani mobile number, e.g. 03001234567.")).toBeVisible();
    await expect(page.getByText("Enter your highest qualification.")).toBeVisible();
    await expect(page.getByText("Choose your CV as a PDF file.")).toBeVisible();
    await expect(page.getByText("Please tick the box to agree before applying.")).toBeVisible();
    expect(await findCareerApplications()).toHaveLength(0);
  });

  test("a PNG renamed .pdf is refused and nothing is stored", async ({ page }) => {
    await page.goto("/careers");
    await fillApplication(page);
    await attach(page, FIXTURE_RENAMED);
    await consentAndSubmit(page);

    await expect(page.getByText("Your CV must be a PDF file.")).toBeVisible();
    expect(await findCareerApplications()).toHaveLength(0);
  });

  test("a PDF over the limit is refused with a message that states the limit", async ({ page }) => {
    await page.goto("/careers");
    await fillApplication(page);
    await attach(page, { name: "big.pdf", mimeType: "application/pdf", buffer: oversizedPdf() });
    await consentAndSubmit(page);

    await expect(page.getByText("Your CV must be 4 MB or smaller.")).toBeVisible();
    expect(await findCareerApplications()).toHaveLength(0);
  });

  test("a failed attempt keeps the typed details and the chosen file", async ({ page }) => {
    await page.goto("/careers");
    await fillApplication(page);
    await attach(page, FIXTURE_PDF);
    // Consent left unticked: the form refuses locally and keeps everything.
    await page.getByRole("button", { name: "Apply" }).click();

    await expect(page.getByText("Please tick the box to agree before applying.")).toBeVisible();
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Ayesha Khan");
    await expect(page.getByText("Selected: cv-valid.pdf")).toBeVisible();
  });
});

test.describe("careers — document store unavailable", () => {
  test.use({ extraHTTPHeaders: forwardedFor(32) });
  test.beforeEach(async () => {
    await clearCareerApplications();
  });
  test.afterEach(async () => {
    await setStoreUnavailable(false);
  });

  test("tells the applicant to try again, keeps their details, and succeeds once the store is back", async ({ page }) => {
    await page.goto("/careers");
    await fillApplication(page);
    await attach(page, FIXTURE_PDF);
    await setStoreUnavailable(true);
    await consentAndSubmit(page);

    await expect(page.locator('p[role="alert"]')).toContainText("We couldn't save your application just now", { timeout: 15000 });
    await expect(page.getByRole("textbox", { name: "Full name" })).toHaveValue("Ayesha Khan");
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("ayesha@example.com");
    await expect(page.getByText("Selected: cv-valid.pdf")).toBeVisible();
    expect(await findCareerApplications()).toHaveLength(0);

    await setStoreUnavailable(false);
    await page.getByRole("button", { name: "Apply" }).click();
    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });
    expect(await findCareerApplications({ email: "ayesha@example.com" })).toHaveLength(1);
  });
});

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

/** `"2026-11-01"` → `"1 November 2026"`, as the refusal message shows it. */
function longDate(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

test.describe("careers — one application per person per 30 days", () => {
  test.use({ extraHTTPHeaders: forwardedFor(34) });
  test.beforeEach(async () => {
    await clearCareerApplications();
  });

  test("refuses the same email, then the same phone, with one message and date; accepts again after 30 days; keeps both records", async ({ page }) => {
    // First application.
    await page.goto("/careers");
    await fillApplication(page);
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });

    const [first] = await findCareerApplications({ email: "ayesha@example.com" });
    const expected = `You applied recently. You can apply again from ${longDate(reapplyFrom(first!.createdAt))}.`;
    const alert = page.locator('p[role="alert"]');

    // Same email, different phone.
    await page.goto("/careers");
    await fillApplication(page, { name: "Someone Else", phone: "03007654321" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(alert).toHaveText(expected, { timeout: 15000 });
    await expect(page.getByRole("textbox", { name: "Email" })).toHaveValue("ayesha@example.com");
    await expect(page.getByText("Selected: cv-valid.pdf")).toBeVisible();

    // Same phone, different email: the identical message (it never says which field matched).
    await page.goto("/careers");
    await fillApplication(page, { name: "Someone Else", email: "stranger@example.com" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(alert).toHaveText(expected, { timeout: 15000 });

    // Nothing was added or changed, and no second file was written.
    const stillOne = await findCareerApplications();
    expect(stillOne).toHaveLength(1);
    expect(stillOne[0]!.name).toBe("Ayesha Khan");

    // Thirty days later the same person may apply again, with no admin action.
    await backdateApplication("ayesha@example.com", 30);
    await page.goto("/careers");
    await fillApplication(page, { name: "Ayesha K. Khan" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });

    const both = await findCareerApplications({ email: "ayesha@example.com" });
    expect(both).toHaveLength(2);
    expect(both.map((doc) => doc.name).sort()).toEqual(["Ayesha K. Khan", "Ayesha Khan"]);
    expect(await storeFileExists(both[0]!.cv.key)).toBe(true);
    expect(await storeFileExists(both[1]!.cv.key)).toBe(true);
  });
});

test.describe("careers — a deleted application does not block", () => {
  test.use({ extraHTTPHeaders: forwardedFor(35) });
  test.beforeEach(async () => {
    await clearCareerApplications();
  });

  test("a deleted applicant can apply again at once, a live recent one cannot", async ({ page }) => {
    await seedCareerApplications([
      { email: "gone@example.com", phone: "+923005550001", deletedAt: new Date() },
      { email: "live@example.com", phone: "+923005550002" },
    ]);

    await page.goto("/careers");
    await fillApplication(page, { email: "live@example.com", phone: "03005550002" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(page.locator('p[role="alert"]')).toContainText("You applied recently. You can apply again from", { timeout: 15000 });

    await page.goto("/careers");
    await fillApplication(page, { email: "gone@example.com", phone: "03005550001" });
    await attach(page, FIXTURE_PDF);
    await consentAndSubmit(page);
    await expect(page.getByRole("status")).toContainText("Thank you for applying", { timeout: 15000 });
  });
});

const WIDTHS: Array<{ w: number; h: number }> = [
  { w: 375, h: 900 },
  { w: 768, h: 1024 },
  { w: 1024, h: 900 },
  { w: 1440, h: 900 },
];

for (const { w, h } of WIDTHS) {
  test.describe(`careers page at ${w}px`, () => {
    test.use({ extraHTTPHeaders: forwardedFor(33) });

    test("has no horizontal scroll and aligns the fields on one grid", async ({ page }) => {
      await page.setViewportSize({ width: w, height: h });
      await page.goto("/careers");
      await page.waitForLoadState("networkidle");

      const overflowing = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
      expect(overflowing).toBe(false);

      const box = async (selector: string) => {
        const rect = await page.locator(selector).first().boundingBox();
        expect(rect, selector).not.toBeNull();
        return rect!;
      };
      const name = await box("#careers-name");
      const email = await box("#careers-email");
      const phone = await box("#careers-phone");
      const qualification = await box("#careers-qualification");
      const cv = await box('label[for="careers-cv"]');
      const button = await box('button[type="submit"]');

      if (w >= 768) {
        // Two columns: name|email and phone|qualification share rows and edges; CV and button span both.
        expect(Math.abs(name.y - email.y)).toBeLessThan(2);
        expect(Math.abs(phone.y - qualification.y)).toBeLessThan(2);
        expect(Math.abs(name.x - phone.x)).toBeLessThan(2);
        expect(Math.abs(email.x - qualification.x)).toBeLessThan(2);
        expect(Math.abs(name.width - email.width)).toBeLessThan(2);
        expect(cv.width).toBeGreaterThan(name.width * 1.8);
        expect(Math.abs(cv.x - name.x)).toBeLessThan(2);
        expect(Math.abs(button.width - cv.width)).toBeLessThan(2);
      } else {
        // One column: every control has the same left edge and width.
        for (const rect of [email, phone, qualification, cv, button]) {
          expect(Math.abs(rect.x - name.x)).toBeLessThan(2);
          expect(Math.abs(rect.width - name.width)).toBeLessThan(2);
        }
      }
    });
  });
}
