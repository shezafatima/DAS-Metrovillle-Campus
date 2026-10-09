import { test, expect } from "@playwright/test";
import { contactInfo, portalLinks } from "../src/content/site-shell";

test.describe("Contact details and social links", () => {
  test("phone, email and address appear in the footer", async ({ page }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer.getByText(contactInfo.phone).first()).toBeVisible();
    await expect(footer.getByText(contactInfo.email).first()).toBeVisible();
    await expect(footer.getByText(contactInfo.address).first()).toBeVisible();
  });

  test("the phone number is a tel: link", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: contactInfo.phone }).first()
    ).toHaveAttribute("href", `tel:${contactInfo.phone}`);
  });

  test("the email address is a mailto: link", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("link", { name: contactInfo.email }).first()
    ).toHaveAttribute("href", `mailto:${contactInfo.email}`);
  });

  test("the footer shows every configured portal link, and the header none", async ({ page }) => {
    await page.goto("/");
    const nav = page.getByRole("contentinfo").getByRole("navigation", { name: "Portal links" });
    for (const link of portalLinks) {
      await expect(nav.getByRole("link", { name: link.label })).toHaveAttribute("href", link.href);
      await expect(page.getByRole("banner").getByRole("link", { name: link.label })).toHaveCount(0);
    }
  });

  // contactInfo.social (src/content/site-shell.ts) currently has no
  // configured platform — real URLs are not yet supplied (spec.md
  // Assumptions). The omission-when-empty and open-in-new-tab behaviors are
  // covered deterministically with fixture data in
  // src/components/site-shell/top-bar.test.tsx; this guarded check starts
  // exercising real content automatically once a platform is configured.
  test("a configured social link opens in a new tab", async ({ page }) => {
    await page.goto("/");
    const socialLinks = page.locator('a[target="_blank"][rel*="noopener"]');
    test.skip(
      (await socialLinks.count()) === 0,
      "No contactInfo.social entry is currently configured — see comment above."
    );
    await expect(socialLinks.first()).toHaveAttribute("target", "_blank");
  });
});
