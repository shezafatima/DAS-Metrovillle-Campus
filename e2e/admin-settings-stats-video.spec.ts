import { test, expect } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, readSettingsGroup, savedToast } from "./helpers/settings";
import { settingsCopy } from "../src/content/admin";

test.describe("settings — stats (005 US4)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("the admin updates the four numbers and they persist", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "stats");

    // The form starts with the reference dashboard numbers.
    await expect(page.getByLabel("Students")).toHaveValue("300000");
    await expect(page.getByLabel("Campuses")).toHaveValue("700");

    await page.getByLabel("Students").fill("310000");
    await page.getByLabel("Books").fill("60");
    await page.getByLabel("Teachers").fill("15000");
    await page.getByLabel("Campuses").fill("720");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, settingsCopy.groups.stats.title)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("stats"))?.data).toEqual({ students: 310000, books: 60, teachers: 15000, campuses: 720 });

    await openGroup(page, "stats");
    await expect(page.getByLabel("Students")).toHaveValue("310000");
    await expect(page.getByLabel("Books")).toHaveValue("60");
    await expect(page.getByLabel("Teachers")).toHaveValue("15000");
    await expect(page.getByLabel("Campuses")).toHaveValue("720");
  });

  for (const bad of ["-5", "2.5", "abc", "", "100000001"]) {
    test(`refuses ${JSON.stringify(bad)} under its field and saves nothing`, async ({ browser }) => {
      test.setTimeout(300_000);
      const { page } = await adminSession(browser);
      await openGroup(page, "stats");

      await page.getByLabel("Books").fill("61");
      await page.getByLabel("Students").fill(bad);
      await page.getByRole("button", { name: "Save" }).click();

      await expect(page.getByText(settingsCopy.errors.wholeNumber)).toBeVisible();
      // The valid edit stays in the form, and nothing in the group was saved.
      await expect(page.getByLabel("Books")).toHaveValue("61");
      expect(await readSettingsGroup("stats")).toBeNull();
    });
  }
});

test.describe("settings — home video (005 US5)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("set a YouTube address, have another site's address refused, then clear it", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    await openGroup(page, "video");
    const field = page.getByLabel(settingsCopy.fields.video.youtubeUrl);
    const title = settingsCopy.groups.video.title;

    await expect(field).toHaveValue("");
    await field.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, title)).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("video"))?.data).toEqual({ youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });

    await openGroup(page, "video");
    await expect(field).toHaveValue("https://www.youtube.com/watch?v=dQw4w9WgXcQ");

    // Another site's address is refused and the saved value is kept.
    await field.fill("https://vimeo.com/123456");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText(settingsCopy.errors.youtube)).toBeVisible();
    expect((await readSettingsGroup("video"))?.data).toEqual({ youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" });

    // Short links and Shorts are fine.
    await field.fill("https://youtu.be/dQw4w9WgXcQ");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, title)).toBeVisible({ timeout: 60_000 });

    // Clearing it stores an empty address (no video).
    await field.fill("");
    await page.getByRole("button", { name: "Save" }).click();
    await expect(savedToast(page, title).last()).toBeVisible({ timeout: 60_000 });
    expect((await readSettingsGroup("video"))?.data).toEqual({ youtubeUrl: "" });
  });
});
