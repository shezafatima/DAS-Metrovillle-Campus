import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { albumId, albumPanel, clearGallery, liveAlbums, openAlbumList, readGallery, seedAlbums } from "./helpers/gallery";
import { galleryCopy, settingsCopy } from "../src/content/admin";

const cards = (page: Page) => page.getByTestId("album-card");
const titles = (page: Page) => page.getByTestId("album-title");

async function createAlbum(page: Page, title: string, extra: { description?: string; date?: string } = {}) {
  await page.getByRole("button", { name: galleryCopy.createAlbum }).click();
  const panel = albumPanel(page);
  await expect(panel).toBeVisible();
  await panel.getByLabel(galleryCopy.fields.title).fill(title);
  if (extra.description) await panel.getByLabel(galleryCopy.fields.description).fill(extra.description);
  if (extra.date) await panel.getByLabel(galleryCopy.fields.date).fill(extra.date);
  await panel.getByRole("button", { name: galleryCopy.save }).click();
  await expect(panel).toBeHidden({ timeout: 60_000 });
}

test.describe("gallery — admin manages albums (007 US1)", () => {
  test.beforeEach(async () => {
    await clearGallery();
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("create albums up to six; the 7th is refused; reorder, rename and delete", async ({ browser }) => {
    test.setTimeout(600_000);
    const { page } = await adminSession(browser);
    await openAlbumList(page);
    await expect(page.getByText(galleryCopy.emptyGallery)).toBeVisible();

    await createAlbum(page, "Annual Day", { description: "Prize giving and speeches", date: "2026-03-12" });
    await expect(cards(page)).toHaveCount(1);
    await expect(cards(page).first()).toContainText("0 photos");
    await expect(cards(page).first()).toContainText("12 March 2026");

    for (const title of ["Sports Day", "Science Fair", "Hifz Ceremony", "Trip", "Qirat"]) await createAlbum(page, title);
    await expect(cards(page)).toHaveCount(6);

    // At the cap: Create is disabled with the reason.
    await expect(page.getByRole("button", { name: galleryCopy.createAlbum })).toBeDisabled();
    await expect(page.getByTestId("album-full")).toHaveText(galleryCopy.albumFull);
    // The direct-call proof of the cap is in actions.test.ts (T018); here the stored count stays at six.
    expect(await liveAlbums()).toHaveLength(6);

    // Move album 3 up with the button, then album 2 down with the keyboard.
    await page.getByRole("button", { name: galleryCopy.moveUp("Science Fair") }).click();
    await expect(titles(page).nth(1)).toHaveText("Science Fair");
    await page.getByRole("button", { name: galleryCopy.moveDown("Science Fair") }).focus();
    await page.keyboard.press("Enter");
    await expect(titles(page).nth(2)).toHaveText("Science Fair");
    await page.reload();
    await expect(titles(page)).toHaveText(["Annual Day", "Sports Day", "Science Fair", "Hifz Ceremony", "Trip", "Qirat"]);

    // Rename in the panel; it persists.
    await page.getByRole("button", { name: `${galleryCopy.edit}: Trip` }).click();
    await albumPanel(page).getByLabel(galleryCopy.fields.title).fill("Northern Areas Trip");
    await albumPanel(page).getByRole("button", { name: galleryCopy.save }).click();
    await expect(albumPanel(page)).toBeHidden({ timeout: 60_000 });
    await page.reload();
    await expect(titles(page).nth(4)).toHaveText("Northern Areas Trip");

    // Delete (confirmed): five left, Create enabled again, the album kept as deleted.
    await page.getByRole("button", { name: `${galleryCopy.deleteAlbum.trigger}: Qirat` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: galleryCopy.deleteAlbum.confirm }).click();
    await expect(cards(page)).toHaveCount(5, { timeout: 60_000 });
    await expect(page.getByRole("button", { name: galleryCopy.createAlbum })).toBeEnabled();
    const stored = await readGallery();
    expect(stored?.albums.find((a) => a.title === "Qirat")?.deletedAt).toBeTruthy();
  });

  test("editing an album someone else changed is refused and keeps the typed value", async ({ browser }) => {
    test.setTimeout(400_000);
    const id = albumId("conflict");
    await seedAlbums([{ id, title: "Original" }]);
    const first = await adminSession(browser);
    const second = await adminSession(browser);
    await openAlbumList(first.page);
    await openAlbumList(second.page);

    await first.page.getByRole("button", { name: `${galleryCopy.edit}: Original` }).click();
    await second.page.getByRole("button", { name: `${galleryCopy.edit}: Original` }).click();

    await first.page.getByTestId("album-panel").getByLabel(galleryCopy.fields.title).fill("From tab one");
    await first.page.getByTestId("album-panel").getByRole("button", { name: galleryCopy.save }).click();
    await expect(first.page.getByTestId("album-panel")).toBeHidden({ timeout: 60_000 });

    const panel = second.page.getByTestId("album-panel");
    await panel.getByLabel(galleryCopy.fields.title).fill("From tab two");
    await panel.getByRole("button", { name: galleryCopy.save }).click();
    await expect(panel.locator('p[role="alert"]')).toHaveText(galleryCopy.toasts.conflict, { timeout: 60_000 });
    await expect(panel.getByLabel(galleryCopy.fields.title)).toHaveValue("From tab two");
    expect((await liveAlbums())[0].title).toBe("From tab one");
  });

  test("unsaved edits in another Settings group do not block gallery actions (FR-025)", async ({ browser }) => {
    test.setTimeout(400_000);
    const { page } = await adminSession(browser);
    await page.goto("/admin/settings/stats");
    await expect(page.locator("#admin-content form")).toBeVisible({ timeout: 90_000 });
    await page.getByLabel("Students").fill("123");

    page.once("dialog", (dialog) => void dialog.accept());
    await page.getByRole("navigation", { name: settingsCopy.navLabel }).getByRole("link", { name: settingsCopy.groups.gallery.title }).click();
    await expect(page.getByTestId("album-list")).toBeVisible({ timeout: 90_000 });
    await createAlbum(page, "Not blocked");
    expect((await liveAlbums()).map((a) => a.title)).toEqual(["Not blocked"]);
  });
});
