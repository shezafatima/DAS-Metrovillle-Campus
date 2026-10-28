import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, panel, readSettingsGroup, savedToast } from "./helpers/settings";
import { contactInfo } from "../src/content/site-shell";
import { settingsCopy } from "../src/content/admin";
import { contactCopy } from "../src/content/contact";

const TITLE = settingsCopy.groups.contact.title;

/** The navy half of the Contact card (the details, the map and the social links). */
function contactSection(page: Page) {
  return page.locator("section[aria-labelledby='contact-details-heading']");
}

test.describe("settings — contact & social (005 US2)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    // Leave the public site exactly as shipped for the specs that follow.
    await clearSettings();
  });

  test("nothing has been saved: the footer and the Contact card show the content-file values, and the top bar carries no social icons (SC-001)", async ({ page }) => {
    test.setTimeout(240_000); // the first visit compiles the page
    await page.goto("/contact");

    const details = contactSection(page);
    for (const [platform, label] of [
      ["facebook", "Facebook"],
      ["youtube", "YouTube"],
      ["instagram", "Instagram"],
      ["tiktok", "TikTok"],
    ] as const) {
      // The icons are in the footer and on the Contact card; the top bar has none.
      await expect(page.locator("header").getByRole("link", { name: label })).toHaveCount(0);
      await expect(page.locator("footer").getByRole("link", { name: label })).toHaveAttribute("href", contactInfo.social[platform]!);
      await expect(details.getByRole("link", { name: label })).toHaveAttribute("href", contactInfo.social[platform]!);
    }

    await expect(details.getByRole("link", { name: contactInfo.phone })).toHaveAttribute("href", `tel:${contactInfo.phone}`);
    await expect(details.getByRole("link", { name: contactInfo.email })).toHaveAttribute("href", `mailto:${contactInfo.email}`);
    await expect(details.locator("[data-placeholder]", { hasText: contactInfo.officeHours })).toBeVisible();
    await expect(details.locator("[data-placeholder]", { hasText: contactInfo.address })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute("href", contactInfo.mapUrl);
  });

  test("the admin edits the details and the Contact card and footer show them; a cleared link hides its icon", async ({
    browser,
  }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "contact");

    // The form starts with the values the site shows today.
    await expect(page.getByLabel("Phone")).toHaveValue(contactInfo.phone);
    await expect(page.getByLabel("TikTok")).toHaveValue(contactInfo.social.tiktok!);

    await page.getByLabel("Phone").fill("+92-300-5551234");
    await page.getByLabel("Email", { exact: true }).fill("hello@metroville.example");
    await page.getByLabel("Address").fill("12 Example Road, Metroville, Karachi");
    await page.getByLabel("Office timings").fill("Monday to Friday, 8am to 2pm");
    await page.getByLabel("Map location (Google Maps link)").fill("https://maps.google.com/?q=Example+Road+Metroville");
    await page.getByLabel("TikTok").fill("");
    await panel(page, "contact").getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, TITLE)).toBeVisible({ timeout: 60_000 });

    const stored = await readSettingsGroup("contact");
    expect(stored?.data).toMatchObject({ phone: "+92-300-5551234", social: { tiktok: "" } });

    await page.goto("/contact");
    const details = contactSection(page);
    await expect(details.getByRole("link", { name: "+92-300-5551234" })).toHaveAttribute("href", "tel:+92-300-5551234");
    await expect(details.getByRole("link", { name: "hello@metroville.example" })).toBeVisible();
    await expect(details.locator("[data-placeholder]", { hasText: "12 Example Road, Metroville, Karachi" })).toBeVisible();
    await expect(details.locator("[data-placeholder]", { hasText: "Monday to Friday, 8am to 2pm" })).toBeVisible();
    await expect(page.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      "https://maps.google.com/?q=Example+Road+Metroville",
    );

    // The cleared platform has no icon anywhere (the top bar has none at all); the others stay.
    await expect(page.locator("header").getByRole("link", { name: "TikTok" })).toHaveCount(0);
    await expect(page.locator("footer").getByRole("link", { name: "TikTok" })).toHaveCount(0);
    await expect(details.getByRole("link", { name: "TikTok" })).toHaveCount(0);
    await expect(details.getByRole("link", { name: "Facebook" })).toBeVisible();
    await expect(page.locator("footer").getByRole("link", { name: "Instagram" })).toBeVisible();

    // The footer shows the change on a page other than Contact, too.
    await page.goto("/news");
    await expect(page.locator("footer").getByRole("link", { name: "TikTok" })).toHaveCount(0);
    await expect(page.locator("footer").getByRole("link", { name: "Facebook" })).toBeVisible();
  });

  test("invalid values are refused with a message under each field, nothing is saved, and what was typed stays", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "contact");

    await page.getByLabel("Phone").fill("");
    await page.getByLabel("Email", { exact: true }).fill("not-an-email");
    await page.getByLabel("Map location (Google Maps link)").fill("ftp://example.com");
    await page.getByLabel("Address").fill("Kept while I fix the rest");
    await panel(page, "contact").getByRole("button", { name: "Save" }).click();

    await expect(page.getByText(settingsCopy.errors.required)).toBeVisible();
    await expect(page.getByText(settingsCopy.errors.email)).toBeVisible();
    await expect(page.getByText(settingsCopy.errors.url).first()).toBeVisible();
    await expect(page.getByLabel("Address")).toHaveValue("Kept while I fix the rest");
    expect(await readSettingsGroup("contact")).toBeNull();
  });

  test("the Contact page keeps its layout: one card with the details first and the form beside it, the labelled rows in order, and the map", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "contact");
    await page.getByLabel("Phone").fill("+92-300-0000001");
    await panel(page, "contact").getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, TITLE)).toBeVisible({ timeout: 60_000 });

    await page.goto("/contact");
    const details = contactSection(page);
    const form = page.locator("section[aria-labelledby='contact-form-heading']");
    await expect(details.getByRole("heading", { level: 2 })).toHaveText(contactCopy.details.heading);
    await expect(details.locator("li p")).toHaveText([contactCopy.details.address, contactCopy.details.phone, contactCopy.details.email, contactCopy.details.timings]);
    await expect(form.getByRole("heading", { level: 2 })).toHaveText(contactCopy.form.heading);
    // Side by side from 1024px (the default desktop viewport): the details on the left, the form on the right.
    const [detailsBox, formBox] = [(await details.boundingBox())!, (await form.boundingBox())!];
    expect(detailsBox.x + detailsBox.width).toBeLessThanOrEqual(formBox.x + 1);
    expect(Math.abs(detailsBox.y - formBox.y)).toBeLessThanOrEqual(1);
    // The map: its screen-reader heading and the "Open in Google Maps" link.
    await expect(details.getByRole("heading", { level: 3, name: contactCopy.map.heading })).toBeAttached();
    await expect(details.getByRole("link", { name: contactCopy.map.openInMaps })).toBeVisible();
  });
});
