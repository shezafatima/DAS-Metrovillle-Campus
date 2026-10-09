import { connectDb } from "@/lib/db";
import { NewsPost, type NewsPostDoc } from "@/models/news-post";
import { type NewsCategoryKey, isCategoryKey } from "@/lib/news/categories";
import { startOfTodayPkt, toDateInput } from "@/lib/news/dates";
import type { Paged } from "@/lib/admin-list";

export interface PublicPostSummary {
  slug: string;
  title: string;
  excerpt: string;
  language: "en" | "ur";
  category: NewsCategoryKey;
  publishDate: string; // YYYY-MM-DD
  coverImage: { url: string; publicId: string; width: number; height: number; alt: string } | null;
}

export interface PublicPost extends PublicPostSummary {
  bodyHtml: string;
}

const PUBLIC_PAGE_SIZE = 9;

/**
 * The single visibility predicate every public read goes through
 * (user constraint: public pages never return drafts or deleted
 * posts; FR-015, FR-019, SC-002). `deletedAt: null` is added
 * automatically by the soft-delete plugin on every query — it is not
 * repeated here, and there is deliberately no way to bypass it from
 * this module.
 */
export function publicVisibilityFilter(now: Date = new Date()): Record<string, unknown> {
  return {
    status: "published",
    publishDate: { $lte: startOfTodayPkt(now) },
  };
}

function toSummary(doc: NewsPostDoc): PublicPostSummary {
  return {
    slug: doc.slug,
    title: doc.title,
    excerpt: doc.excerpt,
    language: doc.language as "en" | "ur",
    category: doc.category as NewsCategoryKey,
    publishDate: toDateInput(doc.publishDate),
    coverImage: doc.coverImage
      ? {
          url: doc.coverImage.url,
          publicId: doc.coverImage.publicId,
          width: doc.coverImage.width,
          height: doc.coverImage.height,
          alt: doc.coverImage.alt,
        }
      : null,
  };
}

export interface ListPublishedPostsOptions {
  page?: number;
  category?: string;
  now?: Date;
}

export async function listPublishedPosts(
  options: ListPublishedPostsOptions = {},
): Promise<Paged<PublicPostSummary>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter: Record<string, unknown> = publicVisibilityFilter(options.now);
  if (options.category && isCategoryKey(options.category)) {
    filter.category = options.category;
  }

  const total = await NewsPost.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / PUBLIC_PAGE_SIZE));
  const docs = await NewsPost.find(filter)
    .sort({ publishDate: -1, updatedAt: -1 })
    .skip((page - 1) * PUBLIC_PAGE_SIZE)
    .limit(PUBLIC_PAGE_SIZE);

  return {
    items: docs.map(toSummary),
    page,
    pageSize: PUBLIC_PAGE_SIZE,
    total,
    totalPages,
  };
}

/**
 * The newest visible posts, newest first (006 Latest News, FR-013/FR-014):
 * the same visibility filter and sort as the News list, capped at `limit`.
 */
export async function listLatestPosts(limit: number, now?: Date): Promise<PublicPostSummary[]> {
  await connectDb();
  const docs = await NewsPost.find(publicVisibilityFilter(now))
    .sort({ publishDate: -1, updatedAt: -1 })
    .limit(Math.max(1, Math.floor(limit)));
  return docs.map(toSummary);
}

/** `null` for anything not currently visible — callers respond with `notFound()`. */
export async function getPublishedPostBySlug(slug: string, now?: Date): Promise<PublicPost | null> {
  await connectDb();
  const doc = await NewsPost.findOne({ slug, ...publicVisibilityFilter(now) });
  if (!doc) return null;
  return { ...toSummary(doc), bodyHtml: doc.bodyHtml };
}
