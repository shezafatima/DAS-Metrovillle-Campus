import { z } from "zod";
import { NEWS_CATEGORY_KEYS } from "@/lib/news/categories";
import { isReservedSlug, SLUG_PATTERN } from "@/lib/news/slug";

/**
 * Shared by the admin editor (client-side field messages) and every
 * mutation route handler (authoritative) — Constitution IV: one schema,
 * never two validation rules that can drift apart.
 */

const DATE_INPUT_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function isValidCalendarDate(value: string): boolean {
  if (!DATE_INPUT_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  // Date.UTC silently rolls over an out-of-range day/month (e.g.
  // 2026-02-30 becomes 2026-03-02) — comparing components back out
  // catches that instead of accepting an invalid calendar date.
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

export const coverImageSchema = z.object({
  url: z
    .string()
    .trim()
    .regex(/^https:\/\/res\.cloudinary\.com\//, "Not a valid Cloudinary URL."),
  publicId: z
    .string()
    .trim()
    .refine((id) => id.startsWith("news/covers/"), "Not a valid uploaded image."),
  width: z.int().positive(),
  height: z.int().positive(),
  alt: z.string().trim().min(1, "Alternative text is required.").max(200),
});

export type CoverImageInput = z.infer<typeof coverImageSchema>;

export const newsPostInputSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, "Title is required.")
    .max(200, "Title must be 200 characters or fewer."),
  slug: z
    .string()
    .trim()
    .max(120, "Address must be 120 characters or fewer.")
    .regex(SLUG_PATTERN, "Address may only contain letters, numbers and hyphens.")
    .refine((s) => !isReservedSlug(s), "This address is reserved.")
    .optional(),
  bodyHtml: z.string().min(1, "Body is required."),
  language: z.enum(["en", "ur"]).default("en"),
  category: z.enum(NEWS_CATEGORY_KEYS, { error: "Choose a category." }),
  publishDate: z
    .string()
    .regex(DATE_INPUT_PATTERN, "Publish date is required.")
    .refine(isValidCalendarDate, "Publish date is not a valid date."),
  status: z.enum(["draft", "published"]).default("draft"),
  coverImage: coverImageSchema.nullable().default(null),
});

export type NewsPostInput = z.infer<typeof newsPostInputSchema>;

/**
 * Flattens a ZodError into `{ "field.path": "message" }`, matching the
 * `400 { error: "validation", fields }` envelope every admin news route
 * returns (contracts/admin-news-api.md).
 */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const fields: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".");
    if (key && !(key in fields)) fields[key] = issue.message;
  }
  return fields;
}
