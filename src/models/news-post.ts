import mongoose, { Schema, type InferSchemaType, type Model } from "mongoose";
import { softDeletePlugin, type SoftDeleteStatics } from "@/lib/soft-delete";
import { NEWS_CATEGORY_KEYS } from "@/lib/news/categories";

/**
 * News post (003 news) — data-model.md "NewsPost → `news`". Cover
 * images are stored as a Cloudinary reference only (URL + public id);
 * binaries live in Cloudinary, never in the database.
 */
const coverImageSchema = new Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String, required: true },
    width: { type: Number, required: true },
    height: { type: Number, required: true },
    alt: { type: String, required: true, trim: true },
  },
  { _id: false },
);

const newsPostSchema = new Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 200 },
    // Unique with no partial filter — a soft-deleted post's slug stays
    // reserved (data-model.md, FR-004), so a later post can never
    // silently take over a deleted post's address.
    slug: { type: String, required: true, unique: true },
    bodyHtml: { type: String, required: true },
    // Derived on every save (src/lib/news/excerpt.ts) — never edited directly.
    excerpt: { type: String, required: true },
    language: { type: String, enum: ["en", "ur"], required: true, default: "en" },
    category: { type: String, enum: NEWS_CATEGORY_KEYS, required: true },
    status: { type: String, enum: ["draft", "published"], required: true, default: "draft" },
    publishDate: { type: Date, required: true },
    coverImage: { type: coverImageSchema, default: null },
  },
  // Explicit collection name: "news", not Mongoose's auto-pluralized
  // "newsposts" — matches data-model.md and e2e/helpers/news.ts, which
  // seed fixtures by writing directly into "news".
  { timestamps: true, collection: "news" },
);

newsPostSchema.plugin(softDeletePlugin);

// Public list + category list + admin default order.
newsPostSchema.index({ status: 1, publishDate: -1, deletedAt: 1 });
newsPostSchema.index({ category: 1, status: 1, publishDate: -1, deletedAt: 1 });
// Admin title search (case-insensitive regex, not a text index — plain
// string comparison works for Urdu titles without stemming surprises).
newsPostSchema.index({ title: 1 });

export type NewsPostDoc = InferSchemaType<typeof newsPostSchema> & {
  _id: mongoose.Types.ObjectId;
};

type NewsPostModel = Model<NewsPostDoc> & SoftDeleteStatics<NewsPostDoc>;

export const NewsPost: NewsPostModel =
  (mongoose.models.NewsPost as NewsPostModel | undefined) ??
  (mongoose.model<NewsPostDoc>("NewsPost", newsPostSchema) as NewsPostModel);
