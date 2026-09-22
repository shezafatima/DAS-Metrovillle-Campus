import mongoose from "mongoose";
import { connectDb } from "@/lib/db";
import { NewsPost } from "@/models/news-post";
import { newsPostInputSchema, fieldErrors, type NewsPostInput } from "@/lib/validation/news";
import { sanitizeBody } from "@/lib/news/sanitize";
import { excerptFrom } from "@/lib/news/excerpt";
import { slugify, fallbackSlug } from "@/lib/news/slug";
import { toUtcMidnight } from "@/lib/news/dates";
import type { VerifyResult } from "@/lib/cloudinary";

/** Thrown for any schema or business-rule validation failure (maps to `400`). */
export class ValidationFailure extends Error {
  fields: Record<string, string>;
  constructor(fields: Record<string, string>) {
    super("Validation failed");
    this.name = "ValidationFailure";
    this.fields = fields;
  }
}

/** Thrown when a hand-typed slug is already taken by another post (maps to `409`). */
export class SlugConflictError extends Error {
  constructor() {
    super("This address is already in use.");
    this.name = "SlugConflictError";
  }
}

/** Thrown when Cloudinary could not confirm a changed cover image (maps to `502`). */
export class UploadVerificationError extends Error {
  constructor(reason: string) {
    super(`Upload verification failed: ${reason}`);
    this.name = "UploadVerificationError";
  }
}

export interface MutationDTO {
  id: string;
  slug: string;
}

export interface StatusDTO {
  id: string;
  status: "draft" | "published";
}

/** Optional cover-verification hook, wired in only from US4 onward (research.md §3). */
export interface MutationOptions {
  verifyCover?: (publicId: string) => Promise<VerifyResult>;
}

async function slugExists(slug: string, excludeId?: string): Promise<boolean> {
  const filter: Record<string, unknown> = { slug };
  if (excludeId) filter._id = { $ne: excludeId };
  // withDeleted: a soft-deleted post's slug stays reserved (FR-004).
  const found = await NewsPost.findOne(filter).setOptions({ withDeleted: true }).select("_id").lean();
  return found !== null;
}

/** Generates a unique slug from the title, appending -2, -3… as needed. */
async function generateUniqueSlug(title: string): Promise<string> {
  const base = slugify(title) || fallbackSlug();
  let candidate = base;
  let n = 2;
  while (await slugExists(candidate)) {
    candidate = `${base}-${n}`;
    n++;
  }
  return candidate;
}

function parseInput(raw: unknown): NewsPostInput {
  const result = newsPostInputSchema.safeParse(raw);
  if (!result.success) throw new ValidationFailure(fieldErrors(result.error));
  return result.data;
}

/** Runs sanitisation + the empty-body check shared by create and update. */
function sanitizeOrThrow(bodyHtml: string): { html: string; text: string; excerpt: string } {
  const { html, text } = sanitizeBody(bodyHtml);
  if (text === "") {
    throw new ValidationFailure({ bodyHtml: "Body is required." });
  }
  return { html, text, excerpt: excerptFrom(text) };
}

async function verifyCoverIfChanged(
  coverImage: NewsPostInput["coverImage"],
  previousPublicId: string | null,
  verifyCover: MutationOptions["verifyCover"],
): Promise<void> {
  if (!coverImage || !verifyCover) return;
  if (coverImage.publicId === previousPublicId) return; // unchanged — already verified when first uploaded
  const result = await verifyCover(coverImage.publicId);
  if (result.ok) return;
  if (result.reason === "unavailable") throw new UploadVerificationError(result.reason);
  const messages: Record<string, string> = {
    too_large: "Image must be 5 MB or smaller.",
    bad_format: "Please choose a JPEG, PNG or WebP image.",
    wrong_folder: "That upload is not valid — please choose the image again.",
  };
  throw new ValidationFailure({ coverImage: messages[result.reason] });
}

export async function createPost(
  raw: unknown,
  options: MutationOptions = {},
): Promise<MutationDTO> {
  await connectDb();
  const input = parseInput(raw);
  const { html, excerpt } = sanitizeOrThrow(input.bodyHtml);
  await verifyCoverIfChanged(input.coverImage, null, options.verifyCover);

  let slug: string;
  if (input.slug) {
    if (await slugExists(input.slug)) throw new SlugConflictError();
    slug = input.slug;
  } else {
    slug = await generateUniqueSlug(input.title);
  }

  const doc = await NewsPost.create({
    title: input.title,
    slug,
    bodyHtml: html,
    excerpt,
    language: input.language,
    category: input.category,
    status: input.status,
    publishDate: toUtcMidnight(input.publishDate),
    coverImage: input.coverImage,
  });

  return { id: doc._id.toString(), slug: doc.slug };
}

export async function updatePost(
  id: string,
  raw: unknown,
  options: MutationOptions = {},
): Promise<MutationDTO | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const existing = await NewsPost.findById(id);
  if (!existing) return null;

  const input = parseInput(raw);
  const { html, excerpt } = sanitizeOrThrow(input.bodyHtml);
  await verifyCoverIfChanged(
    input.coverImage,
    existing.coverImage?.publicId ?? null,
    options.verifyCover,
  );

  // Keep the current slug unless the caller explicitly sent a new one
  // (FR-003: editing keeps the address unless changed by hand).
  let slug = existing.slug;
  if (input.slug && input.slug !== existing.slug) {
    if (await slugExists(input.slug, id)) throw new SlugConflictError();
    slug = input.slug;
  }

  existing.title = input.title;
  existing.slug = slug;
  existing.bodyHtml = html;
  existing.excerpt = excerpt;
  existing.language = input.language;
  existing.category = input.category;
  existing.status = input.status;
  existing.publishDate = toUtcMidnight(input.publishDate);
  existing.coverImage = input.coverImage;
  await existing.save();

  return { id: existing._id.toString(), slug: existing.slug };
}

export async function setPostStatus(
  id: string,
  status: "draft" | "published",
): Promise<StatusDTO | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await NewsPost.findByIdAndUpdate(id, { $set: { status } }, { new: true });
  if (!doc) return null;
  return { id: doc._id.toString(), status: doc.status as "draft" | "published" };
}

export async function deletePost(id: string): Promise<{ id: string } | null> {
  if (!mongoose.isValidObjectId(id)) return null;
  await connectDb();
  const doc = await NewsPost.softDeleteById(id);
  if (!doc) return null;
  return { id: doc._id.toString() };
}
