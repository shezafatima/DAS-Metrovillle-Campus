import { test, expect } from "@playwright/test";
import { footerContent } from "../src/content/site-shell";

test.describe("Footer", () => {
  test("shows quick links and a bottom bar with Metroville content", async ({
    page,
  }) => {
    await page.goto("/");
    const footer = page.getByRole("contentinfo");
    await expect(footer).toBeVisible();

    for (const column of footerContent.columns) {
      await expect(footer.getByRole("heading", { name: column.title })).toBeVisible();
      for (const link of column.links) {
        await expect(
          footer.getByRole("link", { name: link.label }).first()
        ).toBeVisible();
      }
    }

    for (const link of footerContent.quickLinks) {
      await expect(
        footer.getByRole("link", { name: link.label }).first()
      ).toBeVisible();
    }

    if (footerContent.bottomText) {
      await expect(
        footer.getByText(footerContent.bottomText).first()
      ).toBeVisible();
    }
  });

  test("the bottom bar's copyright year is the current year", async ({
    page,
  }) => {
    await page.goto("/");
    const currentYear = new Date().getFullYear().toString();
    await expect(
      page.getByRole("contentinfo").getByText(new RegExp(currentYear))
    ).toBeVisible();
  });
});
