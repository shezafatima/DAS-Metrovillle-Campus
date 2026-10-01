import { z } from "zod";
import { galleryCopy } from "@/content/admin";
import { SETTINGS_GALLERY_FOLDER_PREFIX } from "./folder";
import { ALBUM_ID_PATTERN, CAPTION_MAX, DESCRIPTION_MAX, MAX_ALBUMS, MAX_PHOTOS_PER_ALBUM, TITLE_MAX } from "./types";

/**
 * Validation for every gallery action (007, data-model.md "Validation").
 * One set of schemas, used by the admin forms (client) and the Server
 * Actions (server), so the two cannot drift (Constitution VI).
 */

const msg = galleryCopy.errors;

/** A real calendar date written as YYYY-MM-DD. */
export function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [y, m, d] = value.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return date.getUTCFullYear() === y && date.getUTCMonth() === m - 1 && date.getUTCDate() === d;
}

export const titleSchema = z
  .string({ error: msg.titleRequired })
  .trim()
  .min(1, msg.titleRequired)
  .max(TITLE_MAX, msg.titleTooLong);

export const descriptionSchema = z
  .string()
  .trim()
  .max(DESCRIPTION_MAX, msg.descriptionTooLong)
  .optional()
  .transform((value) => value ?? "");

export const dateSchema = z
  .string()
  .trim()
  .optional()
  .nullable()
  .refine((value) => !value || isCalendarDate(value), msg.date)
  .transform((value) => (value ? value : null));

export const captionSchema = z
  .string()
  .trim()
  .max(CAPTION_MAX, msg.captionTooLong)
  .optional()
  .transform((value) => value ?? "");

export const albumIdSchema = z.string().regex(ALBUM_ID_PATTERN);
export const photoIdSchema = z.uuid();

/** The album details form (create and edit). */
export const albumDetailsSchema = z.object({
  title: titleSchema,
  description: descriptionSchema,
  date: dateSchema,
});
export type AlbumDetailsInput = z.input<typeof albumDetailsSchema>;

export const imageRefSchema = z.object({
  url: z.string().max(1000).regex(/^https:\/\//i),
  publicId: z.string().max(300).refine((value) => value.startsWith(SETTINGS_GALLERY_FOLDER_PREFIX), msg.imageLimits),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});

export const createAlbumInput = albumDetailsSchema;
export const updateAlbumInput = albumDetailsSchema.extend({ albumId: albumIdSchema, rev: z.number().int().min(1) });
export const reorderAlbumsInput = z.object({ albumIds: z.array(albumIdSchema).max(MAX_ALBUMS) });
export const deleteAlbumInput = z.object({ albumId: albumIdSchema });

export const addPhotosInput = z.object({
  albumId: albumIdSchema,
  photos: z
    .array(z.object({ image: imageRefSchema, caption: captionSchema }))
    .min(1)
    .max(MAX_PHOTOS_PER_ALBUM),
});
export const updatePhotoInput = z.object({ albumId: albumIdSchema, photoId: photoIdSchema, caption: captionSchema });
export const reorderPhotosInput = z.object({ albumId: albumIdSchema, photoIds: z.array(photoIdSchema).max(MAX_PHOTOS_PER_ALBUM) });
export const photoRefInput = z.object({ albumId: albumIdSchema, photoId: photoIdSchema });

export { fieldErrors } from "@/lib/validation/field-errors";
