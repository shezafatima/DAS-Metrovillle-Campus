import { test, expect } from "@playwright/test";

test.describe("Site search", () => {
  test.use({ viewport: { width: 1440, height: 700 } });

  test("finds and navigates to a matching page from the desktop header", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    const input = page.getByRole("combobox");
    await input.fill("admission");
    await page
      .getByRole("listbox")
      .getByRole("link", { name: "Admission", exact: true })
      .click();
    await expect(page).toHaveURL("/admission");
  });

  test("finds a dropdown sub-page by its own label", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("combobox").fill("syllabi");
    await expect(page.getByRole("link", { name: /Syllabi/ })).toHaveAttribute(
      "href",
      "/academics/syllabi"
    );
  });

  test("shows a no-results message for an unmatched query", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("combobox").fill("xyz-nonexistent-page");
    await expect(page.getByText("No pages found")).toBeVisible();
  });

  test("closes on Escape", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(page.getByRole("combobox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("combobox")).toBeHidden();
  });
});

test.describe("Site search — mobile", () => {
  test.use({ viewport: { width: 375, height: 800 } });

  test("is reachable from inside the mobile menu", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Open menu" }).click();
    await page.getByRole("button", { name: "Search" }).click();
    await page.getByRole("combobox").fill("contact");
    await expect(
      page.getByRole("link", { name: "Contact", exact: true })
    ).toBeVisible();
  });
});
