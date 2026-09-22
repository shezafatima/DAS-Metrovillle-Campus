import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { NewsPost, type NewsPostDoc } from "@/models/news-post";
import { type NewsCategoryKey, isCategoryKey } from "@/lib/news/categories";
import { startOfTodayPkt, toDateInput } from "@/lib/news/dates";
import { cloudinaryLoader } from "@/lib/news/cloudinary-loader";
import { type Paged, ADMIN_PAGE_SIZE, escapeRegExp } from "@/lib/admin-list";

export interface AdminPost {
  id: string;
  title: string;
  slug: string;
  bodyHtml: string;
  language: "en" | "ur";
  category: NewsCategoryKey;
  status: "draft" | "published";
  publishDate: string; // YYYY-MM-DD
  coverImage: { url: string; publicId: string; width: number; height: number; alt: string } | null;
  isScheduled: boolean;
  updatedAt: string; // ISO
}

function toAdminPost(doc: NewsPostDoc): AdminPost {
  const isScheduled = doc.status === "published" && doc.publishDate > startOfTodayPkt();
  return {
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    bodyHtml: doc.bodyHtml,
    language: doc.language as "en" | "ur",
    category: doc.category as NewsCategoryKey,
    status: doc.status as "draft" | "published",
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
    isScheduled,
    updatedAt: doc.updatedAt.toISOString(),
  };
}

/**
 * Count of published posts for the admin Overview stat card
 * (docs/prd.md §6.2 "published news"; src/app/admin/(dashboard)/page.tsx's
 * NEWS_COUNT TODO, explicitly tagged for this feature). Counts by
 * editorial status only — not gated on publishDate — so a post the admin
 * just published shows up immediately even if future-dated, rather than
 * looking like the action silently failed.
 */
export async function countPublishedPosts(): Promise<number> {
  await connectDb();
  return NewsPost.countDocuments({ status: "published" });
}

/** Reads one post for the editor (edit mode). `null` for unknown or soft-deleted ids. */
export async function getAdminPost(id: string): Promise<AdminPost | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await NewsPost.findById(id);
  if (!doc) return null;
  return toAdminPost(doc);
}

export interface AdminPostRow {
  id: string;
  title: string;
  slug: string;
  status: "draft" | "published";
  language: "en" | "ur";
  category: NewsCategoryKey;
  publishDate: string; // YYYY-MM-DD
  coverThumbUrl: string | null;
  isScheduled: boolean;
}

export interface ListAdminPostsOptions {
  q?: string;
  status?: "draft" | "published" | "all";
  category?: string;
  page?: number;
}

/**
 * The admin list query (FR-010–FR-012, FR-039). Search is a plain
 * case-insensitive substring match on `title` — works for Urdu titles
 * because it's a literal string comparison, not a stemmed text index.
 */
export async function listAdminPosts(options: ListAdminPostsOptions = {}): Promise<Paged<AdminPostRow>> {
  await connectDb();
  const page = Math.max(1, Math.floor(options.page ?? 1));
  const filter: Record<string, unknown> = {};

  if (options.q && options.q.trim() !== "") {
    filter.title = { $regex: escapeRegExp(options.q.trim()), $options: "i" };
  }
  if (options.status && options.status !== "all") {
    filter.status = options.status;
  }
  if (options.category && isCategoryKey(options.category)) {
    filter.category = options.category;
  }

  const total = await NewsPost.countDocuments(filter);
  const totalPages = Math.max(1, Math.ceil(total / ADMIN_PAGE_SIZE));
  const docs = await NewsPost.find(filter)
    .sort({ publishDate: -1, updatedAt: -1 })
    .skip((page - 1) * ADMIN_PAGE_SIZE)
    .limit(ADMIN_PAGE_SIZE);

  const today = startOfTodayPkt();
  const items: AdminPostRow[] = docs.map((doc) => ({
    id: doc._id.toString(),
    title: doc.title,
    slug: doc.slug,
    status: doc.status as "draft" | "published",
    language: doc.language as "en" | "ur",
    category: doc.category as NewsCategoryKey,
    publishDate: toDateInput(doc.publishDate),
    coverThumbUrl: doc.coverImage ? cloudinaryLoader({ src: doc.coverImage.url, width: 160 }) : null,
    isScheduled: doc.status === "published" && doc.publishDate > today,
  }));

  return { items, page, pageSize: ADMIN_PAGE_SIZE, total, totalPages };
}
