import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { adminSession } from "./helpers/users";
import { clearSettings, openGroup, stubCloudinaryUpload } from "./helpers/settings";
import { albumId, clearGallery, openAlbum, seedAlbums } from "./helpers/gallery";
import { settingsCopy } from "../src/content/admin";

/**
 * Oversized and wrong-type uploads are rejected with the stated limit (brief
 * acceptance, FR-023). The server-side refusal for a file that got past the
 * browser (the on-save check) is proven in src/lib/settings/mutations.test.ts,
 * because this server runs with NEWS_COVER_VERIFY=skip.
 */
const JPEG = fs.readFileSync(path.join(__dirname, "fixtures", "cover.jpg"));
const LIMIT = settingsCopy.errors.imageLimits;

const oversized = { name: "big.jpg", mimeType: "image/jpeg", buffer: Buffer.alloc(6 * 1024 * 1024, 1) };
const gif = { name: "anim.gif", mimeType: "image/gif", buffer: Buffer.from("GIF89a\x01\x00\x01\x00", "binary") };
const pdfNamedJpg = { name: "photo.jpg", mimeType: "image/jpeg", buffer: Buffer.from("%PDF-1.4\n1 0 obj\n<<>>\nendobj\n") };
const validJpeg = { name: "ok.jpg", mimeType: "image/jpeg", buffer: JPEG };
const PICKER_ALBUM = albumId("picker");

test.describe("settings — media limits (005)", () => {
  test.beforeEach(async () => {
    await clearSettings();
  });
  test.afterEach(async () => {
    await clearSettings();
  });

  test("a hero slide's desktop image: an oversized file is refused in the panel and the typed fields survive", async ({ browser }) => {
    test.setTimeout(300_000);
    const { page } = await adminSession(browser);
    const stub = await stubCloudinaryUpload(page);
    await openGroup(page, "hero");

    await page.getByRole("button", { name: "Add slide" }).click();
    const panel = page.getByRole("dialog", { name: "Add slide" });
    await panel.getByLabel(settingsCopy.fields.hero.alt).fill("Typed alt text");
    await panel.getByLabel(settingsCopy.fields.hero.heading).fill("Typed heading");

    for (const file of [oversized, gif, pdfNamedJpg]) {
      await panel.getByTestId("image-input-desktop").setInputFiles(file);
      await expect(panel.getByTestId("image-field-desktop").getByText(LIMIT)).toBeVisible();
    }
    expect(stub.count()).toBe(0);
    await expect(panel.getByLabel(settingsCopy.fields.hero.alt)).toHaveValue("Typed alt text");
    await expect(panel.getByLabel(settingsCopy.fields.hero.heading)).toHaveValue("Typed heading");

    // A valid file then works, and the message goes away.
    await panel.getByTestId("image-input-desktop").setInputFiles(validJpeg);
    await expect(panel.getByRole("button", { name: settingsCopy.list.replaceImage })).toBeVisible({ timeout: 30_000 });
    await expect(panel.getByTestId("image-field-desktop").getByText(LIMIT)).toHaveCount(0);
  });

  test("the gallery album picker offers only JPG, PNG and WebP (007)", async ({ browser }) => {
    test.setTimeout(300_000);
    await seedAlbums([{ id: PICKER_ALBUM, title: "Picker" }]);
    const { page } = await adminSession(browser);
    await openAlbum(page, PICKER_ALBUM);
    await expect(page.getByTestId("album-photo-input")).toHaveAttribute("accept", "image/jpeg,image/png,image/webp");
    await expect(page.getByTestId("album-photo-input")).not.toHaveAttribute("accept", /video|gif|svg/);
    await clearGallery();
  });
});
