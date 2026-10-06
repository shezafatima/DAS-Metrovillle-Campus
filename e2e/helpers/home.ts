import fs from "node:fs";
import path from "node:path";
import { expect, type Page } from "@playwright/test";
import { PIXEL_PNG } from "./pixel";
import { clearSettings, seedSettingsGroup } from "./settings";
import { clearPosts } from "./news";

/**
 * Helpers for the 006 home specs. They seed Settings and News straight into
 * the test database; the Playwright dev server runs with E2E_FRESH_READS=1, so
 * the home page reads them at once. All home specs that seed are named
 * `admin-home-*.spec.ts`, so they run in the serial project (they share the
 * `settings` and `news` collections with the other admin specs).
 */

export function cloudImage(folder: string, name: string, width = 1600, height = 600) {
  return { url: `https://res.cloudinary.com/e2e/image/upload/v1/${folder}/${name}.jpg`, publicId: `${folder}/${name}`, width, height };
}

export function slide(n: number, o: Record<string, unknown> = {}) {
  return {
    id: `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`,
    deletedAt: null,
    desktop: cloudImage("settings/hero", `desk-${n}`),
    mobile: null,
    alt: `Slide ${n}`,
    heading: `Heading ${n}`,
    buttonLabel: "",
    buttonLink: "",
    visible: true,
    ...o,
  };
}

export async function seedHero(slides: Record<string, unknown>[], displaySeconds = 5) {
  await seedSettingsGroup("hero", { displaySeconds, slides });
}
export async function seedStats(stats: Partial<Record<"students" | "books" | "teachers" | "campuses", number>> = {}) {
  await seedSettingsGroup("stats", { students: 300000, books: 50, teachers: 14500, campuses: 700, ...stats });
}
export async function seedVideo(youtubeUrl: string) {
  await seedSettingsGroup("video", { youtubeUrl });
}

/** Everything the home page reads, back to empty / starting values. */
export async function resetHome(): Promise<void> {
  await clearSettings();
  await clearPosts();
}

/** Answers every Cloudinary image request with a tiny PNG (no account needed). */
export async function stubImages(page: Page): Promise<void> {
  await page.route("https://res.cloudinary.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));
  await page.route("https://i.ytimg.com/**", (route) => route.fulfill({ status: 200, contentType: "image/png", body: PIXEL_PNG }));
}

export async function openHome(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toBeAttached({ timeout: 120_000 });
}

/** The h2 section headings in page order. */
export async function sectionHeadings(page: Page): Promise<string[]> {
  return (await page.locator("main h2").allTextContents()).map((t) => t.replace(/\s+/g, " ").trim());
}

/** How many of the 10 fixed book covers have been added to public/images/home/books/ (the carousel shows only those). */
export function bookFilesPresent(): number {
  return Array.from({ length: 10 }, (_, i) => `book-${String(i + 1).padStart(2, "0")}.jpg`).filter((f) =>
    fs.existsSync(path.join(__dirname, "..", "..", "public", "images", "home", "books", f)),
  ).length;
}
