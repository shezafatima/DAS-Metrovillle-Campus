import { expect, type Locator, type Page } from "@playwright/test";
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

export type SettingsGroupKey = "contact" | "hero" | "stats" | "video" | "admission";

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


/**
 * Types a value and keeps it: a value typed before React has taken the form over is wiped by hydration,
 * so the fill is repeated until the field still holds it (a flake seen on the 020 admission spec).
 */
export async function fillStable(page: Page, label: string, value: string): Promise<void> {
  const field = page.getByLabel(label);
  await expect(async () => {
    await field.fill(value);
    await expect(field).toHaveValue(value, { timeout: 1_000 });
  }).toPass({ timeout: 30_000 });
  // Hydration may land just after a successful check: confirm once more after a beat.
  await page.waitForTimeout(500);
  await expect(field).toHaveValue(value);
}

/** The success toast after a save ("<Panel title> saved"). */
export function savedToast(page: Page, groupTitle: string) {
  // `.last()`: an earlier "saved" toast may still be on screen after a second save.
  return page.getByText(`${groupTitle} saved`).last();
}

// ── 014: Settings by page ────────────────────────────────────────────────

/** A Settings panel on the current tab (contracts/tabs-and-panels.md). */
export function panel(page: Page, key: string): Locator {
  return page.locator(`section[data-panel="${key}"]`);
}

/** Where each 005 group is edited since 014: its tab and the panel that holds most of it. */
export const GROUP_PANEL: Record<SettingsGroupKey, { tab: string; panel: string }> = {
  contact: { tab: "site-wide", panel: "contact" },
  hero: { tab: "home", panel: "hero" },
  video: { tab: "home", panel: "video" },
  stats: { tab: "home", panel: "stats" },
  admission: { tab: "admission", panel: "admission-window" },
};

/** Opens the tab that holds a group, at its panel, and waits for that panel's form. Returns the panel. */
export async function openGroup(page: Page, group: SettingsGroupKey): Promise<Locator> {
  const { tab, panel: key } = GROUP_PANEL[group];
  await page.goto(`/admin/settings/${tab}#${key}`);
  const section = panel(page, key);
  await expect(section.locator("form")).toBeVisible({ timeout: 90_000 });
  return section;
}

/** An old (pre-014) Settings URL and where it now lands (014 US3; shared by the redirect and access-matrix specs). */
export interface OldSettingsUrl {
  from: string;
  /** The destination path; `hash`, when set, names the panel. */
  to: string;
  hash?: string;
  /** Who may open the destination. */
  needs: "settings" | "pages";
}

export const OLD_SETTINGS_URLS: readonly OldSettingsUrl[] = [
  { from: "/admin/settings/contact", to: "/admin/settings/site-wide", hash: "contact", needs: "settings" },
  { from: "/admin/settings/hero", to: "/admin/settings/home", hash: "hero", needs: "pages" },
  { from: "/admin/settings/video", to: "/admin/settings/home", hash: "video", needs: "pages" },
  { from: "/admin/settings/stats", to: "/admin/settings/home", hash: "stats", needs: "pages" },
  { from: "/admin/settings/gallery", to: "/admin/settings/resources", hash: "photo-gallery", needs: "pages" },
];

export function oldAlbumUrl(albumId: string): OldSettingsUrl {
  return { from: `/admin/settings/gallery/${albumId}`, to: `/admin/settings/resources/gallery/${albumId}`, needs: "pages" };
}
