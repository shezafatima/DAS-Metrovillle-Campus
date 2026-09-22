import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";
import mongoose from "mongoose";
import { E2E_ADMIN } from "../global-setup";

/**
 * Seeding/reading helpers for the news (003) Playwright specs. Inserts
 * directly into the `news` collection (bypassing the app's mutation
 * layer, same spirit as global-setup.ts's admin seed) so specs can set
 * up exact fixtures — including states the UI itself would never
 * produce, like a soft-deleted or future-dated post — without going
 * through the editor first.
 */

export interface NewsPostSeed {
  title: string;
  slug: string;
  bodyHtml: string;
  excerpt?: string;
  language: "en" | "ur";
  category: "head-office" | "events" | "activities" | "achievements" | "announcements";
  status: "draft" | "published";
  publishDate: Date;
  coverImage: { url: string; publicId: string; width: number; height: number; alt: string } | null;
  deletedAt: Date | null;
}

const DEFAULT_BODY = "<p>Seeded body text for end-to-end tests.</p>";

function plainTextExcerpt(html: string): string {
  const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return text.length <= 160 ? text : `${text.slice(0, 160).trimEnd()}…`;
}

function utcMidnightToday(): Date {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

async function withConnection<T>(fn: () => Promise<T>): Promise<T> {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error("[e2e/helpers/news] MONGODB_URI is not set — cannot seed posts");
  const wasConnected = mongoose.connection.readyState !== 0;
  if (!wasConnected) {
    await mongoose.connect(uri, { dbName: "dar_e_arqam_test", serverSelectionTimeoutMS: 15000 });
  }
  try {
    return await fn();
  } finally {
    if (!wasConnected) {
      await mongoose.disconnect().catch(() => {});
    }
  }
}

/**
 * Inserts posts with sensible defaults (published, English, Head
 * Office, dated today, no cover, not deleted) so a test only spells
 * out the fields it cares about. Returns the seeded documents
 * (including generated `_id`s) in insertion order.
 */
export async function seedPosts(
  posts: Array<Partial<NewsPostSeed> & { title: string; slug: string }>,
): Promise<Array<NewsPostSeed & { _id: mongoose.Types.ObjectId }>> {
  return withConnection(async () => {
    const now = new Date();
    const docs = posts.map((post) => {
      const bodyHtml = post.bodyHtml ?? DEFAULT_BODY;
      return {
        title: post.title,
        slug: post.slug,
        bodyHtml,
        excerpt: post.excerpt ?? plainTextExcerpt(bodyHtml),
        language: post.language ?? "en",
        category: post.category ?? "head-office",
        status: post.status ?? "published",
        publishDate: post.publishDate ?? utcMidnightToday(),
        coverImage: post.coverImage ?? null,
        deletedAt: post.deletedAt ?? null,
        createdAt: now,
        updatedAt: now,
      };
    });
    const result = await mongoose.connection.db?.collection("news").insertMany(docs);
    if (!result) throw new Error("[e2e/helpers/news] insertMany returned no result");
    return docs.map((doc, i) => ({ ...doc, _id: result.insertedIds[i]! }) as NewsPostSeed & {
      _id: mongoose.Types.ObjectId;
    });
  });
}

/** Removes every document from the `news` collection. */
export async function clearPosts(): Promise<void> {
  await withConnection(async () => {
    await mongoose.connection.db?.collection("news").deleteMany({});
  });
}

/** Shared admin login flow, copied from e2e/admin-layout.spec.ts's local helper. */
export async function loginAsAdmin(page: Page): Promise<void> {
  await page.goto("/admin/login");
  await page.getByLabel("Email").fill(E2E_ADMIN.email);
  await page.getByLabel("Password").fill(E2E_ADMIN.password);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL("/admin");
}
