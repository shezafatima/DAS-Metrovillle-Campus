import { z } from "zod";

/**
 * Field forms shared by the typed page-content schemas (About 017, Academics
 * 018). They match the 005 Settings engine's forms so 014 can store the same
 * values unchanged.
 */

export const text = (max: number) => z.string().trim().min(1).max(max);
export const longText = (max: number) =>
  z
    .string()
    .max(max)
    .refine((s) => s === s.trim() && !/\n{3,}/.test(s), "paragraphs separated by one blank line");
export const imageRef = z.object({
  url: z.string().url().or(z.string().startsWith("/")),
  publicId: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
});
export const itemId = z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/);
export const uniqueIds = <T extends { id: string }>(items: T[]) => new Set(items.map((i) => i.id)).size === items.length;
