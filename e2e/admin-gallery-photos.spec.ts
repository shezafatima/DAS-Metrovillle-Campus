import fs from "node:fs";
import path from "node:path";
import { test, expect, type Page } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { stubCloudinaryUpload } from "./helpers/settings";
import { albumId, clearGallery, liveAlbums, openAlbum, openAlbumList, seedAlbums } from "./helpers/gallery";
import { galleryCopy } from "../src/content/admin";

const JPEG = fs.readFileSync(path.join(__dirname, "fixtures", "cover.jpg"));
const files = (names: string[]) => names.map((name) => ({ name, mimeType: "image/jpeg", buffer: JPEG }));
const cards = (page: Page) => page.getByTestId("photo-card");
const ID = albumId("photos");

async function livePhotos() {
  return (await liveAlbums())[0].photos.filter((p) => !p.deletedAt);
}

test.describe("gallery — admin manages photos in an album (007 US2)", () => {
  test.beforeEach(async () => {
    await clearGallery();
    await seedAlbums([{ id: ID, title: "Annual Day" }]);
  });
  test.afterAll(async () => {
    await clearGallery();
  });

  test("upload up to 8 (extras refused with a message), caption, reorder, choose and delete the cover", async ({ browser }) => {
    test.setTimeout(600_000);
    const { page } = await adminSession(browser);
    const stub = await stubCloudinaryUpload(page);
    await openAlbum(page, ID);
    await expect(page.getByTestId("album-room")).toHaveText(galleryCopy.room(8));

    await page.getByTestId("album-photo-input").setInputFiles(files(["a.jpg", "b.jpg", "c.jpg", "d.jpg", "e.jpg"]));
    await expect(cards(page)).toHaveCount(5, { timeout: 120_000 });
    await expect(page.getByTestId("album-upload-notice")).toHaveText(galleryCopy.addedSummary(5, 0));

    // Six more: exactly three fit.
    await page.getByTestId("album-photo-input").setInputFiles(files(["f.jpg", "g.jpg", "h.jpg", "i.jpg", "j.jpg", "k.jpg"]));
    await expect(cards(page)).toHaveCount(8, { timeout: 120_000 });
    await expect(page.getByTestId("album-upload-notice")).toHaveText(galleryCopy.addedSummary(3, 3));
    expect(stub.count()).toBe(8); // the three that could never fit were not even uploaded
    await expect(page.getByTestId("album-room")).toHaveText(galleryCopy.photosFull);
    await expect(page.getByRole("button", { name: galleryCopy.uploadPhotos })).toBeDisabled();
    expect(await livePhotos()).toHaveLength(8);

    // Caption, saved on Enter, persists.
    await cards(page).first().getByTestId("photo-caption").fill("Prize giving");
    await cards(page).first().getByTestId("photo-caption").press("Enter");
    await expect(page.getByText(galleryCopy.toasts.photoUpdated).last()).toBeVisible({ timeout: 60_000 });
    await page.reload();
    await expect(cards(page).first().getByTestId("photo-caption")).toHaveValue("Prize giving");

    // Move photo 1 down by button, then back up by keyboard.
    const firstId = (await livePhotos())[0].id;
    await page.getByRole("button", { name: galleryCopy.moveDown(galleryCopy.photoName(1)) }).click();
    await expect.poll(async () => (await livePhotos())[1].id, { timeout: 60_000 }).toBe(firstId);
    await page.getByRole("button", { name: galleryCopy.moveUp(galleryCopy.photoName(2)) }).focus();
    await page.keyboard.press("Enter");
    await expect.poll(async () => (await livePhotos())[0].id, { timeout: 60_000 }).toBe(firstId);

    // The first photo is the cover; make the third the cover.
    await expect(cards(page).first().getByTestId("cover-badge")).toBeVisible();
    await cards(page).nth(2).getByRole("button", { name: galleryCopy.makeCover }).click();
    await expect(cards(page).nth(2).getByTestId("cover-badge")).toBeVisible({ timeout: 60_000 });
    const coverId = (await livePhotos())[2].id;
    expect((await liveAlbums())[0].coverPhotoId).toBe(coverId);

    // Delete the cover: the first remaining photo becomes the cover.
    await page.getByRole("button", { name: `${galleryCopy.deletePhoto.trigger}: ${galleryCopy.photoName(3)}` }).click();
    await page.getByRole("alertdialog").getByRole("button", { name: galleryCopy.deletePhoto.confirm }).click();
    await expect(cards(page)).toHaveCount(7, { timeout: 60_000 });
    await expect(cards(page).first().getByTestId("cover-badge")).toBeVisible();

    // The album list shows the new count.
    await openAlbumList(page);
    await expect(page.getByTestId("album-count")).toHaveText(galleryCopy.photoCount(7));
  });

  test("bad files are listed with the reason and the other photos are untouched", async ({ browser }) => {
    test.setTimeout(400_000);
    await seedAlbums([{ id: ID, title: "Annual Day", photos: [{ name: "kept", caption: "Kept" }] }]);
    const { page } = await adminSession(browser);
    await stubCloudinaryUpload(page);
    await openAlbum(page, ID);

    const big = Buffer.alloc(5 * 1024 * 1024 + 1, 0xff);
    JPEG.copy(big);
    await page.getByTestId("album-photo-input").setInputFiles([
      { name: "huge.jpg", mimeType: "image/jpeg", buffer: big },
      { name: "renamed.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.7 not an image") },
      { name: "fine.jpg", mimeType: "image/jpeg", buffer: JPEG },
    ]);
    await expect(cards(page)).toHaveCount(2, { timeout: 120_000 });
    const entries = page.getByTestId("album-upload-entries");
    await expect(entries).toContainText(`huge.jpg: ${galleryCopy.errors.imageLimits}`);
    await expect(entries).toContainText(`renamed.jpg: ${galleryCopy.errors.imageLimits}`);
    const photos = await livePhotos();
    expect(photos.map((p) => p.caption)).toEqual(["Kept", ""]);
  });
});
