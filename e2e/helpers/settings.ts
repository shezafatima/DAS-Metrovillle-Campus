import { expect, type Page } from "@playwright/test";
import mongoose from "mongoose";

/**
 * Helpers for the 005 Settings Playwright specs. Like the news and users
 * helpers, they touch the `settings` collection directly to reset state and
 * to read back exactly what the app stored (including soft-deleted list
 * items, which no screen shows).
 */

async function withDb<T>(fn: (db: mongoose.mongo.Db) => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/settings] MONGODB_URI is not set");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  try {
    return await fn(mongoose.connection.db!);
  } finally {
    if (!wasConnected) await mongoose.disconnect().catch(() => {});
  }
}

export type SettingsGroupKey = "contact" | "hero" | "stats" | "video";

/** Empties the settings collection, so every group reads as its starting values. */
export async function clearSettings(): Promise<void> {
  await withDb(async (db) => {
    await db.collection("settings").deleteMany({});
  });
}

/** Stores a group directly (bypassing the app), at the given version. */
export async function seedSettingsGroup(group: SettingsGroupKey, data: Record<string, unknown>, version = 1): Promise<void> {
  await withDb(async (db) => {
    await db.collection("settings").replaceOne(
      { _id: group as never },
      { _id: group as never, data, version, updatedBy: "seed@example.test", updatedAt: new Date() },
      { upsert: true },
    );
  });
}

export interface StoredGroup {
  data: Record<string, unknown>;
  version: number;
  updatedBy: string;
}

/** What is stored for a group, including soft-deleted list items. Null when it was never saved. */
export async function readSettingsGroup(group: SettingsGroupKey): Promise<StoredGroup | null> {
  return withDb(async (db) => {
    const doc = await db.collection("settings").findOne({ _id: group as never });
    return doc ? { data: doc.data as Record<string, unknown>, version: doc.version as number, updatedBy: doc.updatedBy as string } : null;
  });
}

// A 1×1 transparent PNG, so uploaded previews load.
const PIXEL = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");

/**
 * Replaces Cloudinary for a page: the direct upload answers with a reference
 * in the folder the form asked for (read from the multipart body), and the
 * delivery host returns a tiny image. Runs with `NEWS_COVER_VERIFY=skip`, like
 * the 003 news specs, so the save path is real while no Cloudinary account is needed.
 * Returns how many uploads were answered.
 */
export async function stubCloudinaryUpload(
  page: Page,
  { width = 800, height = 600 }: { width?: number; height?: number } = {},
): Promise<{ count: () => number }> {
  let uploads = 0;
  await page.route("https://api.cloudinary.com/**", async (route) => {
    uploads += 1;
    const body = route.request().postData() ?? "";
    const folder = /name="folder"\r\n\r\n([^\r\n]+)/.exec(body)?.[1] ?? "settings/gallery";
    const publicId = `${folder}/e2e-${Date.now()}-${uploads}`;
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        secure_url: `https://res.cloudinary.com/e2e/image/upload/v1/${publicId}.jpg`,
        public_id: publicId,
        width,
        height,
      }),
    });
  });
  await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL }));
  return { count: () => uploads };
}

/** Opens a group's page and waits for its form. */
export async function openGroup(page: Page, group: SettingsGroupKey): Promise<void> {
  await page.goto(`/admin/settings/${group}`);
  // The settings form, not the profile menu's logout form.
  await expect(page.locator("#admin-content form")).toBeVisible({ timeout: 90_000 });
}

/** The success toast after a save ("<Group> saved"). */
export function savedToast(page: Page, groupTitle: string) {
  // `.last()`: an earlier "saved" toast may still be on screen after a second save.
  return page.getByText(`${groupTitle} saved`).last();
}
